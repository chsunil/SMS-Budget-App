// ─── src/app/core/services/auth.service.ts ──────
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  user,
  updateProfile,
  sendPasswordResetEmail,
  User
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { ToastController, LoadingController } from '@ionic/angular';
import { UserProfile } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private firestore = inject(Firestore);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);

  // Observable stream of the current Firebase user
  readonly currentUser$: Observable<User | null> = user(this.auth);

  get currentUser(): User | null {
    return this.auth.currentUser;
  }

  // ── Register ───────────────────────────────────
  async register(name: string, email: string, password: string): Promise<void> {
    const loading = await this.loadingCtrl.create({
      message: 'Creating account…',
      cssClass: 'custom-loading'
    });
    await loading.present();

    try {
      const cred = await createUserWithEmailAndPassword(this.auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      // Create Firestore user profile
      const profileRef = doc(this.firestore, `users/${cred.user.uid}`);
      const profile: Omit<UserProfile, 'uid'> = {
        email,
        displayName: name,
        currency: 'INR',
        monthlyIncome: 88500,   // Default; user can update in settings
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await setDoc(profileRef, { ...profile, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

      await loading.dismiss();
      await this.showToast('Welcome! Account created 🎉', 'success');
      await this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
    } catch (err: any) {
      await loading.dismiss();
      await this.showToast(this.parseFirebaseError(err.code), 'danger');
      throw err;
    }
  }

  // ── Login ──────────────────────────────────────
  async login(email: string, password: string): Promise<void> {
    const loading = await this.loadingCtrl.create({ message: 'Signing in…' });
    await loading.present();

    try {
      await signInWithEmailAndPassword(this.auth, email, password);
      await loading.dismiss();
      await this.router.navigateByUrl('/tabs/dashboard', { replaceUrl: true });
    } catch (err: any) {
      await loading.dismiss();
      await this.showToast(this.parseFirebaseError(err.code), 'danger');
      throw err;
    }
  }

  // ── Logout ─────────────────────────────────────
  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigateByUrl('/auth/login', { replaceUrl: true });
  }

  // ── Password Reset ─────────────────────────────
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      await this.showToast('Reset email sent! Check your inbox 📬', 'success');
    } catch (err: any) {
      await this.showToast(this.parseFirebaseError(err.code), 'danger');
    }
  }

  // ── Helpers ────────────────────────────────────
  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'bottom',
      color,
      cssClass: 'custom-toast'
    });
    await toast.present();
  }

  private parseFirebaseError(code: string): string {
    const errors: Record<string, string> = {
      'auth/email-already-in-use': 'This email is already registered.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/user-not-found': 'No account found with this email.',
      'auth/wrong-password': 'Incorrect password. Please try again.',
      'auth/too-many-requests': 'Too many attempts. Please try again later.',
      'auth/network-request-failed': 'Network error. Check your connection.'
    };
    return errors[code] || 'Something went wrong. Please try again.';
  }
}
