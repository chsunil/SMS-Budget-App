import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title><span class="display-title" style="font-size:18px">Reports</span></ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div style="padding:60px 24px;text-align:center;color:var(--muted)">
        <div style="font-size:52px;margin-bottom:16px">📊</div>
        <h3 style="font-family:var(--font-display);font-size:18px;margin-bottom:8px">Reports Coming Soon</h3>
        <p style="font-size:13px;line-height:1.6">Monthly analytics, category breakdowns, and spending trends will appear here.</p>
      </div>
    </ion-content>
  `
})
export class ReportsPage {}
