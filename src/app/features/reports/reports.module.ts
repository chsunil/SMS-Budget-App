import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ReportsPage } from './reports.page';

const routes: Routes = [{ path: '', component: ReportsPage }];

@NgModule({
  imports: [ReportsPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReportsPageModule {}
