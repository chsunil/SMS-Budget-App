import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MerchantRulesPage } from './merchant-rules.page';

const routes: Routes = [{ path: '', component: MerchantRulesPage }];

@NgModule({
    imports: [MerchantRulesPage, RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class MerchantRulesPageModule { }