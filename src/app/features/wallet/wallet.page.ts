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
    styles: [`
    ion-content { --background: #0a0e1a; }
    .wallet-wrap { min-height: 100vh; background: #0a0e1a; }

    /* ── Header ── */
    .wallet-header {
      background: linear-gradient(180deg, #0f1629 0%, #0a0e1a 100%);
      padding: 52px 20px 0;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .wh-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .wh-eyebrow { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }
    .wh-total { font-family: 'Syne', sans-serif; font-size: 38px; font-weight: 800; color: #f0f6ff; line-height: 1; margin-bottom: 10px; }
    .wh-rupee { font-size: 24px; vertical-align: top; margin-top: 4px; display: inline-block; opacity: 0.7; }
    .wh-total-skel { height: 42px; width: 200px; border-radius: 8px; background: linear-gradient(90deg,#1a2240 25%,#22305a 50%,#1a2240 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; margin-bottom: 10px; }
    .wh-sub { display: flex; align-items: center; gap: 10px; }
    .wh-pill { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .wh-pill-green { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.2); }
    .wh-last-update { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(255,255,255,0.35); ion-icon { font-size: 12px; } }
    .refresh-fab {
      width: 42px; height: 42px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); font-size: 20px;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      &.spinning { animation: spin 0.8s linear infinite; }
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }

    /* Segment tabs */
    .wh-segments { display: flex; gap: 0; border-top: 1px solid rgba(255,255,255,0.06); }
    .wh-seg {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 14px 8px 12px; border: none; background: transparent;
      color: rgba(255,255,255,0.4); font-size: 12px; font-weight: 600; cursor: pointer;
      border-bottom: 2px solid transparent; transition: all 0.2s;
      ion-icon { font-size: 15px; }
      &.active { color: #60a5fa; border-bottom-color: #60a5fa; }
    }
    .seg-count { background: rgba(96,165,250,0.15); color: #60a5fa; font-size: 10px; font-weight: 800; padding: 1px 6px; border-radius: 20px; }
    .wh-seg:not(.active) .seg-count { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.3); }

    /* Balance notice */
    .balance-notice {
      display: flex; align-items: center; gap: 8px;
      margin: 12px 16px 4px; padding: 10px 14px;
      background: rgba(16,185,129,0.07); border: 1px solid rgba(16,185,129,0.15);
      border-radius: 12px; font-size: 12px; color: rgba(255,255,255,0.5);
      ion-icon { font-size: 16px; flex-shrink: 0; }
    }

    /* Skeleton */
    .accounts-list { padding: 8px 16px; }
    .account-skel { display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(255,255,255,0.03); border-radius: 18px; margin-bottom: 8px; }
    .skel-logo { width: 48px; height: 48px; border-radius: 14px; flex-shrink: 0; background: linear-gradient(90deg,#1a2240 25%,#22305a 50%,#1a2240 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
    .skel-body { flex: 1; }
    .skel-balance { width: 90px; height: 22px; border-radius: 6px; background: linear-gradient(90deg,#1a2240 25%,#22305a 50%,#1a2240 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
    .skeleton { background: linear-gradient(90deg,#1a2240 25%,#22305a 50%,#1a2240 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }

    /* Empty state */
    .empty-state { text-align: center; padding: 64px 24px; color: rgba(255,255,255,0.4); }
    .empty-icon { font-size: 56px; display: block; margin-bottom: 16px; }
    .empty-state h3 { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
    .empty-state p { font-size: 13px; line-height: 1.6; margin-bottom: 24px; }
    .reload-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(96,165,250,0.15); border: 1px solid rgba(96,165,250,0.3);
      color: #60a5fa; border-radius: 14px; padding: 12px 22px;
      font-size: 14px; font-weight: 700; cursor: pointer;
    }

    /* Tab total */
    .tab-total { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px 12px; }
    .tt-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 1px; }
    .tt-val { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; }

    /* Account card */
    .account-card {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 18px; padding: 14px 16px; margin-bottom: 8px;
      cursor: pointer; animation: fadeUp 0.35s cubic-bezier(0.16,1,0.3,1) both;
      transition: background 0.2s, border-color 0.2s;
      &:active { background: rgba(255,255,255,0.08); }
      &.stale { border-color: rgba(239,68,68,0.25); }
      &.stale .acc-logo::after {
        content: '';
      }
    }
    @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }

    /* Bank logo */
    .acc-logo {
      width: 48px; height: 48px; border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; position: relative;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }
    .acc-abbr { font-family: 'Syne', sans-serif; font-size: 12px; font-weight: 800; color: white; letter-spacing: 0.5px; }
    .stale-dot { position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; border-radius: 50%; background: #ef4444; border: 2px solid #0a0e1a; }

    /* Account info */
    .acc-info { flex: 1; min-width: 0; }
    .acc-bank { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: #f0f6ff; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .acc-number { display: flex; align-items: center; gap: 4px; margin-bottom: 3px; }
    .acc-dots { font-size: 10px; color: rgba(255,255,255,0.3); letter-spacing: 2px; }
    .acc-last4 { font-size: 13px; font-weight: 700; color: rgba(255,255,255,0.6); letter-spacing: 1px; }
    .acc-updated { display: flex; align-items: center; gap: 4px; font-size: 11px; color: rgba(255,255,255,0.3); ion-icon { font-size: 11px; } }

    /* Balance */
    .acc-balance-col { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .acc-balance { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; text-align: right; }
    .acc-chevron { font-size: 16px; color: rgba(255,255,255,0.2); }

    /* ══ Detail Sheet ══ */
    .detail-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0);
      z-index: 200; pointer-events: none;
      display: flex; align-items: flex-end;
      transition: background 0.3s;
      &.open { background: rgba(0,0,0,0.7); pointer-events: all; }
    }
    .detail-sheet {
      width: 100%; max-width: 480px; margin: 0 auto;
      background: #111827; border-radius: 28px 28px 0 0;
      padding: 16px 0 48px;
      transform: translateY(100%);
      transition: transform 0.38s cubic-bezier(0.16,1,0.3,1);
      max-height: 90vh; overflow-y: auto;
    }
    .detail-overlay.open .detail-sheet { transform: translateY(0); }
    .ds-handle { width: 40px; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.15); margin: 0 auto 16px; }

    /* Account card in detail */
    .ds-card {
      margin: 0 16px 16px; border-radius: 20px; padding: 20px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
      position: relative; overflow: hidden;
      &::before {
        content: '';
        position: absolute; top: -40px; right: -40px;
        width: 160px; height: 160px; border-radius: 50%;
        background: rgba(255,255,255,0.07);
      }
    }
    .ds-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .ds-bank-name { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: rgba(255,255,255,0.9); }
    .ds-account-type { font-size: 11px; color: rgba(255,255,255,0.5); background: rgba(255,255,255,0.12); padding: 3px 8px; border-radius: 20px; }
    .ds-balance { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 800; color: white; margin-bottom: 20px; text-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .ds-card-bottom { display: flex; justify-content: space-between; align-items: flex-end; }
    .ds-number { display: flex; gap: 8px; font-size: 14px; color: rgba(255,255,255,0.6); letter-spacing: 2px; }
    .ds-last4 { color: rgba(255,255,255,0.9); font-weight: 700; }
    .ds-updated { font-size: 11px; color: rgba(255,255,255,0.45); text-align: right; }
    .ds-stale-badge { display: inline-block; background: #ef4444; color: white; font-size: 9px; font-weight: 800; padding: 1px 6px; border-radius: 20px; margin-left: 6px; letter-spacing: 0.5px; }

    /* Month stats */
    .ds-stats { display: flex; align-items: center; margin: 0 16px 16px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 14px; }
    .ds-stat { flex: 1; display: flex; align-items: center; gap: 10px; }
    .ds-stat-divider { width: 1px; height: 36px; background: rgba(255,255,255,0.07); flex-shrink: 0; }
    .ds-stat-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; flex-shrink: 0; &.red { background: rgba(239,68,68,0.15); color: #ef4444; } &.green { background: rgba(16,185,129,0.15); color: #10b981; } &.purple { background: rgba(139,92,246,0.15); color: #8b5cf6; } }
    .ds-stat-label { font-size: 10px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 2px; }
    .ds-stat-val { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800; color: #f0f6ff; &.red { color: #ef4444; } &.green { color: #10b981; } }

    /* Transaction list */
    .ds-txn-title { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin: 0 16px 10px; }
    .ds-empty { display: flex; align-items: center; gap: 10px; color: rgba(255,255,255,0.3); font-size: 13px; padding: 16px; ion-icon { font-size: 20px; } }
    .ds-txn-list { padding: 0 16px; }
    .ds-txn-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04); &:last-child { border-bottom: none; } }
    .ds-txn-icon { width: 36px; height: 36px; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .ds-txn-info { flex: 1; min-width: 0; }
    .ds-txn-merchant { font-size: 13px; font-weight: 600; color: #f0f6ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 2px; }
    .ds-txn-meta { font-size: 11px; color: rgba(255,255,255,0.35); }
    .ds-source-badge { background: rgba(255,255,255,0.08); border-radius: 4px; padding: 0 5px; margin-left: 6px; font-size: 10px; }
    .ds-txn-amount { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800; flex-shrink: 0; }
    .ds-footer { display: flex; align-items: center; gap: 7px; font-size: 11px; color: rgba(255,255,255,0.2); padding: 16px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.04); ion-icon { font-size: 14px; flex-shrink: 0; } }
  `]
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