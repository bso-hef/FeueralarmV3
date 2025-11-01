import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RestService } from '../services/rest.service';

export const authGuard: CanActivateFn = (route, state) => {
  const restService = inject(RestService);
  const router = inject(Router);

  if (restService.isAuthenticated()) {
    return true;
  }

  // Redirect to login
  router.navigate(['/login']);
  return false;
};

export const loginGuard: CanActivateFn = (route, state) => {
  const restService = inject(RestService);
  const router = inject(Router);

  // Wenn bereits eingeloggt, redirect zu home
  if (restService.isAuthenticated()) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};
