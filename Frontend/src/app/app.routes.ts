import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },

  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'admin-users',
    loadComponent: () =>
      import('./pages/admin-users/admin-users.page').then(
        (m) => m.AdminUsersPage
      ),
    canActivate: [authGuard],
  },
];
