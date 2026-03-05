// ─── src/app/features/transactions/add-transaction/add-transaction.page.ts ─
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { BudgetService } from '../../../core/services/budget.service';
import { CategoryKey, TransactionType } from '../../../core/models';
import { format } from 'date-fns';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <ion-content [fullscreen]="true">

      <!-- Header -->
      <div class="v-header" style="padding-bottom:22px">
        <div class="vh-top" style="margin-bottom:0">
          <div>
            <h1 class="vh-title">Add Transaction</h1>
            <p class="vh-sub">Log a new debit or credit entry</p>
          </div>
          <button class="vh-fab" (click)="goBack()">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>
      </div>

      <div class="page-wrap" style="padding-top:12px">

        <!-- Type toggle -->
        <div class="type-toggle">
          <button class="type-btn" [class.active-debit]="type === 'debit'"
            (click)="type='debit'">
            <ion-icon name="arrow-up-outline"></ion-icon> Debit
          </button>
          <button class="type-btn" [class.active-credit]="type === 'credit'"
            (click)="type='credit'">
            <ion-icon name="arrow-down-outline"></ion-icon> Credit
          </button>
        </div>

        <!-- Amount -->
        <div class="field-group">
          <label class="field-label">Amount (₹)</label>
          <div class="f-icon-wrap">
            <ion-icon name="logo-usd" class="f-icon" style="font-size:14px;color:var(--violet)"></ion-icon>
            <input type="number" [(ngModel)]="amount" placeholder="0.00"
              class="f-input f-input-icon at-amount-input"
              [class.debit-input]="type === 'debit'"
              [class.credit-input]="type === 'credit'"/>
          </div>
        </div>

        <!-- Merchant -->
        <div class="field-group">
          <label class="field-label">Merchant / Description</label>
          <div class="f-icon-wrap">
            <ion-icon name="storefront-outline" class="f-icon"></ion-icon>
            <input type="text" [(ngModel)]="merchant" placeholder="e.g. Zomato, Amazon, SIP..."
              class="f-input f-input-icon"/>
          </div>
        </div>

        <!-- Category -->
        <div class="field-group">
          <label class="field-label">Category</label>
          <select [(ngModel)]="category" class="f-select">
            <option value="fixed_costs">🏦 Fixed Costs</option>
            <option value="food_household">🛒 Food & Household</option>
            <option value="savings">💰 Savings</option>
            <option value="self_investment">🌿 Self-Investment</option>
            <option value="fun_family">🎉 Fun & Family</option>
            <option value="giving_misc">💖 Giving & Misc</option>
            <option value="uncategorized">❓ Uncategorized</option>
          </select>
        </div>

        <!-- Bank (optional) -->
        <div class="field-group">
          <label class="field-label">Bank / Account <span class="muted2">(optional)</span></label>
          <div class="f-icon-wrap">
            <ion-icon name="business-outline" class="f-icon"></ion-icon>
            <input type="text" [(ngModel)]="bank" placeholder="HDFC, SBI, Axis..."
              class="f-input f-input-icon"/>
          </div>
        </div>

        <!-- Note -->
        <div class="field-group">
          <label class="field-label">Note <span class="muted2">(optional)</span></label>
          <div class="f-icon-wrap">
            <ion-icon name="document-text-outline" class="f-icon" style="top:14px;bottom:auto"></ion-icon>
            <textarea [(ngModel)]="note" placeholder="Add a note..."
              rows="2" class="f-input f-input-icon at-textarea"></textarea>
          </div>
        </div>

        <!-- Amount preview badge -->
        <div class="at-preview" *ngIf="amount > 0" [class.debit]="type==='debit'" [class.credit]="type==='credit'">
          <ion-icon [name]="type === 'debit' ? 'arrow-up-circle' : 'arrow-down-circle'"></ion-icon>
          <span>{{ type === 'debit' ? '− ' : '+ ' }}₹{{ amount | number }}</span>
          <span class="at-preview-label">{{ type | titlecase }}</span>
        </div>

        <!-- Save button -->
        <button class="btn btn-primary full" style="margin-top:8px"
          (click)="save()" [disabled]="!amount || saving">
          <ion-spinner *ngIf="saving" name="crescent"></ion-spinner>
          <span *ngIf="!saving">
            <ion-icon name="checkmark-outline"></ion-icon>
            Save Transaction
          </span>
        </button>

      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: var(--bg); }

    /* Amount input tint by type */
    .at-amount-input { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
    .debit-input  { color: var(--red);   border-color: rgba(239,68,68,0.3);  &:focus { border-color: var(--red);   box-shadow: 0 0 0 3px var(--red-dim); } }
    .credit-input { color: var(--green); border-color: rgba(16,185,129,0.3); &:focus { border-color: var(--green); box-shadow: 0 0 0 3px var(--green-dim); } }

    /* Textarea fix */
    .at-textarea { padding-top: 12px; resize: none; line-height: 1.5; }

    /* Preview badge */
    .at-preview {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 18px; border-radius: var(--r); margin-bottom: 12px;
      font-family: var(--font-display); font-size: 18px; font-weight: 700;
      &.debit  { background: var(--red-bg);   color: var(--red);   ion-icon { font-size: 22px; } }
      &.credit { background: var(--green-bg); color: var(--green); ion-icon { font-size: 22px; } }
    }
    .at-preview-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; margin-left: auto; opacity: 0.6; }
  `]
})
export class AddTransactionPage {
  type: TransactionType = 'debit';
  amount = 0;
  merchant = '';
  bank = '';
  category: CategoryKey = 'uncategorized';
  note = '';
  saving = false;

  constructor(private budgetService: BudgetService, private router: Router) { }

  goBack() { this.router.navigateByUrl('/tabs/transactions'); }

  async save() {
    if (!this.amount) return;
    this.saving = true;
    try {
      await this.budgetService.addTransaction({
        amount: this.amount,
        type: this.type,
        category: this.category,
        merchant: this.merchant,
        bank: this.bank || undefined,
        note: this.note || undefined,
        date: new Date(),
        month: format(new Date(), 'yyyy-MM'),
        source: 'manual'
      });
      this.router.navigateByUrl('/tabs/transactions');
    } finally {
      this.saving = false;
    }
  }
}