// ─── src/app/features/messages/messages.module.ts ─
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MessagesPage } from './messages.page';

const routes: Routes = [{ path: '', component: MessagesPage }];

@NgModule({
  imports: [MessagesPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class MessagesPageModule {}