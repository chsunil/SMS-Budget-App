// ─── src/app/core/services/merchant-rules.service.ts ─
import { Injectable, inject } from '@angular/core';
import {
    Firestore, collection, doc, getDocs, setDoc,
    updateDoc, deleteDoc, query, orderBy,
    serverTimestamp, onSnapshot, increment
} from '@angular/fire/firestore';
import { Auth, authState } from '@angular/fire/auth';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { MerchantRule, CategoryKey, MatchType } from '../models';

// ── Built-in seed rules (applied if user has no custom rules yet) ──
const SEED_RULES: Omit<MerchantRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>[] = [
    // Fixed Costs
    { pattern: 'lic', matchType: 'contains', category: 'fixed_costs', subcategory: '🏠 Home EMI', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'emi', matchType: 'contains', category: 'fixed_costs', subcategory: '🏠 Home EMI', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'home loan', matchType: 'contains', category: 'fixed_costs', subcategory: '🏠 Home EMI', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'airtel', matchType: 'contains', category: 'fixed_costs', subcategory: '⚡ Utilities', priority: 8, enabled: true, hitCount: 0 },
    { pattern: 'jio', matchType: 'contains', category: 'fixed_costs', subcategory: '⚡ Utilities', priority: 8, enabled: true, hitCount: 0 },
    { pattern: 'act broadband', matchType: 'contains', category: 'fixed_costs', subcategory: '⚡ Utilities', priority: 8, enabled: true, hitCount: 0 },
    { pattern: 'electricity', matchType: 'contains', category: 'fixed_costs', subcategory: '⚡ Utilities', priority: 8, enabled: true, hitCount: 0 },
    { pattern: 'uber', matchType: 'contains', category: 'fixed_costs', subcategory: '🚗 Transport & Fuel', priority: 7, enabled: true, hitCount: 0 },
    { pattern: 'ola', matchType: 'contains', category: 'fixed_costs', subcategory: '🚗 Transport & Fuel', priority: 7, enabled: true, hitCount: 0 },
    { pattern: 'rapido', matchType: 'contains', category: 'fixed_costs', subcategory: '🚗 Transport & Fuel', priority: 7, enabled: true, hitCount: 0 },
    { pattern: 'petrol', matchType: 'contains', category: 'fixed_costs', subcategory: '🚗 Transport & Fuel', priority: 7, enabled: true, hitCount: 0 },
    // Food
    { pattern: 'zomato', matchType: 'contains', category: 'food_household', subcategory: '🍕 Takeout / Zomato', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'swiggy', matchType: 'contains', category: 'food_household', subcategory: '🍕 Takeout / Zomato', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'blinkit', matchType: 'contains', category: 'food_household', subcategory: '🥬 Home Groceries', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'zepto', matchType: 'contains', category: 'food_household', subcategory: '🥬 Home Groceries', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'bigbasket', matchType: 'contains', category: 'food_household', subcategory: '🥬 Home Groceries', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'dmart', matchType: 'contains', category: 'food_household', subcategory: '🥬 Home Groceries', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'instamart', matchType: 'contains', category: 'food_household', subcategory: '🥬 Home Groceries', priority: 9, enabled: true, hitCount: 0 },
    // Savings
    { pattern: 'groww', matchType: 'contains', category: 'savings', subcategory: '📈 SIPs / MF / RD', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'zerodha', matchType: 'contains', category: 'savings', subcategory: '📈 SIPs / MF / RD', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'kuvera', matchType: 'contains', category: 'savings', subcategory: '📈 SIPs / MF / RD', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'sip', matchType: 'contains', category: 'savings', subcategory: '📈 SIPs / MF / RD', priority: 8, enabled: true, hitCount: 0 },
    { pattern: 'mutual fund', matchType: 'contains', category: 'savings', subcategory: '📈 SIPs / MF / RD', priority: 8, enabled: true, hitCount: 0 },
    // Self-investment
    { pattern: 'udemy', matchType: 'contains', category: 'self_investment', subcategory: '📚 Online Courses', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'coursera', matchType: 'contains', category: 'self_investment', subcategory: '📚 Online Courses', priority: 10, enabled: true, hitCount: 0 },
    { pattern: 'gym', matchType: 'contains', category: 'self_investment', subcategory: '🧘 Gym & Wellness', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'medplus', matchType: 'contains', category: 'self_investment', subcategory: '🧘 Gym & Wellness', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'apollo', matchType: 'contains', category: 'self_investment', subcategory: '🧘 Gym & Wellness', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'pharmeasy', matchType: 'contains', category: 'self_investment', subcategory: '🧘 Gym & Wellness', priority: 9, enabled: true, hitCount: 0 },
    // Fun
    { pattern: 'amazon', matchType: 'contains', category: 'fun_family', subcategory: '🎬 Treats & Hobbies', priority: 7, enabled: true, hitCount: 0 },
    { pattern: 'flipkart', matchType: 'contains', category: 'fun_family', subcategory: '🎬 Treats & Hobbies', priority: 7, enabled: true, hitCount: 0 },
    { pattern: 'netflix', matchType: 'contains', category: 'fun_family', subcategory: '🎬 Treats & Hobbies', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'hotstar', matchType: 'contains', category: 'fun_family', subcategory: '🎬 Treats & Hobbies', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'spotify', matchType: 'contains', category: 'fun_family', subcategory: '🎬 Treats & Hobbies', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'pvr', matchType: 'contains', category: 'fun_family', subcategory: '👨‍👩‍👧 Family Dinners & Outings', priority: 9, enabled: true, hitCount: 0 },
    { pattern: 'bookmyshow', matchType: 'contains', category: 'fun_family', subcategory: '🎬 Treats & Hobbies', priority: 9, enabled: true, hitCount: 0 },
];

@Injectable({ providedIn: 'root' })
export class MerchantRulesService {
    private firestore = inject(Firestore);
    private auth = inject(Auth);

    // In-memory cache — loaded once per session, stays fresh via snapshot listener
    private _rules$ = new BehaviorSubject<MerchantRule[]>([]);
    readonly rules$ = this._rules$.asObservable();

    private unsubscribe?: () => void;

    // ── Get/await UID ────────────────────────────
    private async getUid(): Promise<string> {
        if (this.auth.currentUser?.uid) return this.auth.currentUser.uid;
        const user = await firstValueFrom(
            authState(this.auth).pipe(filter(u => !!u), take(1))
        ).catch(() => null);
        if (user?.uid) return user.uid;
        throw new Error('Not authenticated');
    }

    // ── Bootstrap: load rules + seed if first time ──
    async init(): Promise<void> {
        const uid = await this.getUid();
        const colRef = collection(this.firestore, `users/${uid}/merchantRules`);

        // Live listener — rules update immediately when changed from admin panel
        this.unsubscribe = onSnapshot(
            query(colRef, orderBy('priority', 'desc')),
            snap => {
                const rules = snap.docs.map(d => ({ id: d.id, ...d.data() })) as MerchantRule[];
                this._rules$.next(rules);
            }
        );

        // Seed default rules on first load
        const snap = await getDocs(colRef);
        if (snap.empty) {
            await this.seedDefaults(uid);
        }
    }

    private async seedDefaults(uid: string): Promise<void> {
        const colRef = collection(this.firestore, `users/${uid}/merchantRules`);
        for (const rule of SEED_RULES) {
            const ref = doc(colRef);
            await setDoc(ref, {
                ...rule, id: ref.id, userId: uid,
                createdAt: serverTimestamp(), updatedAt: serverTimestamp()
            });
        }
    }

    // ── Apply rules to a merchant + raw SMS text ─
    // Returns { category, subcategory } or null if no match
    applyRules(merchant: string, rawSms: string = ''): { category: CategoryKey; subcategory?: string } | null {
        const rules = this._rules$.getValue().filter(r => r.enabled);
        const haystack = `${merchant} ${rawSms}`.toLowerCase();

        for (const rule of rules) { // already sorted by priority desc
            if (this.matches(rule, haystack)) {
                return { category: rule.category, subcategory: rule.subcategory };
            }
        }
        return null;
    }

    private matches(rule: MerchantRule, haystack: string): boolean {
        const pattern = rule.pattern.toLowerCase();
        switch (rule.matchType) {
            case 'contains': return haystack.includes(pattern);
            case 'startsWith': return haystack.startsWith(pattern);
            case 'exact': return haystack.trim() === pattern;
            case 'regex':
                try { return new RegExp(pattern, 'i').test(haystack); }
                catch { return false; }
        }
    }

    // ── CRUD ─────────────────────────────────────
    async addRule(rule: Omit<MerchantRule, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
        const uid = await this.getUid();
        const colRef = collection(this.firestore, `users/${uid}/merchantRules`);
        const ref = doc(colRef);
        await setDoc(ref, {
            ...rule, id: ref.id, userId: uid, hitCount: 0,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp()
        });
        return ref.id;
    }

    async updateRule(id: string, patch: Partial<MerchantRule>): Promise<void> {
        const uid = await this.getUid();
        await updateDoc(
            doc(this.firestore, `users/${uid}/merchantRules/${id}`),
            { ...patch, updatedAt: serverTimestamp() }
        );
    }

    async deleteRule(id: string): Promise<void> {
        const uid = await this.getUid();
        await deleteDoc(doc(this.firestore, `users/${uid}/merchantRules/${id}`));
    }

    async toggleRule(id: string, enabled: boolean): Promise<void> {
        await this.updateRule(id, { enabled });
    }

    // Called by budget.service after a rule successfully categorizes a transaction
    async incrementHit(id: string): Promise<void> {
        try {
            const uid = await this.getUid();
            await updateDoc(
                doc(this.firestore, `users/${uid}/merchantRules/${id}`),
                { hitCount: increment(1) }
            );
        } catch { /* non-critical */ }
    }

    get currentRules(): MerchantRule[] { return this._rules$.getValue(); }

    destroy(): void { this.unsubscribe?.(); }
}