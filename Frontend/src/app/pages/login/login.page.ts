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
  IonBadge,
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
  cloudOfflineOutline,
  cloudDoneOutline,
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
    IonBadge,
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

  // Offline-Status
  isOnline = true;
  canOfflineLogin = false;
  lastOnlineLogin: Date | null = null;

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
      cloudOfflineOutline,
      cloudDoneOutline,
    });
  }

  async ngOnInit() {
    this.themeIcon = this.themeService.getThemeIcon();

    // Prüfe Online-Status nur einmal beim Laden
    this.checkOnlineStatus();

    // Prüfe ob Offline-Login möglich ist
    this.canOfflineLogin = this.restService.canOfflineLogin();
    this.lastOnlineLogin = this.restService.getLastOnlineLogin();
  }

  private async checkOnlineStatus() {
    this.isOnline = await this.restService.isOnline();
    console.log(this.isOnline ? '🟢 Online' : '🔴 Offline');
  }

  async login() {
    // Verhindere mehrfache Aufrufe
    if (this.isLoading) {
      console.warn('⚠️ Login bereits in Progress');
      return;
    }

    if (!this.credentials.username || !this.credentials.password) {
      await this.feedbackService.showErrorToast('Bitte alle Felder ausfüllen');
      return;
    }

    console.log('🔐 Login gestartet...', this.credentials.username);
    this.isLoading = true;

    try {
      const result = await this.restService.login(this.credentials);

      if (result && result.success) {
        console.log('✅ Login erfolgreich', result);

        // Speichere Login-Daten wenn gewünscht
        if (this.stayLoggedIn) {
          localStorage.setItem('stayloggedin', 'true');
          localStorage.setItem('user', this.credentials.username);
        }

        // Toast je nach Modus
        if (result.isOffline) {
          await this.feedbackService.showSuccessToast(
            '📴 Offline-Login erfolgreich!'
          );
        } else {
          await this.feedbackService.showSuccessToast(
            '🟢 Online-Login erfolgreich!'
          );
        }

        this.isLoading = false;

        // Navigation
        setTimeout(async () => {
          try {
            const navigationSuccess = await this.router.navigate(['/home'], {
              replaceUrl: true,
            });
            console.log('✅ Navigation erfolgreich:', navigationSuccess);
          } catch (navError) {
            console.error('❌ Navigation Error:', navError);
            window.location.href = '/home';
          }
        }, 100);
      } else {
        // Login fehlgeschlagen
        console.log('❌ Login fehlgeschlagen:', result?.error);
        this.isLoading = false;
        await this.feedbackService.showErrorToast(
          result?.error || 'Anmeldung fehlgeschlagen'
        );
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      this.isLoading = false;
      await this.feedbackService.showErrorToast(
        'Verbindungsfehler. Bitte versuche es erneut.'
      );
    }
  }

  async testLogin() {
    console.log('🧪 Aktiviere Test-Login');

    if (this.isLoading) return;

    this.isLoading = true;

    try {
      const result = await this.restService.testLogin();

      if (result.success) {
        await this.feedbackService.showSuccessToast('Test-Login erfolgreich!');
        this.isLoading = false;
        await this.router.navigate(['/home'], { replaceUrl: true });
      } else {
        this.isLoading = false;
        await this.feedbackService.showErrorToast('Test-Login fehlgeschlagen');
      }
    } catch (error) {
      console.error('Test-Login error:', error);
      this.isLoading = false;
      await this.feedbackService.showErrorToast('Test-Login fehlgeschlagen');
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
    this.themeIcon = this.themeService.getThemeIcon();
  }

  formatLastLogin(date: Date | null): string {
    if (!date) return '';
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) return 'heute';
    if (diffDays === 1) return 'gestern';
    return `vor ${diffDays} Tagen`;
  }
}
