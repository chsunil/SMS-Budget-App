// ─── src/app/features/sms-import/sms-import.page.ts ─
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { SmsReaderService } from '../../core/services/sms-reader.service';
import { BudgetService } from '../../core/services/budget.service';
import { SmsParserService } from '../../core/services/sms-parser.service';
import { ParsedSMS, CategoryKey } from '../../core/models';
import { InrPipe } from '../../shared/pipes/inr.pipe';
import { format } from 'date-fns';

interface ImportItem extends ParsedSMS {
  selected: boolean;
  category: CategoryKey;
}

@Component({
  selector: 'app-sms-import',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, InrPipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>
          <span class="display-title" style="font-size:18px">SMS Import</span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="selectAll()" *ngIf="items.length > 0">
            <span style="font-size:13px;color:var(--accent)">All</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="sms-wrap">

        <!-- Platform notice for Web -->
        <div class="platform-notice" *ngIf="!isAndroid">
          <div class="notice-icon">📱</div>
          <div class="notice-text">
            <strong>Android only feature</strong>
            <p>SMS reading works on the Android app. Showing demo transactions for preview.</p>
          </div>
        </div>

        <!-- Action Bar -->
        <div class="action-bar" *ngIf="!loading && items.length === 0">
          <div class="action-icon">💬</div>
          <h3>Import Bank SMS</h3>
          <p class="muted">Automatically read and categorize your bank transaction SMS messages.</p>
          <button class="action-btn" (click)="loadSMS()">
            <ion-icon name="refresh-outline"></ion-icon>
            {{ isAndroid ? 'Read Bank SMS' : 'Load Demo SMS' }}
          </button>
        </div>

        <!-- Loading -->
        <div class="loading-wrap" *ngIf="loading">
          <ion-spinner name="crescent" color="warning"></ion-spinner>
          <p class="muted" style="margin-top:12px">Reading bank messages…</p>
        </div>

        <!-- Results -->
        <div *ngIf="!loading && items.length > 0">
          <div class="results-header">
            <div>
              <div class="results-count">{{ items.length }} transactions found</div>
              <div class="muted" style="font-size:12px">{{ selectedCount }} selected for import</div>
            </div>
            <button class="action-btn small" (click)="importSelected()" [disabled]="selectedCount === 0 || importing">
              <ion-spinner *ngIf="importing" name="crescent" style="width:14px;height:14px"></ion-spinner>
              <span *ngIf="!importing">Import {{ selectedCount }}</span>
            </button>
          </div>

          <div class="sms-card"
            *ngFor="let item of items"
            [class.selected]="item.selected"
            [class.debit]="item.type === 'debit'"
            [class.credit]="item.type === 'credit'"
            (click)="toggleItem(item)">

            <div class="sms-top">
              <div class="sms-check" [class.checked]="item.selected">
                <ion-icon [name]="item.selected ? 'checkmark' : ''" style="font-size:12px;color:#0b0f1a"></ion-icon>
              </div>
              <div class="sms-info">
                <div class="sms-merchant">{{ item.merchant || 'Unknown Merchant' }}</div>
                <div class="sms-meta">
                  <span class="bank-badge">{{ item.bank }}</span>
                  <span class="muted" style="font-size:11px">·  {{ item.date | date:'dd MMM' }}</span>
                  <span class="confidence-dot" [class]="item.confidence"></span>
                </div>
              </div>
              <div class="sms-amount" [class.debit]="item.type === 'debit'" [class.credit]="item.type === 'credit'">
                {{ item.type === 'debit' ? '-' : '+' }}{{ item.amount | inr }}
              </div>
            </div>

            <!-- Category Selector (when selected) -->
            <div class="cat-selector" *ngIf="item.selected" (click)="$event.stopPropagation()">
              <label class="field-label">Category</label>
              <select [(ngModel)]="item.category" class="cat-select">
                <option value="fixed_costs">🏦 Fixed Costs</option>
                <option value="food_household">🛒 Food & Household</option>
                <option value="savings">💰 Savings</option>
                <option value="self_investment">🌿 Self-Investment</option>
                <option value="fun_family">🎉 Fun & Family</option>
                <option value="giving_misc">💖 Giving & Misc</option>
                <option value="uncategorized">❓ Uncategorized</option>
              </select>
            </div>

            <!-- SMS Raw preview -->
            <div class="sms-raw" *ngIf="item.selected">{{ item.raw | slice:0:100 }}…</div>
          </div>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: var(--bg); }
    .sms-wrap { padding: 16px; max-width: 480px; margin: 0 auto; }

    .platform-notice {
      display: flex;
      gap: 12px;
      background: var(--blue-dim);
      border: 1px solid rgba(96,165,250,0.2);
      border-radius: var(--radius);
      padding: 14px;
      margin-bottom: 16px;
      align-items: flex-start;
    }
    .notice-icon { font-size: 24px; flex-shrink: 0; }
    .notice-text strong { font-size: 13px; font-weight: 700; }
    .notice-text p { font-size: 12px; color: var(--muted); margin-top: 4px; }

    .action-bar {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 48px 24px;
    }
    .action-icon { font-size: 52px; margin-bottom: 16px; }
    .action-bar h3 { font-family: var(--font-display); font-size: 20px; font-weight: 800; margin-bottom: 8px; }
    .action-bar p { font-size: 13px; line-height: 1.5; margin-bottom: 24px; }
    .action-btn {
      display: flex; align-items: center; gap: 8px;
      background: var(--accent); color: #0b0f1a;
      border: none; border-radius: var(--radius);
      padding: 13px 24px;
      font-family: var(--font-display);
      font-size: 14px; font-weight: 700;
      cursor: pointer;
      box-shadow: var(--shadow-glow-gold);
      ion-icon { font-size: 18px; }
      &.small { padding: 10px 18px; font-size: 13px; }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .loading-wrap { text-align: center; padding: 60px 24px; }

    .results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .results-count { font-family: var(--font-display); font-size: 16px; font-weight: 800; }

    .sms-card {
      background: var(--surface);
      border-radius: var(--radius);
      padding: 14px;
      margin-bottom: 10px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      &.selected { border-color: var(--accent); background: rgba(245,200,66,0.04); }
      &.selected.credit { border-color: var(--green); background: rgba(62,207,142,0.04); }
    }
    .sms-top { display: flex; align-items: center; gap: 10px; }
    .sms-check {
      width: 20px; height: 20px;
      border-radius: 50%;
      border: 2px solid var(--muted2);
      background: transparent;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
      &.checked { background: var(--accent); border-color: var(--accent); }
    }
    .sms-info { flex: 1; }
    .sms-merchant { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
    .sms-meta { display: flex; align-items: center; gap: 6px; }
    .bank-badge {
      background: var(--surface2);
      border-radius: 6px;
      padding: 2px 7px;
      font-size: 10px;
      font-weight: 700;
      color: var(--muted);
    }
    .confidence-dot {
      width: 6px; height: 6px; border-radius: 50%;
      &.high { background: var(--green); }
      &.medium { background: var(--accent); }
      &.low { background: var(--red); }
    }
    .sms-amount {
      font-family: var(--font-display);
      font-size: 16px; font-weight: 700;
      &.debit { color: var(--red); }
      &.credit { color: var(--green); }
    }

    .cat-selector { margin-top: 12px; }
    .field-label {
      display: block;
      font-size: 10px; font-weight: 700;
      color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 6px;
    }
    .cat-select {
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      padding: 9px 12px;
      color: var(--text);
      font-family: var(--font-body);
      font-size: 13px;
      outline: none;
    }
    .sms-raw {
      margin-top: 10px;
      font-size: 11px;
      color: var(--muted2);
      font-style: italic;
      line-height: 1.4;
    }
  `]
})
export class SmsImportPage implements OnInit {
  items: ImportItem[] = [];
  loading = false;
  importing = false;

  constructor(
    private smsReader: SmsReaderService,
    private budgetService: BudgetService,
    private smsParser: SmsParserService
  ) {}

  get isAndroid(): boolean { return this.smsReader.isPlatformAndroid; }
  get selectedCount(): number { return this.items.filter(i => i.selected).length; }

  ngOnInit() {}

  async loadSMS() {
    this.loading = true;
    try {
      const parsed = await this.smsReader.readBankSMS();
      this.items = parsed.map(p => ({
        ...p,
        selected: p.confidence === 'high',
        category: this.smsParser.autoCategory(p)
      }));
    } finally {
      this.loading = false;
    }
  }

  toggleItem(item: ImportItem) { item.selected = !item.selected; }

  selectAll() {
    const allSelected = this.items.every(i => i.selected);
    this.items.forEach(i => i.selected = !allSelected);
  }

  async importSelected() {
    this.importing = true;
    const month = format(new Date(), 'yyyy-MM');
    const selected = this.items.filter(i => i.selected);

    try {
      for (const item of selected) {
        await this.budgetService.addTransaction({
          amount: item.amount,
          type: item.type,
          category: item.category,
          merchant: item.merchant,
          bank: item.bank,
          date: item.date,
          month,
          source: 'sms',
          smsRaw: item.raw
        });
      }
      // Remove imported items
      this.items = this.items.filter(i => !i.selected);
    } finally {
      this.importing = false;
    }
  }
}
