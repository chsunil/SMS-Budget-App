// ─── src/app/features/wallet/wallet.page.ts ─────
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { SmsReaderService } from '../../core/services/sms-reader.service';
import { SmsParserService } from '../../core/services/sms-parser.service';
import { BudgetService } from '../../core/services/budget.service';
import { Transaction } from '../../core/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { format, formatDistanceToNow } from 'date-fns';

// ── Bank brand config ─────────────────────────
interface BankBrand {
    color: string;
    gradient: string;
    abbr: string;
    fullName: string;
    type: 'savings' | 'current' | 'credit' | 'payments' | 'wallet';
}

const BANK_BRANDS: Record<string, BankBrand> = {
    'HDFC': { color: '#004C8F', gradient: 'linear-gradient(135deg,#004C8F,#0070CC)', abbr: 'HDFC', fullName: 'HDFC Bank', type: 'savings' },
    'AXIS': { color: '#97144D', gradient: 'linear-gradient(135deg,#97144D,#C41E6A)', abbr: 'AXIS', fullName: 'Axis Bank', type: 'savings' },
    'SBI': { color: '#22409A', gradient: 'linear-gradient(135deg,#22409A,#3B5CC4)', abbr: 'SBI', fullName: 'State Bank of India', type: 'savings' },
    'ICICI': { color: '#B02A30', gradient: 'linear-gradient(135deg,#B02A30,#E03540)', abbr: 'ICICI', fullName: 'ICICI Bank', type: 'savings' },
    'KOTAK': { color: '#ED1C24', gradient: 'linear-gradient(135deg,#ED1C24,#FF4040)', abbr: 'KMB', fullName: 'Kotak Mahindra Bank', type: 'savings' },
    'PNB': { color: '#5C2D91', gradient: 'linear-gradient(135deg,#5C2D91,#7B3FB5)', abbr: 'PNB', fullName: 'Punjab National Bank', type: 'savings' },
    'BOB': { color: '#F26522', gradient: 'linear-gradient(135deg,#F26522,#FF8040)', abbr: 'BOB', fullName: 'Bank of Baroda', type: 'savings' },
    'CANARA': { color: '#005DAA', gradient: 'linear-gradient(135deg,#005DAA,#0079DD)', abbr: 'CAN', fullName: 'Canara Bank', type: 'savings' },
    'YES': { color: '#0060A9', gradient: 'linear-gradient(135deg,#0060A9,#0080DD)', abbr: 'YES', fullName: 'Yes Bank', type: 'savings' },
    'INDUSIND': { color: '#009B77', gradient: 'linear-gradient(135deg,#009B77,#00C495)', abbr: 'IIB', fullName: 'IndusInd Bank', type: 'savings' },
    'IDBI': { color: '#00A650', gradient: 'linear-gradient(135deg,#00A650,#00CC64)', abbr: 'IDBI', fullName: 'IDBI Bank', type: 'savings' },
    'PAYTM': { color: '#00BAF2', gradient: 'linear-gradient(135deg,#00BAF2,#40D0FF)', abbr: 'PTM', fullName: 'Paytm Payments Bank', type: 'payments' },
    'INDIA POST': { color: '#B5451B', gradient: 'linear-gradient(135deg,#B5451B,#E05520)', abbr: 'IPPB', fullName: 'India Post Payments', type: 'payments' },
    'FEDERAL': { color: '#003087', gradient: 'linear-gradient(135deg,#003087,#0050BB)', abbr: 'FED', fullName: 'Federal Bank', type: 'savings' },
    'UNKNOWN': { color: '#4B5563', gradient: 'linear-gradient(135deg,#4B5563,#6B7280)', abbr: '???', fullName: 'Unknown Bank', type: 'savings' },
};

// ── Account model (parsed from SMS) ───────────
export interface BankAccount {
    id: string;
    bank: string;
    bankKey: string;
    brand: BankBrand;
    accountLast4: string;
    balance: number;
    balanceUpdatedAt: Date;
    isCredit: boolean;
    isStale: boolean;          // > 7 days old
    transactions: Transaction[];
    totalDebit: number;
    totalCredit: number;
}

// Balance regex: "Avl Bal: INR 1,41,803.37" or "Available Balance: Rs.55,900"
const BAL_REGEX = /(?:avl\.?\s*bal(?:ance)?|available\s+bal(?:ance)?|balance)[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i;
const DATE_REGEX = /(\d{2}[-\/]\w{3}[-\/]\d{2,4}|\d{2}[-\/]\d{2}[-\/]\d{2,4})/;

@Component({
    selector: 'app-wallet',
    standalone: true,
    imports: [CommonModule, FormsModule, IonicModule, RouterModule, InrPipe],
    template: `
    <ion-content [fullscreen]="true" [scrollEvents]="true">
      <div class="wallet-wrap">

        <!-- ── Header ── -->
        <div class="wallet-header">
          <div class="wh-top">
            <div>
              <div class="wh-eyebrow">Net Worth</div>
              <div class="wh-total" *ngIf="!loading">
                <span class="wh-rupee">₹</span>{{ netWorth | number:'1.0-0' }}
              </div>
              <div class="skeleton wh-total-skel" *ngIf="loading"></div>
              <div class="wh-sub">
                <span class="wh-pill wh-pill-green">{{ accounts.length }} accounts</span>
                <span class="wh-last-update" *ngIf="lastSync">
                  <ion-icon name="time-outline"></ion-icon>
                  Synced {{ lastSync }}
                </span>
              </div>
            </div>
            <button class="refresh-fab" (click)="reload()" [class.spinning]="loading">
              <ion-icon name="refresh-outline"></ion-icon>
            </button>
          </div>

          <!-- Segment tabs: Accounts / Credit Cards -->
          <div class="wh-segments">
            <button class="wh-seg" [class.active]="activeTab === 'accounts'" (click)="activeTab = 'accounts'">
              <ion-icon name="business-outline"></ion-icon>
              Accounts
              <span class="seg-count">{{ savingsAccounts.length }}</span>
            </button>
            <button class="wh-seg" [class.active]="activeTab === 'credit'" (click)="activeTab = 'credit'">
              <ion-icon name="card-outline"></ion-icon>
              Credit Cards
              <span class="seg-count">{{ creditAccounts.length }}</span>
            </button>
            <button class="wh-seg" [class.active]="activeTab === 'wallets'" (click)="activeTab = 'wallets'">
              <ion-icon name="wallet-outline"></ion-icon>
              Wallets
              <span class="seg-count">{{ walletAccounts.length }}</span>
            </button>
          </div>
        </div>

        <!-- ── Show balance toggle notice ── -->
        <div class="balance-notice" *ngIf="!loading && accounts.length > 0">
          <ion-icon name="shield-checkmark-outline" style="color:#10b981"></ion-icon>
          <span>Balance powered from SMS · stays on device</span>
          <ion-icon name="checkmark-circle" style="color:#10b981;margin-left:auto"></ion-icon>
        </div>

        <!-- ── Loading skeletons ── -->
        <div class="accounts-list" *ngIf="loading">
          <div class="account-skel" *ngFor="let n of [1,2,3,4,5]">
            <div class="skeleton skel-logo"></div>
            <div class="skel-body">
              <div class="skeleton" style="height:14px;width:120px;border-radius:4px;margin-bottom:7px"></div>
              <div class="skeleton" style="height:11px;width:80px;border-radius:4px"></div>
            </div>
            <div class="skeleton skel-balance"></div>
          </div>
        </div>

        <!-- ── Empty state ── -->
        <div class="empty-state" *ngIf="!loading && accounts.length === 0">
          <div class="empty-icon">🏦</div>
          <h3>No accounts found</h3>
          <p>SMS balance updates from your bank will appear here automatically.</p>
          <button class="reload-btn" (click)="reload()">
            <ion-icon name="refresh-outline"></ion-icon>
            Scan SMS
          </button>
        </div>

        <!-- ── Accounts list ── -->
        <div class="accounts-list" *ngIf="!loading && visibleAccounts.length > 0">

          <!-- Total for tab -->
          <div class="tab-total">
            <span class="tt-label">Total {{ activeTab === 'accounts' ? 'Balance' : activeTab === 'credit' ? 'Outstanding' : 'Wallet Balance' }}</span>
            <span class="tt-val" [style.color]="activeTab === 'credit' ? '#ef4444' : '#10b981'">
              {{ tabTotal | inr }}
            </span>
          </div>

          <div class="account-card"
            *ngFor="let acc of visibleAccounts; let i = index"
            [class.stale]="acc.isStale"
            [style.animation-delay]="(i * 0.06) + 's'"
            (click)="openAccount(acc)">

            <!-- Bank logo / monogram -->
            <div class="acc-logo" [style.background]="acc.brand.gradient">
              <span class="acc-abbr">{{ acc.brand.abbr }}</span>
              <div class="stale-dot" *ngIf="acc.isStale"></div>
            </div>

            <!-- Account info -->
            <div class="acc-info">
              <div class="acc-bank">{{ acc.brand.fullName }}</div>
              <div class="acc-number">
                <span class="acc-dots">••••</span>
                <span class="acc-last4">{{ acc.accountLast4 }}</span>
              </div>
              <div class="acc-updated">
                <ion-icon name="time-outline"></ion-icon>
                Avbl bal on {{ acc.balanceUpdatedAt | date:'dd MMM' }}
              </div>
            </div>

            <!-- Balance -->
            <div class="acc-balance-col">
              <div class="acc-balance"
                [style.color]="acc.isCredit ? '#ef4444' : '#0f172a'">
                {{ acc.balance | inr }}
              </div>
              <ion-icon name="chevron-forward-outline" class="acc-chevron"></ion-icon>
            </div>

          </div>
        </div>

        <div style="height:100px"></div>
      </div>

      <!-- ══════════════════════════════════════
           ACCOUNT DETAIL SHEET
      ══════════════════════════════════════ -->
      <div class="detail-overlay" [class.open]="!!selectedAccount" (click)="closeDetail()">
        <div class="detail-sheet" (click)="$event.stopPropagation()" *ngIf="selectedAccount">
          <div class="ds-handle"></div>

          <!-- Account header card -->
          <div class="ds-card" [style.background]="selectedAccount.brand.gradient">
            <div class="ds-card-top">
              <div class="ds-bank-name">{{ selectedAccount.brand.fullName }}</div>
              <div class="ds-account-type">{{ selectedAccount.brand.type | titlecase }} Account</div>
            </div>
            <div class="ds-balance">{{ selectedAccount.balance | inr }}</div>
            <div class="ds-card-bottom">
              <div class="ds-number">
                <span>•••• •••• ••••</span>
                <span class="ds-last4">{{ selectedAccount.accountLast4 }}</span>
              </div>
              <div class="ds-updated">
                Updated {{ selectedAccount.balanceUpdatedAt | date:'dd MMM yyyy' }}
                <span class="ds-stale-badge" *ngIf="selectedAccount.isStale">STALE</span>
              </div>
            </div>
          </div>

          <!-- Month stats -->
          <div class="ds-stats">
            <div class="ds-stat">
              <div class="ds-stat-icon red">↑</div>
              <div>
                <div class="ds-stat-label">This Month Out</div>
                <div class="ds-stat-val red">{{ selectedAccount.totalDebit | inr }}</div>
              </div>
            </div>
            <div class="ds-stat-divider"></div>
            <div class="ds-stat">
              <div class="ds-stat-icon green">↓</div>
              <div>
                <div class="ds-stat-label">This Month In</div>
                <div class="ds-stat-val green">{{ selectedAccount.totalCredit | inr }}</div>
              </div>
            </div>
            <div class="ds-stat-divider"></div>
            <div class="ds-stat">
              <div class="ds-stat-icon purple">#</div>
              <div>
                <div class="ds-stat-label">Transactions</div>
                <div class="ds-stat-val">{{ selectedAccount.transactions.length }}</div>
              </div>
            </div>
          </div>

          <!-- Recent transactions for this account -->
          <div class="ds-txn-title">Recent Transactions</div>

          <div class="ds-empty" *ngIf="selectedAccount.transactions.length === 0">
            <ion-icon name="receipt-outline"></ion-icon>
            No transactions found this month
          </div>

          <div class="ds-txn-list">
            <div class="ds-txn-row" *ngFor="let txn of selectedAccount.transactions.slice(0, 20)">
              <div class="ds-txn-icon" [style.background]="getCatColorDim(txn.category)" [style.color]="getCatColor(txn.category)">
                {{ getCatIcon(txn.category) }}
              </div>
              <div class="ds-txn-info">
                <div class="ds-txn-merchant">{{ txn.merchant || 'Transaction' }}</div>
                <div class="ds-txn-meta">
                  {{ getCatName(txn.category) }} · {{ txn.date | date:'dd MMM' }}
                  <span class="ds-source-badge">{{ txn.source }}</span>
                </div>
              </div>
              <div class="ds-txn-amount" [style.color]="txn.type === 'debit' ? '#ef4444' : '#10b981'">
                {{ txn.type === 'debit' ? '−' : '+' }}{{ txn.amount | inr }}
              </div>
            </div>
          </div>

          <div class="ds-footer">
            <ion-icon name="information-circle-outline"></ion-icon>
            Balances are parsed from SMS and may not reflect real-time figures
          </div>
        </div>
      </div>

    </ion-content>
  `,
    styles: []
})
export class WalletPage implements OnInit {
    accounts: BankAccount[] = [];
    loading = false;
    activeTab: 'accounts' | 'credit' | 'wallets' = 'accounts';
    selectedAccount: BankAccount | null = null;
    lastSync = '';

    // All transactions this month for linking to accounts
    private allTxns: Transaction[] = [];

    // Category meta lookup
    private readonly CAT_META: Record<string, { icon: string; color: string; colorDim: string; name: string }> = {
        fixed_costs: { icon: '🏦', color: '#f5c842', colorDim: 'rgba(245,200,66,0.15)', name: 'Fixed Costs' },
        food_household: { icon: '🛒', color: '#60a5fa', colorDim: 'rgba(96,165,250,0.15)', name: 'Food & Home' },
        savings: { icon: '💰', color: '#10b981', colorDim: 'rgba(16,185,129,0.15)', name: 'Savings' },
        self_investment: { icon: '🌿', color: '#a78bfa', colorDim: 'rgba(167,139,250,0.15)', name: 'Self-Investment' },
        fun_family: { icon: '🎉', color: '#fb923c', colorDim: 'rgba(251,146,60,0.15)', name: 'Fun & Family' },
        giving_misc: { icon: '💖', color: '#f472b6', colorDim: 'rgba(244,114,182,0.15)', name: 'Giving & Misc' },
        uncategorized: { icon: '❓', color: '#94a3b8', colorDim: 'rgba(148,163,184,0.15)', name: 'Other' },
    };

    constructor(
        private smsReader: SmsReaderService,
        private smsParser: SmsParserService,
        private budgetService: BudgetService
    ) { }

    get savingsAccounts(): BankAccount[] {
        return this.accounts.filter(a => !a.isCredit && a.brand.type !== 'payments' && a.brand.type !== 'wallet');
    }

    get creditAccounts(): BankAccount[] {
        return this.accounts.filter(a => a.isCredit);
    }

    get walletAccounts(): BankAccount[] {
        return this.accounts.filter(a => a.brand.type === 'payments' || a.brand.type === 'wallet');
    }

    get visibleAccounts(): BankAccount[] {
        if (this.activeTab === 'accounts') return this.savingsAccounts;
        if (this.activeTab === 'credit') return this.creditAccounts;
        return this.walletAccounts;
    }

    get netWorth(): number {
        return this.savingsAccounts.reduce((s, a) => s + a.balance, 0)
            + this.walletAccounts.reduce((s, a) => s + a.balance, 0);
    }

    get tabTotal(): number {
        return this.visibleAccounts.reduce((s, a) => s + a.balance, 0);
    }

    ngOnInit() { this.reload(); }

    async reload() {
        this.loading = true;
        try {
            // Read all SMS + load current month transactions
            const rawSms = await this.smsReader.readAllSMS(2000);
            const month = format(new Date(), 'yyyy-MM');

            // Subscribe once to get transactions
            this.budgetService.watchTransactions(month).subscribe(txns => {
                this.allTxns = txns;
            });

            // Parse accounts from SMS
            this.accounts = this.extractAccounts(rawSms);
            this.lastSync = formatDistanceToNow(new Date(), { addSuffix: true });
        } finally {
            this.loading = false;
        }
    }

    // ── Core: extract unique accounts from SMS ────
    private extractAccounts(rawSms: Array<{ body: string; address: string; date: number }>): BankAccount[] {
        const accountMap = new Map<string, {
            bank: string; accountLast4: string; balance: number;
            balanceDate: Date; isCredit: boolean; rawMessages: typeof rawSms;
        }>();

        for (const sms of rawSms) {
            // Extract account last4
            const acctMatch = sms.body.match(/(?:[Aa]\/[Cc]|account|acct)[^\d]*[Xx*]+(\d{4})|[Xx*]{4,}(\d{4})/);
            if (!acctMatch) continue;
            const last4 = acctMatch[1] || acctMatch[2];
            if (!last4) continue;

            // Detect bank
            const bank = this.detectBankKey(sms.body, sms.address);

            // Look for balance
            const balMatch = sms.body.match(BAL_REGEX);
            const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : -1;

            // Credit card detection
            const isCredit = /credit\s*card|cc\s*a\/c|credit\s*a\/c/i.test(sms.body) ||
                /bill\s*amount|minimum\s*due|total\s*due/i.test(sms.body);

            const key = `${bank}_${last4}`;
            const existing = accountMap.get(key);
            const smsDate = new Date(sms.date);

            if (!existing || (balance >= 0 && smsDate > existing.balanceDate)) {
                accountMap.set(key, {
                    bank,
                    accountLast4: last4,
                    balance: balance >= 0 ? balance : (existing?.balance ?? 0),
                    balanceDate: balance >= 0 ? smsDate : (existing?.balanceDate ?? smsDate),
                    isCredit,
                    rawMessages: [...(existing?.rawMessages ?? []), sms]
                });
            } else if (existing) {
                existing.rawMessages.push(sms);
            }
        }

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        return Array.from(accountMap.entries())
            .filter(([, v]) => v.balance > 0)
            .map(([id, v]) => {
                const brand = this.getBrand(v.bank);
                const acctTxns = this.allTxns.filter(t =>
                    t.accountLast4 === v.accountLast4 || t.bank === v.bank
                );
                return {
                    id,
                    bank: v.bank,
                    bankKey: v.bank,
                    brand,
                    accountLast4: v.accountLast4,
                    balance: v.balance,
                    balanceUpdatedAt: v.balanceDate,
                    isCredit: v.isCredit,
                    isStale: v.balanceDate < sevenDaysAgo,
                    transactions: acctTxns,
                    totalDebit: acctTxns.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
                    totalCredit: acctTxns.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
                } as BankAccount;
            })
            .sort((a, b) => b.balance - a.balance);
    }

    private detectBankKey(body: string, sender: string): string {
        const s = `${body} ${sender}`.toUpperCase();
        if (/HDFC/.test(s)) return 'HDFC';
        if (/AXIS/.test(s)) return 'AXIS';
        if (/ICICI/.test(s)) return 'ICICI';
        if (/KOTAK|KMB/.test(s)) return 'KOTAK';
        if (/SBI|STATE BANK/.test(s)) return 'SBI';
        if (/PNB|PUNJAB NAT/.test(s)) return 'PNB';
        if (/BOB|BANK OF BARODA/.test(s)) return 'BOB';
        if (/CANARA/.test(s)) return 'CANARA';
        if (/YES BANK/.test(s)) return 'YES';
        if (/INDUSIND|IIB/.test(s)) return 'INDUSIND';
        if (/IDBI/.test(s)) return 'IDBI';
        if (/PAYTM/.test(s)) return 'PAYTM';
        if (/INDIA POST|IPPB/.test(s)) return 'INDIA POST';
        if (/FEDERAL/.test(s)) return 'FEDERAL';
        return 'UNKNOWN';
    }

    private getBrand(bankKey: string): BankBrand {
        return BANK_BRANDS[bankKey] ?? BANK_BRANDS['UNKNOWN'];
    }

    openAccount(acc: BankAccount) {
        this.selectedAccount = acc;
    }

    closeDetail() {
        this.selectedAccount = null;
    }

    getCatIcon(cat: string): string { return this.CAT_META[cat]?.icon ?? '❓'; }
    getCatColor(cat: string): string { return this.CAT_META[cat]?.color ?? '#94a3b8'; }
    getCatColorDim(cat: string): string { return this.CAT_META[cat]?.colorDim ?? 'rgba(148,163,184,0.15)'; }
    getCatName(cat: string): string { return this.CAT_META[cat]?.name ?? cat; }
}