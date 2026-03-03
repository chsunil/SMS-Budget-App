// ─── src/app/core/guards/auth.guard.ts ──────────
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe(
    take(1),
    map(u => {
      if (u) return true;
      router.navigateByUrl('/auth/login');
      return false;
    })
  );
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return user(auth).pipe(
    take(1),
    map(u => {
      if (!u) return true;
      router.navigateByUrl('/tabs/dashboard');
      return false;
    })
  );
};
