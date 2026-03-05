// ─── src/app/core/services/budget.service.ts ────
import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import {
  MonthlyBudget,
  Transaction,
  CategoryBudget,
  CategoryKey,
  DEFAULT_BUDGET_CATEGORIES
} from '../models';
import { format } from 'date-fns';

@Injectable({ providedIn: 'root' })
export class BudgetService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  private _currentMonth$ = new BehaviorSubject<string>(this.currentMonthKey());
  readonly currentMonth$ = this._currentMonth$.asObservable();

  // ── Month helpers ─────────────────────────────
  currentMonthKey(): string {
    return format(new Date(), 'yyyy-MM');
  }

  setMonth(month: string) {
    this._currentMonth$.next(month);
  }

  // ── Budget CRUD ───────────────────────────────
  async getOrCreateBudget(month: string, income: number = 88500): Promise<MonthlyBudget> {
    const uid = this.authService.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const budgetRef = doc(this.firestore, `users/${uid}/budgets/${month}`);
    const snap = await getDoc(budgetRef);

    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as MonthlyBudget;
    }

    // Create budget using exact subcategory limits from DEFAULT_BUDGET_CATEGORIES
    const categories: CategoryBudget[] = DEFAULT_BUDGET_CATEGORIES.map(cat => ({
      ...cat,
      limit: Math.round(income * cat.percentage / 100),
      spent: 0,
      subcategories: cat.subcategories.map(sub => ({
        ...sub,
        // Use preset limit if > 0, otherwise calculate proportionally
        limit: sub.limit > 0 ? sub.limit : Math.round(income * cat.percentage / 100 / cat.subcategories.length),
        spent: 0
      }))
    }));

    const budget: MonthlyBudget = {
      userId: uid,
      month,
      income,
      categories,
      totalSpent: 0,
      totalSaved: 0
    };

    await setDoc(budgetRef, {
      ...budget,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { id: month, ...budget };
  }

  // Real-time budget listener
  watchBudget(month: string): Observable<MonthlyBudget | null> {
    return new Observable(observer => {
      const uid = this.authService.currentUser?.uid;
      if (!uid) { observer.next(null); return; }

      const ref = doc(this.firestore, `users/${uid}/budgets/${month}`);
      return onSnapshot(ref, snap => {
        if (snap.exists()) {
          observer.next({ id: snap.id, ...snap.data() } as MonthlyBudget);
        } else {
          observer.next(null);
        }
      });
    });
  }

  // Patch any fields on a budget document
  async patchBudget(month: string, patch: Partial<MonthlyBudget>): Promise<void> {
    const uid = this.authService.currentUser?.uid;
    if (!uid) return;
    const ref = doc(this.firestore, `users/${uid}/budgets/${month}`);
    await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  }

  async updateCategorySpent(month: string, categoryKey: CategoryKey, amount: number, isDebit: boolean) {
    const uid = this.authService.currentUser?.uid;
    if (!uid) return;

    const budget = await this.getOrCreateBudget(month);
    const updatedCategories = budget.categories.map(cat => {
      if (cat.key === categoryKey) {
        return {
          ...cat,
          spent: isDebit ? cat.spent + amount : Math.max(0, cat.spent - amount)
        };
      }
      return cat;
    });

    const totalSpent = updatedCategories.reduce((acc, c) => acc + c.spent, 0);
    const ref = doc(this.firestore, `users/${uid}/budgets/${month}`);
    await updateDoc(ref, {
      categories: updatedCategories,
      totalSpent,
      updatedAt: serverTimestamp()
    });
  }

  // Update subcategory spent when transaction is added
  async updateSubcategorySpent(
    month: string,
    categoryKey: CategoryKey,
    subcategoryName: string,
    amount: number,
    isDebit: boolean
  ): Promise<void> {
    const uid = this.authService.currentUser?.uid;
    if (!uid) return;

    const budget = await this.getOrCreateBudget(month);
    const updatedCategories = budget.categories.map(cat => {
      if (cat.key !== categoryKey) return cat;
      const updatedSubs = cat.subcategories.map(sub => {
        if (sub.name === subcategoryName) {
          return { ...sub, spent: isDebit ? sub.spent + amount : Math.max(0, sub.spent - amount) };
        }
        return sub;
      });
      const catSpent = updatedSubs.reduce((a, s) => a + s.spent, 0);
      return { ...cat, subcategories: updatedSubs, spent: catSpent };
    });

    const totalSpent = updatedCategories.reduce((acc, c) => acc + c.spent, 0);
    const ref = doc(this.firestore, `users/${uid}/budgets/${month}`);
    await updateDoc(ref, { categories: updatedCategories, totalSpent, updatedAt: serverTimestamp() });
  }

  // ── Transactions ──────────────────────────────
  async addTransaction(txn: Omit<Transaction, 'id' | 'userId' | 'createdAt'>): Promise<string> {
    const uid = this.authService.currentUser?.uid;
    if (!uid) throw new Error('Not authenticated');

    const colRef = collection(this.firestore, `users/${uid}/transactions`);
    const newRef = doc(colRef);
    const transaction: Transaction = {
      ...txn,
      id: newRef.id,
      userId: uid,
      createdAt: new Date()
    };

    await setDoc(newRef, { ...transaction, createdAt: serverTimestamp() });

    // Update category + subcategory spent totals
    if (txn.category !== 'uncategorized') {
      if (txn.subcategory) {
        await this.updateSubcategorySpent(txn.month, txn.category, txn.subcategory, txn.amount, txn.type === 'debit');
      } else {
        await this.updateCategorySpent(txn.month, txn.category, txn.amount, txn.type === 'debit');
      }
    }

    return newRef.id;
  }

  watchTransactions(month: string): Observable<Transaction[]> {
    return new Observable(observer => {
      const uid = this.authService.currentUser?.uid;
      if (!uid) { observer.next([]); return; }

      const q = query(
        collection(this.firestore, `users/${uid}/transactions`),
        where('month', '==', month),
        orderBy('date', 'desc')
      );

      return onSnapshot(q, snap => {
        const txns = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          date: (d.data()['date'] as Timestamp).toDate()
        })) as Transaction[];
        observer.next(txns);
      });
    });
  }

  async deleteTransaction(txnId: string, txn: Transaction): Promise<void> {
    const uid = this.authService.currentUser?.uid;
    if (!uid) return;

    await deleteDoc(doc(this.firestore, `users/${uid}/transactions/${txnId}`));

    // Reverse the spent amount
    if (txn.subcategory) {
      await this.updateSubcategorySpent(txn.month, txn.category, txn.subcategory, txn.amount, txn.type !== 'debit');
    } else {
      await this.updateCategorySpent(txn.month, txn.category, txn.amount, txn.type !== 'debit');
    }
  }

  // ── Analytics ─────────────────────────────────
  async getMonthlyReport(month: string): Promise<{
    totalIncome: number;
    totalExpense: number;
    savingsRate: number;
    topCategory: string;
    dailyAverage: number;
  }> {
    const budget = await this.getOrCreateBudget(month);
    const totalExpense = budget.totalSpent;
    const savingsRate = Math.round(((budget.income - totalExpense) / budget.income) * 100);
    const topCat = budget.categories.reduce((a, b) => (a.spent > b.spent ? a : b));
    const daysInMonth = new Date(
      parseInt(month.split('-')[0]),
      parseInt(month.split('-')[1]),
      0
    ).getDate();

    return {
      totalIncome: budget.income,
      totalExpense,
      savingsRate,
      topCategory: topCat.name,
      dailyAverage: Math.round(totalExpense / daysInMonth)
    };
  }
}