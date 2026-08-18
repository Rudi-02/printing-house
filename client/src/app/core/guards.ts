import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Role } from './models';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService), router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigateByUrl('/login');
  return false;
};

export const roleGuard = (...roles: Role[]): CanActivateFn => () => {
  const auth = inject(AuthService), router = inject(Router);
  if (!auth.isLoggedIn()) { router.navigateByUrl('/login'); return false; }
  if (roles.includes(auth.role()!)) return true;
  router.navigateByUrl(auth.homeRoute());
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService), router = inject(Router);
  if (!auth.isLoggedIn()) return true;
  router.navigateByUrl(auth.homeRoute());
  return false;
};
