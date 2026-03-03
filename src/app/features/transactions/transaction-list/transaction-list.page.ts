import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { BudgetService } from '../../../core/services/budget.service';
import { Transaction } from '../../../core/models';
import { InrPipe } from '../../../shared/pipes/inr.pipe';
import { format } from 'date-fns';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, InrPipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title><span class="display-title" style="font-size:18px">Transactions</span></ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/add-transaction" color="warning">
            <ion-icon name="add-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div style="padding:16px;max-width:480px;margin:0 auto">
        <div *ngIf="transactions.length === 0" style="text-align:center;padding:60px 24px;color:var(--muted)">
          <div style="font-size:48px;margin-bottom:16px">📭</div>
          <p>No transactions yet</p>
          <p style="font-size:12px;margin-top:8px">Add one manually or import from SMS</p>
        </div>
        <ion-card *ngFor="let txn of transactions" class="txn-card">
          <div class="txn-row">
            <div class="txn-info">
              <div style="font-weight:600;font-size:14px">{{ txn.merchant || 'Transaction' }}</div>
              <div style="font-size:11px;color:var(--muted)">{{ txn.bank }} · {{ txn.date | date:'dd MMM' }} · {{ txn.source }}</div>
            </div>
            <div [style.color]="txn.type === 'debit' ? 'var(--red)' : 'var(--green)'"
              style="font-family:var(--font-display);font-size:15px;font-weight:700">
              {{ txn.type === 'debit' ? '-' : '+' }}{{ txn.amount | inr }}
            </div>
          </div>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: [`.txn-card { margin-bottom:8px; } .txn-row { display:flex;align-items:center;gap:12px;padding:14px 16px; } .txn-info { flex:1; }`]
})
export class TransactionListPage implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  private sub?: Subscription;
  constructor(private budgetService: BudgetService) {}
  ngOnInit() {
    const month = format(new Date(), 'yyyy-MM');
    this.sub = this.budgetService.watchTransactions(month).subscribe(t => this.transactions = t);
  }
  ngOnDestroy() { this.sub?.unsubscribe(); }
}
