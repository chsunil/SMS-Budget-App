// ─── Updated Login Page with Modern Gradient UI ─
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
      <div class="auth-background">
        <div class="gradient-blob blob-1"></div>
        <div class="gradient-blob blob-2"></div>
      </div>

      <div class="auth-wrap">
        <!-- Logo & Brand -->
        <div class="brand animate-fade-up">
          <div class="brand-icon">
            <span class="icon-text">₹</span>
          </div>
          <h1 class="brand-title gradient-text">SMS Budget</h1>
          <p class="brand-subtitle">Smart money tracking, automated</p>
        </div>

        <!-- Login Form -->
        <div class="auth-card animate-fade-up" style="animation-delay: 0.1s">
          <div class="card-header">
            <h2 class="card-title">Welcome back!</h2>
            <p class="card-subtitle">Sign in to continue managing your budget</p>
          </div>

          <div class="field-group">
            <label class="field-label">
              <ion-icon name="mail-outline"></ion-icon>
              Email Address
            </label>
            <div class="input-wrap">
              <input
                type="email"
                [(ngModel)]="email"
                placeholder="you@example.com"
                class="modern-input"
                autocomplete="email"
                (keyup.enter)="login()"
              />
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">
              <ion-icon name="lock-closed-outline"></ion-icon>
              Password
            </label>
            <div class="input-wrap">
              <input
                [type]="showPass ? 'text' : 'password'"
                [(ngModel)]="password"
                placeholder="Enter your password"
                class="modern-input"
                autocomplete="current-password"
                (keyup.enter)="login()"
              />
              <button class="toggle-pass" (click)="showPass = !showPass" type="button">
                <ion-icon [name]="showPass ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
              </button>
            </div>
          </div>

          <div class="forgot-wrap">
            <span class="forgot-link" (click)="forgotPassword()">
              <ion-icon name="key-outline"></ion-icon>
              Forgot password?
            </span>
          </div>

          <button class="gradient-btn" (click)="login()" [disabled]="loading || !email || !password">
            <span *ngIf="!loading" class="btn-content">
              <ion-icon name="log-in-outline"></ion-icon>
              Sign In
            </span>
            <ion-spinner *ngIf="loading" name="crescent"></ion-spinner>
          </button>
        </div>

        <!-- Register Link -->
        <div class="auth-footer animate-fade-up" style="animation-delay: 0.2s">
          <p class="footer-text">
            Don't have an account?
            <span class="footer-link" routerLink="/auth/register">Create one free</span>
          </p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--bg);
    }

    .auth-background {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
      z-index: 0;
    }

    .gradient-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.3;
      animation: float 20s infinite;
    }

    .blob-1 {
      width: 400px;
      height: 400px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      top: -200px;
      right: -100px;
    }

    .blob-2 {
      width: 300px;
      height: 300px;
      background: linear-gradient(135deg, var(--accent), var(--primary));
      bottom: -150px;
      left: -100px;
      animation-delay: -10s;
    }

    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(30px, -30px) scale(1.1); }
      66% { transform: translate(-20px, 20px) scale(0.9); }
    }

    .auth-wrap {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      max-width: 440px;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }

    .brand {
      text-align: center;
      margin-bottom: 40px;
    }

    .brand-icon {
      width: 80px;
      height: 80px;
      border-radius: 24px;
      background: linear-gradient(135deg, var(--primary), var(--accent));
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 20px;
      box-shadow: 0 12px 40px rgba(124,58,237,0.4);
      position: relative;
      
      &::before {
        content: '';
        position: absolute;
        inset: -2px;
        border-radius: 26px;
        padding: 2px;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
        -webkit-mask-composite: xor;
        mask-composite: exclude;
        opacity: 0.5;
      }
    }

    .icon-text {
      font-family: var(--font-display);
      font-size: 40px;
      font-weight: 800;
      color: #ffffff;
    }

    .brand-title {
      font-family: var(--font-display);
      font-size: 32px;
      font-weight: 800;
      margin-bottom: 8px;
      letter-spacing: -0.5px;
    }

    .brand-subtitle {
      font-size: 15px;
      color: var(--muted);
      font-weight: 500;
    }

    .auth-card {
      width: 100%;
      background: var(--surface);
      border-radius: 28px;
      padding: 32px 28px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-lg);
      margin-bottom: 24px;
      backdrop-filter: blur(20px);
    }

    .card-header {
      margin-bottom: 28px;
    }

    .card-title {
      font-family: var(--font-display);
      font-size: 24px;
      font-weight: 800;
      color: var(--text);
      margin-bottom: 8px;
    }

    .card-subtitle {
      font-size: 14px;
      color: var(--muted);
      font-weight: 500;
    }

    .field-group {
      margin-bottom: 20px;
    }

    .field-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 10px;
      
      ion-icon {
        font-size: 16px;
        color: var(--primary);
      }
    }

    .input-wrap {
      position: relative;
    }

    .modern-input {
      width: 100%;
      background: var(--surface2);
      border: 2px solid var(--border);
      border-radius: 14px;
      padding: 16px 18px;
      color: var(--text);
      font-family: var(--font-body);
      font-size: 15px;
      outline: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      &::placeholder {
        color: var(--muted);
        opacity: 0.6;
      }
      
      &:focus {
        border-color: var(--primary);
        box-shadow: 0 0 0 4px var(--primary-dim);
        background: var(--surface3);
      }
    }

    .toggle-pass {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      transition: all 0.3s;
      
      ion-icon {
        font-size: 20px;
      }
      
      &:hover {
        color: var(--primary);
        background: var(--primary-dim);
      }
    }

    .forgot-wrap {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }

    .forgot-link {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--primary);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      
      ion-icon {
        font-size: 16px;
      }
      
      &:hover {
        color: var(--primary-light);
        transform: translateX(2px);
      }
    }

    .gradient-btn {
      width: 100%;
      height: 56px;
      padding: 0 28px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      color: #ffffff;
      font-family: var(--font-display);
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.3px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 8px 24px rgba(124,58,237,0.3);
      position: relative;
      overflow: hidden;
      
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, var(--primary-light) 0%, var(--accent) 100%);
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 12px 32px rgba(124,58,237,0.4);
        
        &::before {
          opacity: 1;
        }
      }
      
      &:active:not(:disabled) {
        transform: translateY(0);
      }
      
      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .btn-content {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
      z-index: 1;
      
      ion-icon {
        font-size: 20px;
      }
    }

    ion-spinner {
      --color: #ffffff;
      width: 24px;
      height: 24px;
    }

    .auth-footer {
      text-align: center;
    }

    .footer-text {
      font-size: 14px;
      color: var(--muted);
      font-weight: 500;
    }

    .footer-link {
      color: var(--primary);
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s;
      display: inline-block;
      
      &:hover {
        color: var(--primary-light);
        transform: translateX(2px);
      }
    }

    @media (max-height: 700px) {
      .auth-wrap {
        padding: 24px;
      }
      
      .brand {
        margin-bottom: 24px;
      }
      
      .brand-icon {
        width: 64px;
        height: 64px;
      }
      
      .icon-text {
        font-size: 32px;
      }
    }
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
    if (!this.email) {
      alert('Please enter your email address first.');
      return;
    }
    await this.authService.resetPassword(this.email);
  }
}