import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { CashierAuthService } from './cashier-auth.service';

export const cashierGuard: CanActivateFn = () => {
  const auth = inject(CashierAuthService);
  const router = inject(Router);
  return auth.cashierToken ? true : router.parseUrl('/login');
};
