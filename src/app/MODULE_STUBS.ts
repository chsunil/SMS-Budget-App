// ─── Feature Module Stubs ────────────────────────
// These are routing modules for lazy-loaded features.
// Each page follows the same standalone component pattern.

// ── dashboard.module.ts ──────────────────────────
// src/app/features/dashboard/dashboard.module.ts
/*
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardPage } from './dashboard.page';
const routes: Routes = [{ path: '', component: DashboardPage }];
@NgModule({ imports: [DashboardPage, RouterModule.forChild(routes)], exports: [RouterModule] })
export class DashboardPageModule {}
*/

// ── transaction-list.module.ts ───────────────────
// src/app/features/transactions/transaction-list/transaction-list.module.ts
/*
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TransactionListPage } from './transaction-list.page';
const routes: Routes = [{ path: '', component: TransactionListPage }];
@NgModule({ imports: [TransactionListPage, RouterModule.forChild(routes)], exports: [RouterModule] })
export class TransactionListPageModule {}
*/

// ── sms-import.module.ts ─────────────────────────
// src/app/features/sms-import/sms-import.module.ts
/*
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SmsImportPage } from './sms-import.page';
const routes: Routes = [{ path: '', component: SmsImportPage }];
@NgModule({ imports: [SmsImportPage, RouterModule.forChild(routes)], exports: [RouterModule] })
export class SmsImportPageModule {}
*/

// ── reports.module.ts ────────────────────────────
// ── add-transaction.module.ts ────────────────────
// ── settings.module.ts ───────────────────────────
// ── login.module.ts ──────────────────────────────
// ── register.module.ts ───────────────────────────
// All follow identical pattern ↑

export {};
