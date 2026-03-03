// ─── src/app/core/services/sms-parser.service.ts ─
import { Injectable } from '@angular/core';
import { ParsedSMS, CategoryKey } from '../models';

// ── Indian Bank SMS Pattern Library ──────────────
interface BankPattern {
  name: string;
  shortName: string;
  senderIds: string[];
  debitPatterns: RegExp[];
  creditPatterns: RegExp[];
  amountPattern: RegExp;
  merchantPattern?: RegExp;
  accountPattern?: RegExp;
}

@Injectable({ providedIn: 'root' })
export class SmsParserService {

  private readonly BANKS: BankPattern[] = [
    {
      name: 'State Bank of India',
      shortName: 'SBI',
      senderIds: ['SBIINB', 'SBIPSG', 'SBIUPI', 'VM-SBIPSG'],
      debitPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|deducted|withdrawn)/i,
        /debited\s+(?:from|Rs\.?|INR).*?([\d,]+\.?\d*)/i,
        /(?:ATM WDL|POS|UPI\/DR).*?(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
        /your\s+A\/c\s+[Xx*\d]+\s+is\s+debited\s+(?:with\s+)?(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      ],
      creditPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*credited/i,
        /credited\s+(?:with\s+)?(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
        /UPI\/CR.*?(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      ],
      amountPattern: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      merchantPattern: /(?:at|to|towards)\s+([A-Za-z0-9][A-Za-z0-9\s&\-_.]*?)(?:\s+on|\s+Ref|\.|\s*$)/i,
      accountPattern: /[Aa]\/[Cc]\s*(?:no\.?\s*)?[Xx*]+(\d{4})/i,
    },
    {
      name: 'HDFC Bank',
      shortName: 'HDFC',
      senderIds: ['HDFCBK', 'HDFCBN', 'HD-HDFCBK', 'VM-HDFCBK'],
      debitPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|spent)/i,
        /HDFC Bank.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*).*?debited/i,
        /Debit.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      ],
      creditPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*credited/i,
        /Amount Credited.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      ],
      amountPattern: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      merchantPattern: /(?:at|to|VPA)\s+([A-Za-z0-9][A-Za-z0-9\s&\-_.@]*?)(?:\s+on|\s+Ref|\s+Info|\.|\s*$)/i,
      accountPattern: /[Xx*]+(\d{4})/i,
    },
    {
      name: 'ICICI Bank',
      shortName: 'ICICI',
      senderIds: ['ICICIB', 'ICICI', 'VM-ICICIB'],
      debitPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|deducted)/i,
        /ICICI Bank Acct.*?debited.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      ],
      creditPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*credited/i,
      ],
      amountPattern: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      merchantPattern: /(?:at|for|to)\s+([A-Za-z0-9][A-Za-z0-9\s&\-_./]*?)(?:\s+on|\s+Ref|\.|\s*$)/i,
      accountPattern: /[Xx*]+(\d{4})/i,
    },
    {
      name: 'Axis Bank',
      shortName: 'Axis',
      senderIds: ['AXISBK', 'AXISB', 'VM-AXISBK'],
      debitPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|spent)/i,
        /Axis Bank.*?(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*).*?debited/i,
      ],
      creditPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*credited/i,
      ],
      amountPattern: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      merchantPattern: /(?:at|to)\s+([A-Za-z0-9][A-Za-z0-9\s&\-_.]*?)(?:\s+on|\s*$)/i,
      accountPattern: /[Xx*]+(\d{4})/i,
    },
    {
      name: 'Kotak Mahindra Bank',
      shortName: 'Kotak',
      senderIds: ['KOTAKB', 'KOTAK', 'KMB'],
      debitPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*(?:debited|deducted)/i,
      ],
      creditPatterns: [
        /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)\s*credited/i,
      ],
      amountPattern: /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      merchantPattern: /(?:at|to)\s+([A-Za-z0-9][A-Za-z0-9\s&\-_.]*?)(?:\s+on|\s*$)/i,
      accountPattern: /[Xx*]+(\d{4})/i,
    }
  ];

  // UPI patterns (bank-agnostic)
  private readonly UPI_DEBIT = /UPI\/DR\/(\d+)\/([^/\n]+)/i;
  private readonly UPI_CREDIT = /UPI\/CR\/(\d+)\/([^/\n]+)/i;
  private readonly GENERIC_AMOUNT = /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/gi;

  // ── Category auto-assignment keywords ────────
  private readonly CATEGORY_KEYWORDS: Record<CategoryKey, string[]> = {
    fixed_costs: [
      'emi', 'loan', 'lic', 'insurance', 'rent', 'electricity', 'power',
      'broadband', 'airtel', 'jio', 'act', 'bsnl', 'water', 'gas', 'maintenance',
      'fuel', 'petrol', 'diesel', 'uber', 'ola', 'auto', 'metro', 'rapido'
    ],
    food_household: [
      'zomato', 'swiggy', 'dunzo', 'blinkit', 'zepto', 'bigbasket',
      'dmart', 'reliance fresh', 'more', 'nature basket', 'grofers', 'instamart',
      'restaurant', 'cafe', 'hotel', 'dhaba', 'canteen', 'food'
    ],
    savings: [
      'mutual fund', 'sip', 'fd', 'rd', 'ppf', 'nps', 'zerodha',
      'groww', 'kuvera', 'paytm money', 'investment', 'deposit'
    ],
    self_investment: [
      'udemy', 'coursera', 'linkedin', 'skillshare', 'byju', 'unacademy',
      'gym', 'yoga', 'fitness', 'health', 'hospital', 'clinic', 'pharmacy',
      'apollo', 'medplus', 'netmeds', 'pharmeasy'
    ],
    fun_family: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho',
      'movie', 'pvr', 'inox', 'netflix', 'spotify', 'hotstar', 'prime',
      'gaming', 'steam', 'playstation', 'entertainment', 'bookmyshow'
    ],
    giving_misc: [
      'gpay', 'phonepe', 'paytm', 'donation', 'temple', 'charity',
      'transfer', 'gift', 'cashback', 'reward'
    ],
    uncategorized: []
  };

  // ── Main Parse Method ─────────────────────────
  parseSMS(raw: string, sender?: string): ParsedSMS {
    const text = raw.trim();
    const result: ParsedSMS = {
      raw: text,
      amount: 0,
      type: 'debit',
      bank: this.detectBank(text, sender),
      merchant: this.extractMerchant(text),
      accountLast4: this.extractAccount(text),
      date: new Date(),
      isValid: false,
      confidence: 'low'
    };

    // Detect type
    const isCredit = this.isCredit(text);
    const isDebit = this.isDebit(text);

    if (!isCredit && !isDebit) {
      return result; // Not a transaction SMS
    }

    result.type = isCredit && !isDebit ? 'credit' : 'debit';

    // Extract amount
    const amount = this.extractAmount(text);
    if (!amount || amount <= 0) return result;

    result.amount = amount;
    result.isValid = true;
    result.confidence = this.calculateConfidence(text, result.bank);

    return result;
  }

  // ── Batch Parse ───────────────────────────────
  parseBatch(messages: Array<{ body: string; address?: string }>): ParsedSMS[] {
    return messages
      .map(msg => this.parseSMS(msg.body, msg.address))
      .filter(p => p.isValid)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  // ── Auto-Categorize ───────────────────────────
  autoCategory(parsed: ParsedSMS): CategoryKey {
    const searchText = `${parsed.merchant || ''} ${parsed.raw}`.toLowerCase();

    for (const [cat, keywords] of Object.entries(this.CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => searchText.includes(kw))) {
        return cat as CategoryKey;
      }
    }

    return 'uncategorized';
  }

  // ── Private Helpers ───────────────────────────
  private detectBank(text: string, sender?: string): string {
    const searchIn = `${text} ${sender || ''}`.toUpperCase();
    for (const bank of this.BANKS) {
      if (bank.senderIds.some(id => searchIn.includes(id))) {
        return bank.shortName;
      }
    }
    // Fallback: look for bank name in body
    if (/sbi|state bank/i.test(text)) return 'SBI';
    if (/hdfc/i.test(text)) return 'HDFC';
    if (/icici/i.test(text)) return 'ICICI';
    if (/axis/i.test(text)) return 'Axis';
    if (/kotak/i.test(text)) return 'Kotak';
    if (/pnb|punjab/i.test(text)) return 'PNB';
    if (/bob|bank of baroda/i.test(text)) return 'BOB';
    if (/canara/i.test(text)) return 'Canara';
    if (/yes bank/i.test(text)) return 'YES';
    if (/indusind/i.test(text)) return 'IndusInd';
    return 'Unknown Bank';
  }

  private isDebit(text: string): boolean {
    return /debited|deducted|spent|withdrawn|purchase|payment made|paid|debit|ATM WDL|UPI\/DR/i.test(text);
  }

  private isCredit(text: string): boolean {
    return /credited|received|deposited|refund|cashback|credit|UPI\/CR|salary|NEFT CR|IMPS CR/i.test(text);
  }

  private extractAmount(text: string): number {
    // Try all amount patterns
    const patterns = [
      /(?:INR|Rs\.?|₹)\s*([\d,]+\.?\d*)/i,
      /(?:amount|amt)[:\s]+(?:INR|Rs\.?|₹)?\s*([\d,]+\.?\d*)/i,
      /([\d,]+\.?\d*)\s*(?:INR|Rs\.?|₹)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        const num = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return 0;
  }

  private extractMerchant(text: string): string | undefined {
    // UPI merchant
    const upiMatch = text.match(/UPI\/(?:DR|CR)\/\d+\/([^/\n\s]+)/i);
    if (upiMatch) return this.cleanMerchantName(upiMatch[1]);

    // "at MERCHANT" pattern
    const atMatch = text.match(/(?:at|to|for)\s+([A-Za-z0-9][A-Za-z0-9\s&\-_.]*?)(?:\s+on|\s+Ref|\s+Info|\s+Avl|\.|$)/i);
    if (atMatch) return this.cleanMerchantName(atMatch[1]);

    return undefined;
  }

  private cleanMerchantName(raw: string): string {
    return raw
      .replace(/\d{10,}/g, '') // remove phone numbers
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 40);
  }

  private extractAccount(text: string): string | undefined {
    const match = text.match(/(?:[Aa]\/[Cc]|account|acct)[^\d]*[Xx*]+(\d{4})/i)
      || text.match(/[Xx*]{4,}(\d{4})/);
    return match?.[1];
  }

  private calculateConfidence(text: string, bank: string): 'high' | 'medium' | 'low' {
    let score = 0;
    if (bank !== 'Unknown Bank') score++;
    if (this.extractAmount(text) > 0) score++;
    if (this.extractAccount(text)) score++;
    if (this.extractMerchant(text)) score++;
    if (score >= 3) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }
}
