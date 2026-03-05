// ─── src/app/features/auth/login/login.page.ts ──
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  template: `
    <ion-content [fullscreen]="true">
      <div class="auth-wrap">

        <!-- Logo & Brand -->
        <div class="brand">
          <div class="brand-icon">₹</div>
          <h1 class="display-title">SMS Budget</h1>
          <p class="muted">Smart money. Automatically tracked.</p>
        </div>

        <!-- Login Form -->
        <div class="auth-card">
          <h2 class="form-title">Welcome back</h2>
          <p class="muted" style="font-size:13px;margin-bottom:24px">Sign in to your account</p>

          <div class="field-group">
            <label class="field-label">Email</label>
            <div class="input-wrap">
              <ion-icon name="mail-outline" class="input-icon"></ion-icon>
              <input type="email" [(ngModel)]="email" placeholder="you@example.com"
                class="auth-input" autocomplete="email"/>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Password</label>
            <div class="input-wrap">
              <ion-icon name="lock-closed-outline" class="input-icon"></ion-icon>
              <input [type]="showPass ? 'text' : 'password'" [(ngModel)]="password"
                placeholder="••••••••" class="auth-input" autocomplete="current-password"/>
              <ion-icon [name]="showPass ? 'eye-off-outline' : 'eye-outline'"
                class="input-icon-end" (click)="showPass = !showPass">
              </ion-icon>
            </div>
          </div>

          <div class="forgot-wrap">
            <span class="forgot-link" (click)="forgotPassword()">Forgot password?</span>
          </div>

          <button class="auth-btn primary" (click)="login()" [disabled]="loading">
            <span *ngIf="!loading">Sign In</span>
            <ion-spinner *ngIf="loading" name="crescent" style="width:20px;height:20px"></ion-spinner>
          </button>

          <!-- Divider -->
          <div class="divider">
            <span class="divider-line"></span>
            <span class="divider-text">or</span>
            <span class="divider-line"></span>
          </div>

          <!-- Guest Login -->
          <button class="auth-btn guest" (click)="guestLogin()" [disabled]="loading">
            <ion-icon name="person-outline" style="font-size:16px;margin-right:8px"></ion-icon>
            Continue as Guest
          </button>

          <p class="guest-note">
            <ion-icon name="information-circle-outline" style="font-size:13px;vertical-align:-2px"></ion-icon>
            Guest mode uses demo data — no account needed
          </p>
        </div>

        <!-- Register Link -->
        <div class="auth-footer">
          Don't have an account?
          <span class="auth-link" routerLink="/auth/register"> Create one</span>
        </div>

      </div>
    </ion-content>
  `,
  styles: []
})
export class LoginPage {
  email = '';
  password = '';
  showPass = false;
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  async login() {
    if (!this.email || !this.password) return;
    this.loading = true;
    try {
      await this.authService.login(this.email, this.password);
    } finally {
      this.loading = false;
    }
  }

  async guestLogin() {
    this.loading = true;
    try {
      await this.authService.loginAsGuest();
    } finally {
      this.loading = false;
    }
  }

  async forgotPassword() {
    if (!this.email) {
      alert('Please enter your email address first.');
      return;
    }
    await this.authService.resetPassword(this.email);
  }
}