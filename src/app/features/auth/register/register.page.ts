// ─── src/app/features/auth/register/register.page.ts ─
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, RouterModule],
  template: `
    <ion-content [fullscreen]="true">
      <div class="auth-page">

        <!-- Brand -->
        <div class="auth-brand">
          <div class="auth-logo">₹</div>
          <h1 class="display-title" style="font-size:24px;margin-bottom:4px">Get Started</h1>
          <p class="muted" style="font-size:13px">Create your free budget account</p>
        </div>

        <!-- Form card -->
        <div class="auth-card">

          <div class="field-group">
            <label class="field-label">Full Name</label>
            <div class="f-icon-wrap">
              <ion-icon name="person-outline" class="f-icon"></ion-icon>
              <input type="text" [(ngModel)]="name" placeholder="Arjun Kumar"
                class="f-input f-input-icon"/>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Email</label>
            <div class="f-icon-wrap">
              <ion-icon name="mail-outline" class="f-icon"></ion-icon>
              <input type="email" [(ngModel)]="email" placeholder="you@example.com"
                class="f-input f-input-icon" autocomplete="email"/>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Monthly Income (₹)</label>
            <div class="f-icon-wrap">
              <ion-icon name="cash-outline" class="f-icon"></ion-icon>
              <input type="number" [(ngModel)]="income" placeholder="88500"
                class="f-input f-input-icon"/>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Password</label>
            <div class="f-icon-wrap">
              <ion-icon name="lock-closed-outline" class="f-icon"></ion-icon>
              <input [type]="showPass ? 'text' : 'password'" [(ngModel)]="password"
                placeholder="Min. 6 characters"
                class="f-input f-input-icon" autocomplete="new-password"/>
              <ion-icon [name]="showPass ? 'eye-off-outline' : 'eye-outline'"
                class="f-icon-end" (click)="showPass = !showPass"></ion-icon>
            </div>
          </div>

          <!-- Income preview -->
          <div class="income-preview" *ngIf="income > 0">
            <div class="field-label" style="margin-bottom:10px">Your budget breakdown</div>
            <div class="preview-rows">
              <div class="preview-row" *ngFor="let cat of getPreview()">
                <span style="font-size:15px">{{ cat.icon }}</span>
                <span class="muted" style="flex:1;font-size:12px">{{ cat.name }}</span>
                <span style="font-family:var(--font-display);font-size:12px;font-weight:700"
                  [style.color]="cat.color">₹{{ cat.amount | number }}</span>
              </div>
            </div>
          </div>

          <button class="btn btn-primary full" (click)="register()" [disabled]="loading"
            style="margin-top:4px">
            <ion-spinner *ngIf="loading" name="crescent"></ion-spinner>
            <span *ngIf="!loading">Create Account</span>
          </button>
        </div>

        <div class="auth-footer">
          Already have an account?
          <span class="auth-link" routerLink="/auth/login"> Sign in</span>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: var(--bg); }

    .auth-page {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 32px var(--pg); max-width: 420px; margin: 0 auto;
    }

    .auth-brand { text-align: center; margin-bottom: 28px; }
    .auth-logo {
      width: 64px; height: 64px; border-radius: 20px;
      background: linear-gradient(135deg, var(--violet), var(--violet-dark));
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display); font-size: 28px; font-weight: 800; color: white;
      margin: 0 auto 16px; box-shadow: var(--shadow-violet);
    }

    .auth-card {
      width: 100%; background: var(--surface); border-radius: var(--r-2xl);
      padding: 24px; border: 1px solid var(--border);
      box-shadow: var(--shadow); margin-bottom: 20px;
    }

    .income-preview {
      background: var(--surface2); border-radius: var(--r);
      padding: 14px; margin-bottom: 16px; border: 1px solid var(--border);
    }
    .preview-rows { display: flex; flex-direction: column; gap: 7px; }
    .preview-row  { display: flex; align-items: center; gap: 8px; }

    .auth-footer { font-size: 13px; color: var(--muted); text-align: center; }
    .auth-link   { color: var(--violet); font-weight: 600; cursor: pointer; }
  `]
})
export class RegisterPage {
  name = '';
  email = '';
  password = '';
  income = 88500;
  showPass = false;
  loading = false;

  private readonly CATS = [
    { icon: '🏦', name: 'Fixed Costs', pct: 55, color: '#f59e0b' },
    { icon: '🛒', name: 'Food & Home', pct: 10, color: '#3b82f6' },
    { icon: '💰', name: 'Savings', pct: 20, color: '#10b981' },
    { icon: '🌿', name: 'Self-Growth', pct: 5, color: '#8b5cf6' },
    { icon: '🎉', name: 'Fun & Family', pct: 7, color: '#f97316' },
    { icon: '💖', name: 'Giving', pct: 3, color: '#ec4899' },
  ];

  constructor(private authService: AuthService) { }

  getPreview() {
    return this.CATS.map(c => ({ ...c, amount: Math.round(this.income * c.pct / 100) }));
  }

  async register() {
    if (!this.name || !this.email || !this.password) return;
    this.loading = true;
    try {
      await this.authService.register(this.name, this.email, this.password);
    } finally {
      this.loading = false;
    }
  }
}