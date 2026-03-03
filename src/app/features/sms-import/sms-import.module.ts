import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SmsImportPage } from './sms-import.page';

const routes: Routes = [{ path: '', component: SmsImportPage }];

@NgModule({
  imports: [SmsImportPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class SmsImportPageModule {}
