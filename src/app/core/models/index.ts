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
  subcategory?: string;        // maps to subcategory name
  merchant?: string;
  bank?: string;
  accountLast4?: string;
  note?: string;
  date: Date;
  month: string;               // 'YYYY-MM'
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
  month: string;               // 'YYYY-MM'
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

// ── Default Budget Template (₹88,500 income) ─────
// Exact amounts from user's budget plan
export const DEFAULT_BUDGET_CATEGORIES: Omit<CategoryBudget, 'limit' | 'spent'>[] = [
  {
    key: 'fixed_costs',
    name: 'Fixed Costs',
    icon: '🏦',
    color: '#f5c842',
    colorDim: 'rgba(245,200,66,0.12)',
    percentage: 55,
    subcategories: [
      { name: '🏠 Home EMI', limit: 32600, spent: 0, note: 'LIC Housing Finance — non-negotiable' },
      { name: '⚡ Utilities', limit: 10500, spent: 0, note: 'ACT, Airtel, Power, Water, Rent' },
      { name: '🚗 Transport & Fuel', limit: 5575, spent: 0, note: 'Auto / Taxi / Local commute' }
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
      { name: '🥬 Home Groceries', limit: 5300, spent: 0, note: 'Weekly grocery shopping' },
      { name: '🍕 Takeout / Zomato', limit: 3550, spent: 0, note: 'Limit to 2–3 times a month' }
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
      { name: '🛡️ Emergency Fund', limit: 8850, spent: 0, note: 'Peace Fund — toward 3-month goal' },
      { name: '📈 SIPs / MF / RD', limit: 5300, spent: 0, note: 'Long-term wealth building' },
      { name: '🎯 Short-term Goals', limit: 3550, spent: 0, note: 'Festive or unexpected costs' }
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
      { name: '📚 Online Courses', limit: 1770, spent: 0, note: 'LinkedIn Learning / Udemy' },
      { name: '🧘 Gym & Wellness', limit: 1770, spent: 0, note: 'Yoga, health checkups' },
      { name: '✨ Personal Growth Fund', limit: 885, spent: 0, note: 'Save for something inspiring' }
    ]
  },
  {
    key: 'fun_family',
    name: 'Guilt-Free Fun & Family',
    icon: '🎉',
    color: '#fb923c',
    colorDim: 'rgba(251,146,60,0.12)',
    percentage: 7,
    subcategories: [
      { name: '👨‍👩‍👧 Family Dinners & Outings', limit: 3540, spent: 0, note: '1–2 family outings/month' },
      { name: '🎬 Treats & Hobbies', limit: 2655, spent: 0, note: 'Movies · Games · No guilt zone!' }
    ]
  },
  {
    key: 'giving_misc',
    name: 'Giving & Miscellaneous',
    icon: '💖',
    color: '#f472b6',
    colorDim: 'rgba(244,114,182,0.12)',
    percentage: 3,
    subcategories: [
      { name: '🎁 Gifts & Charitable Acts', limit: 1770, spent: 0, note: 'Adds emotional abundance' },
      { name: '🔧 Misc Unexpected', limit: 885, spent: 0, note: 'Keeps budget flexible' }
    ]
  }
];

export const AVOID_LIST = [
  { emoji: '🚬', name: 'Smoking',  key: 'smoke'   },
  { emoji: '🍺', name: 'Drinking', key: 'alcohol' }
];

// ── Keyword → Category auto-mapping ──────────────
export const CATEGORY_MERCHANT_MAP: Record<CategoryKey, string[]> = {
  fixed_costs: [
    'lic housing', 'emi', 'home loan', 'act broadband', 'airtel', 'jio',
    'power bill', 'electricity', 'water bill', 'gas', 'maintenance', 'rent',
    'uber', 'ola', 'rapido', 'auto', 'petrol', 'fuel', 'metro', 'bus'
  ],
  food_household: [
    'zomato', 'swiggy', 'dunzo', 'blinkit', 'zepto', 'bigbasket',
    'dmart', 'reliance fresh', 'more supermarket', 'nature basket',
    'grofers', 'instamart', 'restaurant', 'cafe', 'dhaba', 'hotel',
    'canteen', 'food', 'grocery', 'vegetables', 'fruits'
  ],
  savings: [
    'mutual fund', 'sip', 'groww', 'zerodha', 'kuvera', 'paytm money',
    'fd', 'fixed deposit', 'rd', 'recurring deposit', 'ppf', 'nps',
    'investment', 'mf', 'coin', 'niyo'
  ],
  self_investment: [
    'udemy', 'coursera', 'linkedin learning', 'skillshare', 'byju',
    'unacademy', 'gym', 'yoga', 'fitness', 'health', 'hospital',
    'clinic', 'pharmacy', 'apollo', 'medplus', 'netmeds', 'pharmeasy',
    '1mg', 'practo', 'cult.fit', 'cure.fit'
  ],
  fun_family: [
    'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'meesho',
    'pvr', 'inox', 'bookmyshow', 'netflix', 'spotify', 'hotstar',
    'disney', 'prime video', 'gaming', 'steam', 'playstation',
    'xbox', 'entertainment', 'movie', 'outing', 'park', 'resort'
  ],
  giving_misc: [
    'donation', 'temple', 'charity', 'gift', 'gpay', 'phonepe',
    'paytm', 'transfer', 'send money', 'cashback'
  ],
  uncategorized: []
};