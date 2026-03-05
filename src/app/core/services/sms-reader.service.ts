// ─── src/app/core/services/sms-reader.service.ts ─
import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SmsParserService } from './sms-parser.service';
import { ParsedSMS } from '../models';
import { MessageReader } from '@solimanware/capacitor-sms-reader';

export interface RawSmsMessage {
  address: string;
  body: string;
  date: number;
}

@Injectable({ providedIn: 'root' })
export class SmsReaderService {
  private readonly isAndroid = Capacitor.getPlatform() === 'android';
  private readonly BANK_SENDER_REGEX =
    /^[A-Z]{2}-[A-Z]+|SBIINB|HDFCBK|ICICIB|AXISBK|KOTAKB|[A-Z]{6}/;

  // In-memory cache so switching tabs never re-reads the plugin
  private cache: RawSmsMessage[] = [];
  private cacheLoadedDays = 0;
  private cacheTimestamp = 0;

  constructor(private parser: SmsParserService) { }

  get isPlatformAndroid(): boolean { return this.isAndroid; }

  // ── Permission ────────────────────────────────
  // Correct field: status.messages (not status.sms)
  async requestSmsPermission(): Promise<boolean> {
    if (!this.isAndroid) return false;
    try {
      const status = await MessageReader.checkPermissions();
      if (status.messages === 'granted') return true;
      const result = await MessageReader.requestPermissions();
      return result.messages === 'granted';
    } catch (err) {
      console.error('[SMS] Permission error:', err);
      return false;
    }
  }

  // ── Read TODAY only (fast first load) ─────────
  // Uses minDate filter — only fetches messages from midnight today
  async readTodaySMS(): Promise<RawSmsMessage[]> {
    if (!this.isAndroid) return this.getMockSMS(1);

    const granted = await this.requestSmsPermission();
    if (!granted) return [];

    try {
      const todayStart = this.startOfToday();
      // getMessages takes filter directly — no { filter: } wrapper
      const result = await MessageReader.getMessages({
        minDate: todayStart,
        limit: 200
      });

      const msgs = this.toRaw(result.messages);
      this.mergeIntoCache(msgs, 1);
      return msgs;
    } catch (err) {
      console.error('[SMS] readTodaySMS error:', err);
      return [];
    }
  }

  // ── Read last N days (progressive background load) ────────────
  async readLastNDays(days: number, limit = 500): Promise<RawSmsMessage[]> {
    if (!this.isAndroid) return this.getMockSMS(days);

    // Return cache if already loaded enough and fresh (5-min TTL)
    if (this.cacheLoadedDays >= days && Date.now() - this.cacheTimestamp < 5 * 60 * 1000) {
      return this.cache;
    }

    const granted = await this.requestSmsPermission();
    if (!granted) return this.cache;

    try {
      const result = await MessageReader.getMessages({
        minDate: this.daysAgo(days),
        limit
      });

      this.mergeIntoCache(this.toRaw(result.messages), days);
      return this.cache;
    } catch (err) {
      console.error('[SMS] readLastNDays error:', err);
      return this.cache;
    }
  }

  // ── Read ALL SMS (for wallet balance extraction) ───────────────
  async readAllSMS(limit: number = 2000): Promise<RawSmsMessage[]> {
    if (!this.isAndroid) return this.getMockSMS(90);

    const granted = await this.requestSmsPermission();
    if (!granted) return this.cache;

    try {
      const result = await MessageReader.getMessages({ limit });
      this.mergeIntoCache(this.toRaw(result.messages), 999);
      return this.cache;
    } catch (err) {
      console.error('[SMS] readAllSMS error:', err);
      return this.cache;
    }
  }

  // ── Read Bank SMS only (for SMS import flow) ──────────────────
  async readBankSMS(limit: number = 500): Promise<ParsedSMS[]> {
    if (!this.isAndroid) return [];

    const granted = await this.requestSmsPermission();
    if (!granted) return [];

    try {
      const result = await MessageReader.getMessages({ limit });

      const bankOnly = result.messages.filter((s: any) =>
        this.BANK_SENDER_REGEX.test((s.sender ?? s.address ?? '').toUpperCase())
      );

      return this.parser.parseBatch(
        bankOnly.map((s: any) => ({
          body: s.body ?? '',
          address: s.sender ?? s.address ?? ''
        }))
      );
    } catch (err) {
      console.error('[SMS] readBankSMS error:', err);
      return [];
    }
  }

  // ── Invalidate cache (pull-to-refresh) ───────────────────────
  clearCache() {
    this.cache = [];
    this.cacheLoadedDays = 0;
    this.cacheTimestamp = 0;
  }

  // ── Helpers ───────────────────────────────────────────────────
  private toRaw(messages: any[]): RawSmsMessage[] {
    return (messages ?? []).map((s: any) => ({
      address: s.sender ?? s.address ?? '',
      body: s.body ?? s.message ?? '',
      date: Number(s.date ?? Date.now())
    }));
  }

  private mergeIntoCache(incoming: RawSmsMessage[], days: number) {
    const existing = new Set(
      this.cache.map(m => `${m.address}|${m.date}|${m.body.slice(0, 40)}`)
    );
    const fresh = incoming.filter(
      m => !existing.has(`${m.address}|${m.date}|${m.body.slice(0, 40)}`)
    );
    this.cache = [...this.cache, ...fresh].sort((a, b) => b.date - a.date);
    this.cacheLoadedDays = Math.max(this.cacheLoadedDays, days);
    this.cacheTimestamp = Date.now();
  }

  private startOfToday(): number {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  private daysAgo(n: number): number {
    return Date.now() - n * 24 * 60 * 60 * 1000;
  }

  // ── Mock data for web/dev preview ─────────────────────────────
  private getMockSMS(days: number): RawSmsMessage[] {
    const now = Date.now();
    const hr = 60 * 60 * 1000;
    const day = 24 * hr;
    const all: RawSmsMessage[] = [
      { address: 'VM-SBIINB', body: 'INR 32,600.00 debited from A/c XX1234 towards LIC Housing EMI. Avl Bal: INR 55,900.00', date: now - 1 * hr },
      { address: 'VM-HDFCBK', body: 'Your HDFC Bank A/c XX5678 credited INR 88,500.00 by NEFT. Avl Bal: INR 1,41,803.37', date: now - 2 * hr },
      { address: 'VM-AXISBK', body: 'Rs.3540 debited from Axis Bank A/c XX2683 at ZOMATO via UPI. Avl Bal: INR 8,18,475.06', date: now - 3 * hr },
      { address: 'Airtel', body: 'Your Airtel bill of Rs.999 is due on 10-Mar-26. Pay now.', date: now - 4 * hr },
      { address: 'Zomato', body: 'Your order from Pizza Hut is confirmed! Estimated delivery: 30 mins.', date: now - 5 * hr },
      { address: 'VM-SBIINB', body: 'Rs.5300 debited from SBI A/c XX1234 at DMART via UPI. Avl Bal: 50,600', date: now - 1 * day },
      { address: 'VM-HDFCBK', body: 'INR 1,770 debited from A/c XX5678 to UDEMY via UPI/DR/987654.', date: now - 2 * day },
      { address: 'ICICIBNK', body: 'ICICI Bank: INR 2,655.00 debited from A/c XX3456 via UPI to Swiggy.', date: now - 3 * day },
      { address: 'VM-SBIINB', body: 'INR 885 debited from A/c XX1234 at Medplus Pharmacy via UPI.', date: now - 4 * day },
      { address: 'VM-SBIINB', body: 'Rs.5300 debited from A/c XX1234 to GROWW MF SIP. Ref: SIP202603', date: now - 5 * day },
      { address: 'ACT', body: 'Dear Customer, your ACT Fibernet bill of Rs.849 is due. Pay before 15-Mar.', date: now - 6 * day },
      { address: 'AMAZON', body: 'Your Amazon order #405-123 has been delivered. Rate your experience.', date: now - 7 * day },
    ];
    const cutoff = now - days * day;
    return all.filter(m => m.date >= cutoff);
  }
}