import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

const routes: Routes = [
  {
    path: '',
    component: TabsPage,
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('../dashboard/dashboard.module').then(m => m.DashboardPageModule)
      },
      {
        path: 'budget',
        loadChildren: () =>
          import('../budget/budget-categories.module').then(m => m.BudgetCategoriesPageModule)
      },
      {
        path: 'transactions',
        loadChildren: () =>
          import('../transactions/transaction-list/transaction-list.module')
            .then(m => m.TransactionListPageModule)
      },
      {
        path: 'messages',
        loadChildren: () =>
          import('../messages/messages.module').then(m => m.MessagesPageModule)
      },
      {
        path: 'wallet',
        loadChildren: () =>
          import('../wallet/wallet.module').then(m => m.WalletPageModule)
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('../settings/settings.module').then(m => m.SettingsPageModule)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [TabsPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TabsPageModule { }