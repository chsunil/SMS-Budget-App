// ─── src/app/features/transactions/transaction-list/transaction-list.page.ts ─
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BudgetService } from '../../../core/services/budget.service';
import { Transaction, CategoryKey } from '../../../core/models';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { format } from 'date-fns';

interface GroupedTransactions {
  date: string;
  label: string;
  transactions: Transaction[];
  total: number;
}

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, InrPipe],
  template: `
    <ion-content [fullscreen]="true">
      <div class="txn-bg">
        <!-- Purple Header -->
        <div class="page-header">
          <div class="header-top">
            <h1 class="header-title">Transactions</h1>
            <button class="add-fab" routerLink="/add-transaction">
              <ion-icon name="add-outline"></ion-icon>
            </button>
          </div>

          <!-- Month Tabs -->
          <div class="month-scroll">
            <button class="month-chip" *ngFor="let m of recentMonths"
              [class.active]="m.key === selectedMonth"
              (click)="selectMonth(m.key)">
              {{ m.label }}
            </button>
          </div>

          <!-- Summary Pills -->
          <div class="summary-pills" *ngIf="transactions.length > 0">
            <div class="pill pill-red">
              <ion-icon name="arrow-up-outline"></ion-icon>
              <span>{{ totalExpense | inr:true }}</span>
              <small>Spent</small>
            </div>
            <div class="pill pill-green">
              <ion-icon name="arrow-down-outline"></ion-icon>
              <span>{{ totalIncome | inr:true }}</span>
              <small>Earned</small>
            </div>
            <div class="pill pill-purple">
              <ion-icon name="layers-outline"></ion-icon>
              <span>{{ transactions.length }}</span>
              <small>Total</small>
            </div>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar" *ngIf="transactions.length > 0">
          <button class="filter-chip" [class.active]="activeFilter === 'all'" (click)="setFilter('all')">All</button>
          <button class="filter-chip" [class.active]="activeFilter === 'debit'" (click)="setFilter('debit')">Expense</button>
          <button class="filter-chip" [class.active]="activeFilter === 'credit'" (click)="setFilter('credit')">Income</button>
          <div style="flex:1"></div>
          <div class="txn-count">{{ filteredTransactions.length }} txns</div>
        </div>

        <!-- Empty State -->
        <div class="empty-state" *ngIf="transactions.length === 0 && !loading">
          <div class="empty-icon">📭</div>
          <h3>No transactions yet</h3>
          <p>Add one manually or import from SMS</p>
          <button class="empty-btn" routerLink="/add-transaction">
            <ion-icon name="add-outline"></ion-icon> Add Transaction
          </button>
        </div>

        <!-- Loading -->
        <div class="loading-wrap" *ngIf="loading">
          <div class="skel" *ngFor="let n of [1,2,3,4,5]">
            <div class="skel-icon skeleton"></div>
            <div class="skel-body">
              <div class="skeleton" style="height:13px;width:140px;margin-bottom:6px;border-radius:4px"></div>
              <div class="skeleton" style="height:10px;width:90px;border-radius:4px"></div>
            </div>
            <div class="skeleton" style="height:18px;width:70px;border-radius:4px"></div>
          </div>
        </div>

        <!-- Grouped Transaction List -->
        <div class="txn-list" *ngIf="!loading && filteredTransactions.length > 0">
          <ng-container *ngFor="let group of groupedTransactions">
            <div class="date-header">
              <span class="date-label">{{ group.label }}</span>
              <span class="date-total" [style.color]="group.total < 0 ? 'var(--v-red)' : 'var(--v-green)'">
                {{ group.total < 0 ? '' : '+' }}{{ group.total | inr }}
              </span>
            </div>

            <div class="txn-card" *ngFor="let txn of group.transactions"
              (click)="openTxnDetail(txn)">
              <div class="txn-icon-wrap" [style.background]="getCatColor(txn.category) + '22'">
                <span class="txn-icon">{{ getCatIcon(txn.category) }}</span>
              </div>
              <div class="txn-body">
                <div class="txn-name">{{ txn.merchant || 'Transaction' }}</div>
                <div class="txn-meta">
                  <span class="cat-chip" [style.background]="getCatColor(txn.category) + '18'" [style.color]="getCatColor(txn.category)">
                    {{ getCatLabel(txn.category) }}
                  </span>
                  <span class="txn-bank">{{ txn.bank || '' }}</span>
                  <span class="txn-source">{{ txn.source }}</span>
                </div>
              </div>
              <div class="txn-right">
                <div class="txn-amount" [class.debit]="txn.type === 'debit'" [class.credit]="txn.type === 'credit'">
                  {{ txn.type === 'debit' ? '-' : '+' }}{{ txn.amount | inr }}
                </div>
                <div class="txn-time">{{ txn.date | date:'h:mm a' }}</div>
              </div>
            </div>
          </ng-container>
        </div>

        <div style="height:100px"></div>
      </div>

      <!-- Transaction Detail Sheet -->
      <div class="detail-sheet" [class.open]="!!selectedTxn" (click)="closeDetail()">
        <div class="sheet-card" (click)="$event.stopPropagation()" *ngIf="selectedTxn">
          <div class="sheet-handle"></div>

          <div class="sheet-header">
            <div class="sheet-icon" [style.background]="getCatColor(selectedTxn.category) + '22'">
              {{ getCatIcon(selectedTxn.category) }}
            </div>
            <div class="sheet-amount" [class.debit]="selectedTxn.type === 'debit'" [class.credit]="selectedTxn.type === 'credit'">
              {{ selectedTxn.type === 'debit' ? '-' : '+' }}{{ selectedTxn.amount | inr }}
            </div>
            <div class="sheet-name">{{ selectedTxn.merchant || 'Transaction' }}</div>
            <div class="sheet-date">{{ selectedTxn.date | date:'EEEE, dd MMMM yyyy · h:mm a' }}</div>
          </div>

          <div class="sheet-details">
            <div class="detail-row">
              <span class="detail-key">Category</span>
              <span class="detail-val">{{ getCatIcon(selectedTxn.category) }} {{ getCatLabel(selectedTxn.category) }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedTxn.bank">
              <span class="detail-key">Bank</span>
              <span class="detail-val">{{ selectedTxn.bank }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedTxn.accountLast4">
              <span class="detail-key">Account</span>
              <span class="detail-val">•••• {{ selectedTxn.accountLast4 }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-key">Source</span>
              <span class="detail-val source-badge">{{ selectedTxn.source }}</span>
            </div>
            <div class="detail-row" *ngIf="selectedTxn.note">
              <span class="detail-key">Note</span>
              <span class="detail-val">{{ selectedTxn.note }}</span>
            </div>
          </div>

          <!-- Edit Category -->
          <div class="edit-section" *ngIf="editMode">
            <label class="edit-label">Change Category</label>
            <div class="cat-grid">
              <button class="cat-btn" *ngFor="let cat of categories"
                [class.active]="editCategory === cat.key"
                (click)="editCategory = cat.key"
                [style.border-color]="editCategory === cat.key ? cat.color : 'transparent'"
                [style.background]="editCategory === cat.key ? cat.color + '18' : '#f9fafb'">
                <span>{{ cat.icon }}</span>
                <span class="cat-btn-name">{{ cat.shortName }}</span>
              </button>
            </div>

            <label class="edit-label" style="margin-top:14px">Note (optional)</label>
            <input type="text" [(ngModel)]="editNote" placeholder="Add a note..." class="edit-input"/>

            <div class="edit-actions">
              <button class="edit-cancel" (click)="editMode = false">Cancel</button>
              <button class="edit-save" (click)="saveEdit()">
                <ion-spinner *ngIf="saving" name="crescent" style="width:16px;height:16px;--color:white"></ion-spinner>
                <span *ngIf="!saving">Save Changes</span>
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="sheet-actions" *ngIf="!editMode">
            <button class="action-edit" (click)="startEdit()">
              <ion-icon name="create-outline"></ion-icon>
              Edit
            </button>
            <button class="action-delete" (click)="deleteTransaction()">
              <ion-spinner *ngIf="deleting" name="crescent" style="width:16px;height:16px;--color:white"></ion-spinner>
              <ion-icon *ngIf="!deleting" name="trash-outline"></ion-icon>
              <span *ngIf="!deleting">Delete</span>
            </button>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: #f3f4f6; }

    :host {
      --v-purple: #7c3aed;
      --v-purple-light: #8b5cf6;
      --v-red: #ef4444;
      --v-green: #10b981;
    }

    .txn-bg { background: #f3f4f6; min-height: 100vh; }

    /* Header */
    .page-header {
      background: linear-gradient(160deg, #7c3aed 0%, #5b21b6 100%);
      padding: 52px 20px 20px;
      border-radius: 0 0 28px 28px;
      margin-bottom: 8px;
    }
    .header-top {
      display: flex; align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }
    .header-title {
      font-family: 'Syne', sans-serif;
      font-size: 24px; font-weight: 800;
      color: white;
    }
    .add-fab {
      width: 40px; height: 40px;
      border-radius: 50%; border: none;
      background: rgba(255,255,255,0.2);
      color: white; font-size: 22px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.3);
    }

    .month-scroll {
      display: flex; gap: 8px;
      overflow-x: auto; padding-bottom: 4px;
      margin-bottom: 16px;
      &::-webkit-scrollbar { display: none; }
    }
    .month-chip {
      flex-shrink: 0;
      padding: 6px 16px;
      border-radius: 20px; border: none;
      background: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.7);
      font-family: 'DM Sans', sans-serif;
      font-size: 13px; font-weight: 500;
      cursor: pointer;
      backdrop-filter: blur(6px);
      transition: all 0.2s;
      &.active {
        background: white;
        color: #7c3aed;
        font-weight: 700;
      }
    }

    .summary-pills { display: flex; gap: 10px; }
    .pill {
      flex: 1;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(8px);
      border-radius: 14px;
      padding: 10px 8px;
      display: flex; flex-direction: column; align-items: center;
      gap: 2px; border: 1px solid rgba(255,255,255,0.2);
      ion-icon { font-size: 16px; color: white; }
      span { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; color: white; }
      small { font-size: 10px; color: rgba(255,255,255,0.6); }
      &.pill-red ion-icon { color: #fca5a5; }
      &.pill-green ion-icon { color: #6ee7b7; }
      &.pill-purple ion-icon { color: #c4b5fd; }
    }

    /* Filter Bar */
    .filter-bar {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px;
    }
    .filter-chip {
      padding: 6px 14px;
      border-radius: 20px; border: none;
      background: white; color: #6b7280;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 600;
      cursor: pointer;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      transition: all 0.2s;
      &.active { background: #7c3aed; color: white; }
    }
    .txn-count { font-size: 12px; color: #9ca3af; }

    /* Empty State */
    .empty-state {
      text-align: center; padding: 60px 24px;
      .empty-icon { font-size: 52px; margin-bottom: 16px; display: block; }
      h3 { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; color: #374151; margin-bottom: 8px; }
      p { font-size: 13px; color: #9ca3af; margin-bottom: 24px; }
    }
    .empty-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white; border: none; border-radius: 14px;
      padding: 13px 24px;
      font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
      cursor: pointer; box-shadow: 0 8px 24px rgba(109,40,217,0.3);
    }

    /* Loading */
    .loading-wrap { padding: 8px 16px; }
    .skel { display:flex; align-items:center; gap:12px; padding:14px 16px; background:white; border-radius:16px; margin-bottom:8px; }
    .skel-icon { width:44px; height:44px; border-radius:12px; flex-shrink:0; }
    .skel-body { flex:1; }
    .skeleton {
      background: linear-gradient(90deg, #f3f4f6 25%, #e9eaec 50%, #f3f4f6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    /* Transactions */
    .txn-list { padding: 0 16px; }
    .date-header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 10px 4px 6px;
    }
    .date-label { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.8px; }
    .date-total { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700; }

    .txn-card {
      background: white;
      border-radius: 16px;
      padding: 14px;
      margin-bottom: 8px;
      display: flex; align-items: center; gap: 12px;
      cursor: pointer;
      box-shadow: 0 1px 8px rgba(0,0,0,0.06);
      transition: transform 0.15s, box-shadow 0.15s;
      &:active { transform: scale(0.98); box-shadow: 0 2px 16px rgba(0,0,0,0.1); }
    }
    .txn-icon-wrap {
      width: 44px; height: 44px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 20px;
    }
    .txn-body { flex: 1; min-width: 0; }
    .txn-name { font-weight: 600; font-size: 14px; color: #111827; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .txn-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .cat-chip {
      padding: 2px 8px; border-radius: 20px;
      font-size: 10px; font-weight: 700;
    }
    .txn-bank, .txn-source { font-size: 11px; color: #9ca3af; }
    .txn-right { text-align: right; flex-shrink: 0; }
    .txn-amount {
      font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
      &.debit { color: #ef4444; }
      &.credit { color: #10b981; }
    }
    .txn-time { font-size: 10px; color: #9ca3af; margin-top: 2px; }

    /* Detail Sheet */
    .detail-sheet {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0);
      z-index: 100;
      pointer-events: none;
      transition: background 0.3s;
      display: flex; align-items: flex-end;
      &.open {
        background: rgba(0,0,0,0.4);
        pointer-events: all;
      }
    }
    .sheet-card {
      width: 100%; max-width: 480px; margin: 0 auto;
      background: white;
      border-radius: 28px 28px 0 0;
      padding: 16px 24px 40px;
      transform: translateY(100%);
      transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
      max-height: 90vh; overflow-y: auto;
    }
    .detail-sheet.open .sheet-card { transform: translateY(0); }
    .sheet-handle { width: 40px; height: 4px; border-radius: 2px; background: #e5e7eb; margin: 0 auto 20px; }

    .sheet-header { text-align: center; margin-bottom: 24px; }
    .sheet-icon {
      width: 64px; height: 64px; border-radius: 20px;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; margin: 0 auto 12px;
    }
    .sheet-amount {
      font-family: 'Syne', sans-serif; font-size: 30px; font-weight: 800;
      margin-bottom: 4px;
      &.debit { color: #ef4444; }
      &.credit { color: #10b981; }
    }
    .sheet-name { font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; }
    .sheet-date { font-size: 12px; color: #9ca3af; }

    .sheet-details {
      background: #f9fafb; border-radius: 16px;
      padding: 4px 16px; margin-bottom: 20px;
    }
    .detail-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0; border-bottom: 1px solid #f3f4f6;
      &:last-child { border-bottom: none; }
    }
    .detail-key { font-size: 13px; color: #9ca3af; }
    .detail-val { font-size: 13px; font-weight: 600; color: #111827; }
    .source-badge {
      background: #ede9fe; color: #7c3aed;
      padding: 2px 10px; border-radius: 20px;
      font-size: 11px; font-weight: 700; text-transform: capitalize;
    }

    /* Edit Section */
    .edit-section { margin-top: 16px; }
    .edit-label { display: block; font-size: 12px; font-weight: 600; color: #6b7280; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
    .cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .cat-btn {
      border: 2px solid transparent;
      border-radius: 12px; padding: 10px 6px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      cursor: pointer; transition: all 0.2s;
      span:first-child { font-size: 20px; }
      &.active { }
    }
    .cat-btn-name { font-size: 10px; font-weight: 600; color: #374151; }
    .edit-input {
      width: 100%;
      background: #f9fafb; border: 1.5px solid #e5e7eb;
      border-radius: 12px; padding: 11px 14px;
      color: #111827; font-family: 'DM Sans', sans-serif; font-size: 14px;
      outline: none; margin-bottom: 16px;
      &:focus { border-color: #7c3aed; }
    }
    .edit-actions { display: flex; gap: 10px; }
    .edit-cancel {
      flex: 1; padding: 13px; border-radius: 14px; border: 1.5px solid #e5e7eb;
      background: white; color: #6b7280;
      font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
    }
    .edit-save {
      flex: 2; padding: 13px; border-radius: 14px; border: none;
      background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white;
      font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
      display: flex; align-items: center; justify-content: center; gap: 6px;
    }

    .sheet-actions { display: flex; gap: 10px; margin-top: 8px; }
    .action-edit {
      flex: 1; padding: 14px; border-radius: 14px;
      border: 1.5px solid #e5e7eb; background: white; color: #374151;
      font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer; ion-icon { font-size: 18px; color: #7c3aed; }
    }
    .action-delete {
      flex: 1; padding: 14px; border-radius: 14px;
      border: none; background: linear-gradient(135deg, #ef4444, #dc2626); color: white;
      font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer; ion-icon { font-size: 18px; }
    }
  `]
})
export class TransactionListPage implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  selectedMonth = format(new Date(), 'yyyy-MM');
  recentMonths: { key: string; label: string }[] = [];
  activeFilter: 'all' | 'debit' | 'credit' = 'all';
  selectedTxn: Transaction | null = null;
  editMode = false;
  editCategory: CategoryKey = 'uncategorized';
  editNote = '';
  loading = true;
  saving = false;
  deleting = false;
  private sub?: Subscription;

  readonly categories = [
    { key: 'fixed_costs' as CategoryKey, icon: '🏦', shortName: 'Fixed', color: '#f5c842' },
    { key: 'food_household' as CategoryKey, icon: '🛒', shortName: 'Food', color: '#60a5fa' },
    { key: 'savings' as CategoryKey, icon: '💰', shortName: 'Savings', color: '#10b981' },
    { key: 'self_investment' as CategoryKey, icon: '🌿', shortName: 'Growth', color: '#a78bfa' },
    { key: 'fun_family' as CategoryKey, icon: '🎉', shortName: 'Fun', color: '#fb923c' },
    { key: 'giving_misc' as CategoryKey, icon: '💖', shortName: 'Giving', color: '#f472b6' },
    { key: 'uncategorized' as CategoryKey, icon: '❓', shortName: 'Other', color: '#9ca3af' },
  ];

  constructor(
    private budgetService: BudgetService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  get filteredTransactions(): Transaction[] {
    if (this.activeFilter === 'all') return this.transactions;
    return this.transactions.filter(t => t.type === this.activeFilter);
  }

  get totalExpense(): number {
    return this.transactions.filter(t => t.type === 'debit').reduce((a, t) => a + t.amount, 0);
  }
  get totalIncome(): number {
    return this.transactions.filter(t => t.type === 'credit').reduce((a, t) => a + t.amount, 0);
  }

  get groupedTransactions(): GroupedTransactions[] {
    const map = new Map<string, Transaction[]>();
    for (const txn of this.filteredTransactions) {
      const key = format(new Date(txn.date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(txn);
    }
    const groups: GroupedTransactions[] = [];
    map.forEach((txns, dateKey) => {
      const date = new Date(dateKey);
      const today = new Date(); today.setHours(0,0,0,0);
      const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      let label: string;
      if (date.toDateString() === today.toDateString()) label = 'Today';
      else if (date.toDateString() === yesterday.toDateString()) label = 'Yesterday';
      else label = format(date, 'EEEE, dd MMM');
      const total = txns.reduce((a, t) => t.type === 'debit' ? a - t.amount : a + t.amount, 0);
      groups.push({ date: dateKey, label, transactions: txns, total });
    });
    return groups.sort((a, b) => b.date.localeCompare(a.date));
  }

  ngOnInit() {
    this.buildMonths();
    this.loadTransactions();
  }

  buildMonths() {
    const months = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      months.push({
        key: format(d, 'yyyy-MM'),
        label: format(d, i === 0 ? "'This Month'" : 'MMM yyyy')
      });
    }
    this.recentMonths = months;
  }

  selectMonth(month: string) {
    this.selectedMonth = month;
    this.loadTransactions();
  }

  setFilter(f: 'all' | 'debit' | 'credit') { this.activeFilter = f; }

  loadTransactions() {
    this.loading = true;
    this.sub?.unsubscribe();
    this.sub = this.budgetService.watchTransactions(this.selectedMonth).subscribe(txns => {
      this.transactions = txns;
      this.loading = false;
    });
  }

  getCatIcon(key: CategoryKey): string {
    return this.categories.find(c => c.key === key)?.icon ?? '❓';
  }
  getCatColor(key: CategoryKey): string {
    return this.categories.find(c => c.key === key)?.color ?? '#9ca3af';
  }
  getCatLabel(key: CategoryKey): string {
    return this.categories.find(c => c.key === key)?.shortName ?? 'Other';
  }

  openTxnDetail(txn: Transaction) {
    this.selectedTxn = txn;
    this.editMode = false;
  }
  closeDetail() {
    this.selectedTxn = null;
    this.editMode = false;
  }

  startEdit() {
    if (!this.selectedTxn) return;
    this.editCategory = this.selectedTxn.category;
    this.editNote = this.selectedTxn.note || '';
    this.editMode = true;
  }

  async saveEdit() {
    if (!this.selectedTxn?.id) return;
    this.saving = true;
    try {
      // Update via delete + re-add to maintain category spend totals
      await this.budgetService.deleteTransaction(this.selectedTxn.id, this.selectedTxn);
      await this.budgetService.addTransaction({
        ...this.selectedTxn,
        category: this.editCategory,
        note: this.editNote,
      });
      this.showToast('Transaction updated ✓');
      this.closeDetail();
    } finally {
      this.saving = false;
    }
  }

  async deleteTransaction() {
    if (!this.selectedTxn?.id) return;
    const alert = await this.alertCtrl.create({
      header: 'Delete Transaction',
      message: `Remove ${this.selectedTxn.merchant || 'this transaction'}?`,
      cssClass: 'v-alert',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            this.deleting = true;
            await this.budgetService.deleteTransaction(this.selectedTxn!.id!, this.selectedTxn!);
            this.showToast('Transaction deleted');
            this.closeDetail();
            this.deleting = false;
          }
        }
      ]
    });
    await alert.present();
  }

  private async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, position: 'bottom', color: 'success' });
    await t.present();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}