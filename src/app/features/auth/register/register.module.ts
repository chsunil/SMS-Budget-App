import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RegisterPage } from './register.page';

const routes: Routes = [{ path: '', component: RegisterPage }];

@NgModule({
  imports: [RegisterPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RegisterPageModule {}
