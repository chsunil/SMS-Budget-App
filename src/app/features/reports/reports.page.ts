// ─── src/app/features/reports/reports.page.ts ───
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { BudgetService } from '../../core/services/budget.service';
import { MonthlyBudget, Transaction, CategoryBudget } from '../../core/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { format, subMonths } from 'date-fns';

interface MerchantStat {
  name: string;
  amount: number;
  count: number;
  icon: string;
}

interface MonthComparison {
  month: string;
  label: string;
  spent: number;
  income: number;
  barHeight: number;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, IonicModule, InrPipe],
  template: `
    <ion-content [fullscreen]="true">
      <div class="reports-bg">

        <!-- Header -->
        <div class="reports-header">
          <h1 class="header-title">Reports</h1>
          <p class="header-sub">Your financial overview</p>

          <!-- Month Selector -->
          <div class="month-row">
            <button class="mnav" (click)="prevMonth()">
              <ion-icon name="chevron-back-outline"></ion-icon>
            </button>
            <span class="month-display">{{ currentMonthLabel }}</span>
            <button class="mnav" (click)="nextMonth()" [disabled]="isCurrentMonth">
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </button>
          </div>
        </div>

        <!-- Loading skeleton -->
        <div class="skel-wrap" *ngIf="loading">
          <div class="skeleton" style="height:180px;border-radius:20px;margin-bottom:12px"></div>
          <div class="skeleton" style="height:140px;border-radius:20px;margin-bottom:12px"></div>
          <div class="skeleton" style="height:220px;border-radius:20px"></div>
        </div>

        <ng-container *ngIf="!loading && budget">

          <!-- KPI Cards -->
          <div class="kpi-row">
            <div class="kpi-card kpi-green">
              <div class="kpi-icon">💰</div>
              <div class="kpi-val">{{ budget.income | inr:true }}</div>
              <div class="kpi-label">Income</div>
            </div>
            <div class="kpi-card kpi-red">
              <div class="kpi-icon">💸</div>
              <div class="kpi-val">{{ budget.totalSpent | inr:true }}</div>
              <div class="kpi-label">Spent</div>
            </div>
            <div class="kpi-card" [class.kpi-green]="savings >= 0" [class.kpi-red]="savings < 0">
              <div class="kpi-icon">📈</div>
              <div class="kpi-val">{{ savings | inr:true }}</div>
              <div class="kpi-label">Saved</div>
            </div>
          </div>

          <!-- Savings Rate pill -->
          <div class="savings-rate-wrap">
            <div class="savings-chip" [class.good]="savingsRate >= 20" [class.warn]="savingsRate >= 10 && savingsRate < 20" [class.bad]="savingsRate < 10">
              <ion-icon [name]="savingsRate >= 20 ? 'trending-up-outline' : savingsRate >= 10 ? 'trending-up-outline' : 'trending-down-outline'"></ion-icon>
              {{ savingsRate }}% savings rate ·
              {{ savingsRate >= 20 ? 'Excellent! 🎉' : savingsRate >= 10 ? 'Good job 👍' : 'Needs attention ⚠️' }}
            </div>
          </div>

          <!-- Donut Chart: Category Breakdown -->
          <div class="chart-card">
            <div class="card-title">Spending by Category</div>
            <div class="donut-section">
              <div class="donut-wrap">
                <svg width="130" height="130" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r="50" fill="none" stroke="#f3f4f6" stroke-width="18"/>
                  <circle *ngFor="let seg of donutSegments"
                    cx="65" cy="65" r="50" fill="none"
                    [attr.stroke]="seg.color"
                    stroke-width="18"
                    stroke-linecap="round"
                    [attr.stroke-dasharray]="seg.dashArray"
                    [attr.stroke-dashoffset]="seg.offset"
                    transform="rotate(-90 65 65)"/>
                  <text x="65" y="60" text-anchor="middle"
                    font-family="Syne,sans-serif" font-size="11" font-weight="800" fill="#111827">
                    {{ budget.totalSpent | inr:true }}
                  </text>
                  <text x="65" y="74" text-anchor="middle"
                    font-family="DM Sans,sans-serif" font-size="9" fill="#9ca3af">spent</text>
                </svg>
                <div class="donut-legend">
                  <div class="legend-row" *ngFor="let cat of spentCategories">
                    <div class="legend-dot" [style.background]="cat.color"></div>
                    <span class="legend-name">{{ cat.name }}</span>
                    <div class="legend-right">
                      <span class="legend-pct" [style.color]="cat.color">{{ getCatPercent(cat) }}%</span>
                      <span class="legend-amt">{{ cat.spent | inr:true }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Category Progress Bars -->
            <div class="cat-bars">
              <div class="cat-bar-row" *ngFor="let cat of budget.categories">
                <div class="cat-bar-header">
                  <span class="cat-bar-icon">{{ cat.icon }}</span>
                  <span class="cat-bar-name">{{ cat.name }}</span>
                  <span class="cat-bar-amounts">
                    <span [style.color]="cat.color">{{ cat.spent | inr:true }}</span>
                    <span class="cat-bar-limit"> / {{ cat.limit | inr:true }}</span>
                  </span>
                </div>
                <div class="cat-bar-track">
                  <div class="cat-bar-fill"
                    [style.width]="getSpentPct(cat) + '%'"
                    [style.background]="getBarColor(cat)">
                  </div>
                </div>
                <div class="cat-bar-footer">
                  <span class="cat-bar-pct" [style.color]="getSpentPct(cat) >= 90 ? '#ef4444' : '#9ca3af'">
                    {{ getSpentPct(cat) }}% used
                  </span>
                  <span class="cat-bar-remain" *ngIf="cat.limit > cat.spent">
                    {{ (cat.limit - cat.spent) | inr:true }} left
                  </span>
                  <span class="cat-bar-over" *ngIf="cat.spent > cat.limit">
                    {{ (cat.spent - cat.limit) | inr:true }} over!
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Bar Chart: Month Comparison -->
          <div class="chart-card">
            <div class="card-title">6-Month Trend</div>
            <div class="card-sub">Monthly spending comparison</div>

            <div class="bar-chart-wrap">
              <div class="bar-col" *ngFor="let m of monthComparisons">
                <div class="bar-value" *ngIf="m.spent > 0">{{ m.spent | inr:true }}</div>
                <div class="bar-outer">
                  <div class="bar-inner"
                    [style.height]="m.barHeight + '%'"
                    [class.current]="m.month === currentMonth">
                  </div>
                </div>
                <div class="bar-label" [class.current-label]="m.month === currentMonth">
                  {{ m.label }}
                </div>
              </div>
            </div>

            <div class="bar-legend-row">
              <div class="bar-legend-item">
                <div class="bleg-dot" style="background:#7c3aed"></div>
                <span>This month</span>
              </div>
              <div class="bar-legend-item">
                <div class="bleg-dot" style="background:#e5e7eb"></div>
                <span>Past months</span>
              </div>
            </div>
          </div>

          <!-- Daily Spending Bars -->
          <div class="chart-card" *ngIf="dailyData.length > 0">
            <div class="card-title">Daily Spending</div>
            <div class="card-sub">{{ currentMonthLabel }}</div>

            <div class="daily-chart">
              <div class="daily-bar-wrap" *ngFor="let d of dailyData">
                <div class="daily-bar-outer">
                  <div class="daily-bar-inner" [style.height]="d.heightPct + '%'"
                    [class.has-spend]="d.amount > 0"></div>
                </div>
                <div class="daily-label">{{ d.day }}</div>
              </div>
            </div>

            <div class="daily-stats-row">
              <div class="dstat">
                <div class="dstat-val">{{ dailyAvg | inr:true }}</div>
                <div class="dstat-label">Daily avg</div>
              </div>
              <div class="dstat">
                <div class="dstat-val">{{ peakDay }}</div>
                <div class="dstat-label">Peak day</div>
              </div>
              <div class="dstat">
                <div class="dstat-val">{{ spendDays }}</div>
                <div class="dstat-label">Spend days</div>
              </div>
            </div>
          </div>

          <!-- Top Merchants -->
          <div class="chart-card" *ngIf="topMerchants.length > 0">
            <div class="card-title">Top Merchants</div>
            <div class="card-sub">Highest spending this month</div>

            <div class="merchant-list">
              <div class="merchant-row" *ngFor="let m of topMerchants; let i = index">
                <div class="merchant-rank" [class.top]="i === 0">{{ i + 1 }}</div>
                <div class="merchant-icon">{{ m.icon }}</div>
                <div class="merchant-body">
                  <div class="merchant-name">{{ m.name }}</div>
                  <div class="merchant-count">{{ m.count }} transaction{{ m.count !== 1 ? 's' : '' }}</div>
                </div>
                <div class="merchant-right">
                  <div class="merchant-amount">{{ m.amount | inr }}</div>
                  <div class="merchant-bar-wrap">
                    <div class="merchant-bar" [style.width]="getMerchantPct(m) + '%'"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- No spending state -->
          <div class="no-spend" *ngIf="!budget.totalSpent">
            <div style="font-size:52px;margin-bottom:16px">📊</div>
            <h3>No spending data yet</h3>
            <p>Add transactions or import from SMS to see your reports.</p>
          </div>

        </ng-container>

        <div style="height:100px"></div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: #f3f4f6; }
    .reports-bg { background: #f3f4f6; min-height: 100vh; }

    /* Header */
    .reports-header {
      background: linear-gradient(160deg, #7c3aed 0%, #5b21b6 100%);
      padding: 52px 20px 24px;
      border-radius: 0 0 28px 28px;
      margin-bottom: 16px;
      text-align: center;
    }
    .header-title { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; color: white; margin-bottom: 4px; }
    .header-sub { font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 16px; }
    .month-row { display: flex; align-items: center; justify-content: center; gap: 16px; }
    .mnav {
      width: 34px; height: 34px; border-radius: 50%; border: none;
      background: rgba(255,255,255,0.2); color: white; font-size: 18px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; backdrop-filter: blur(6px);
      &:disabled { opacity: 0.4; }
    }
    .month-display { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: white; min-width: 130px; text-align: center; }

    /* Skeleton */
    .skel-wrap { padding: 0 16px; }
    .skeleton {
      background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }

    /* KPI */
    .kpi-row { display: flex; gap: 10px; padding: 0 16px; margin-bottom: 10px; }
    .kpi-card {
      flex: 1; background: white; border-radius: 16px; padding: 14px 10px;
      text-align: center; box-shadow: 0 1px 8px rgba(0,0,0,0.06);
      border-top: 3px solid transparent;
    }
    .kpi-green { border-top-color: #10b981; }
    .kpi-red { border-top-color: #ef4444; }
    .kpi-icon { font-size: 22px; margin-bottom: 4px; }
    .kpi-val { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800; color: #111827; margin-bottom: 2px; }
    .kpi-label { font-size: 10px; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    .savings-rate-wrap { padding: 0 16px; margin-bottom: 12px; }
    .savings-chip {
      display: flex; align-items: center; gap: 6px;
      padding: 9px 14px; border-radius: 12px; font-size: 12px; font-weight: 600;
      ion-icon { font-size: 16px; }
      &.good { background: #d1fae5; color: #065f46; }
      &.warn { background: #fef3c7; color: #92400e; }
      &.bad { background: #fee2e2; color: #991b1b; }
    }

    /* Chart Card */
    .chart-card {
      background: white; border-radius: 20px;
      padding: 20px 16px; margin: 0 16px 12px;
      box-shadow: 0 1px 8px rgba(0,0,0,0.06);
    }
    .card-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 2px; }
    .card-sub { font-size: 12px; color: #9ca3af; margin-bottom: 16px; }

    /* Donut */
    .donut-section { margin-bottom: 20px; }
    .donut-wrap { display: flex; align-items: center; gap: 16px; }
    .donut-legend { flex: 1; display: flex; flex-direction: column; gap: 7px; }
    .legend-row { display: flex; align-items: center; gap: 8px; }
    .legend-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .legend-name { flex: 1; font-size: 12px; color: #374151; }
    .legend-right { display: flex; flex-direction: column; align-items: flex-end; }
    .legend-pct { font-size: 12px; font-weight: 700; }
    .legend-amt { font-size: 10px; color: #9ca3af; }

    /* Cat Bars */
    .cat-bars { display: flex; flex-direction: column; gap: 12px; }
    .cat-bar-row { }
    .cat-bar-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .cat-bar-icon { font-size: 14px; }
    .cat-bar-name { flex: 1; font-size: 12px; color: #374151; font-weight: 600; }
    .cat-bar-amounts { font-size: 12px; font-weight: 700; }
    .cat-bar-limit { font-weight: 400; color: #9ca3af; }
    .cat-bar-track { height: 6px; background: #f3f4f6; border-radius: 10px; overflow: hidden; margin-bottom: 3px; }
    .cat-bar-fill { height: 100%; border-radius: 10px; transition: width 1.2s cubic-bezier(0.16,1,0.3,1); }
    .cat-bar-footer { display: flex; justify-content: space-between; }
    .cat-bar-pct { font-size: 10px; }
    .cat-bar-remain { font-size: 10px; color: #10b981; font-weight: 600; }
    .cat-bar-over { font-size: 10px; color: #ef4444; font-weight: 700; }

    /* Bar Chart - Month Comparison */
    .bar-chart-wrap {
      display: flex; align-items: flex-end; gap: 6px;
      height: 130px; margin-bottom: 12px; padding: 0 4px;
    }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .bar-value { font-size: 8px; color: #9ca3af; text-align: center; }
    .bar-outer { width: 100%; flex: 1; display: flex; align-items: flex-end; }
    .bar-inner {
      width: 100%; border-radius: 6px 6px 4px 4px;
      background: #e5e7eb;
      transition: height 1s cubic-bezier(0.16,1,0.3,1);
      min-height: 4px;
      &.current { background: linear-gradient(180deg, #8b5cf6, #7c3aed); }
    }
    .bar-label { font-size: 10px; color: #9ca3af; text-align: center; }
    .current-label { color: #7c3aed; font-weight: 700; }
    .bar-legend-row { display: flex; gap: 16px; }
    .bar-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #6b7280; }
    .bleg-dot { width: 8px; height: 8px; border-radius: 2px; }

    /* Daily Chart */
    .daily-chart {
      display: flex; align-items: flex-end; gap: 3px;
      height: 80px; margin-bottom: 16px; overflow-x: auto;
      padding-bottom: 4px;
      &::-webkit-scrollbar { display: none; }
    }
    .daily-bar-wrap { flex-shrink: 0; width: 20px; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; justify-content: flex-end; }
    .daily-bar-outer { width: 14px; flex: 1; display: flex; align-items: flex-end; }
    .daily-bar-inner {
      width: 100%; border-radius: 3px 3px 2px 2px; background: #f3f4f6; min-height: 3px;
      transition: height 1s ease;
      &.has-spend { background: linear-gradient(180deg, #a78bfa, #7c3aed); }
    }
    .daily-label { font-size: 8px; color: #d1d5db; }
    .daily-stats-row { display: flex; gap: 10px; }
    .dstat { flex: 1; background: #f9fafb; border-radius: 12px; padding: 10px; text-align: center; }
    .dstat-val { font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 800; color: #111827; margin-bottom: 2px; }
    .dstat-label { font-size: 10px; color: #9ca3af; }

    /* Merchants */
    .merchant-list { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
    .merchant-row { display: flex; align-items: center; gap: 10px; }
    .merchant-rank {
      width: 24px; height: 24px; border-radius: 8px;
      background: #f3f4f6; color: #6b7280;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800; flex-shrink: 0;
      &.top { background: #fef3c7; color: #d97706; }
    }
    .merchant-icon { font-size: 22px; flex-shrink: 0; }
    .merchant-body { flex: 1; }
    .merchant-name { font-size: 14px; font-weight: 600; color: #111827; }
    .merchant-count { font-size: 11px; color: #9ca3af; }
    .merchant-right { text-align: right; }
    .merchant-amount { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .merchant-bar-wrap { width: 70px; height: 4px; background: #f3f4f6; border-radius: 2px; margin-left: auto; }
    .merchant-bar { height: 100%; background: linear-gradient(90deg, #8b5cf6, #7c3aed); border-radius: 2px; }

    /* No spend */
    .no-spend { text-align: center; padding: 40px 24px; color: #9ca3af;
      h3 { font-family: 'Syne', sans-serif; font-size: 18px; color: #374151; margin-bottom: 8px; }
      p { font-size: 13px; line-height: 1.6; }
    }
  `]
})
export class ReportsPage implements OnInit, OnDestroy {
  currentMonth = format(new Date(), 'yyyy-MM');
  budget: MonthlyBudget | null = null;
  transactions: Transaction[] = [];
  loading = true;
  donutSegments: { color: string; dashArray: string; offset: string }[] = [];
  monthComparisons: MonthComparison[] = [];
  dailyData: { day: string; amount: number; heightPct: number }[] = [];
  topMerchants: MerchantStat[] = [];
  private budgetSub?: Subscription;
  private txnSub?: Subscription;

  get currentMonthLabel(): string {
    const [y, m] = this.currentMonth.split('-');
    return format(new Date(+y, +m - 1, 1), 'MMMM yyyy');
  }
  get isCurrentMonth(): boolean { return this.currentMonth === format(new Date(), 'yyyy-MM'); }
  get savings(): number { return (this.budget?.income ?? 0) - (this.budget?.totalSpent ?? 0); }
  get savingsRate(): number {
    if (!this.budget?.income) return 0;
    return Math.max(0, Math.round((this.savings / this.budget.income) * 100));
  }
  get spentCategories(): CategoryBudget[] {
    return (this.budget?.categories ?? []).filter(c => c.spent > 0);
  }
  get dailyAvg(): number {
    const days = this.dailyData.filter(d => d.amount > 0).length;
    return days ? Math.round((this.budget?.totalSpent ?? 0) / Math.max(days, 1)) : 0;
  }
  get peakDay(): string {
    if (!this.dailyData.length) return '-';
    const peak = this.dailyData.reduce((a, b) => a.amount > b.amount ? a : b);
    return peak.amount > 0 ? peak.day : '-';
  }
  get spendDays(): number { return this.dailyData.filter(d => d.amount > 0).length; }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.budgetSub?.unsubscribe();
    this.txnSub?.unsubscribe();

    this.budgetSub = this.budgetService.watchBudget(this.currentMonth).subscribe(async budget => {
      if (!budget) {
        await this.budgetService.getOrCreateBudget(this.currentMonth);
      } else {
        this.budget = budget;
        this.buildDonut();
        this.loading = false;
      }
    });

    this.txnSub = this.budgetService.watchTransactions(this.currentMonth).subscribe(txns => {
      this.transactions = txns;
      this.buildDailyData();
      this.buildMerchants();
    });

    this.buildMonthComparisons();
  }

  buildDonut() {
    if (!this.budget) return;
    const total = this.budget.totalSpent;
    if (!total) { this.donutSegments = []; return; }
    const circumference = 314.16;
    let offset = 0;
    this.donutSegments = this.budget.categories
      .filter(c => c.spent > 0)
      .map(cat => {
        const dash = (cat.spent / total) * circumference;
        const seg = { color: cat.color, dashArray: (dash - 2) + ' ' + circumference, offset: (-offset).toString() };
        offset += dash;
        return seg;
      });
  }

  async buildMonthComparisons() {
    const months: MonthComparison[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const key = format(d, 'yyyy-MM');
      const label = format(d, 'MMM');
      try {
        const b = await this.budgetService.getOrCreateBudget(key);
        months.push({ month: key, label, spent: b.totalSpent, income: b.income, barHeight: 0 });
      } catch {
        months.push({ month: key, label, spent: 0, income: 0, barHeight: 0 });
      }
    }
    const maxSpent = Math.max(...months.map(m => m.spent), 1);
    months.forEach(m => { m.barHeight = Math.max(5, Math.round((m.spent / maxSpent) * 90)); });
    this.monthComparisons = months;
  }

  buildDailyData() {
    const [y, m] = this.currentMonth.split('-');
    const daysInMonth = new Date(+y, +m, 0).getDate();
    const dailyMap = new Map<number, number>();

    for (const txn of this.transactions) {
      if (txn.type !== 'debit') continue;
      const day = new Date(txn.date).getDate();
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + txn.amount);
    }

    const data = [];
    const maxAmt = Math.max(...Array.from(dailyMap.values()), 1);
    for (let d = 1; d <= daysInMonth; d++) {
      const amt = dailyMap.get(d) ?? 0;
      data.push({ day: d.toString(), amount: amt, heightPct: Math.max(3, Math.round((amt / maxAmt) * 90)) });
    }
    this.dailyData = data;
  }

  buildMerchants() {
    const map = new Map<string, { amount: number; count: number }>();
    for (const txn of this.transactions.filter(t => t.type === 'debit')) {
      const key = txn.merchant || 'Unknown';
      const existing = map.get(key) ?? { amount: 0, count: 0 };
      map.set(key, { amount: existing.amount + txn.amount, count: existing.count + 1 });
    }
    const merchantIcons: Record<string, string> = {
      zomato: '🍕', swiggy: '🛵', amazon: '📦', flipkart: '🛍️',
      dmart: '🛒', bigbasket: '🥦', uber: '🚗', ola: '🚕',
      netflix: '🎬', spotify: '🎵', gym: '🏋️', default: '🏪'
    };
    const getMIcon = (name: string) => {
      const lower = name.toLowerCase();
      for (const [key, icon] of Object.entries(merchantIcons)) {
        if (lower.includes(key)) return icon;
      }
      return merchantIcons['default'];
    };

    this.topMerchants = Array.from(map.entries())
      .map(([name, stat]) => ({ name, ...stat, icon: getMIcon(name) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7);
  }

  getCatPercent(cat: CategoryBudget): number {
    const total = this.budget?.totalSpent ?? 0;
    if (!total) return 0;
    return Math.round((cat.spent / total) * 100);
  }

  getSpentPct(cat: CategoryBudget): number {
    if (!cat.limit) return 0;
    return Math.min(100, Math.round((cat.spent / cat.limit) * 100));
  }

  getBarColor(cat: CategoryBudget): string {
    const pct = this.getSpentPct(cat);
    if (pct >= 90) return '#ef4444';
    if (pct >= 70) return cat.color;
    return cat.color + 'cc';
  }

  getMerchantPct(m: MerchantStat): number {
    const max = this.topMerchants[0]?.amount ?? 1;
    return Math.round((m.amount / max) * 100);
  }

  prevMonth() {
    const [y, m] = this.currentMonth.split('-');
    this.currentMonth = format(subMonths(new Date(+y, +m - 1, 1), 1), 'yyyy-MM');
    this.load();
  }

  nextMonth() {
    if (this.isCurrentMonth) return;
    const [y, m] = this.currentMonth.split('-');
    this.currentMonth = format(new Date(+y, +m, 1), 'yyyy-MM');
    this.load();
  }

  ngOnDestroy() {
    this.budgetSub?.unsubscribe();
    this.txnSub?.unsubscribe();
  }

  constructor(private budgetService: BudgetService) {}
}