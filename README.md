# 📱 SMS Budget Planner
### Ionic 7 + Angular 17 + Firebase + Capacitor

> Smart monthly budget tracker with automatic Indian bank SMS parsing.
> Targets Android (native) + Web (PWA).

---

## 🗂️ Project Structure

```
src/app/
├── core/
│   ├── models/index.ts           # All TypeScript interfaces + budget template
│   ├── services/
│   │   ├── auth.service.ts       # Firebase email/password auth
│   │   ├── budget.service.ts     # Firestore budget + transaction CRUD
│   │   ├── sms-parser.service.ts # Indian bank SMS regex engine
│   │   └── sms-reader.service.ts # Android Capacitor SMS reader
│   └── guards/auth.guard.ts      # Route protection
│
├── shared/
│   └── pipes/inr.pipe.ts         # ₹ INR currency formatting pipe
│
└── features/
    ├── auth/login/               # Email login page
    ├── auth/register/            # Registration with income preview
    ├── tabs/                     # Bottom tab layout
    ├── dashboard/                # Budget overview + donut chart
    ├── sms-import/               # Android SMS reader + import UI
    ├── transactions/             # Transaction list + add form
    ├── reports/                  # Monthly analytics
    └── settings/                 # Profile + income settings
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
3. Enable **Authentication** → Sign-in method → **Email/Password**
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
In Firebase Console → Firestore → Rules:
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

### 4. Run on Web
```bash
ionic serve
```
Open http://localhost:4200

### 5. Run on Android
```bash
# Build first
ionic build

# Add Android platform (first time only)
ionic capacitor add android

# Sync and open in Android Studio
ionic capacitor sync android
ionic capacitor open android

# Or run directly (requires connected device or emulator)
ionic capacitor run android -l --external
```

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

## 💰 Default Budget Template (₹88,500 income)

| Category | % | Amount |
|----------|---|--------|
| 🏦 Fixed Costs (EMI + Bills + Transport) | 55% | ₹48,675 |
| 🛒 Food & Household | 10% | ₹8,850 |
| 💰 Savings & Investments | 20% | ₹17,700 |
| 🌿 Self-Investment | 5% | ₹4,425 |
| 🎉 Fun & Family | 7% | ₹6,195 |
| 💖 Giving & Misc | 3% | ₹2,655 |

**Avoid list:** 🚬 Smoke · 🍺 Drinking

---

## 🔥 Firebase Collections

```
users/
  {uid}/
    profile: { displayName, email, currency, monthlyIncome }
    budgets/
      {yyyy-MM}/
        { income, categories[], totalSpent, totalSaved }
    transactions/
      {txnId}/
        { amount, type, category, merchant, bank, date, source, smsRaw }
```

---

## 🧪 Testing SMS Parser

```typescript
// In any component or test file:
const parser = inject(SmsParserService);

const result = parser.parseSMS(
  'INR 32,600.00 debited from A/c XX1234 towards LIC Housing EMI on 01-Mar-26'
);
// → { amount: 32600, type: 'debit', bank: 'SBI', isValid: true, confidence: 'high' }
```

---

## 📦 Build for Production

### Web / PWA
```bash
ionic build --configuration production
# Deploy dist/sms-budget-app to Firebase Hosting:
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Android APK
```bash
ionic capacitor build android --prod
# Open Android Studio → Build → Generate Signed Bundle/APK
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Ionic 7 + Angular 17 |
| Native Bridge | Capacitor 5 |
| Backend | Firebase (Auth + Firestore) |
| SMS (Android) | Capacitor SMS Plugin |
| Charts | ApexCharts / SVG |
| Styling | Ionic CSS + SCSS Design Tokens |
| State | RxJS + BehaviorSubject |
| Auth | Firebase Email/Password |

---

## 📋 Next Steps
- [ ] Add ApexCharts to Reports page
- [ ] Add transaction edit/delete functionality
- [ ] Add monthly budget goal alerts
- [ ] Add biometric lock (Capacitor Biometrics)
- [ ] Add export to PDF/Excel
- [ ] Push notifications for budget limits
