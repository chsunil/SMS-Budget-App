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

  constructor(private parser: SmsParserService) { }

  get isPlatformAndroid(): boolean { return this.isAndroid; }

  // ── Permission ────────────────────────────────
  async requestSmsPermission(): Promise<boolean> {
    if (!this.isAndroid) return false;
    try {
      const status = await MessageReader.checkPermissions();
      if (status.messages === 'granted') return true;
      const result = await MessageReader.requestPermissions();
      return result.messages === 'granted';
    } catch {
      return false;
    }
  }

  // ── Read ALL SMS (for Messages tab) ───────────
  async readAllSMS(maxCount: number = 300): Promise<RawSmsMessage[]> {
    if (!this.isAndroid) return [];

    const granted = await this.requestSmsPermission();
    if (!granted) return [];

    try {
      const result = await MessageReader.getMessages({
        maxCount,
        indexFrom: 0
      } as any);

      return (result.messages ?? []).map((s: any) => ({
        address: s.address ?? s.sender ?? '',
        body: s.body ?? s.message ?? '',
        date: s.date ?? Date.now()
      }));
    } catch (err) {
      console.error('[SMS] readAllSMS error:', err);
      return [];
    }
  }

  // ── Read Bank SMS only (for import flow) ─────
  async readBankSMS(maxCount: number = 500): Promise<ParsedSMS[]> {
    if (!this.isAndroid) return [];

    const granted = await this.requestSmsPermission();
    if (!granted) return [];

    try {
      const result = await MessageReader.getMessages({
        maxCount,
        indexFrom: 0
      } as any);

      const bankSMS = (result.messages ?? []).filter((sms: any) => {
        const addr = (sms.address ?? sms.sender ?? '').toUpperCase();
        return this.BANK_SENDER_REGEX.test(addr);
      });

      return this.parser.parseBatch(
        bankSMS.map((s: any) => ({
          body: s.body ?? s.message ?? '',
          address: s.address ?? s.sender ?? ''
        }))
      );
    } catch (err) {
      console.error('[SMS] readBankSMS error:', err);
      return [];
    }
  }
}