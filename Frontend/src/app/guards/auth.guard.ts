import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { RestService } from '../services/rest.service';

export const authGuard: CanActivateFn = (route, state) => {
  const restService = inject(RestService);
  const router = inject(Router);

  console.log('🛡️ Auth Guard prüft Zugriff auf:', state.url);

  const isAuthenticated = restService.isAuthenticated();
  console.log('🔐 Authentifiziert:', isAuthenticated);

  if (isAuthenticated) {
    console.log('✅ Auth Guard: Zugriff erlaubt');
    return true;
  }

  console.log('❌ Auth Guard: Zugriff verweigert, redirect zu /login');
  // Redirect to login
  router.navigate(['/login']);
  return false;
};

export const loginGuard: CanActivateFn = (route, state) => {
  const restService = inject(RestService);
  const router = inject(Router);

  console.log('🛡️ Login Guard prüft bereits eingeloggt...');

  const isAuthenticated = restService.isAuthenticated();

  // Wenn bereits eingeloggt, redirect zu home
  if (isAuthenticated) {
    console.log('✅ Bereits eingeloggt, redirect zu /home');
    router.navigate(['/home']);
    return false;
  }

  console.log('✅ Nicht eingeloggt, Login-Seite erlaubt');
  return true;
};

// The Comment only exists to do a commit with the message, that the login is finally working as intended.
// That means the Repo is in its First working State regarding Authentication and Login.
