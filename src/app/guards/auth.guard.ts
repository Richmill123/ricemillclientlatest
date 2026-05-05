import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, _state) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Token exists but is expired — try a silent refresh before redirecting.
  // For simplicity we just redirect; the interceptor handles mid-session refreshes.
  auth.clearSession();
  return router.createUrlTree(['/login']);
};
