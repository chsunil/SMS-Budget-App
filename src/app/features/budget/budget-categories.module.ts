// ─── src/app/features/budget/budget-categories.module.ts ─
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BudgetCategoriesPage } from './budget-categories.page';

const routes: Routes = [{ path: '', component: BudgetCategoriesPage }];

@NgModule({
  imports: [BudgetCategoriesPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BudgetCategoriesPageModule {}