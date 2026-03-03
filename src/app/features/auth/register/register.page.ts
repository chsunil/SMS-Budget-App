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
      <div class="auth-wrap">
        <div class="brand">
          <div class="brand-icon">₹</div>
          <h1 class="display-title">Get Started</h1>
          <p class="muted">Create your free budget account</p>
        </div>

        <div class="auth-card">
          <div class="field-group">
            <label class="field-label">Full Name</label>
            <div class="input-wrap">
              <ion-icon name="person-outline" class="input-icon"></ion-icon>
              <input type="text" [(ngModel)]="name" placeholder="Arjun Kumar" class="auth-input"/>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Email</label>
            <div class="input-wrap">
              <ion-icon name="mail-outline" class="input-icon"></ion-icon>
              <input type="email" [(ngModel)]="email" placeholder="you@example.com" class="auth-input"/>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Monthly Income (₹)</label>
            <div class="input-wrap">
              <ion-icon name="cash-outline" class="input-icon"></ion-icon>
              <input type="number" [(ngModel)]="income" placeholder="88500" class="auth-input"/>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label">Password</label>
            <div class="input-wrap">
              <ion-icon name="lock-closed-outline" class="input-icon"></ion-icon>
              <input [type]="showPass ? 'text' : 'password'" [(ngModel)]="password"
                placeholder="Min. 6 characters" class="auth-input"/>
              <ion-icon [name]="showPass ? 'eye-off-outline' : 'eye-outline'"
                class="input-icon-end" (click)="showPass = !showPass"></ion-icon>
            </div>
          </div>

          <div class="income-preview" *ngIf="income > 0">
            <div class="preview-title">Your budget breakdown</div>
            <div class="preview-grid">
              <div class="preview-item" *ngFor="let cat of getPreview()">
                <span class="preview-icon">{{ cat.icon }}</span>
                <span class="preview-name">{{ cat.name }}</span>
                <span class="preview-amt" [style.color]="cat.color">₹{{ cat.amount | number }}</span>
              </div>
            </div>
          </div>

          <button class="auth-btn primary" (click)="register()" [disabled]="loading">
            <span *ngIf="!loading">Create Account</span>
            <ion-spinner *ngIf="loading" name="crescent" style="width:20px;height:20px"></ion-spinner>
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
    .brand { text-align: center; margin-bottom: 28px; }
    .brand-icon {
      width: 64px; height: 64px;
      border-radius: 20px;
      background: linear-gradient(135deg, var(--accent), var(--orange));
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display);
      font-size: 28px; font-weight: 800;
      color: #0b0f1a;
      margin: 0 auto 16px;
      box-shadow: var(--shadow-glow-gold);
    }
    .brand h1 { font-size: 24px; margin-bottom: 4px; }

    .auth-card {
      width: 100%;
      background: var(--surface);
      border-radius: 24px;
      padding: 24px;
      border: 1px solid var(--border);
      margin-bottom: 20px;
    }
    .field-group { margin-bottom: 14px; }
    .field-label {
      display: block;
      font-size: 11px; font-weight: 600;
      color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 7px;
    }
    .input-wrap { position: relative; display: flex; align-items: center; }
    .input-icon { position: absolute; left: 14px; color: var(--muted); font-size: 17px; }
    .input-icon-end { position: absolute; right: 14px; color: var(--muted); font-size: 17px; cursor: pointer; }
    .auth-input {
      width: 100%;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 44px;
      color: var(--text);
      font-family: var(--font-body);
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
      &:focus { border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-dim); }
      &::placeholder { color: var(--muted); }
    }

    /* Income Preview */
    .income-preview {
      background: var(--surface2);
      border-radius: var(--radius);
      padding: 14px;
      margin-bottom: 16px;
      border: 1px solid var(--border);
    }
    .preview-title {
      font-size: 11px; font-weight: 700;
      color: var(--muted);
      text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 10px;
    }
    .preview-grid { display: flex; flex-direction: column; gap: 7px; }
    .preview-item {
      display: flex; align-items: center; gap: 8px; font-size: 12px;
    }
    .preview-icon { font-size: 14px; }
    .preview-name { flex: 1; color: var(--muted); }
    .preview-amt { font-weight: 700; font-family: var(--font-display); }

    .auth-btn {
      width: 100%; padding: 15px;
      border-radius: var(--radius); border: none;
      font-family: var(--font-display);
      font-size: 15px; font-weight: 700;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: opacity 0.2s;
      &.primary { background: var(--accent); color: #0b0f1a; box-shadow: var(--shadow-glow-gold); }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .auth-footer { font-size: 13px; color: var(--muted); text-align: center; }
    .auth-link { color: var(--accent); font-weight: 600; cursor: pointer; }
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
    { icon: '🏦', name: 'Fixed Costs', pct: 55, color: '#f5c842' },
    { icon: '🛒', name: 'Food & Home', pct: 10, color: '#60a5fa' },
    { icon: '💰', name: 'Savings', pct: 20, color: '#3ecf8e' },
    { icon: '🌿', name: 'Self-Growth', pct: 5, color: '#a78bfa' },
    { icon: '🎉', name: 'Fun & Family', pct: 7, color: '#fb923c' },
    { icon: '💖', name: 'Giving', pct: 3, color: '#f472b6' },
  ];

  constructor(private authService: AuthService) {}

  getPreview() {
    return this.CATS.map(c => ({
      ...c,
      amount: Math.round(this.income * c.pct / 100)
    }));
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
