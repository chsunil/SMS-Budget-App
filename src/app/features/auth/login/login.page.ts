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
      <div class="login-bg">
        <!-- Decorative circles -->
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>

        <div class="login-wrap">
          <!-- Brand -->
          <div class="brand">
            <div class="brand-logo">
              <span class="logo-rupee">₹</span>
            </div>
            <h1 class="brand-name">SMS Budget</h1>
            <p class="brand-sub">Hello, Welcome back! 👋</p>
            <p class="brand-desc">Sign in to track your daily bills & expenses</p>
          </div>

          <!-- Form Card -->
          <div class="form-card">
            <div class="field-group">
              <label class="field-label">Email address</label>
              <div class="input-wrap">
                <ion-icon name="mail-outline" class="input-icon"></ion-icon>
                <input type="email" [(ngModel)]="email"
                  placeholder="you@example.com" class="v-input"
                  autocomplete="email"/>
              </div>
            </div>

            <div class="field-group">
              <label class="field-label">Password</label>
              <div class="input-wrap">
                <ion-icon name="lock-closed-outline" class="input-icon"></ion-icon>
                <input [type]="showPass ? 'text' : 'password'" [(ngModel)]="password"
                  placeholder="••••••••" class="v-input"
                  autocomplete="current-password"/>
                <ion-icon [name]="showPass ? 'eye-off-outline' : 'eye-outline'"
                  class="input-icon-end" (click)="showPass = !showPass">
                </ion-icon>
              </div>
            </div>

            <div class="forgot-row">
              <span class="forgot-link" (click)="forgotPassword()">Forgot password?</span>
            </div>

            <button class="sign-btn" (click)="login()" [disabled]="loading">
              <span *ngIf="!loading">SIGN IN</span>
              <ion-spinner *ngIf="loading" name="crescent" style="width:20px;height:20px;--color:#6c3fff"></ion-spinner>
            </button>
            <button class="sign-btn" href="/tabs/dashboard">
              <span *ngIf="!loading">Guest Login</span>
              <ion-spinner *ngIf="loading" name="crescent" style="width:20px;height:20px;--color:#6c3fff"></ion-spinner>
            </button>

            <div class="divider">
              <span class="divider-line"></span>
              <span class="divider-text">or continue with</span>
              <span class="divider-line"></span>
            </div>

            <div class="social-row">
              <button class="social-btn">
                <ion-icon name="logo-google"></ion-icon>
              </button>
              <button class="social-btn">
                <ion-icon name="logo-apple"></ion-icon>
              </button>
              <button class="social-btn">
                <ion-icon name="logo-facebook"></ion-icon>
              </button>
            </div>
          </div>

          <div class="register-row">
            Don't have an account?
            <span class="register-link" routerLink="/auth/register"> Sign up</span>
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: transparent; }

    .login-bg {
      min-height: 100vh;
      background: linear-gradient(160deg, #7c3aed 0%, #6d28d9 35%, #5b21b6 65%, #4c1d95 100%);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Decorative circles */
    .circle {
      position: absolute;
      border-radius: 50%;
      opacity: 0.12;
      background: white;
    }
    .circle-1 { width: 280px; height: 280px; top: -80px; right: -60px; }
    .circle-2 { width: 180px; height: 180px; top: 60px; right: 80px; opacity: 0.06; }
    .circle-3 { width: 220px; height: 220px; bottom: -60px; left: -80px; opacity: 0.08; }

    .login-wrap {
      width: 100%;
      max-width: 420px;
      padding: 52px 24px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
      z-index: 2;
    }

    /* Brand */
    .brand { text-align: center; margin-bottom: 36px; }
    .brand-logo {
      width: 70px; height: 70px;
      border-radius: 22px;
      background: rgba(255,255,255,0.18);
      backdrop-filter: blur(12px);
      border: 1.5px solid rgba(255,255,255,0.3);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .logo-rupee { font-size: 32px; color: white; font-weight: 900; }
    .brand-name {
      font-family: 'Syne', sans-serif;
      font-size: 28px; font-weight: 800;
      color: white; margin-bottom: 12px;
    }
    .brand-sub {
      font-size: 20px; font-weight: 700;
      color: white; margin-bottom: 6px;
    }
    .brand-desc { font-size: 13px; color: rgba(255,255,255,0.7); line-height: 1.5; }

    /* Form Card */
    .form-card {
      width: 100%;
      background: white;
      border-radius: 28px;
      padding: 28px 24px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.25);
      margin-bottom: 20px;
    }

    .field-group { margin-bottom: 18px; }
    .field-label {
      display: block;
      font-size: 12px; font-weight: 600;
      color: #6b7280;
      margin-bottom: 8px;
      letter-spacing: 0.3px;
    }
    .input-wrap { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 14px; color: #9ca3af; font-size: 18px; }
    .input-icon-end { position: absolute; right: 14px; color: #9ca3af; font-size: 18px; cursor: pointer; }
    .v-input {
      width: 100%;
      background: #f9fafb;
      border: 1.5px solid #e5e7eb;
      border-radius: 14px;
      padding: 13px 44px;
      color: #111827;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
      &::placeholder { color: #d1d5db; }
    }

    .forgot-row { display: flex; justify-content: flex-end; margin-bottom: 20px; }
    .forgot-link { font-size: 12px; color: #7c3aed; font-weight: 600; cursor: pointer; }

    .sign-btn {
      width: 100%; padding: 15px;
      border-radius: 14px; border: none;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: white;
      font-family: 'Syne', sans-serif;
      font-size: 15px; font-weight: 700;
      letter-spacing: 1px;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 24px rgba(109,40,217,0.4);
      transition: opacity 0.2s, transform 0.1s;
      &:active { transform: scale(0.98); }
      &:disabled { opacity: 0.6; }
    }

    .divider {
      display: flex; align-items: center; gap: 12px;
      margin: 20px 0;
    }
    .divider-line { flex: 1; height: 1px; background: #e5e7eb; }
    .divider-text { font-size: 12px; color: #9ca3af; white-space: nowrap; }

    .social-row { display: flex; gap: 12px; }
    .social-btn {
      flex: 1; padding: 12px;
      border-radius: 12px; border: 1.5px solid #e5e7eb;
      background: white; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; color: #374151;
      transition: background 0.2s;
      &:hover { background: #f9fafb; }
    }

    .register-row { font-size: 13px; color: rgba(255,255,255,0.8); text-align: center; }
    .register-link { color: white; font-weight: 700; cursor: pointer; }
  `]
})
export class LoginPage {
  email = '';
  password = '';
  showPass = false;
  loading = false;

  constructor(private authService: AuthService) { }

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
    if (!this.email) { alert('Please enter your email address first.'); return; }
    await this.authService.resetPassword(this.email);
  }
}