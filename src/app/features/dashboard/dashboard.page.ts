// ─── src/app/features/dashboard/dashboard.page.ts ───
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BudgetService } from '../../core/services/budget.service';
import { AuthService } from '../../core/services/auth.service';
import { MonthlyBudget, CategoryBudget, AVOID_LIST } from '../../core/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { format, subMonths, addMonths } from 'date-fns';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, InrPipe],
  template: `
    <ion-content [fullscreen]="true">

      <!-- ── VIOLET HEADER ── -->
      <div class="v-header">
        <div class="vh-top">
          <div>
            <h1 class="vh-title">Budget Planner</h1>
            <p class="vh-sub">{{ currentMonthLabel }} · Monthly Plan</p>
          </div>
          <div class="dash-avatar">{{ userInitials }}</div>
        </div>

        <!-- Month nav -->
        <div class="month-nav" style="padding:0 0 14px">
          <button class="mnav" (click)="prevMonth()">
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>
          <span class="month-display">{{ currentMonthLabel }}</span>
          <button class="mnav" (click)="nextMonth()" [disabled]="isCurrentMonth">
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </div>

        <!-- Summary pills -->
        <div class="summary-pills" *ngIf="budget">
          <div class="s-pill">
            <ion-icon name="cash-outline"></ion-icon>
            <span class="sp-val">{{ needsTotal | inr:true }}</span>
            <span class="sp-lbl">Needs</span>
          </div>
          <div class="s-pill green">
            <ion-icon name="trending-up-outline"></ion-icon>
            <span class="sp-val">{{ savingsTotal | inr:true }}</span>
            <span class="sp-lbl">Savings</span>
          </div>
          <div class="s-pill purple">
            <ion-icon name="heart-outline"></ion-icon>
            <span class="sp-val">{{ wantsTotal | inr:true }}</span>
            <span class="sp-lbl">Wants</span>
          </div>
        </div>
        <!-- Pill skeletons while loading -->
        <div class="summary-pills" *ngIf="!budget">
          <div class="s-pill" *ngFor="let n of [1,2,3]">
            <div class="skeleton-dark" style="height:10px;width:50px;border-radius:4px"></div>
            <div class="skeleton-dark" style="height:13px;width:40px;border-radius:4px;margin-top:3px"></div>
          </div>
        </div>
      </div>

      <div class="page-wrap">

        <!-- Income card -->
        <div class="dash-income-card animate-up" *ngIf="budget; else skeletonIncome">
          <div class="dic-label">Monthly Income</div>
          <div class="dic-amount">{{ budget.income | inr }}</div>
          <div class="dic-sub">{{ totalAllocated }}% allocated · 6 categories</div>
        </div>
        <ng-template #skeletonIncome>
          <div class="card" style="padding:20px;margin-bottom:12px">
            <div class="skeleton" style="height:11px;width:90px;margin-bottom:10px"></div>
            <div class="skeleton" style="height:30px;width:150px;margin-bottom:8px"></div>
            <div class="skeleton" style="height:10px;width:120px"></div>
          </div>
        </ng-template>

        <!-- Donut chart -->
        <div class="card" style="padding:18px;margin-bottom:12px" *ngIf="budget">
          <span class="section-label" style="margin-bottom:14px">Allocation Overview</span>
          <div class="donut-wrap">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="46" fill="none" stroke="#f1f5f9" stroke-width="16"/>
              <circle *ngFor="let seg of donutSegments"
                cx="60" cy="60" r="46" fill="none"
                [attr.stroke]="seg.color"
                stroke-width="16"
                [attr.stroke-dasharray]="seg.dashArray"
                [attr.stroke-dashoffset]="seg.offset"
                transform="rotate(-90 60 60)"/>
              <text x="60" y="56" text-anchor="middle"
                font-family="Syne,sans-serif" font-size="11" font-weight="800" fill="#111827">
                {{ budget.income | inr:true }}
              </text>
              <text x="60" y="69" text-anchor="middle"
                font-family="DM Sans,sans-serif" font-size="9" fill="#9ca3af">TOTAL</text>
            </svg>
            <div class="donut-legend">
              <div class="donut-legend-row" *ngFor="let cat of budget.categories">
                <span class="cat-dot" [ngClass]="getCatClass(cat.key)"></span>
                <span class="muted" style="flex:1;font-size:12px">{{ cat.name }}</span>
                <span style="font-weight:700;font-size:11px;color:var(--text2)">{{ cat.percentage }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Category cards -->
        <div style="display:flex;align-items:center;gap:8px" class="section-label">
          Budget Categories
          <span class="badge badge-violet">6 CATEGORIES</span>
        </div>

        <ng-container *ngIf="budget; else catSkeleton">
          <div class="cat-expand-card"
            *ngFor="let cat of budget.categories; let i = index"
            [class.open]="openCategory === cat.key"
            [style.animation-delay]="getDelay(i)">

            <div class="cec-header" (click)="toggleCategory(cat.key)">
              <div class="cat-icon-wrap" [ngClass]="getCatClass(cat.key)">{{ cat.icon }}</div>
              <div style="flex:1;min-width:0">
                <div class="cec-name">{{ cat.name }}</div>
                <div class="cec-subs muted2">{{ getSubNames(cat) }}</div>
              </div>
              <div style="text-align:right;flex-shrink:0">
                <div class="cec-limit" [style.color]="cat.color">{{ cat.limit | inr }}</div>
                <div class="cec-pct muted2">{{ cat.percentage }}% of income</div>
              </div>
              <div class="cec-chevron" [class.open]="openCategory === cat.key">
                <ion-icon name="chevron-down-outline"></ion-icon>
              </div>
            </div>

            <div style="padding:0 14px 12px">
              <div style="display:flex;justify-content:space-between;margin-bottom:5px">
                <span class="muted2" style="font-size:11px">Spent</span>
                <span style="font-size:11px;font-weight:600">{{ cat.spent | inr }} / {{ cat.limit | inr }}</span>
              </div>
              <div class="prog-track prog-h-sm">
                <div class="prog-fill"
                  [style.width]="getSpentPercent(cat)+'%'"
                  [style.background]="getProgressColor(cat)">
                </div>
              </div>
            </div>

            <div class="cec-sublist" [class.open]="openCategory === cat.key">
              <div style="height:1px;background:var(--border);margin:0 14px 10px"></div>
              <div class="cec-sub-row" *ngFor="let sub of cat.subcategories">
                <span class="cat-dot" [ngClass]="getCatClass(cat.key)" style="opacity:0.6"></span>
                <span class="muted" style="flex:1;font-size:12px">{{ sub.name }}</span>
                <span class="muted2" style="font-size:10px;max-width:90px;text-align:right;line-height:1.3">{{ sub.note }}</span>
                <span style="font-size:12px;font-weight:600;margin-left:6px;white-space:nowrap" [style.color]="cat.color">{{ sub.limit | inr }}</span>
              </div>
            </div>
          </div>
        </ng-container>

        <ng-template #catSkeleton>
          <div class="skel-row" *ngFor="let n of [1,2,3]">
            <div class="skel-avatar skeleton"></div>
            <div class="skel-body">
              <div class="skel-line skeleton" style="width:100px"></div>
              <div class="skel-line-sm skeleton"></div>
            </div>
            <div class="skeleton" style="height:20px;width:52px;border-radius:6px"></div>
          </div>
        </ng-template>

        <!-- Avoid list -->
        <div style="display:flex;align-items:center;gap:8px;margin:20px 0 10px" class="section-label">
          Avoid List <span class="badge badge-red">ZERO SPEND</span>
        </div>
        <div class="avoid-block">
          <div class="avoid-block-title">
            <ion-icon name="ban-outline"></ion-icon>
            Committed to avoiding these expenses
          </div>
          <div style="display:flex;gap:10px">
            <div class="avoid-block-item" *ngFor="let item of avoidList">
              <span style="font-size:26px;display:block;margin-bottom:4px">{{ item.emoji }}</span>
              <div style="font-size:12px;color:var(--red);font-weight:600">{{ item.name }}</div>
              <div class="badge badge-red" style="margin-top:5px">Blocked</div>
            </div>
          </div>
        </div>

      </div>

      <!-- FAB -->
      <button class="fab-btn" [routerLink]="['/add-transaction']">
        <ion-icon name="add-outline"></ion-icon>
      </button>

    </ion-content>
  `,
  styles: [`
    .dash-avatar {
      width: 42px; height: 42px; border-radius: 50%;
      background: rgba(255,255,255,0.2); backdrop-filter: blur(8px);
      border: 1.5px solid rgba(255,255,255,0.35);
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display); font-weight: 800; font-size: 15px;
      color: white; cursor: pointer; flex-shrink: 0;
    }

    /* Income card */
    .dash-income-card {
      background: linear-gradient(135deg, #1e1b4b, #312e81, #1e1b4b);
      border-radius: var(--r-xl); padding: 22px 20px; margin-bottom: 12px;
      border: 1px solid rgba(124,58,237,0.2);
    }
    .dic-label  { font-size: 11px; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 1.2px; font-weight: 600; margin-bottom: 6px; }
    .dic-amount { font-family: var(--font-display); font-size: 32px; font-weight: 800; color: white; letter-spacing: -1px; line-height: 1; margin-bottom: 6px; }
    .dic-sub    { font-size: 12px; color: rgba(255,255,255,0.4); }

    /* Donut */
    .donut-wrap        { display: flex; align-items: center; gap: 16px; }
    .donut-legend      { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    .donut-legend-row  { display: flex; align-items: center; gap: 7px; }

    /* Category expandable card */
    .cat-expand-card {
      background: var(--surface); border-radius: var(--r-lg); margin-bottom: 10px;
      border: 1px solid var(--border); overflow: hidden; animation: fadeUp 0.4s ease both;
      &.open { border-color: var(--border2); }
    }
    .cec-header  { display: flex; align-items: center; padding: 14px; gap: 10px; cursor: pointer; user-select: none; }
    .cec-name    { font-family: var(--font-display); font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .cec-subs    { font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cec-limit   { font-family: var(--font-display); font-size: 13px; font-weight: 700; }
    .cec-pct     { font-size: 10px; margin-top: 2px; }
    .cec-chevron {
      width: 20px; height: 20px; border-radius: 50%; background: var(--surface3);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      transition: transform 0.3s; ion-icon { font-size: 12px; color: var(--muted2); }
      &.open { transform: rotate(180deg); }
    }
    .cec-sublist { display: none; padding: 0 14px 12px; &.open { display: block; } }
    .cec-sub-row {
      display: flex; align-items: center; padding: 7px 0; gap: 8px;
      border-bottom: 1px solid var(--border); &:last-child { border-bottom: none; }
    }

    /* Avoid block */
    .avoid-block {
      background: var(--red-bg); border: 1px solid rgba(239,68,68,0.2);
      border-radius: var(--r-lg); padding: 14px; margin-bottom: 12px;
    }
    .avoid-block-title {
      font-family: var(--font-display); font-size: 12px; font-weight: 800;
      color: var(--red); margin-bottom: 12px;
      display: flex; align-items: center; gap: 6px; ion-icon { font-size: 14px; }
    }
    .avoid-block-item {
      flex: 1; background: white; border: 1px solid rgba(239,68,68,0.15);
      border-radius: var(--r); padding: 12px; text-align: center;
    }
  `]
})
export class DashboardPage implements OnInit, OnDestroy {
  budget: MonthlyBudget | null = null;
  openCategory: string | null = null;
  avoidList = AVOID_LIST;
  currentMonth = format(new Date(), 'yyyy-MM');
  donutSegments: { color: string; dashArray: string; offset: string }[] = [];
  private sub?: Subscription;

  constructor(
    private budgetService: BudgetService,
    private authService: AuthService
  ) { }

  get currentMonthLabel(): string {
    const [y, m] = this.currentMonth.split('-');
    return format(new Date(+y, +m - 1, 1), 'MMMM yyyy');
  }

  get isCurrentMonth(): boolean {
    return this.currentMonth === format(new Date(), 'yyyy-MM');
  }

  get userInitials(): string {
    const name = this.authService.currentUser?.displayName || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  get needsTotal(): number {
    return this.budget?.categories
      .filter(c => c.key === 'fixed_costs' || c.key === 'food_household')
      .reduce((a, c) => a + c.limit, 0) ?? 0;
  }

  get savingsTotal(): number {
    return this.budget?.categories
      .filter(c => c.key === 'savings')
      .reduce((a, c) => a + c.limit, 0) ?? 0;
  }

  get wantsTotal(): number {
    return this.budget?.categories
      .filter(c => c.key === 'self_investment' || c.key === 'fun_family' || c.key === 'giving_misc')
      .reduce((a, c) => a + c.limit, 0) ?? 0;
  }

  get totalAllocated(): number {
    return this.budget?.categories.reduce((a, c) => a + c.percentage, 0) ?? 0;
  }

  getDelay(i: number): string { return (i * 0.07) + 's'; }

  getCatClass(key: string): string {
    const map: Record<string, string> = {
      fixed_costs: 'cc-fixed', food_household: 'cc-food', savings: 'cc-savings',
      self_investment: 'cc-self', fun_family: 'cc-fun', giving_misc: 'cc-giving',
      uncategorized: 'cc-uncat'
    };
    return map[key] ?? 'cc-uncat';
  }

  getSubNames(cat: CategoryBudget): string {
    return cat.subcategories.map(s => {
      const parts = s.name.split(' ');
      return parts.length > 1 ? parts.slice(1).join(' ') : s.name;
    }).slice(0, 3).join(' · ');
  }

  getSpentPercent(cat: CategoryBudget): number {
    if (!cat.limit) return 0;
    return Math.min(100, Math.round((cat.spent / cat.limit) * 100));
  }

  getProgressColor(cat: CategoryBudget): string {
    const pct = this.getSpentPercent(cat);
    if (pct >= 90) return 'var(--red)';
    if (pct >= 70) return 'var(--gold)';
    return cat.color;
  }

  ngOnInit() { this.loadBudget(); }

  loadBudget() {
    this.sub?.unsubscribe();
    this.budget = null;
    this.sub = this.budgetService.watchBudget(this.currentMonth).subscribe(async budget => {
      if (!budget) {
        await this.budgetService.getOrCreateBudget(this.currentMonth);
      } else {
        this.budget = budget;
        this.buildDonutSegments();
      }
    });
  }

  buildDonutSegments() {
    if (!this.budget) return;
    const circumference = 289.3;
    let offset = 0;
    this.donutSegments = this.budget.categories.map(cat => {
      const dash = (cat.percentage / 100) * circumference;
      const seg = { color: cat.color, dashArray: dash + ' ' + circumference, offset: (-offset).toString() };
      offset += dash;
      return seg;
    });
  }

  toggleCategory(key: string) { this.openCategory = this.openCategory === key ? null : key; }

  prevMonth() {
    const [y, m] = this.currentMonth.split('-');
    this.currentMonth = format(subMonths(new Date(+y, +m - 1, 1), 1), 'yyyy-MM');
    this.loadBudget();
  }

  nextMonth() {
    if (this.isCurrentMonth) return;
    const [y, m] = this.currentMonth.split('-');
    this.currentMonth = format(addMonths(new Date(+y, +m - 1, 1), 1), 'yyyy-MM');
    this.loadBudget();
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}