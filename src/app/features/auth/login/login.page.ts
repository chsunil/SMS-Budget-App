// ─── src/app/features/auth/login/login.page.ts ──
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
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
              <input
                type="email"
                [(ngModel)]="email"
                placeholder="you@example.com"
                class="auth-input"
                autocomplete="email"
              />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Password</label>
            <div class="input-wrap">
              <ion-icon name="lock-closed-outline" class="input-icon"></ion-icon>
              <input
                [type]="showPass ? 'text' : 'password'"
                [(ngModel)]="password"
                placeholder="••••••••"
                class="auth-input"
                autocomplete="current-password"
              />
              <ion-icon
                [name]="showPass ? 'eye-off-outline' : 'eye-outline'"
                class="input-icon-end"
                (click)="showPass = !showPass">
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
        </div>

        <!-- Register Link -->
        <div class="auth-footer">
          Don't have an account?
          <span class="auth-link" routerLink="/auth/register"> Create one</span>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: var(--bg); }
    .auth-wrap {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 24px;
      max-width: 420px;
      margin: 0 auto;
    }
    .brand {
      text-align: center;
      margin-bottom: 36px;
    }
    .brand-icon {
      width: 64px; height: 64px;
      border-radius: 20px;
      background: linear-gradient(135deg, var(--accent), var(--orange));
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display);
      font-size: 28px;
      font-weight: 800;
      color: #0b0f1a;
      margin: 0 auto 16px;
      box-shadow: var(--shadow-glow-gold);
    }
    .brand h1 { font-size: 26px; margin-bottom: 6px; }

    .auth-card {
      width: 100%;
      background: var(--surface);
      border-radius: 24px;
      padding: 28px 24px;
      border: 1px solid var(--border);
      margin-bottom: 20px;
    }
    .form-title {
      font-family: var(--font-display);
      font-size: 20px;
      font-weight: 800;
      margin-bottom: 4px;
    }
    .field-group { margin-bottom: 16px; }
    .field-label {
      display: block;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 8px;
    }
    .input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .input-icon {
      position: absolute;
      left: 14px;
      color: var(--muted);
      font-size: 17px;
      z-index: 1;
    }
    .input-icon-end {
      position: absolute;
      right: 14px;
      color: var(--muted);
      font-size: 17px;
      cursor: pointer;
    }
    .auth-input {
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 13px 44px;
      color: var(--text);
      font-family: var(--font-body);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-dim);
      }
      &::placeholder { color: var(--muted); }
    }
    .forgot-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }
    .forgot-link {
      font-size: 12px;
      color: var(--accent);
      cursor: pointer;
      font-weight: 600;
    }
    .auth-btn {
      width: 100%;
      padding: 15px;
      border-radius: var(--radius);
      border: none;
      font-family: var(--font-display);
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.2s;
      &.primary {
        background: var(--accent);
        color: #0b0f1a;
        box-shadow: var(--shadow-glow-gold);
      }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .auth-footer { font-size: 13px; color: var(--muted); text-align: center; }
    .auth-link { color: var(--accent); font-weight: 600; cursor: pointer; }
  `]
})
export class LoginPage {
  email = '';
  password = '';
  showPass = false;
  loading = false;

  constructor(private authService: AuthService) {}

  async login() {
    if (!this.email || !this.password) return;
    this.loading = true;
    try {
      await this.authService.login(this.email, this.password);
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
