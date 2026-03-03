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
        path: 'transactions',
        loadChildren: () =>
          import('../transactions/transaction-list/transaction-list.module')
            .then(m => m.TransactionListPageModule)
      },
      {
        path: 'sms',
        loadChildren: () =>
          import('../sms-import/sms-import.module').then(m => m.SmsImportPageModule)
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('../reports/reports.module').then(m => m.ReportsPageModule)
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
export class TabsPageModule {}
