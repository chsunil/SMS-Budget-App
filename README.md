# 📱 SMS Budget Planner
### Ionic 7 + Angular 17 + Firebase + Capacitor 6

> Smart monthly budget tracker with automatic Indian bank SMS parsing.
> Reads real Android SMS, auto-categorizes transactions, and tracks spending against your personal budget plan.
> Targets Android (native) + Web (PWA).

---

## 🗂️ Project Structure

```
src/app/
├── core/
│   ├── models/index.ts                    # Interfaces, budget template, category-keyword map
│   ├── services/
│   │   ├── auth.service.ts                # Firebase email/password + anonymous auth
│   │   ├── budget.service.ts              # Firestore budget + transaction CRUD + subcategory tracking
│   │   ├── sms-parser.service.ts          # Indian bank SMS regex engine (SBI, HDFC, ICICI, Axis, Kotak…)
│   │   └── sms-reader.service.ts          # Android Capacitor SMS reader (@solimanware/capacitor-sms-reader)
│   └── guards/auth.guard.ts               # Route protection
│
├── shared/
│   └── pipes/inr.pipe.ts                  # ₹ INR currency formatting pipe
│
└── features/
    ├── auth/login/                         # Email login + "Continue as Guest"
    ├── auth/register/                      # Registration with live income preview
    ├── tabs/                               # Bottom tab layout (5 tabs)
    ├── dashboard/                          # Budget overview + donut chart + month navigator
    ├── budget/                             # 🆕 Budget Categories — full CRUD
    ├── transactions/                       # Transaction list + add form (manual)
    ├── messages/                           # 🆕 SMS inbox — 4 segments, search, infinite scroll
    ├── reports/                            # Monthly analytics + charts
    └── settings/                           # Profile, income settings, logout
```

---

## 🚀 Quick Start

### Prerequisites
```bash
node >= 18
npm >= 9
ionic CLI: npm install -g @ionic/cli
```

### 1. Install Dependencies
```bash
cd sms-budget-app
npm install
```

### 2. Firebase Setup
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project → "SMS Budget App"
3. Enable **Authentication** → Sign-in methods → **Email/Password** + **Anonymous**
4. Create **Firestore Database** → Start in production mode
5. Add a **Web App** → Copy the config
6. Paste into `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSy...',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-project.appspot.com',
    messagingSenderId: '123456789',
    appId: '1:123456789:web:abc123'
  }
};
```

### 3. Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Android SMS Permission
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.READ_SMS" />
<uses-permission android:name="android.permission.RECEIVE_SMS" />
```

### 5. Run on Web (demo / mock SMS data)
```bash
ionic serve
```
Open http://localhost:4200

### 6. Run on Android (real SMS reading)
```bash
ionic build
ionic capacitor add android        # first time only
ionic capacitor sync android
ionic capacitor open android       # opens Android Studio
# → Run on device or emulator
```

---

## 💰 Budget Plan (₹88,500 income)

| Category | % | Amount | Purpose |
|----------|---|--------|---------|
| 🏦 Fixed Costs | 55% | ₹48,675 | EMI, utilities, transport |
| 🛒 Food & Household | 10% | ₹8,850 | Groceries, takeout |
| 💰 Savings & Investments | 20% | ₹17,700 | Emergency fund, SIPs, goals |
| 🌿 Self-Investment | 5% | ₹4,425 | Courses, gym, wellness |
| 🎉 Guilt-Free Fun & Family | 7% | ₹6,195 | Outings, hobbies |
| 💖 Giving & Miscellaneous | 3% | ₹2,655 | Gifts, charity, buffer |

**Subcategory amounts (pre-loaded):**
- 🏠 Home EMI → ₹32,600 · ⚡ Utilities → ₹10,500 · 🚗 Transport → ₹5,575
- 🥬 Groceries → ₹5,300 · 🍕 Takeout → ₹3,550
- 🛡️ Emergency Fund → ₹8,850 · 📈 SIPs/MF → ₹5,300 · 🎯 Short-term Goals → ₹3,550
- 📚 Online Courses → ₹1,770 · 🧘 Gym & Wellness → ₹1,770 · ✨ Personal Growth → ₹885
- 👨‍👩‍👧 Family Outings → ₹3,540 · 🎬 Treats & Hobbies → ₹2,655
- 🎁 Gifts & Charity → ₹1,770 · 🔧 Misc → ₹885

**Avoid list:** 🚬 Smoking · 🍺 Drinking (Zero Spend)

---

## 🏦 Supported Indian Banks (SMS Parser)

| Bank | Debit | Credit | UPI |
|------|-------|--------|-----|
| SBI  | ✅ | ✅ | ✅ |
| HDFC | ✅ | ✅ | ✅ |
| ICICI| ✅ | ✅ | ✅ |
| Axis | ✅ | ✅ | ✅ |
| Kotak| ✅ | ✅ | ✅ |
| PNB  | ✅ | ✅ | ⚠️ |
| BOB  | ✅ | ✅ | ⚠️ |

---

## 📱 Feature Overview

### Messages Tab (SMS Inbox)
- Reads up to 2,000 SMS from Android inbox in one permission grant
- Auto-classifies into **4 segments**: Personal · Transactions · Promotions · Reminders
- **Infinite scroll** — renders 50 messages at a time, loads more on scroll
- Per-segment unread badges, full-text search, swipe to archive/delete
- Tap a transaction SMS → detail sheet with parsed amount, bank, merchant, confidence score
- One-tap **"Add to Budget"** with category picker — writes to Firestore instantly

### Budget Categories Tab
- **Full CRUD** for categories and subcategories (add, edit, delete with confirmation)
- Tap ✏️ on any category to rename, change icon/color/percentage/limit
- Expand any category to see subcategories with individual progress bars
- **Income editor** — change monthly income and all limits scale proportionally
- Live progress bars: amber at 80%, red at 100% spent
- Avoid List management — add/remove zero-spend commitments
- Month navigator — view any past month's budget

### Transaction Tracking
- Every transaction (SMS import or manual) updates category + subcategory `spent` totals in real time
- `subcategory` field on transactions enables granular tracking (e.g. "🏠 Home EMI" within Fixed Costs)
- Delete a transaction → automatically reverses the spent amount

### Dashboard
- Donut chart of income allocation across all 6 categories
- Month-by-month navigation
- Needs / Savings / Wants summary pills
- Collapsible category cards with progress

---

## 🔥 Firebase Data Model

```
users/
  {uid}/
    profile: { displayName, email, currency, monthlyIncome }
    budgets/
      {yyyy-MM}/
        income: number
        categories: CategoryBudget[]      # includes subcategories[] with spent tracking
        totalSpent: number
        totalSaved: number
    transactions/
      {txnId}/
        amount, type, category, subcategory, merchant, bank,
        accountLast4, date, month, source ('sms'|'manual'), smsRaw
```

---

## 🧪 Testing SMS Parser

```typescript
const parser = inject(SmsParserService);

parser.parseSMS('INR 32,600.00 debited from A/c XX1234 towards LIC Housing EMI on 01-Mar-26');
// → { amount: 32600, type: 'debit', bank: 'SBI', isValid: true, confidence: 'high' }

parser.parseSMS('Your HDFC Bank A/c XX5678 credited INR 88,500 by NEFT on 01-Mar-26');
// → { amount: 88500, type: 'credit', bank: 'HDFC', isValid: true, confidence: 'high' }

parser.autoCategory({ merchant: 'Zomato', raw: '...' });
// → 'food_household'
```

---

## 📦 Build for Production

### Web / PWA
```bash
ionic build --configuration production
npm install -g firebase-tools
firebase login && firebase init hosting
firebase deploy
```

### Android APK / AAB
```bash
ionic capacitor build android --prod
# Android Studio → Build → Generate Signed Bundle/APK
```

> **Play Store note:** Apps that read SMS require Google's SMS permissions declaration form. Select "Financial" as the use case.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Ionic 7 + Angular 17 |
| Native Bridge | Capacitor 6 |
| Backend | Firebase 10 (Auth + Firestore) |
| SMS Reading | @solimanware/capacitor-sms-reader 5.x |
| Styling | SCSS design tokens (dark + light surfaces) |
| State | RxJS BehaviorSubject + Firestore onSnapshot |
| Auth | Firebase Email/Password + Anonymous |
| Fonts | Syne (display) + DM Sans (body) |

---

## ✅ Completed Features
- [x] Firebase auth (email + anonymous guest login)
- [x] Android SMS reading with runtime permission
- [x] Indian bank SMS parser (SBI, HDFC, ICICI, Axis, Kotak + 5 others)
- [x] Messages inbox — 4 segments, search, infinite scroll, swipe actions
- [x] SMS → transaction import with category picker
- [x] Budget categories with full CRUD (add/edit/delete categories + subcategories)
- [x] Pre-loaded ₹88,500 budget plan with exact subcategory amounts
- [x] Income editor with proportional recalculation
- [x] Subcategory-level transaction tracking
- [x] Real-time Firestore sync across all pages
- [x] Month navigator on dashboard and budget pages
- [x] Avoid list with add/remove

## 📋 Upcoming
- [ ] Reports page — monthly charts (ApexCharts)
- [ ] Budget alerts / push notifications when category nears limit
- [ ] Transaction edit (currently add + delete only)
- [ ] Export to PDF/Excel
- [ ] Biometric app lock (Capacitor Biometrics)
- [ ] Recurring transaction detection
