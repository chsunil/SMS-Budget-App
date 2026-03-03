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
      <div class="dashboard-wrap">

        <!-- HEADER -->
        <div class="dash-header">
          <div class="header-left">
            <h1 class="display-title">Budget Planner</h1>
            <p class="muted">{{ currentMonthLabel }} · Monthly Plan</p>
          </div>
          <div class="avatar">{{ userInitials }}</div>
        </div>

        <!-- MONTH NAVIGATOR -->
        <div class="month-nav">
          <button class="nav-arrow" (click)="prevMonth()">
            <ion-icon name="chevron-back-outline"></ion-icon>
          </button>
          <span class="month-label">{{ currentMonthLabel }}</span>
          <button class="nav-arrow" (click)="nextMonth()" [disabled]="isCurrentMonth">
            <ion-icon name="chevron-forward-outline"></ion-icon>
          </button>
        </div>

        <!-- SUMMARY CARD -->
        <div class="summary-card" *ngIf="budget; else skeletonCard">
          <div class="summary-month">Monthly Income</div>
          <div class="summary-total"><span class="accent">₹</span>{{ budget.income | inr:true }}</div>
          <div class="summary-subtitle">{{ totalAllocated }}% allocated · 6 categories</div>
          <div class="summary-stats">
            <div class="stat-box">
              <div class="stat-label">Needs</div>
              <div class="stat-val" style="color:var(--accent)">{{ needsTotal | inr:true }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Savings</div>
              <div class="stat-val" style="color:var(--green)">{{ savingsTotal | inr:true }}</div>
            </div>
            <div class="stat-box">
              <div class="stat-label">Wants</div>
              <div class="stat-val" style="color:var(--blue)">{{ wantsTotal | inr:true }}</div>
            </div>
          </div>
        </div>
        <ng-template #skeletonCard>
          <div class="summary-card" style="min-height:160px;background:var(--surface)">
            <div class="skeleton" style="height:14px;width:120px;margin-bottom:10px;border-radius:6px"></div>
            <div class="skeleton" style="height:38px;width:180px;margin-bottom:8px;border-radius:6px"></div>
            <div class="skeleton" style="height:12px;width:150px;margin-bottom:20px;border-radius:6px"></div>
            <div class="summary-stats">
              <div class="skeleton" style="height:54px;border-radius:12px"></div>
              <div class="skeleton" style="height:54px;border-radius:12px"></div>
              <div class="skeleton" style="height:54px;border-radius:12px"></div>
            </div>
          </div>
        </ng-template>

        <!-- DONUT CHART -->
        <div class="donut-section" *ngIf="budget">
          <div class="section-title" style="margin-bottom:14px">Allocation Overview</div>
          <div class="donut-wrap">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface2)" stroke-width="16"/>
              <circle *ngFor="let seg of donutSegments"
                cx="60" cy="60" r="46" fill="none"
                [attr.stroke]="seg.color"
                stroke-width="16"
                [attr.stroke-dasharray]="seg.dashArray"
                [attr.stroke-dashoffset]="seg.offset"
                transform="rotate(-90 60 60)"/>
              <text x="60" y="56" text-anchor="middle"
                font-family="Syne,sans-serif" font-size="11" font-weight="800" fill="#f0f4ff">
                {{ budget.income | inr:true }}
              </text>
              <text x="60" y="69" text-anchor="middle"
                font-family="DM Sans,sans-serif" font-size="9" fill="#7b8bab">TOTAL</text>
            </svg>
            <div class="donut-legend">
              <div class="legend-item" *ngFor="let cat of budget.categories">
                <div class="legend-dot" [style.background]="cat.color"></div>
                <span class="legend-name">{{ cat.name }}</span>
                <span class="legend-pct">{{ cat.percentage }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CATEGORIES -->
        <div class="section-title" style="margin-top:22px;display:flex;align-items:center;gap:8px">
          Budget Categories
          <span class="badge badge-gold">6 CATEGORIES</span>
        </div>

        <ng-container *ngIf="budget; else catSkeleton">
          <div class="cat-card"
            *ngFor="let cat of budget.categories; let i = index"
            [class.open]="openCategory === cat.key"
            [style.animation-delay]="getDelay(i)">

            <div class="cat-header" (click)="toggleCategory(cat.key)">
              <div class="cat-icon" [style.background]="cat.colorDim">{{ cat.icon }}</div>
              <div class="cat-info">
                <div class="cat-name">{{ cat.name }}</div>
                <div class="cat-sub">{{ getSubNames(cat) }}</div>
              </div>
              <div class="cat-amounts">
                <div class="cat-amount" [style.color]="cat.color">{{ cat.limit | inr }}</div>
                <div class="cat-pct">{{ cat.percentage }}% of income</div>
              </div>
              <div class="chevron">
                <ion-icon name="chevron-down-outline"></ion-icon>
              </div>
            </div>

            <div class="cat-progress-wrap">
              <div class="cat-spent-label">
                <span class="muted" style="font-size:11px">Spent</span>
                <span style="font-size:11px;font-weight:600">{{ cat.spent | inr }} / {{ cat.limit | inr }}</span>
              </div>
              <div class="progress-track">
                <div class="progress-fill"
                  [style.width]="getSpentPercent(cat) + '%'"
                  [style.background]="getProgressGradient(cat)">
                </div>
              </div>
            </div>

            <div class="sub-list" [class.open]="openCategory === cat.key">
              <div class="sub-divider"></div>
              <div class="sub-item" *ngFor="let sub of cat.subcategories">
                <div class="sub-dot" [style.background]="cat.color"></div>
                <span class="sub-name">{{ sub.name }}</span>
                <span class="sub-note">{{ sub.note }}</span>
                <span class="sub-amt" [style.color]="cat.color">{{ sub.limit | inr }}</span>
              </div>
            </div>
          </div>
        </ng-container>

        <ng-template #catSkeleton>
          <div class="cat-card" *ngFor="let n of [1,2,3]" style="padding:18px">
            <div style="display:flex;gap:12px;align-items:center">
              <div class="skeleton" style="width:42px;height:42px;border-radius:12px"></div>
              <div style="flex:1">
                <div class="skeleton" style="height:13px;width:110px;margin-bottom:7px;border-radius:4px"></div>
                <div class="skeleton" style="height:10px;width:75px;border-radius:4px"></div>
              </div>
              <div class="skeleton" style="height:22px;width:56px;border-radius:6px"></div>
            </div>
          </div>
        </ng-template>

        <!-- AVOID LIST -->
        <div class="section-title" style="margin-top:26px;display:flex;align-items:center;gap:8px">
          Avoid List
          <span class="badge badge-red">ZERO SPEND</span>
        </div>
        <div class="avoid-card">
          <div class="avoid-title">
            <ion-icon name="ban-outline" style="font-size:14px"></ion-icon>
            Committed to avoiding these expenses
          </div>
          <div class="avoid-items">
            <div class="avoid-item" *ngFor="let item of avoidList">
              <span class="avoid-emoji">{{ item.emoji }}</span>
              <div class="avoid-name">{{ item.name }}</div>
              <div class="avoid-badge">Blocked</div>
            </div>
          </div>
        </div>

        <div style="height:100px"></div>
      </div>

      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button [routerLink]="['/add-transaction']" color="warning">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    .dashboard-wrap { padding: 52px 16px 20px; max-width: 480px; margin: 0 auto; }
    .dash-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .avatar { width:42px; height:42px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--orange)); display:flex; align-items:center; justify-content:center; font-family:var(--font-display); font-weight:800; font-size:15px; color:#0b0f1a; cursor:pointer; }
    .month-nav { display:flex; align-items:center; justify-content:center; gap:16px; margin-bottom:16px; }
    .nav-arrow { background:var(--surface2); border:1px solid var(--border); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:var(--muted); cursor:pointer; } .nav-arrow:disabled { opacity:0.3; }
    .month-label { font-family:var(--font-display); font-size:14px; font-weight:700; }
    .summary-card { background:linear-gradient(135deg,#1a2d52,#0f1e3a,#141c30); border-radius:24px; padding:26px 22px; margin-bottom:8px; border:1px solid rgba(245,200,66,0.12); position:relative; overflow:hidden; }
    .summary-month { font-size:11px; color:var(--accent); font-weight:600; letter-spacing:1.5px; text-transform:uppercase; margin-bottom:6px; }
    .summary-total { font-family:var(--font-display); font-size:34px; font-weight:800; letter-spacing:-1px; line-height:1; margin-bottom:6px; }
    .summary-subtitle { font-size:12px; color:var(--muted); margin-bottom:20px; }
    .summary-stats { display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; }
    .stat-box { background:rgba(255,255,255,0.05); border-radius:12px; padding:11px; border:1px solid rgba(255,255,255,0.05); }
    .stat-label { font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:3px; }
    .stat-val { font-family:var(--font-display); font-size:14px; font-weight:700; }
    .donut-section { background:var(--surface); border-radius:20px; padding:18px; margin:16px 0 8px; border:1px solid var(--border); }
    .donut-wrap { display:flex; align-items:center; gap:18px; }
    .donut-legend { flex:1; display:flex; flex-direction:column; gap:6px; }
    .legend-item { display:flex; align-items:center; gap:7px; font-size:12px; }
    .legend-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .legend-name { color:var(--muted); flex:1; }
    .legend-pct { font-weight:600; font-size:11px; }
    .cat-card { background:var(--surface); border-radius:18px; margin-bottom:10px; border:1px solid var(--border); overflow:hidden; animation:fadeUp 0.4s ease both; }
    .cat-card.open { border-color:rgba(255,255,255,0.1); }
    .cat-header { display:flex; align-items:center; padding:15px 16px; gap:11px; cursor:pointer; user-select:none; }
    .cat-icon { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:20px; flex-shrink:0; }
    .cat-info { flex:1; min-width:0; }
    .cat-name { font-family:var(--font-display); font-size:14px; font-weight:700; margin-bottom:2px; }
    .cat-sub { font-size:11px; color:var(--muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .cat-amounts { text-align:right; flex-shrink:0; }
    .cat-amount { font-family:var(--font-display); font-size:14px; font-weight:700; }
    .cat-pct { font-size:10px; color:var(--muted); margin-top:2px; }
    .chevron { width:20px; height:20px; border-radius:50%; background:rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:transform 0.3s; } .chevron ion-icon { font-size:12px; }
    .cat-card.open .chevron { transform:rotate(180deg); }
    .cat-progress-wrap { padding:0 16px 14px; }
    .cat-spent-label { display:flex; justify-content:space-between; margin-bottom:6px; }
    .sub-list { display:none; padding:0 16px 14px; }
    .sub-list.open { display:block; }
    .sub-divider { height:1px; background:var(--border); margin-bottom:10px; }
    .sub-item { display:flex; align-items:center; padding:7px 0; gap:9px; border-bottom:1px solid rgba(255,255,255,0.02); }
    .sub-item:last-child { border-bottom:none; }
    .sub-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; opacity:0.6; }
    .sub-name { flex:1; font-size:12.5px; color:var(--muted); }
    .sub-note { font-size:10px; color:var(--muted); opacity:0.5; max-width:90px; text-align:right; line-height:1.3; }
    .sub-amt { font-size:12.5px; font-weight:600; margin-left:8px; white-space:nowrap; }
    .avoid-card { background:linear-gradient(135deg,rgba(245,101,101,0.1),rgba(245,101,101,0.05)); border:1px solid rgba(245,101,101,0.2); border-radius:18px; padding:16px; }
    .avoid-title { font-family:var(--font-display); font-size:12px; font-weight:800; color:var(--red); margin-bottom:12px; display:flex; align-items:center; gap:6px; }
    .avoid-items { display:flex; gap:10px; }
    .avoid-item { flex:1; background:rgba(245,101,101,0.08); border:1px solid rgba(245,101,101,0.15); border-radius:12px; padding:12px; text-align:center; }
    .avoid-emoji { font-size:26px; display:block; margin-bottom:4px; }
    .avoid-name { font-size:12px; color:var(--red); font-weight:600; }
    .avoid-badge { font-size:9px; background:rgba(245,101,101,0.2); color:var(--red); padding:2px 6px; border-radius:20px; margin-top:4px; display:inline-block; text-transform:uppercase; font-weight:700; letter-spacing:0.5px; }
    ion-fab-button { --background:var(--accent); --color:#0b0f1a; --box-shadow:0 4px 20px rgba(245,200,66,0.4); }
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
  ) {}

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

  // ── Template helper methods (no arrow fns in templates) ──
  getDelay(i: number): string { return (i * 0.07) + 's'; }

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

  getProgressGradient(cat: CategoryBudget): string {
    const pct = this.getSpentPercent(cat);
    if (pct >= 90) return 'linear-gradient(90deg, var(--red), #c53030)';
    if (pct >= 70) return 'linear-gradient(90deg, ' + cat.color + ', var(--orange))';
    return 'linear-gradient(90deg, ' + cat.color + ', ' + cat.color + 'cc)';
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
      const seg = {
        color: cat.color,
        dashArray: dash + ' ' + circumference,
        offset: (-offset).toString()
      };
      offset += dash;
      return seg;
    });
  }

  toggleCategory(key: string) {
    this.openCategory = this.openCategory === key ? null : key;
  }

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
