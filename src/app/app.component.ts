import { Component, OnInit } from '@angular/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { MerchantRulesService } from './core/services/merchant-rules.service';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: false,
  template: `<ion-app><ion-router-outlet></ion-router-outlet></ion-app>`,
})
export class AppComponent implements OnInit {
  constructor(
    private merchantRules: MerchantRulesService,
    private authService: AuthService
  ) { }

  async ngOnInit() {
    if (Capacitor.isNativePlatform()) {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0b0f1a' });
    }
    // Init merchant rules once auth is ready
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.merchantRules.init().catch(err =>
          console.warn('[MerchantRules] init failed:', err)
        );
      }
    });
  }
}