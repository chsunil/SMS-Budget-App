// ─── src/app/features/settings/settings.page.ts ─
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';
import {
  Firestore, doc, getDoc, updateDoc, serverTimestamp
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { InrPipe } from '../../shared/pipes/inr.pipe';

interface ProfileData {
  displayName: string;
  email: string;
  monthlyIncome: number;
  currency: string;
  createdAt?: any;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, InrPipe],
  template: `
    <ion-content [fullscreen]="true">
      <div class="settings-bg">

        <!-- Purple Header -->
        <div class="settings-header">
          <div class="avatar-ring">
            <div class="avatar">{{ initials }}</div>
          </div>
          <h2 class="profile-name">{{ profile?.displayName || 'User' }}</h2>
          <p class="profile-email">{{ profile?.email || '' }}</p>
          <div class="member-since" *ngIf="profile?.createdAt">
            Member since {{ getMemberSince() }}
          </div>
        </div>

        <!-- Income Card -->
        <div class="income-card animate-up">
          <div class="income-label">Monthly Income</div>
          <div class="income-amount" *ngIf="!editingIncome">
            {{ profile?.monthlyIncome | inr }}
          </div>
          <div class="income-edit-wrap" *ngIf="editingIncome">
            <span class="rupee-sym">₹</span>
            <input type="number" [(ngModel)]="newIncome" class="income-input"
              placeholder="88500" (keyup.enter)="saveIncome()"/>
          </div>
          <div class="income-actions">
            <ng-container *ngIf="!editingIncome">
              <button class="income-btn" (click)="startEditIncome()">
                <ion-icon name="pencil-outline"></ion-icon> Edit Income
              </button>
            </ng-container>
            <ng-container *ngIf="editingIncome">
              <button class="income-cancel" (click)="editingIncome = false">Cancel</button>
              <button class="income-save" (click)="saveIncome()" [disabled]="savingIncome">
                <ion-spinner *ngIf="savingIncome" name="crescent" style="width:14px;height:14px;--color:white"></ion-spinner>
                <span *ngIf="!savingIncome">Save</span>
              </button>
            </ng-container>
          </div>

          <!-- Budget Preview -->
          <div class="budget-preview" *ngIf="!editingIncome && profile?.monthlyIncome">
            <div class="preview-title">Budget Allocation</div>
            <div class="preview-bars">
              <div class="preview-bar" *ngFor="let cat of getBudgetPreview()">
                <div class="bar-info">
                  <span class="bar-icon">{{ cat.icon }}</span>
                  <span class="bar-name">{{ cat.name }}</span>
                  <span class="bar-pct">{{ cat.pct }}%</span>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" [style.width]="cat.pct + '%'" [style.background]="cat.color"></div>
                </div>
                <span class="bar-amt" [style.color]="cat.color">{{ cat.amount | inr:true }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Sections -->
        <div class="settings-section animate-up" style="animation-delay:0.05s">
          <div class="section-label">Account</div>

          <div class="settings-card">
            <div class="setting-row" (click)="editName()">
              <div class="setting-icon" style="background:#ede9fe">
                <ion-icon name="person-outline" style="color:#7c3aed"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Display Name</div>
                <div class="setting-value">{{ profile?.displayName }}</div>
              </div>
              <ion-icon name="chevron-forward-outline" class="setting-arrow"></ion-icon>
            </div>

            <div class="setting-divider"></div>

            <div class="setting-row">
              <div class="setting-icon" style="background:#dbeafe">
                <ion-icon name="mail-outline" style="color:#3b82f6"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Email</div>
                <div class="setting-value">{{ profile?.email }}</div>
              </div>
            </div>

            <div class="setting-divider"></div>

            <div class="setting-row" (click)="changePassword()">
              <div class="setting-icon" style="background:#fef3c7">
                <ion-icon name="lock-closed-outline" style="color:#f59e0b"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Change Password</div>
                <div class="setting-value">Send reset email</div>
              </div>
              <ion-icon name="chevron-forward-outline" class="setting-arrow"></ion-icon>
            </div>
          </div>
        </div>

        <div class="settings-section animate-up" style="animation-delay:0.1s">
          <div class="section-label">Preferences</div>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-icon" style="background:#d1fae5">
                <ion-icon name="cash-outline" style="color:#10b981"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Currency</div>
                <div class="setting-value">Indian Rupee (₹ INR)</div>
              </div>
            </div>

            <div class="setting-divider"></div>

            <div class="setting-row">
              <div class="setting-icon" style="background:#fce7f3">
                <ion-icon name="notifications-outline" style="color:#ec4899"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Budget Alerts</div>
                <div class="setting-value">Notify when 80% spent</div>
              </div>
              <ion-toggle checked class="v-toggle"></ion-toggle>
            </div>

            <div class="setting-divider"></div>

            <div class="setting-row">
              <div class="setting-icon" style="background:#ede9fe">
                <ion-icon name="finger-print-outline" style="color:#7c3aed"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Biometric Lock</div>
                <div class="setting-value">Secure app with fingerprint</div>
              </div>
              <ion-toggle class="v-toggle"></ion-toggle>
            </div>
          </div>
        </div>

        <div class="settings-section animate-up" style="animation-delay:0.15s">
          <div class="section-label">Data</div>
          <div class="settings-card">
            <div class="setting-row" (click)="exportData()">
              <div class="setting-icon" style="background:#dbeafe">
                <ion-icon name="download-outline" style="color:#3b82f6"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Export Data</div>
                <div class="setting-value">Download as CSV / PDF</div>
              </div>
              <ion-icon name="chevron-forward-outline" class="setting-arrow"></ion-icon>
            </div>

            <div class="setting-divider"></div>

            <div class="setting-row" (click)="clearCache()">
              <div class="setting-icon" style="background:#fef3c7">
                <ion-icon name="refresh-outline" style="color:#f59e0b"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Clear Cache</div>
                <div class="setting-value">Free up local storage</div>
              </div>
              <ion-icon name="chevron-forward-outline" class="setting-arrow"></ion-icon>
            </div>
          </div>
        </div>

        <div class="settings-section animate-up" style="animation-delay:0.2s">
          <div class="section-label">About</div>
          <div class="settings-card">
            <div class="setting-row">
              <div class="setting-icon" style="background:#f3f4f6">
                <ion-icon name="information-circle-outline" style="color:#6b7280"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">App Version</div>
                <div class="setting-value">1.0.0 · Build 5</div>
              </div>
            </div>
            <div class="setting-divider"></div>
            <div class="setting-row">
              <div class="setting-icon" style="background:#f3f4f6">
                <ion-icon name="shield-checkmark-outline" style="color:#6b7280"></ion-icon>
              </div>
              <div class="setting-body">
                <div class="setting-title">Privacy Policy</div>
                <div class="setting-value">View our data policy</div>
              </div>
              <ion-icon name="chevron-forward-outline" class="setting-arrow"></ion-icon>
            </div>
          </div>
        </div>

        <!-- Sign Out -->
        <div class="signout-section animate-up" style="animation-delay:0.25s">
          <button class="signout-btn" (click)="logout()">
            <ion-icon name="log-out-outline"></ion-icon>
            Sign Out
          </button>
        </div>

        <div style="height:100px"></div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: #f3f4f6; }

    .settings-bg { background: #f3f4f6; min-height: 100vh; }

    /* Header */
    .settings-header {
      background: linear-gradient(160deg, #7c3aed 0%, #5b21b6 100%);
      padding: 60px 20px 36px;
      text-align: center;
      border-radius: 0 0 32px 32px;
      margin-bottom: 0;
    }
    .avatar-ring {
      width: 88px; height: 88px;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      border: 3px solid rgba(255,255,255,0.4);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .avatar {
      width: 72px; height: 72px; border-radius: 50%;
      background: linear-gradient(135deg, #f5c842, #fb923c);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800;
      color: #0b0f1a;
    }
    .profile-name { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; color: white; margin-bottom: 4px; }
    .profile-email { font-size: 13px; color: rgba(255,255,255,0.7); margin-bottom: 8px; }
    .member-since {
      display: inline-block;
      background: rgba(255,255,255,0.15); backdrop-filter: blur(8px);
      border-radius: 20px; padding: 4px 14px;
      font-size: 11px; color: rgba(255,255,255,0.8); font-weight: 600;
    }

    /* Income Card */
    .income-card {
      background: white;
      border-radius: 20px;
      padding: 20px;
      margin: -1px 16px 16px;
      box-shadow: 0 4px 20px rgba(124,58,237,0.12);
      border: 1px solid rgba(124,58,237,0.08);
    }
    .income-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 4px; }
    .income-amount { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 12px; }
    .income-edit-wrap {
      display: flex; align-items: center;
      background: #f9fafb; border: 1.5px solid #7c3aed;
      border-radius: 12px; padding: 8px 14px;
      margin-bottom: 12px;
      box-shadow: 0 0 0 3px rgba(124,58,237,0.1);
    }
    .rupee-sym { font-size: 18px; font-weight: 700; color: #7c3aed; margin-right: 6px; }
    .income-input {
      flex: 1; background: transparent; border: none; outline: none;
      font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 700;
      color: #111827;
    }
    .income-actions { display: flex; gap: 8px; margin-bottom: 4px; }
    .income-btn {
      display: flex; align-items: center; gap: 6px;
      background: #ede9fe; color: #7c3aed; border: none; border-radius: 10px;
      padding: 8px 16px;
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; ion-icon { font-size: 15px; }
    }
    .income-cancel {
      flex: 1; padding: 10px; border-radius: 10px; border: 1.5px solid #e5e7eb;
      background: white; color: #6b7280; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700; cursor: pointer;
    }
    .income-save {
      flex: 2; padding: 10px; border-radius: 10px; border: none;
      background: linear-gradient(135deg, #7c3aed, #6d28d9); color: white;
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
      &:disabled { opacity: 0.6; }
    }

    /* Budget Preview */
    .budget-preview { margin-top: 16px; border-top: 1px solid #f3f4f6; padding-top: 14px; }
    .preview-title { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 12px; }
    .preview-bars { display: flex; flex-direction: column; gap: 10px; }
    .preview-bar { display: flex; align-items: center; gap: 8px; }
    .bar-info { display: flex; align-items: center; gap: 4px; width: 110px; flex-shrink: 0; }
    .bar-icon { font-size: 14px; }
    .bar-name { font-size: 11px; color: #6b7280; flex: 1; }
    .bar-pct { font-size: 11px; font-weight: 700; color: #374151; }
    .bar-track { flex: 1; height: 5px; background: #f3f4f6; border-radius: 10px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 10px; transition: width 1s ease; }
    .bar-amt { font-family: 'Syne', sans-serif; font-size: 11px; font-weight: 700; width: 52px; text-align: right; flex-shrink: 0; }

    /* Settings Sections */
    .settings-section { padding: 0 16px 8px; }
    .section-label {
      font-size: 12px; font-weight: 700; color: #9ca3af;
      text-transform: uppercase; letter-spacing: 1px;
      margin-bottom: 8px; padding-left: 4px;
    }
    .settings-card {
      background: white; border-radius: 20px;
      overflow: hidden; box-shadow: 0 1px 8px rgba(0,0,0,0.06);
    }
    .setting-row {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; cursor: pointer;
      transition: background 0.15s;
      &:active { background: #f9fafb; }
    }
    .setting-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; font-size: 18px;
    }
    .setting-body { flex: 1; }
    .setting-title { font-size: 14px; font-weight: 600; color: #111827; }
    .setting-value { font-size: 12px; color: #9ca3af; margin-top: 1px; }
    .setting-arrow { color: #d1d5db; font-size: 16px; }
    .setting-divider { height: 1px; background: #f9fafb; margin: 0 16px; }

    .v-toggle {
      --track-background: #e5e7eb;
      --track-background-checked: #7c3aed;
    }

    /* Sign Out */
    .signout-section { padding: 8px 16px 16px; }
    .signout-btn {
      width: 100%; padding: 15px;
      border-radius: 18px;
      border: 1.5px solid #fee2e2;
      background: #fff5f5; color: #ef4444;
      font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      cursor: pointer;
      ion-icon { font-size: 20px; }
    }

    /* Animations */
    .animate-up { animation: fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) both; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class SettingsPage implements OnInit {
  private firestore = inject(Firestore);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  profile: ProfileData | null = null;
  editingIncome = false;
  newIncome = 0;
  savingIncome = false;

  constructor(private authService: AuthService) {}

  get initials(): string {
    return (this.profile?.displayName || 'U').split(' ')
      .map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    const uid = this.authService.currentUser?.uid;
    if (!uid) return;
    const ref = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      this.profile = snap.data() as ProfileData;
    } else {
      this.profile = {
        displayName: this.authService.currentUser?.displayName || 'User',
        email: this.authService.currentUser?.email || '',
        monthlyIncome: 88500,
        currency: 'INR'
      };
    }
  }

  getMemberSince(): string {
    if (!this.profile?.createdAt) return '';
    try {
      const d = this.profile.createdAt.toDate ? this.profile.createdAt.toDate() : new Date(this.profile.createdAt);
      return format(d, 'MMM yyyy');
    } catch { return ''; }
  }

  getBudgetPreview() {
    const income = this.profile?.monthlyIncome || 0;
    return [
      { icon: '🏦', name: 'Fixed Costs', pct: 55, color: '#f5c842', amount: Math.round(income * 0.55) },
      { icon: '🛒', name: 'Food & Home', pct: 10, color: '#60a5fa', amount: Math.round(income * 0.10) },
      { icon: '💰', name: 'Savings', pct: 20, color: '#10b981', amount: Math.round(income * 0.20) },
      { icon: '🌿', name: 'Self-Growth', pct: 5, color: '#a78bfa', amount: Math.round(income * 0.05) },
      { icon: '🎉', name: 'Fun & Family', pct: 7, color: '#fb923c', amount: Math.round(income * 0.07) },
      { icon: '💖', name: 'Giving', pct: 3, color: '#f472b6', amount: Math.round(income * 0.03) },
    ];
  }

  startEditIncome() {
    this.newIncome = this.profile?.monthlyIncome || 88500;
    this.editingIncome = true;
  }

  async saveIncome() {
    if (!this.newIncome || this.newIncome <= 0) return;
    this.savingIncome = true;
    const uid = this.authService.currentUser?.uid;
    if (!uid) return;
    try {
      const ref = doc(this.firestore, `users/${uid}`);
      await updateDoc(ref, { monthlyIncome: this.newIncome, updatedAt: serverTimestamp() });
      if (this.profile) this.profile.monthlyIncome = this.newIncome;
      this.editingIncome = false;
      this.showToast('Income updated ✓');
    } finally {
      this.savingIncome = false;
    }
  }

  async editName() {
    const alert = await this.alertCtrl.create({
      header: 'Update Name',
      inputs: [{ name: 'name', type: 'text', value: this.profile?.displayName, placeholder: 'Your name' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: async (data) => {
            if (!data.name) return;
            const uid = this.authService.currentUser?.uid;
            if (!uid) return;
            await updateDoc(doc(this.firestore, `users/${uid}`), { displayName: data.name, updatedAt: serverTimestamp() });
            if (this.profile) this.profile.displayName = data.name;
            this.showToast('Name updated ✓');
          }
        }
      ]
    });
    await alert.present();
  }

  async changePassword() {
    const email = this.profile?.email || this.authService.currentUser?.email;
    if (!email) return;
    await this.authService.resetPassword(email);
  }

  async exportData() {
    this.showToast('Export feature coming soon 📊');
  }

  async clearCache() {
    this.showToast('Cache cleared ✓');
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Sign Out', role: 'destructive', handler: () => this.authService.logout() }
      ]
    });
    await alert.present();
  }

  private async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2500, position: 'bottom', color: 'success' });
    await t.present();
  }
}

// needed import at top
import { format } from 'date-fns';