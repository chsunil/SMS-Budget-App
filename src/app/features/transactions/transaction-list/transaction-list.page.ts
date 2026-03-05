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
  styles: []
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
  ) { }

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
      const today = new Date(); today.setHours(0, 0, 0, 0);
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