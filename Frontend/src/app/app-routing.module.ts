import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuardService } from './guards/auth-guard.service';
import { AuthLoginService } from './guards/auth-login.service';

const routes: Routes = [
  {
    path: '',
    canActivate: [AuthGuardService],
    loadChildren: () => import('./home/home.module').then( m => m.HomePageModule)
  },
  {
    path: 'login',
    canActivate: [AuthLoginService],
    loadChildren: () => import('./login/login.module').then( m => m.LoginPageModule)
  },
  {
    path: 'information',
    loadChildren: () => import('./_modals/information/information.module').then( m => m.InformationPageModule)
  },
  {
    path: 'settings',
    loadChildren: () => import('./_modals/settings/settings.module').then( m => m.SettingsPageModule)
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
