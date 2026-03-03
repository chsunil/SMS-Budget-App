// ─── src/app/core/models/index.ts ───────────────

// ── User ────────────────────────────────────────
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currency: 'INR';
  monthlyIncome: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Transaction ─────────────────────────────────
export type TransactionType = 'debit' | 'credit';
export type TransactionSource = 'sms' | 'manual';
export type CategoryKey =
  | 'fixed_costs'
  | 'food_household'
  | 'savings'
  | 'self_investment'
  | 'fun_family'
  | 'giving_misc'
  | 'uncategorized';

export interface Transaction {
  id?: string;
  userId: string;
  amount: number;
  type: TransactionType;
  category: CategoryKey;
  subcategory?: string;
  merchant?: string;
  bank?: string;
  accountLast4?: string;
  note?: string;
  date: Date;
  month: string;           // Format: 'YYYY-MM'
  source: TransactionSource;
  smsRaw?: string;
  createdAt?: Date;
}

// ── Budget ──────────────────────────────────────
export interface SubcategoryBudget {
  name: string;
  limit: number;
  spent: number;
  icon?: string;
  note?: string;
}

export interface CategoryBudget {
  key: CategoryKey;
  name: string;
  icon: string;
  color: string;
  colorDim: string;
  percentage: number;
  limit: number;
  spent: number;
  subcategories: SubcategoryBudget[];
}

export interface MonthlyBudget {
  id?: string;
  userId: string;
  month: string;           // 'YYYY-MM'
  income: number;
  categories: CategoryBudget[];
  totalSpent: number;
  totalSaved: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// ── SMS Parsed Result ────────────────────────────
export interface ParsedSMS {
  raw: string;
  amount: number;
  type: TransactionType;
  bank: string;
  merchant?: string;
  accountLast4?: string;
  date: Date;
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
}

// ── Default Budget Template (Indian Middle Class) ─
export const DEFAULT_BUDGET_CATEGORIES: Omit<CategoryBudget, 'limit' | 'spent'>[] = [
  {
    key: 'fixed_costs',
    name: 'Fixed Costs',
    icon: '🏦',
    color: '#f5c842',
    colorDim: 'rgba(245,200,66,0.12)',
    percentage: 55,
    subcategories: [
      { name: '🏠 Home EMI', limit: 0, spent: 0, note: 'Non-negotiable fixed expense' },
      { name: '⚡ Utilities', limit: 0, spent: 0, note: 'ACT, Airtel, Power, Water' },
      { name: '🚗 Transport & Fuel', limit: 0, spent: 0, note: 'Auto / Taxi / Local travel' }
    ]
  },
  {
    key: 'food_household',
    name: 'Food & Household',
    icon: '🛒',
    color: '#60a5fa',
    colorDim: 'rgba(96,165,250,0.12)',
    percentage: 10,
    subcategories: [
      { name: '🥬 Groceries', limit: 0, spent: 0, note: 'Weekly grocery shopping' },
      { name: '🍕 Takeout / Zomato', limit: 0, spent: 0, note: 'Limit to 2–3 times a month' }
    ]
  },
  {
    key: 'savings',
    name: 'Savings & Investments',
    icon: '💰',
    color: '#3ecf8e',
    colorDim: 'rgba(62,207,142,0.12)',
    percentage: 20,
    subcategories: [
      { name: '🛡️ Emergency Fund', limit: 0, spent: 0, note: 'Toward 3-month goal' },
      { name: '📈 SIPs / MF / RD', limit: 0, spent: 0, note: 'Long-term wealth' },
      { name: '🎯 Short-term Goals', limit: 0, spent: 0, note: 'Festive or unexpected costs' }
    ]
  },
  {
    key: 'self_investment',
    name: 'Self-Investment',
    icon: '🌿',
    color: '#a78bfa',
    colorDim: 'rgba(167,139,250,0.12)',
    percentage: 5,
    subcategories: [
      { name: '📚 Online Courses', limit: 0, spent: 0, note: 'LinkedIn Learning / Udemy' },
      { name: '🧘 Gym & Wellness', limit: 0, spent: 0, note: 'Yoga, health checkups' },
      { name: '✨ Personal Growth', limit: 0, spent: 0, note: 'Save for something inspiring' }
    ]
  },
  {
    key: 'fun_family',
    name: 'Fun & Family',
    icon: '🎉',
    color: '#fb923c',
    colorDim: 'rgba(251,146,60,0.12)',
    percentage: 7,
    subcategories: [
      { name: '👨‍👩‍👧 Family Outings', limit: 0, spent: 0, note: '1–2 family outings/month' },
      { name: '🎬 Treats & Hobbies', limit: 0, spent: 0, note: 'Movies · Games · No guilt!' }
    ]
  },
  {
    key: 'giving_misc',
    name: 'Giving & Misc',
    icon: '💖',
    color: '#f472b6',
    colorDim: 'rgba(244,114,182,0.12)',
    percentage: 3,
    subcategories: [
      { name: '🎁 Gifts & Charity', limit: 0, spent: 0, note: 'Adds emotional abundance' },
      { name: '🔧 Miscellaneous', limit: 0, spent: 0, note: 'Keeps budget flexible' }
    ]
  }
];

export const AVOID_LIST = [
  { emoji: '🚬', name: 'Smoking', key: 'smoke' },
  { emoji: '🍺', name: 'Drinking', key: 'alcohol' }
];
