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
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/tabs/transactions" color="warning"></ion-back-button></ion-buttons>
        <ion-title><span class="display-title" style="font-size:18px">Add Transaction</span></ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div style="padding:20px;max-width:480px;margin:0 auto">
        <div class="type-toggle">
          <button [class.active]="type === 'debit'" (click)="type='debit'">Debit</button>
          <button [class.active]="type === 'credit'" (click)="type='credit'">Credit</button>
        </div>
        <div class="field-group"><label class="field-label">Amount (₹)</label>
          <input type="number" [(ngModel)]="amount" placeholder="0" class="auth-input" style="padding:13px 16px"/>
        </div>
        <div class="field-group"><label class="field-label">Merchant / Description</label>
          <input type="text" [(ngModel)]="merchant" placeholder="Zomato, Amazon..." class="auth-input" style="padding:13px 16px"/>
        </div>
        <div class="field-group"><label class="field-label">Category</label>
          <select [(ngModel)]="category" class="cat-select">
            <option value="fixed_costs">🏦 Fixed Costs</option>
            <option value="food_household">🛒 Food & Household</option>
            <option value="savings">💰 Savings</option>
            <option value="self_investment">🌿 Self-Investment</option>
            <option value="fun_family">🎉 Fun & Family</option>
            <option value="giving_misc">💖 Giving & Misc</option>
            <option value="uncategorized">❓ Uncategorized</option>
          </select>
        </div>
        <div class="field-group"><label class="field-label">Note (optional)</label>
          <input type="text" [(ngModel)]="note" placeholder="Add a note..." class="auth-input" style="padding:13px 16px"/>
        </div>
        <button class="auth-btn" (click)="save()" [disabled]="!amount || saving">
          <span *ngIf="!saving">Save Transaction</span>
          <ion-spinner *ngIf="saving" name="crescent" style="width:18px;height:18px"></ion-spinner>
        </button>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: var(--bg); }
    .type-toggle { display:flex; gap:8px; margin-bottom:20px; }
    .type-toggle button {
      flex:1; padding:12px; border-radius:var(--radius); border:1px solid var(--border);
      background:var(--surface); color:var(--muted); font-family:var(--font-display);
      font-size:14px; font-weight:700; cursor:pointer;
      &.active { background:var(--accent); color:#0b0f1a; border-color:var(--accent); }
    }
    .field-group { margin-bottom:16px; }
    .field-label { display:block; font-size:11px; font-weight:600; color:var(--muted); text-transform:uppercase; letter-spacing:0.8px; margin-bottom:7px; }
    .auth-input { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius); color:var(--text); font-family:var(--font-body); font-size:14px; outline:none; &::placeholder { color:var(--muted); } }
    .cat-select { width:100%; background:var(--surface2); border:1px solid var(--border); border-radius:var(--radius); padding:12px 16px; color:var(--text); font-family:var(--font-body); font-size:13px; outline:none; }
    .auth-btn { width:100%; padding:15px; border-radius:var(--radius); border:none; background:var(--accent); color:#0b0f1a; font-family:var(--font-display); font-size:15px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; margin-top:8px; box-shadow:var(--shadow-glow-gold); &:disabled { opacity:0.6; } }
  `]
})
export class AddTransactionPage {
  type: TransactionType = 'debit';
  amount = 0;
  merchant = '';
  category: CategoryKey = 'uncategorized';
  note = '';
  saving = false;
  constructor(private budgetService: BudgetService, private router: Router) {}
  async save() {
    if (!this.amount) return;
    this.saving = true;
    try {
      await this.budgetService.addTransaction({
        amount: this.amount, type: this.type,
        category: this.category, merchant: this.merchant,
        note: this.note, date: new Date(),
        month: format(new Date(), 'yyyy-MM'), source: 'manual'
      });
      this.router.navigateByUrl('/tabs/transactions');
    } finally { this.saving = false; }
  }
}
