// ─── src/app/features/tabs/tabs.page.ts ─────────
import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-tabs',
  standalone: true,
  imports: [IonicModule, RouterModule],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
 <ion-tab-button tab="messages" href="/tabs/messages">
          <ion-icon name="chatbubble-ellipses-outline"></ion-icon>
          <ion-label>Messages</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="dashboard" href="/tabs/dashboard">
          <ion-icon name="grid-outline"></ion-icon>
          <ion-label>Home</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="budget" href="/tabs/budget">
          <ion-icon name="pie-chart-outline"></ion-icon>
          <ion-label>Budget</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="transactions" href="/tabs/transactions">
          <ion-icon name="layers-outline"></ion-icon>
          <ion-label>Txns</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="wallet" href="/tabs/wallet">
          <ion-icon name="wallet-outline"></ion-icon>
          <ion-label>Wallet</ion-label>
        </ion-tab-button>

       
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: [`
    ion-tab-bar {
      padding-bottom: env(safe-area-inset-bottom);
      padding-top: 8px;
      height: calc(64px + env(safe-area-inset-bottom));
    }
  `]
})
export class TabsPage { }