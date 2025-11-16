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
    path: 'privacy',
    loadComponent: () =>
      import('./pages/privacy/privacy.page').then((m) => m.PrivacyPage),
  },
  {
    path: 'admin-users',
    loadComponent: () =>
      import('./pages/admin-users/admin-users.page').then(
        (m) => m.AdminUsersPage
      ),
    canActivate: [authGuard],
  },
  {
    path: 'archive',
    loadComponent: () =>
      import('./pages/archive/archive.page').then((m) => m.ArchivePage),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
    canActivate: [authGuard], // Nur für eingeloggte User - Admin-Check ist in der Komponente
  },
];
