// ─── src/app/core/services/sms-reader.service.ts ─
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SmsParserService } from './sms-parser.service';
import { ParsedSMS } from '../models';

// Type declarations for capacitor-sms plugin
declare const CapacitorSMS: {
  requestPermission(): Promise<{ granted: boolean }>;
  getSMSList(options: { filter: { box: string; maxCount: number } }): Promise<{
    smsList: Array<{ address: string; body: string; date: number }>;
  }>;
};

@Injectable({ providedIn: 'root' })
export class SmsReaderService {
  private readonly isAndroid = Capacitor.getPlatform() === 'android';
  private readonly BANK_SENDER_REGEX = /^[A-Z]{2}-[A-Z]+|SBIINB|HDFCBK|ICICIB|AXISBK|KOTAKB|[A-Z]{6}/;

  constructor(private parser: SmsParserService) {}

  get isPlatformAndroid(): boolean {
    return this.isAndroid;
  }

  // ── Permission Request ────────────────────────
  async requestSmsPermission(): Promise<boolean> {
    if (!this.isAndroid) return false;
    try {
      const { granted } = await CapacitorSMS.requestPermission();
      return granted;
    } catch {
      return false;
    }
  }

  // ── Read Bank SMS (last 3 months) ─────────────
  async readBankSMS(maxCount: number = 500): Promise<ParsedSMS[]> {
    if (!this.isAndroid) {
      console.warn('[SMS] Reading SMS is only supported on Android');
      return this.getMockSMS(); // return demo data on web
    }

    const granted = await this.requestSmsPermission();
    if (!granted) return [];

    try {
      const { smsList } = await CapacitorSMS.getSMSList({
        filter: { box: 'inbox', maxCount }
      });

      // Filter only bank/transaction SMS
      const bankSMS = smsList.filter(sms =>
        this.BANK_SENDER_REGEX.test(sms.address.toUpperCase())
      );

      return this.parser.parseBatch(
        bankSMS.map(s => ({ body: s.body, address: s.address }))
      );
    } catch (err) {
      console.error('[SMS] Read error:', err);
      return [];
    }
  }

  // ── Mock Data for Web/Dev Testing ─────────────
  getMockSMS(): ParsedSMS[] {
    const mockMessages = [
      'INR 32,600.00 debited from A/c XX1234 towards LIC Housing EMI on 01-Mar-26. Avl Bal: INR 55,900.00',
      'Rs.5300 debited from SBI A/c XX1234 at DMART on 02-Mar-26 via UPI. Avl Bal: 50,600',
      'Your HDFC Bank A/c XX5678 is credited with INR 88,500.00 by NEFT on 01-Mar-26. Ref No 123456789',
      'INR 1,770 debited from A/c XX1234 to UDEMY via UPI/DR/987654/Udemy.com on 03-Mar-26',
      'Rs.3540 debited from Axis Bank A/c XX9012 at ZOMATO on 02-Mar-26. Avl Bal: INR 46,890',
      'ICICI Bank: INR 2,655.00 debited from A/c XX3456 via UPI to Swiggy on 04-Mar-26',
      'INR 885.00 debited from A/c XX1234 at Medplus Pharmacy via UPI on 05-Mar-26',
      'Rs.5300 debited from A/c XX1234 to GROWW MF SIP on 05-Mar-26. Ref: SIP202603',
    ];

    return this.parser.parseBatch(
      mockMessages.map(body => ({ body }))
    );
  }
}
