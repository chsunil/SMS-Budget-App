// ─── src/app/features/budget/budget-categories.page.ts ─
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BudgetService } from '../../core/services/budget.service';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { format } from 'date-fns';
import {
  CategoryBudget, SubcategoryBudget, MonthlyBudget,
  CategoryKey, Transaction, DEFAULT_BUDGET_CATEGORIES, AVOID_LIST
} from '../../core/models';

interface EditingSubcat {
  catKey: CategoryKey;
  index: number;
  sub: SubcategoryBudget;
}

@Component({
  selector: 'app-budget-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule, InrPipe],
  template: `
    <ion-content [fullscreen]="true">
      <div class="bc-wrap">

        <!-- ── Header ── -->
        <div class="bc-header">
          <div class="header-row">
            <div>
              <h1 class="page-title">Budget</h1>
              <p class="page-sub">{{ currentMonthLabel }} · ₹{{ budget?.income | number }} income</p>
            </div>
            <div class="header-actions">
              <button class="icon-btn" (click)="showIncomeEditor = true">
                <ion-icon name="pencil-outline"></ion-icon>
              </button>
              <button class="icon-btn" (click)="showAddCategory = true">
                <ion-icon name="add-outline"></ion-icon>
              </button>
            </div>
          </div>

          <!-- Summary pills -->
          <div class="summary-pills" *ngIf="budget">
            <div class="pill pill-green">
              <span class="pill-label">Income</span>
              <span class="pill-val">{{ budget.income | inr:true }}</span>
            </div>
            <div class="pill pill-red">
              <span class="pill-label">Spent</span>
              <span class="pill-val">{{ budget.totalSpent | inr:true }}</span>
            </div>
            <div class="pill" [class.pill-green]="remaining >= 0" [class.pill-red]="remaining < 0">
              <span class="pill-label">Left</span>
              <span class="pill-val">{{ remaining | inr:true }}</span>
            </div>
            <div class="pill pill-purple">
              <span class="pill-label">Saved</span>
              <span class="pill-val">{{ savingsRate }}%</span>
            </div>
          </div>
        </div>

        <!-- ── Month nav ── -->
        <div class="month-nav">
          <button class="nav-btn" (click)="prevMonth()">
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>
          <span class="month-label">{{ currentMonthLabel }}</span>
          <button class="nav-btn" (click)="nextMonth()" [disabled]="isCurrentMonth">
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </div>

        <!-- ── Loading ── -->
        <div class="skel-wrap" *ngIf="loading">
          <div class="skel-card" *ngFor="let n of [1,2,3,4]">
            <div class="skeleton" style="height:18px;width:140px;border-radius:6px;margin-bottom:10px"></div>
            <div class="skeleton" style="height:12px;width:80px;border-radius:4px;margin-bottom:14px"></div>
            <div class="skeleton" style="height:6px;border-radius:10px"></div>
          </div>
        </div>

        <!-- ── Empty state (auth/firestore issue) ── -->
        <div class="empty-budget" *ngIf="!loading && !budget">
          <div class="empty-icon">📊</div>
          <h3>No budget found</h3>
          <p>Your budget for {{ currentMonthLabel }} hasn't been set up yet.</p>
          <button class="create-btn" (click)="createBudget()">
            <ion-icon name="add-circle-outline"></ion-icon>
            Create {{ currentMonthLabel }} Budget
          </button>
          <p class="empty-hint">If this keeps failing, check you are signed in and Firestore rules allow writes to users/uid/budgets</p>
        </div>

        <!-- ── Category Cards ── -->
        <ng-container *ngIf="!loading && budget">

          <!-- Overall progress bar -->
          <div class="overall-bar">
            <div class="ob-labels">
              <span class="ob-left">Total Spent</span>
              <span class="ob-right">{{ spentPct }}% of income</span>
            </div>
            <div class="ob-track">
              <div class="ob-fill" [style.width]="spentPct + '%'" [style.background]="spentPct > 90 ? '#ef4444' : spentPct > 70 ? '#f59e0b' : '#10b981'"></div>
            </div>
            <div class="ob-amounts">
              <span>{{ budget.totalSpent | inr }}</span>
              <span class="muted-text">/ {{ budget.income | inr }}</span>
            </div>
          </div>

          <!-- Category cards -->
          <div class="cat-card"
            *ngFor="let cat of budget.categories; let ci = index"
            [class.expanded]="expandedCat === cat.key">

            <!-- Card header -->
            <div class="cat-header" (click)="toggleCat(cat.key)">
              <div class="cat-icon-wrap" [style.background]="cat.colorDim">
                <span class="cat-icon">{{ cat.icon }}</span>
              </div>
              <div class="cat-title-area">
                <div class="cat-name">{{ cat.name }}</div>
                <div class="cat-meta">
                  <span class="cat-pct-badge" [style.background]="cat.colorDim" [style.color]="cat.color">{{ cat.percentage }}%</span>
                  <span class="muted-text" style="font-size:11px">{{ cat.subcategories.length }} items</span>
                </div>
              </div>
              <div class="cat-amounts-col">
                <div class="cat-spent" [style.color]="getCatSpentColor(cat)">{{ cat.spent | inr }}</div>
                <div class="cat-limit muted-text">of {{ cat.limit | inr }}</div>
              </div>
              <div class="cat-actions-row">
                <button class="cat-action-btn" (click)="startEditCat(cat, $event)">
                  <ion-icon name="pencil-outline"></ion-icon>
                </button>
                <button class="cat-action-btn danger" (click)="confirmDeleteCat(cat, $event)">
                  <ion-icon name="trash-outline"></ion-icon>
                </button>
                <div class="chevron-icon" [class.rotated]="expandedCat === cat.key">
                  <ion-icon name="chevron-down-outline"></ion-icon>
                </div>
              </div>
            </div>

            <!-- Progress bar -->
            <div class="cat-prog-wrap">
              <div class="cat-prog-track">
                <div class="cat-prog-fill"
                  [style.width]="getCatPct(cat) + '%'"
                  [style.background]="cat.color"
                  [style.opacity]="getCatPct(cat) > 90 ? 1 : 0.85">
                </div>
              </div>
              <div class="cat-prog-label">
                <span [style.color]="getCatSpentColor(cat)">{{ getCatPct(cat) + "% used" }}</span>
                <span class="muted-text">{{ getRemainingLabel(cat) }} left</span>
              </div>
            </div>

            <!-- Subcategory list (expanded) -->
            <div class="subcat-list" [class.open]="expandedCat === cat.key">
              <div class="subcat-divider"></div>

              <div class="subcat-row" *ngFor="let sub of cat.subcategories; let si = index">
                <div class="sub-dot" [style.background]="cat.color"></div>
                <div class="sub-info">
                  <div class="sub-name">{{ sub.name }}</div>
                  <div class="sub-note muted-text" *ngIf="sub.note">{{ sub.note }}</div>
                  <!-- Sub progress -->
                  <div class="sub-prog-track" *ngIf="sub.limit > 0">
                    <div class="sub-prog-fill"
                      [style.width]="getSubPct(sub) + '%'"
                      [style.background]="cat.color">
                    </div>
                  </div>
                </div>
                <div class="sub-amounts">
                  <div class="sub-spent" [style.color]="cat.color">{{ sub.spent | inr }}</div>
                  <div class="sub-limit muted-text">/ {{ sub.limit | inr }}</div>
                </div>
                <div class="sub-actions">
                  <button class="sub-action-btn" (click)="startEditSub(cat, si, sub)">
                    <ion-icon name="pencil-outline"></ion-icon>
                  </button>
                  <button class="sub-action-btn danger" (click)="confirmDeleteSub(cat, si)">
                    <ion-icon name="trash-outline"></ion-icon>
                  </button>
                </div>
              </div>

              <!-- Add subcategory button -->
              <button class="add-sub-btn" (click)="startAddSub(cat)">
                <ion-icon name="add-circle-outline"></ion-icon>
                Add subcategory
              </button>
            </div>
          </div>

          <!-- ── Avoid List ── -->
          <div class="avoid-section">
            <div class="section-label">
              <ion-icon name="ban-outline"></ion-icon>
              Avoid List — Zero Spend
            </div>
            <div class="avoid-grid">
              <div class="avoid-chip" *ngFor="let item of avoidList; let ai = index">
                <span class="avoid-emoji">{{ item.emoji }}</span>
                <span class="avoid-name">{{ item.name }}</span>
                <button class="avoid-del" (click)="removeAvoidItem(ai)">
                  <ion-icon name="close-outline"></ion-icon>
                </button>
              </div>
              <button class="avoid-add" (click)="showAddAvoid = true">
                <ion-icon name="add-outline"></ion-icon>
                Add
              </button>
            </div>
          </div>

          <!-- ── Recent Transactions mapped to categories ── -->
          <div class="txn-section" *ngIf="recentTxns.length > 0">
            <div class="section-label">
              <ion-icon name="swap-vertical-outline"></ion-icon>
              Recent Transactions
            </div>
            <div class="txn-row" *ngFor="let txn of recentTxns">
              <div class="txn-cat-dot" [style.background]="getCatColor(txn.category)"></div>
              <div class="txn-info">
                <div class="txn-merchant">{{ txn.merchant || 'Transaction' }}</div>
                <div class="txn-meta muted-text">
                  {{ getCatName(txn.category) }}
                  <span *ngIf="txn.subcategory"> · {{ txn.subcategory }}</span>
                  · {{ txn.date | date:'dd MMM' }}
                </div>
              </div>
              <div class="txn-amount" [style.color]="txn.type === 'debit' ? '#ef4444' : '#10b981'">
                {{ txn.type === 'debit' ? '−' : '+' }}{{ txn.amount | inr }}
              </div>
            </div>
          </div>

        </ng-container>

        <div style="height:100px"></div>
      </div>

      <!-- ══════════════════════════════════════════
           MODALS
      ══════════════════════════════════════════ -->

      <!-- ── Edit Income ── -->
      <div class="modal-overlay" [class.open]="showIncomeEditor" (click)="showIncomeEditor = false">
        <div class="modal-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>
          <div class="modal-title">Edit Monthly Income</div>
          <div class="field-label">Monthly Income (₹)</div>
          <input type="number" [(ngModel)]="editIncome" class="modal-input" placeholder="88500"/>
          <div class="modal-note">Updating income will recalculate all category limits proportionally.</div>
          <div class="modal-actions">
            <button class="modal-btn cancel" (click)="showIncomeEditor = false">Cancel</button>
            <button class="modal-btn save" (click)="saveIncome()">Save</button>
          </div>
        </div>
      </div>

      <!-- ── Add Category ── -->
      <div class="modal-overlay" [class.open]="showAddCategory" (click)="showAddCategory = false">
        <div class="modal-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>
          <div class="modal-title">Add Category</div>
          <div class="field-label">Icon (emoji)</div>
          <input type="text" [(ngModel)]="newCat.icon" class="modal-input" placeholder="💡" maxlength="2"/>
          <div class="field-label">Name</div>
          <input type="text" [(ngModel)]="newCat.name" class="modal-input" placeholder="Education"/>
          <div class="field-label">Budget %</div>
          <input type="number" [(ngModel)]="newCat.percentage" class="modal-input" placeholder="5"/>
          <div class="field-label">Color</div>
          <div class="color-picker-row">
            <div class="color-chip" *ngFor="let c of colorOptions"
              [class.selected]="newCat.color === c"
              [style.background]="c"
              (click)="newCat.color = c">
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn cancel" (click)="showAddCategory = false">Cancel</button>
            <button class="modal-btn save" (click)="addCategory()">Add</button>
          </div>
        </div>
      </div>

      <!-- ── Edit Category ── -->
      <div class="modal-overlay" [class.open]="!!editingCat" (click)="editingCat = null">
        <div class="modal-sheet" (click)="$event.stopPropagation()" *ngIf="editingCat">
          <div class="sheet-handle"></div>
          <div class="modal-title">Edit Category</div>
          <div class="field-label">Icon</div>
          <input type="text" [(ngModel)]="editingCat.icon" class="modal-input" maxlength="2"/>
          <div class="field-label">Name</div>
          <input type="text" [(ngModel)]="editingCat.name" class="modal-input"/>
          <div class="field-label">Budget %</div>
          <input type="number" [(ngModel)]="editingCat.percentage" class="modal-input"/>
          <div class="field-label">Budget Limit (₹)</div>
          <input type="number" [(ngModel)]="editingCat.limit" class="modal-input"/>
          <div class="field-label">Color</div>
          <div class="color-picker-row">
            <div class="color-chip" *ngFor="let c of colorOptions"
              [class.selected]="editingCat.color === c"
              [style.background]="c"
              (click)="setEditCatColor(c)">
            </div>
          </div>
          <div class="modal-actions">
            <button class="modal-btn cancel" (click)="editingCat = null">Cancel</button>
            <button class="modal-btn save" (click)="saveEditCat()">Save</button>
          </div>
        </div>
      </div>

      <!-- ── Add / Edit Subcategory ── -->
      <div class="modal-overlay" [class.open]="!!editingSub || showAddSub" (click)="closeSub()">
        <div class="modal-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>
          <div class="modal-title">{{ editingSub ? 'Edit' : 'Add' }} Subcategory</div>
          <div class="field-label">Name (include emoji)</div>
          <input type="text" [(ngModel)]="subForm.name" class="modal-input" placeholder="🎓 Education"/>
          <div class="field-label">Budget Limit (₹)</div>
          <input type="number" [(ngModel)]="subForm.limit" class="modal-input" placeholder="0"/>
          <div class="field-label">Note (optional)</div>
          <input type="text" [(ngModel)]="subForm.note" class="modal-input" placeholder="Short description"/>
          <div class="modal-actions">
            <button class="modal-btn cancel" (click)="closeSub()">Cancel</button>
            <button class="modal-btn save" (click)="saveSub()">Save</button>
          </div>
        </div>
      </div>

      <!-- ── Add Avoid item ── -->
      <div class="modal-overlay" [class.open]="showAddAvoid" (click)="showAddAvoid = false">
        <div class="modal-sheet" (click)="$event.stopPropagation()">
          <div class="sheet-handle"></div>
          <div class="modal-title">Add to Avoid List</div>
          <div class="field-label">Emoji</div>
          <input type="text" [(ngModel)]="newAvoid.emoji" class="modal-input" placeholder="🚬" maxlength="2"/>
          <div class="field-label">Name</div>
          <input type="text" [(ngModel)]="newAvoid.name" class="modal-input" placeholder="Smoking"/>
          <div class="modal-actions">
            <button class="modal-btn cancel" (click)="showAddAvoid = false">Cancel</button>
            <button class="modal-btn save" (click)="addAvoidItem()">Add</button>
          </div>
        </div>
      </div>

    </ion-content>
  `,
  styles: []
})
export class BudgetCategoriesPage implements OnInit, OnDestroy {
  budget: MonthlyBudget | null = null;
  recentTxns: Transaction[] = [];
  loading = false;
  expandedCat: CategoryKey | null = null;
  currentMonth = format(new Date(), 'yyyy-MM');
  avoidList = [...AVOID_LIST];

  // Modal states
  showIncomeEditor = false;
  showAddCategory = false;
  showAddSub = false;
  showAddAvoid = false;
  editingCat: CategoryBudget | null = null;
  editingSub: EditingSubcat | null = null;
  addingSubForCat: CategoryKey | null = null;

  // Form models
  editIncome = 88500;
  newCat = { icon: '', name: '', percentage: 5, color: '#7c3aed' };
  subForm: SubcategoryBudget = { name: '', limit: 0, spent: 0, note: '' };
  newAvoid = { emoji: '', name: '', key: '' };

  readonly colorOptions = [
    '#f5c842', '#fb923c', '#ef4444', '#ec4899', '#a78bfa',
    '#7c3aed', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981',
    '#84cc16', '#f97316', '#6366f1', '#8b5cf6', '#d946ef'
  ];

  private sub?: Subscription;
  private txnSub?: Subscription;

  constructor(
    private budgetService: BudgetService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) { }

  get currentMonthLabel(): string {
    const [y, m] = this.currentMonth.split('-');
    return format(new Date(+y, +m - 1, 1), 'MMMM yyyy');
  }

  get isCurrentMonth(): boolean { return this.currentMonth === format(new Date(), 'yyyy-MM'); }

  get remaining(): number {
    if (!this.budget) return 0;
    return this.budget.income - this.budget.totalSpent;
  }

  get savingsRate(): number {
    if (!this.budget || !this.budget.income) return 0;
    return Math.max(0, Math.round((this.remaining / this.budget.income) * 100));
  }

  get spentPct(): number {
    if (!this.budget || !this.budget.income) return 0;
    return Math.min(100, Math.round((this.budget.totalSpent / this.budget.income) * 100));
  }

  ngOnInit() { this.loadData(); }

  loadData() {
    this.loading = true;
    this.sub?.unsubscribe();
    this.txnSub?.unsubscribe();

    this.sub = this.budgetService.watchBudget(this.currentMonth).subscribe({
      next: async b => {
        if (!b) {
          // No budget doc yet — create default one, watchBudget will re-emit with it
          try {
            await this.budgetService.getOrCreateBudget(this.currentMonth);
          } catch (err) {
            console.error('[Budget] getOrCreateBudget failed:', err);
            this.loading = false; // stop spinner even on error
          }
        } else {
          this.budget = b;
          this.editIncome = b.income;
          this.loading = false;
        }
      },
      error: err => {
        console.error('[Budget] watchBudget error:', err);
        this.loading = false;
      }
    });

    this.txnSub = this.budgetService.watchTransactions(this.currentMonth).subscribe(txns => {
      this.recentTxns = txns.slice(0, 15);
    });
  }

  async createBudget() {
    this.loading = true;
    try {
      await this.budgetService.getOrCreateBudget(this.currentMonth);
      // watchBudget subscription will pick up the new doc automatically
    } catch (err: any) {
      console.error('[Budget] create failed:', err);
      this.loading = false;
      const msg = err?.message?.includes('authenticated')
        ? 'Please sign in first.'
        : err?.message?.includes('permission')
          ? 'Firestore permission denied. Update your security rules.'
          : 'Failed to create budget. Check console for details.';
      const alert = await this.alertCtrl.create({
        header: 'Could not create budget',
        message: msg,
        buttons: ['OK']
      });
      await alert.present();
    }
  }

  // ── Helpers ───────────────────────────────────
  getCatPct(cat: CategoryBudget): number {
    if (!cat.limit) return 0;
    return Math.min(100, Math.round((cat.spent / cat.limit) * 100));
  }

  getCatSpentColor(cat: CategoryBudget): string {
    const pct = this.getCatPct(cat);
    if (pct >= 100) return '#ef4444';
    if (pct >= 80) return '#f59e0b';
    return cat.color;
  }

  getRemainingLabel(cat: CategoryBudget): string {
    const r = cat.limit - cat.spent;
    if (r < 0) return `₹${Math.abs(r).toLocaleString('en-IN')} over`;
    return `₹${r.toLocaleString('en-IN')}`;
  }

  getSubPct(sub: SubcategoryBudget): number {
    if (!sub.limit) return 0;
    return Math.min(100, Math.round((sub.spent / sub.limit) * 100));
  }

  getCatColor(key: CategoryKey): string {
    return this.budget?.categories.find(c => c.key === key)?.color ?? '#94a3b8';
  }

  getCatName(key: CategoryKey): string {
    return this.budget?.categories.find(c => c.key === key)?.name ?? key;
  }

  toggleCat(key: CategoryKey) {
    this.expandedCat = this.expandedCat === key ? null : key;
  }

  prevMonth() {
    const d = new Date(this.currentMonth + '-01');
    d.setMonth(d.getMonth() - 1);
    this.currentMonth = format(d, 'yyyy-MM');
    this.loadData();
  }

  nextMonth() {
    if (this.isCurrentMonth) return;
    const d = new Date(this.currentMonth + '-01');
    d.setMonth(d.getMonth() + 1);
    this.currentMonth = format(d, 'yyyy-MM');
    this.loadData();
  }

  // ── Income editor ─────────────────────────────
  async saveIncome() {
    if (!this.budget || !this.editIncome) return;
    const newIncome = +this.editIncome;
    const ratio = newIncome / this.budget.income;

    // Recalculate limits proportionally
    const updatedCategories = this.budget.categories.map(cat => ({
      ...cat,
      limit: Math.round(cat.limit * ratio),
      subcategories: cat.subcategories.map(s => ({ ...s, limit: Math.round(s.limit * ratio) }))
    }));

    await this.saveBudget({ income: newIncome, categories: updatedCategories });
    this.showIncomeEditor = false;
    this.toast('Income updated ✓');
  }

  // ── Category CRUD ─────────────────────────────
  async addCategory() {
    if (!this.budget || !this.newCat.name || !this.newCat.icon) return;

    const key = (this.newCat.name.toLowerCase().replace(/\s+/g, '_').substring(0, 20)) as CategoryKey;
    const limit = Math.round(this.budget.income * this.newCat.percentage / 100);
    const hex = this.newCat.color;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);

    const newCat: CategoryBudget = {
      key,
      name: this.newCat.name,
      icon: this.newCat.icon,
      color: hex,
      colorDim: `rgba(${r},${g},${b},0.12)`,
      percentage: +this.newCat.percentage,
      limit,
      spent: 0,
      subcategories: []
    };

    const updatedCategories = [...this.budget.categories, newCat];
    await this.saveBudget({ categories: updatedCategories });
    this.showAddCategory = false;
    this.newCat = { icon: '', name: '', percentage: 5, color: '#7c3aed' };
    this.toast('Category added ✓');
  }

  startEditCat(cat: CategoryBudget, event: Event) {
    event.stopPropagation();
    this.editingCat = { ...cat, subcategories: [...cat.subcategories] };
  }

  setEditCatColor(c: string) {
    if (!this.editingCat) return;
    const r = parseInt(c.slice(1, 3), 16), g = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
    this.editingCat = { ...this.editingCat, color: c, colorDim: `rgba(${r},${g},${b},0.12)` };
  }

  async saveEditCat() {
    if (!this.budget || !this.editingCat) return;
    const updatedCategories = this.budget.categories.map(c =>
      c.key === this.editingCat!.key ? { ...this.editingCat! } : c
    );
    await this.saveBudget({ categories: updatedCategories });
    this.editingCat = null;
    this.toast('Category saved ✓');
  }

  async confirmDeleteCat(cat: CategoryBudget, event: Event) {
    event.stopPropagation();
    const alert = await this.alertCtrl.create({
      header: 'Delete Category?',
      message: `Remove "${cat.name}"? Existing transactions won't be deleted.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            if (!this.budget) return;
            const updatedCategories = this.budget.categories.filter(c => c.key !== cat.key);
            await this.saveBudget({ categories: updatedCategories });
            this.toast('Category deleted');
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Subcategory CRUD ──────────────────────────
  startAddSub(cat: CategoryBudget) {
    this.addingSubForCat = cat.key;
    this.editingSub = null;
    this.subForm = { name: '', limit: 0, spent: 0, note: '' };
    this.showAddSub = true;
  }

  startEditSub(cat: CategoryBudget, index: number, sub: SubcategoryBudget) {
    this.editingSub = { catKey: cat.key, index, sub };
    this.addingSubForCat = null;
    this.subForm = { ...sub };
    this.showAddSub = false;
  }

  closeSub() {
    this.editingSub = null;
    this.showAddSub = false;
    this.addingSubForCat = null;
  }

  async saveSub() {
    if (!this.budget || !this.subForm.name) return;

    const updatedCategories = this.budget.categories.map(cat => {
      if (this.editingSub && cat.key === this.editingSub.catKey) {
        const subs = [...cat.subcategories];
        subs[this.editingSub.index] = { ...this.subForm };
        return { ...cat, subcategories: subs };
      }
      if (!this.editingSub && cat.key === this.addingSubForCat) {
        return { ...cat, subcategories: [...cat.subcategories, { ...this.subForm, spent: 0 }] };
      }
      return cat;
    });

    await this.saveBudget({ categories: updatedCategories });
    this.closeSub();
    this.toast('Subcategory saved ✓');
  }

  async confirmDeleteSub(cat: CategoryBudget, index: number) {
    const alert = await this.alertCtrl.create({
      header: 'Delete Subcategory?',
      message: `Remove "${cat.subcategories[index].name}"?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete', role: 'destructive',
          handler: async () => {
            if (!this.budget) return;
            const updatedCategories = this.budget.categories.map(c => {
              if (c.key !== cat.key) return c;
              const subs = c.subcategories.filter((_, i) => i !== index);
              return { ...c, subcategories: subs };
            });
            await this.saveBudget({ categories: updatedCategories });
            this.toast('Subcategory deleted');
          }
        }
      ]
    });
    await alert.present();
  }

  // ── Avoid list ────────────────────────────────
  addAvoidItem() {
    if (!this.newAvoid.emoji || !this.newAvoid.name) return;
    this.avoidList = [...this.avoidList, {
      emoji: this.newAvoid.emoji,
      name: this.newAvoid.name,
      key: this.newAvoid.name.toLowerCase().replace(/\s+/g, '_')
    }];
    this.newAvoid = { emoji: '', name: '', key: '' };
    this.showAddAvoid = false;
    this.toast('Added to avoid list');
  }

  removeAvoidItem(index: number) {
    this.avoidList = this.avoidList.filter((_, i) => i !== index);
  }

  // ── Save helper ───────────────────────────────
  private async saveBudget(patch: Partial<MonthlyBudget>) {
    if (!this.budget) return;
    const uid = this.budget.userId;
    // Use BudgetService to patch Firestore
    await this.budgetService.patchBudget(this.currentMonth, patch);
  }

  private async toast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000, position: 'bottom', color: 'success' });
    await t.present();
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.txnSub?.unsubscribe();
  }
}