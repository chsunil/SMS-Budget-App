// ─── src/app/features/wallet/wallet.module.ts ───
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { WalletPage } from './wallet.page';

const routes: Routes = [{ path: '', component: WalletPage }];

@NgModule({
    imports: [WalletPage, RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class WalletPageModule { }