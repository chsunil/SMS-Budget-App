import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginPage } from './login.page';

const routes: Routes = [{ path: '', component: LoginPage }];

@NgModule({
  imports: [LoginPage, RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class LoginPageModule {}
