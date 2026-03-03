import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddTransactionPage } from './add-transaction.page';

const routes: Routes = [{ path: '', component: AddTransactionPage }];

@NgModule({
  imports: [AddTransactionPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AddTransactionPageModule {}
