// ─── src/app/core/services/sms-reader.service.ts ─
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SmsParserService } from './sms-parser.service';
import { ParsedSMS } from '../models';

declare const CapacitorSMS: {
  requestPermission(): Promise<{ granted: boolean }>;
  getSMSList(options: { filter: { box: string; maxCount: number } }): Promise<{
    smsList: Array<{ address: string; body: string; date: number }>;
  }>;
};

export interface RawSmsMessage {
  address: string;
  body: string;
  date: number;
}

@Injectable({ providedIn: 'root' })
export class SmsReaderService {
  private readonly isAndroid = Capacitor.getPlatform() === 'android';
  private readonly BANK_SENDER_REGEX = /^[A-Z]{2}-[A-Z]+|SBIINB|HDFCBK|ICICIB|AXISBK|KOTAKB|[A-Z]{6}/;

  constructor(private parser: SmsParserService) {}

  get isPlatformAndroid(): boolean { return this.isAndroid; }

  // ── Permission ────────────────────────────────
  async requestSmsPermission(): Promise<boolean> {
    if (!this.isAndroid) return false;
    try {
      const { granted } = await CapacitorSMS.requestPermission();
      return granted;
    } catch { return false; }
  }

  // ── Read ALL SMS (for Messages tab) ───────────
  async readAllSMS(maxCount: number = 300): Promise<RawSmsMessage[]> {
    if (!this.isAndroid) {
      return this.getMockAllSMS();
    }
    const granted = await this.requestSmsPermission();
    if (!granted) return [];
    try {
      const { smsList } = await CapacitorSMS.getSMSList({
        filter: { box: 'inbox', maxCount }
      });
      return smsList.map(s => ({
        address: s.address,
        body: s.body,
        date: s.date
      }));
    } catch (err) {
      console.error('[SMS] Read all error:', err);
      return [];
    }
  }

  // ── Read Bank SMS only (for legacy import) ────
  async readBankSMS(maxCount: number = 500): Promise<ParsedSMS[]> {
    if (!this.isAndroid) {
      return this.getMockSMS();
    }
    const granted = await this.requestSmsPermission();
    if (!granted) return [];
    try {
      const { smsList } = await CapacitorSMS.getSMSList({
        filter: { box: 'inbox', maxCount }
      });
      const bankSMS = smsList.filter(sms =>
        this.BANK_SENDER_REGEX.test(sms.address.toUpperCase())
      );
      return this.parser.parseBatch(
        bankSMS.map(s => ({ body: s.body, address: s.address }))
      );
    } catch (err) {
      console.error('[SMS] Read bank error:', err);
      return [];
    }
  }

  // ── Mock: All SMS for web/dev ─────────────────
  getMockAllSMS(): RawSmsMessage[] {
    const now = Date.now();
    const hr = 3600000;
    const day = 86400000;

    return [
      // ── Transactions ──────────────────────────
      {
        address: 'VM-SBIPSG',
        body: 'INR 32,600.00 debited from A/c XX1234 towards LIC Housing EMI on 01-Mar-26. Avl Bal: INR 55,900.00',
        date: now - 2 * hr
      },
      {
        address: 'VM-HDFCBK',
        body: 'Your HDFC Bank A/c XX5678 is credited with INR 88,500.00 by NEFT on 01-Mar-26. Ref No 123456789',
        date: now - 5 * hr
      },
      {
        address: 'VM-AXISBK',
        body: 'Rs.3540 debited from Axis Bank A/c XX9012 at ZOMATO on 02-Mar-26. Avl Bal: INR 46,890',
        date: now - 1 * day
      },
      {
        address: 'VM-ICICIB',
        body: 'ICICI Bank: INR 2,655.00 debited from A/c XX3456 via UPI to Swiggy on 04-Mar-26',
        date: now - 1 * day - 2 * hr
      },
      {
        address: 'SBIINB',
        body: 'Rs.5300 debited from SBI A/c XX1234 to GROWW MF SIP on 05-Mar-26. Ref: SIP202603',
        date: now - 2 * day
      },
      {
        address: 'VM-HDFCBK',
        body: 'INR 1,770 debited from A/c XX1234 to UDEMY via UPI/DR/987654/Udemy.com on 03-Mar-26',
        date: now - 2 * day - hr
      },
      {
        address: 'KOTAKB',
        body: 'INR 885.00 debited from A/c XX1234 at Medplus Pharmacy via UPI on 05-Mar-26',
        date: now - 3 * day
      },
      {
        address: 'VM-SBIPSG',
        body: 'INR 5,300.00 debited from A/c XX1234 for DMART on 06-Mar-26 via UPI. Avl Bal: 50,600',
        date: now - 3 * day - hr
      },

      // ── Promotions ────────────────────────────
      {
        address: 'ZOMATO',
        body: '🎉 50% OFF on your next order! Use code SAVE50. Valid till tonight. Order now on Zomato!',
        date: now - 1 * hr
      },
      {
        address: 'AMAZON',
        body: 'Great Indian Sale starts NOW! Up to 80% off on Electronics, Fashion & more. Shop before stock runs out!',
        date: now - 3 * hr
      },
      {
        address: 'SWIGGY',
        body: 'Flat ₹100 OFF on orders above ₹299. Use code SWIGGY100. Hungry? Order your favorite food now.',
        date: now - 6 * hr
      },
      {
        address: 'FLIPKART',
        body: 'Your wishlist items are on sale! Prices dropped on 3 items. Limited time offer — grab them now!',
        date: now - 1 * day
      },
      {
        address: 'NETFLIX',
        body: 'New on Netflix: 12 new shows added this week. Don\'t miss out — subscribe now from ₹149/month.',
        date: now - 2 * day
      },
      {
        address: 'MYNTRA',
        body: 'End of Reason Sale! Min 50-80% off on top brands. Free delivery on orders above ₹499. Shop Now!',
        date: now - 2 * day - 3 * hr
      },

      // ── Reminders ─────────────────────────────
      {
        address: 'HDFCCC',
        body: 'Reminder: Your HDFC Credit Card bill of ₹18,450 is due on 10-Mar-26. Please pay to avoid late charges.',
        date: now - 30 * 60 * 1000
      },
      {
        address: 'LICIND',
        body: 'Dear Customer, your LIC Policy Premium of ₹4,200 is due on 15-Mar-26. Please pay via LIC portal or app.',
        date: now - 4 * hr
      },
      {
        address: 'AIRTEL',
        body: 'Your Airtel broadband plan expires on 08-Mar-26. Recharge now to avoid disconnection. Recharge at airtel.in',
        date: now - 8 * hr
      },
      {
        address: 'AXISCC',
        body: 'OTP for Axis Bank transaction: 847291. Valid for 10 minutes. Do not share with anyone.',
        date: now - 1 * day
      },
      {
        address: 'APOLLOC',
        body: 'Reminder: Your appointment with Dr. Ramesh Kumar is scheduled for 07-Mar-26 at 10:30 AM. Apollo Clinic.',
        date: now - 1 * day - 4 * hr
      },
      {
        address: 'GASINDIA',
        body: 'Your gas cylinder booking is confirmed. Delivery scheduled for 08-Mar-26. Booking ID: GAS789456.',
        date: now - 2 * day
      },

      // ── Personal ──────────────────────────────
      {
        address: '+919876543210',
        body: 'Hey! Are we still on for dinner this Saturday? Let me know if you want to change the restaurant.',
        date: now - 15 * 60 * 1000
      },
      {
        address: '+918765432109',
        body: 'Bro the cricket match was amazing yesterday! Did you watch the last over? Unbelievable finish 🏏',
        date: now - 2 * hr
      },
      {
        address: '+917654321098',
        body: 'Mom says come home for lunch on Sunday. She\'s making your favourite biryani 😄',
        date: now - 4 * hr
      },
      {
        address: '+916543210987',
        body: 'The project files are shared on Drive. Please review by EOD tomorrow and share your feedback.',
        date: now - 1 * day
      },
      {
        address: '+915432109876',
        body: 'Happy Birthday! 🎂🎉 Wishing you a wonderful day ahead. Let\'s celebrate this weekend!',
        date: now - 2 * day
      },
    ];
  }

  // ── Mock: Bank-only SMS (legacy) ─────────────
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