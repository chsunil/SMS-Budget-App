import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TransactionListPage } from './transaction-list.page';

const routes: Routes = [{ path: '', component: TransactionListPage }];

@NgModule({
  imports: [TransactionListPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TransactionListPageModule {}
