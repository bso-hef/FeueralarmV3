import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  flame,
  personOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  logInOutline,
  moon,
  sunny,
  contrast,
} from 'ionicons/icons';

import { RestService } from '../../services/rest.service';
import { FeedbackService } from '../../services/feedback.service';
import { ThemeService } from '../../services/theme.service';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonSpinner,
  ],
})
export class LoginPage implements OnInit {
  credentials = {
    username: '',
    password: '',
  };

  showPassword = false;
  stayLoggedIn = false;
  isLoading = false;
  themeIcon = 'moon';
  showTestLogin = environment.enableTestLogin;

  constructor(
    private restService: RestService,
    private feedbackService: FeedbackService,
    private themeService: ThemeService,
    private router: Router
  ) {
    addIcons({
      flame,
      personOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      logInOutline,
      moon,
      sunny,
      contrast,
    });
  }

  ngOnInit() {
    this.themeIcon = this.themeService.getThemeIcon();
  }

  async login() {
    if (!this.credentials.username || !this.credentials.password) {
      await this.feedbackService.showErrorToast('Bitte alle Felder ausfüllen');
      return;
    }

    console.log('login start', this.credentials);
    this.isLoading = true;

    try {
      const result = await this.restService.login(this.credentials);

      if (result.success) {
        if (this.stayLoggedIn) {
          localStorage.setItem('stayloggedin', 'true');
          localStorage.setItem('user', this.credentials.username);
          localStorage.setItem('password', this.credentials.password);
        }

        await this.feedbackService.showSuccessToast('Erfolgreich angemeldet!');
        this.router.navigate(['/home']);
      } else {
        await this.feedbackService.showErrorToast(
          result.error || 'Anmeldung fehlgeschlagen'
        );
      }
    } catch (error: any) {
      console.error('Login error:', error);
      await this.feedbackService.showErrorToast(
        'Verbindungsfehler. Bitte versuche es erneut.'
      );
    } finally {
      this.isLoading = false;
      console.log('login end -> isLoading', this.isLoading);
    }
  }

  async testLogin() {
    console.log('🧪 Aktiviere Test-Login');
    this.isLoading = true;

    try {
      const result = await this.restService.testLogin();

      if (result.success) {
        await this.feedbackService.showSuccessToast('Test-Login erfolgreich!');
        this.router.navigate(['/home']);
      }
    } catch (error) {
      console.error('Test-Login error:', error);
      await this.feedbackService.showErrorToast('Test-Login fehlgeschlagen');
    } finally {
      this.isLoading = false;
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.themeIcon = this.themeService.getThemeIcon();
  }
}
