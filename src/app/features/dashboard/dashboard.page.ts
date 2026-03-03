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

        <!-- GRADIENT HEADER -->
        <div class="gradient-header">
          <div class="header-top">
            <div class="header-left">
              <div class="welcome-text">Welcome back,</div>
              <h1 class="display-title">{{ userName }}</h1>
            </div>
            <div class="avatar" (click)="openProfile()">{{ userInitials }}</div>
          </div>

          <!-- MONTH NAVIGATOR -->
          <div class="month-nav">
            <button class="nav-arrow" (click)="prevMonth()">
              <ion-icon name="chevron-back-outline"></ion-icon>
            </button>
            <div class="month-label">
              <span class="month-name">{{ currentMonthLabel }}</span>
              <span class="month-subtitle">Monthly Budget</span>
            </div>
            <button class="nav-arrow" (click)="nextMonth()" [disabled]="isCurrentMonth">
              <ion-icon name="chevron-forward-outline"></ion-icon>
            </button>
          </div>

          <!-- TOTAL BUDGET CARD -->
          <div class="total-budget-card" *ngIf="budget; else skeletonTotal">
            <div class="budget-label">Total Remaining Budget</div>
            <div class="budget-amount">
              <span class="currency">₹</span>{{ remaining | number:'1.0-0' }}
              <span class="budget-original">/{{ budget.income | number:'1.0-0' }}</span>
            </div>
            <div class="budget-bar-wrap">
              <div class="budget-bar">
                <div class="budget-fill" 
                  [style.width]="spentPercentage + '%'"
                  [style.background]="getSpentGradient()">
                </div>
              </div>
              <div class="budget-stats">
                <span class="stat-spent">Spent: {{ budget.totalSpent | inr:true }}</span>
                <span class="stat-percent" [style.color]="getSpentColor()">{{ spentPercentage | number:'1.0-0' }}%</span>
              </div>
            </div>
            <div class="quick-stats">
              <div class="quick-stat">
                <div class="stat-icon">🏠</div>
                <div class="stat-info">
                  <div class="stat-label">Needs</div>
                  <div class="stat-value">{{ needsTotal | inr:true }}</div>
                </div>
              </div>
              <div class="quick-stat">
                <div class="stat-icon">💰</div>
                <div class="stat-info">
                  <div class="stat-label">Savings</div>
                  <div class="stat-value">{{ savingsTotal | inr:true }}</div>
                </div>
              </div>
              <div class="quick-stat">
                <div class="stat-icon">🎉</div>
                <div class="stat-info">
                  <div class="stat-label">Wants</div>
                  <div class="stat-value">{{ wantsTotal | inr:true }}</div>
                </div>
              </div>
            </div>
          </div>
          <ng-template #skeletonTotal>
            <div class="total-budget-card skeleton-card">
              <div class="skeleton" style="height:16px;width:160px;margin-bottom:12px"></div>
              <div class="skeleton" style="height:42px;width:220px;margin-bottom:16px"></div>
              <div class="skeleton" style="height:6px;width:100%;margin-bottom:24px"></div>
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
                <div class="skeleton" style="height:62px"></div>
                <div class="skeleton" style="height:62px"></div>
                <div class="skeleton" style="height:62px"></div>
              </div>
            </div>
          </ng-template>
        </div>

        <!-- DONUT CHART SECTION -->
        <div class="chart-section" *ngIf="budget">
          <div class="section-title">
            <span class="title-text">Budget Allocation</span>
            <span class="badge badge-primary">{{ totalAllocated }}%</span>
          </div>
          <div class="donut-container">
            <div class="donut-chart">
              <svg width="160" height="160" viewBox="0 0 160 160">
                <defs>
                  <linearGradient *ngFor="let cat of budget.categories; let i = index" 
                    [id]="'gradient-' + cat.key" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" [attr.stop-color]="cat.color"/>
                    <stop offset="100%" [attr.stop-color]="lightenColor(cat.color)"/>
                  </linearGradient>
                </defs>
                <circle cx="80" cy="80" r="60" fill="none" stroke="var(--surface2)" stroke-width="20"/>
                <circle *ngFor="let seg of donutSegments"
                  cx="80" cy="80" r="60" fill="none"
                  [attr.stroke]="'url(#gradient-' + seg.key + ')'"
                  stroke-width="20"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="seg.dashArray"
                  [attr.stroke-dashoffset]="seg.offset"
                  transform="rotate(-90 80 80)"
                  [style.opacity]="0.95"/>
                <text x="80" y="72" text-anchor="middle"
                  font-family="Syne,sans-serif" font-size="16" font-weight="800" fill="var(--text)">
                  {{ budget.income | inr:true }}
                </text>
                <text x="80" y="90" text-anchor="middle"
                  font-family="DM Sans,sans-serif" font-size="11" fill="var(--muted)">TOTAL</text>
              </svg>
            </div>
            <div class="donut-legend">
              <div class="legend-item" *ngFor="let cat of budget.categories" 
                [style.animation-delay]="(budget.categories.indexOf(cat) * 0.05) + 's'">
                <div class="legend-dot" [style.background]="cat.color"></div>
                <span class="legend-name">{{ cat.name }}</span>
                <span class="legend-pct">{{ cat.percentage }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- CATEGORIES LIST -->
        <div class="categories-section">
          <div class="section-title">
            <span class="title-text">Categories</span>
            <span class="badge badge-purple">{{ budget?.categories?.length || 6 }}</span>
          </div>

          <ng-container *ngIf="budget; else catSkeleton">
            <div class="cat-card"
              *ngFor="let cat of budget.categories; let i = index"
              [class.open]="openCategory === cat.key"
              [style.animation-delay]="(i * 0.08) + 's'"
              (click)="toggleCategory(cat.key)">

              <div class="cat-header">
                <div class="cat-icon-wrap">
                  <div class="cat-icon" [style.background]="getCatGradient(cat.color)">
                    {{ cat.icon }}
                  </div>
                </div>
                <div class="cat-info">
                  <div class="cat-name">{{ cat.name }}</div>
                  <div class="cat-meta">
                    <span class="cat-percentage">{{ cat.percentage }}% · </span>
                    <span class="cat-spent">{{ cat.spent | inr:true }} / {{ cat.limit | inr:true }}</span>
                  </div>
                </div>
                <div class="chevron-icon">
                  <ion-icon name="chevron-down-outline"></ion-icon>
                </div>
              </div>

              <div class="cat-progress">
                <div class="progress-track">
                  <div class="progress-fill"
                    [style.width]="getSpentPercent(cat) + '%'"
                    [style.background]="getProgressGradient(cat)">
                  </div>
                </div>
              </div>

              <div class="sub-list" [class.open]="openCategory === cat.key">
                <div class="sub-divider"></div>
                <div class="sub-item" *ngFor="let sub of cat.subcategories; let si = index"
                  [style.animation-delay]="(si * 0.04) + 's'">
                  <div class="sub-icon">{{ getSubIcon(sub.name) }}</div>
                  <div class="sub-details">
                    <span class="sub-name">{{ getSubName(sub.name) }}</span>
                    <span class="sub-note">{{ sub.note }}</span>
                  </div>
                  <span class="sub-amt" [style.color]="cat.color">{{ sub.limit | inr:true }}</span>
                </div>
              </div>
            </div>
          </ng-container>

          <ng-template #catSkeleton>
            <div class="cat-card" *ngFor="let n of [1,2,3]" style="padding:20px;margin-bottom:12px">
              <div style="display:flex;gap:14px;align-items:center">
                <div class="skeleton" style="width:56px;height:56px;border-radius:16px"></div>
                <div style="flex:1">
                  <div class="skeleton" style="height:16px;width:120px;margin-bottom:10px"></div>
                  <div class="skeleton" style="height:12px;width:90px"></div>
                </div>
              </div>
              <div class="skeleton" style="height:6px;margin-top:16px"></div>
            </div>
          </ng-template>
        </div>

        <!-- AVOID LIST -->
        <div class="avoid-section">
          <div class="section-title">
            <span class="title-text">Avoid List</span>
            <span class="badge badge-red">Zero Spend</span>
          </div>
          <div class="avoid-card">
            <div class="avoid-header">
              <ion-icon name="shield-checkmark-outline"></ion-icon>
              <span>Committed to avoiding</span>
            </div>
            <div class="avoid-items">
              <div class="avoid-item" *ngFor="let item of avoidList">
                <span class="avoid-emoji">{{ item.emoji }}</span>
                <div class="avoid-name">{{ item.name }}</div>
                <div class="avoid-badge">Blocked</div>
              </div>
            </div>
          </div>
        </div>

        <div style="height:100px"></div>
      </div>

      <!-- FLOATING ACTION BUTTON -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button [routerLink]="['/add-transaction']">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    ion-content { 
      --background: var(--bg); 
    }
    
    .dashboard-wrap { 
      padding: 0;
      max-width: 480px; 
      margin: 0 auto; 
    }

    // ── Gradient Header ─────────────────────────
    .gradient-header {
      background: linear-gradient(180deg, #7c3aed 0%, #6d28d9 100%);
      padding: 48px 20px 28px;
      border-radius: 0 0 32px 32px;
      margin-bottom: 20px;
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        width: 300px;
        height: 300px;
        background: radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%);
        border-radius: 50%;
        transform: translate(40%, -40%);
      }
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      position: relative;
      z-index: 1;
    }

    .welcome-text {
      font-size: 13px;
      color: rgba(255,255,255,0.7);
      font-weight: 500;
      margin-bottom: 4px;
    }

    .display-title {
      font-size: 28px;
      color: #ffffff;
      margin: 0;
    }

    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ec4899, #f59e0b);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 18px;
      color: #ffffff;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      transition: transform 0.3s;
      
      &:hover {
        transform: scale(1.05);
      }
    }

    // ── Month Navigator ─────────────────────────
    .month-nav {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }

    .nav-arrow {
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      cursor: pointer;
      transition: all 0.3s;
      
      &:hover {
        background: rgba(255,255,255,0.25);
        transform: scale(1.05);
      }
      
      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }
      
      ion-icon {
        font-size: 20px;
      }
    }

    .month-label {
      text-align: center;
      flex: 1;
    }

    .month-name {
      display: block;
      font-family: var(--font-display);
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
    }

    .month-subtitle {
      display: block;
      font-size: 12px;
      color: rgba(255,255,255,0.7);
      margin-top: 2px;
    }

    // ── Total Budget Card ───────────────────────
    .total-budget-card {
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 24px;
      padding: 24px;
      position: relative;
      z-index: 1;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }

    .skeleton-card {
      background: rgba(255,255,255,0.08);
      min-height: 240px;
    }

    .budget-label {
      font-size: 12px;
      color: rgba(255,255,255,0.8);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.2px;
      margin-bottom: 8px;
    }

    .budget-amount {
      font-family: var(--font-display);
      font-size: 38px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1;
      margin-bottom: 20px;
      
      .currency {
        font-size: 24px;
        opacity: 0.8;
      }
      
      .budget-original {
        font-size: 18px;
        color: rgba(255,255,255,0.6);
        font-weight: 600;
      }
    }

    .budget-bar-wrap {
      margin-bottom: 20px;
    }

    .budget-bar {
      height: 8px;
      background: rgba(255,255,255,0.15);
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 10px;
    }

    .budget-fill {
      height: 100%;
      border-radius: 12px;
      transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      
      &::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shimmer 2s infinite;
      }
    }

    .budget-stats {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: rgba(255,255,255,0.8);
      font-weight: 600;
    }

    .stat-percent {
      font-family: var(--font-display);
      font-weight: 700;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
    }

    .quick-stat {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 16px;
      padding: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .stat-icon {
      font-size: 24px;
      line-height: 1;
    }

    .stat-info {
      flex: 1;
    }

    .stat-label {
      font-size: 10px;
      color: rgba(255,255,255,0.7);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 4px;
    }

    .stat-value {
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
    }

    // ── Chart Section ──────────────────────────
    .chart-section {
      padding: 0 20px;
      margin-bottom: 24px;
    }

    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .title-text {
      font-family: var(--font-display);
      font-size: 14px;
      font-weight: 800;
      color: var(--text);
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    .donut-container {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 24px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-card);
      display: flex;
      align-items: center;
      gap: 24px;
    }

    .donut-chart {
      flex-shrink: 0;
    }

    .donut-legend {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 13px;
      animation: slideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 8px currentColor;
    }

    .legend-name {
      color: var(--text);
      flex: 1;
      font-weight: 500;
    }

    .legend-pct {
      font-weight: 700;
      font-family: var(--font-display);
      font-size: 12px;
      color: var(--muted);
    }

    // ── Categories Section ─────────────────────
    .categories-section {
      padding: 0 20px;
      margin-bottom: 24px;
    }

    .cat-card {
      background: var(--surface);
      border-radius: var(--radius-lg);
      margin-bottom: 12px;
      border: 1px solid var(--border);
      overflow: hidden;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
      
      &:hover {
        border-color: var(--border-hover);
        transform: translateY(-2px);
        box-shadow: var(--shadow-card);
      }
      
      &.open {
        border-color: var(--primary);
        box-shadow: 0 0 0 3px var(--primary-dim);
      }
    }

    .cat-header {
      display: flex;
      align-items: center;
      padding: 18px;
      gap: 14px;
    }

    .cat-icon-wrap {
      flex-shrink: 0;
    }

    .cat-icon {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }

    .cat-info {
      flex: 1;
      min-width: 0;
    }

    .cat-name {
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 6px;
      color: var(--text);
    }

    .cat-meta {
      font-size: 12px;
      color: var(--muted);
    }

    .cat-percentage {
      font-weight: 600;
    }

    .cat-spent {
      font-weight: 500;
    }

    .chevron-icon {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: transform 0.3s;
      
      ion-icon {
        font-size: 16px;
        color: var(--muted);
      }
    }

    .cat-card.open .chevron-icon {
      transform: rotate(180deg);
      background: var(--primary-dim);
      
      ion-icon {
        color: var(--primary);
      }
    }

    .cat-progress {
      padding: 0 18px 16px;
    }

    .sub-list {
      display: none;
      padding: 0 18px 18px;
    }

    .sub-list.open {
      display: block;
    }

    .sub-divider {
      height: 1px;
      background: var(--border);
      margin-bottom: 14px;
    }

    .sub-item {
      display: flex;
      align-items: center;
      padding: 12px 0;
      gap: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.03);
      animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
      
      &:last-child {
        border-bottom: none;
      }
    }

    .sub-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .sub-details {
      flex: 1;
      min-width: 0;
    }

    .sub-name {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 3px;
    }

    .sub-note {
      display: block;
      font-size: 11px;
      color: var(--muted);
      opacity: 0.8;
    }

    .sub-amt {
      font-size: 14px;
      font-weight: 700;
      font-family: var(--font-display);
      white-space: nowrap;
    }

    // ── Avoid Section ──────────────────────────
    .avoid-section {
      padding: 0 20px;
      margin-bottom: 24px;
    }

    .avoid-card {
      background: linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.08));
      border: 1px solid rgba(239,68,68,0.25);
      border-radius: var(--radius-lg);
      padding: 20px;
    }

    .avoid-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: var(--font-display);
      font-size: 13px;
      font-weight: 700;
      color: var(--red);
      margin-bottom: 16px;
      
      ion-icon {
        font-size: 18px;
      }
    }

    .avoid-items {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .avoid-item {
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.2);
      border-radius: 14px;
      padding: 16px;
      text-align: center;
    }

    .avoid-emoji {
      font-size: 32px;
      display: block;
      margin-bottom: 8px;
    }

    .avoid-name {
      font-size: 13px;
      color: var(--red);
      font-weight: 600;
      margin-bottom: 6px;
    }

    .avoid-badge {
      font-size: 9px;
      background: rgba(239,68,68,0.25);
      color: var(--red);
      padding: 4px 8px;
      border-radius: 20px;
      display: inline-block;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    // ── FAB ────────────────────────────────────
    ion-fab-button {
      width: 64px;
      height: 64px;
      
      ion-icon {
        font-size: 30px;
      }
    }
  `]
})
export class DashboardPage implements OnInit, OnDestroy {
  budget: MonthlyBudget | null = null;
  openCategory: string | null = null;
  avoidList = AVOID_LIST;
  currentMonth = format(new Date(), 'yyyy-MM');
  donutSegments: Array<{ color: string; dashArray: string; offset: string; key: string }> = [];
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

  get userName(): string {
    const name = this.authService.currentUser?.displayName || 'User';
    return name.split(' ')[0];
  }

  get userInitials(): string {
    const name = this.authService.currentUser?.displayName || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  get remaining(): number {
    return (this.budget?.income || 0) - (this.budget?.totalSpent || 0);
  }

  get spentPercentage(): number {
    if (!this.budget?.income) return 0;
    return Math.min(100, Math.round((this.budget.totalSpent / this.budget.income) * 100));
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

  getSpentGradient(): string {
    if (this.spentPercentage >= 90) {
      return 'linear-gradient(90deg, var(--red), var(--red-light))';
    } else if (this.spentPercentage >= 70) {
      return 'linear-gradient(90deg, var(--orange), var(--orange-light))';
    }
    return 'linear-gradient(90deg, var(--green), var(--green-light))';
  }

  getSpentColor(): string {
    if (this.spentPercentage >= 90) return 'var(--red)';
    if (this.spentPercentage >= 70) return 'var(--orange)';
    return 'var(--green)';
  }

  getSpentPercent(cat: CategoryBudget): number {
    if (!cat.limit) return 0;
    return Math.min(100, Math.round((cat.spent / cat.limit) * 100));
  }

  getProgressGradient(cat: CategoryBudget): string {
    const pct = this.getSpentPercent(cat);
    if (pct >= 90) return 'linear-gradient(90deg, var(--red), var(--red-light))';
    if (pct >= 70) return `linear-gradient(90deg, ${cat.color}, var(--orange))`;
    return `linear-gradient(90deg, ${cat.color}, ${this.lightenColor(cat.color)})`;
  }

  getCatGradient(color: string): string {
    return `linear-gradient(135deg, ${color}, ${this.lightenColor(color)})`;
  }

  lightenColor(color: string): string {
    // Simple color lightener
    const colorMap: Record<string, string> = {
      '#f5c842': '#f6d468',
      '#60a5fa': '#7bb4fb',
      '#3ecf8e': '#5dd9a0',
      '#a78bfa': '#b9a0fb',
      '#fb923c': '#fca55f',
      '#f472b6': '#f68cc3'
    };
    return colorMap[color] || color;
  }

  getSubIcon(name: string): string {
    return name.split(' ')[0];
  }

  getSubName(name: string): string {
    const parts = name.split(' ');
    return parts.length > 1 ? parts.slice(1).join(' ') : name;
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
    const circumference = 377;
    let offset = 0;
    this.donutSegments = this.budget.categories.map(cat => {
      const dash = (cat.percentage / 100) * circumference;
      const seg = {
        color: cat.color,
        dashArray: `${dash} ${circumference}`,
        offset: (-offset).toString(),
        key: cat.key
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

  openProfile() {
    // Navigate to settings/profile
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }
}