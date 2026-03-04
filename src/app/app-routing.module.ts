// ─── src/app/app-routing.module.ts ──────────────
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs/dashboard',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    // canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadChildren: () =>
          import('./features/auth/login/login.module').then(m => m.LoginPageModule)
      },
      {
        path: 'register',
        loadChildren: () =>
          import('./features/auth/register/register.module').then(m => m.RegisterPageModule)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'tabs',
    // canActivate: [authGuard],
    loadChildren: () =>
      import('./features/tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'add-transaction',
    // canActivate: [authGuard],
    loadChildren: () =>
      import('./features/transactions/add-transaction/add-transaction.module')
        .then(m => m.AddTransactionPageModule)
  },
  /* {
    path: 'sms-import',
    // canActivate: [authGuard],
    loadChildren: () =>
      import('./features/sms-import/sms-import.module').then(m => m.SmsImportPageModule)
  }, */
  {
    path: '**',
    redirectTo: 'tabs/dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
