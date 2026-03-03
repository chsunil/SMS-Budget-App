import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title><span class="display-title" style="font-size:18px">Profile</span></ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div style="padding:32px 24px;max-width:480px;margin:0 auto">
        <div style="text-align:center;margin-bottom:32px">
          <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--orange));display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:800;font-size:24px;color:#0b0f1a;margin:0 auto 12px">
            {{ initials }}
          </div>
          <div style="font-family:var(--font-display);font-size:18px;font-weight:800">{{ displayName }}</div>
          <div style="font-size:13px;color:var(--muted)">{{ email }}</div>
        </div>
        <ion-button expand="block" color="danger" fill="outline" (click)="logout()">
          <ion-icon name="log-out-outline" slot="start"></ion-icon>
          Sign Out
        </ion-button>
      </div>
    </ion-content>
  `
})
export class SettingsPage {
  constructor(private authService: AuthService) {}

  get displayName(): string { return this.authService.currentUser?.displayName || 'User'; }
  get email(): string { return this.authService.currentUser?.email || ''; }
  get initials(): string {
    return (this.displayName).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }
  async logout() { await this.authService.logout(); }
}
