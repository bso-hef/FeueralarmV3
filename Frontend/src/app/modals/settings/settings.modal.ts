import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertController } from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { RestService } from '../../services/rest.service';
import { FeedbackService } from '../../services/feedback.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonList,
  IonItem,
  IonRadioGroup,
  IonRadio,
  IonToggle,
  IonSelect,
  IonSelectOption,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, sunny, moon, contrast, logOut } from 'ionicons/icons';

import { SettingsService } from '../../services/settings.service';
import { ThemeService } from '../../services/theme.service';
import { SocketService } from '../../services/socket.service';
import { Archive } from '../../interfaces/archive.interface';

@Component({
  selector: 'app-settings-modal',
  templateUrl: './settings.modal.html',
  styleUrls: ['./settings.modal.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonList,
    IonItem,
    IonRadioGroup,
    IonRadio,
    IonToggle,
    IonSelect,
    IonSelectOption,
  ],
})
export class SettingsModal implements OnInit {
  sortBy: 'teacher' | 'class' = 'teacher';
  defaultStatus: string = 'all';
  showNotifications = true;
  theme: 'light' | 'dark' | 'auto' = 'dark';
  selectedArchive = '';
  archives: Archive[] = [];

  private isLoggingOut = false;

  constructor(
    private modalCtrl: ModalController,
    private settingsService: SettingsService,
    private themeService: ThemeService,
    private socketService: SocketService,
    private alertCtrl: AlertController,
    private router: Router,
    private restService: RestService,
    private feedbackService: FeedbackService
  ) {
    addIcons({ close, sunny, moon, contrast, logOut });
  }

  ngOnInit() {
    this.sortBy = this.settingsService.getSortBy();
    this.defaultStatus =
      this.settingsService.getDefaultStatus() === 'all'
        ? 'all'
        : this.settingsService.getDefaultStatus().toString();
    this.showNotifications = this.settingsService.getNotifications();
    this.theme = this.themeService.getCurrentTheme() as
      | 'light'
      | 'dark'
      | 'auto';
    this.selectedArchive = this.settingsService.getChosenArchive() || '';

    this.loadArchives();
  }

  private loadArchives(): void {
    this.socketService.archive$.subscribe((archives) => {
      this.archives = archives;
    });
    this.socketService.fetchAlerts();
  }

  onSortByChange(): void {
    this.settingsService.setSortBy(this.sortBy);
  }

  onDefaultStatusChange(): void {
    const status =
      this.defaultStatus === 'all' ? 'all' : parseInt(this.defaultStatus);
    this.settingsService.setDefaultStatus(status as any);
  }

  onNotificationsChange(): void {
    this.settingsService.setNotifications(this.showNotifications);
  }

  onThemeChange(): void {
    this.themeService.setTheme(this.theme);
    console.log('🎨 Theme changed to:', this.theme);
  }

  onArchiveChange(): void {
    if (this.selectedArchive) {
      this.settingsService.setChosenArchive(this.selectedArchive);
      this.socketService.getPosts(this.selectedArchive);
    } else {
      this.settingsService.setChosenArchive('');
      this.socketService.getPosts();
    }
  }

  close(): void {
    this.modalCtrl.dismiss();
  }

  async logout(): Promise<void> {
    console.log('🚨 logout() called - isLoggingOut:', this.isLoggingOut);

    const globalLogoutFlag = sessionStorage.getItem('logout-in-progress');
    console.log('🚨 Global flag value:', globalLogoutFlag);

    if (globalLogoutFlag === 'true') {
      console.log('🚨 Global logout in progress, skipping...');
      return;
    }

    if (this.isLoggingOut) {
      console.log('🔓 Logout already in progress, skipping alert...');
      return;
    }

    this.isLoggingOut = true;
    sessionStorage.setItem('logout-in-progress', 'true');
    console.log('🚨 Set logout flag to true');

    console.log('🚨 Creating alert...');

    const alert = await this.alertCtrl.create({
      header: 'Abmelden',
      message: 'Möchtest du dich wirklich abmelden?',
      backdropDismiss: false,
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
          handler: () => {
            console.log('🚨 Abbrechen clicked');
            this.isLoggingOut = false;
            sessionStorage.removeItem('logout-in-progress');
            console.log('🚨 Removed logout flag after cancel');
          },
        },
        {
          text: 'Abmelden',
          role: 'confirm',
          handler: () => {
            console.log('🚨 Abmelden clicked - dismissing alert immediately');

            alert.dismiss().then(() => {
              console.log('🚨 Alert closed, starting logout...');
              this.performLogout();
            });

            return false;
          },
        },
      ],
    });

    console.log('🚨 Presenting alert...');
    await alert.present();
  }

  private async performLogout(): Promise<void> {
    console.log('🔓 performLogout() START');
    try {
      console.log('🔓 Showing loading...');
      this.feedbackService.showLoading('Abmelden...');

      console.log('🔓 Disconnecting socket...');
      this.socketService.disconnect();

      console.log('🔓 Calling logout...');
      await this.restService.logout();

      console.log('🔓 Clearing storage...');
      localStorage.clear();
      sessionStorage.clear();

      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          databases.forEach((db) => {
            if (db.name) indexedDB.deleteDatabase(db.name);
          });
        } catch (e) {
          console.log('IndexedDB clear failed:', e);
        }
      }

      console.log('🔓 Hiding loading...');
      await this.feedbackService.hideLoading();

      console.log('🔓 Closing settings modal...');
      await this.modalCtrl.dismiss();

      console.log('🔓 Navigating to login...');
      await this.router.navigate(['/login'], { replaceUrl: true });

      console.log('🔓 Showing toast...');
      await this.feedbackService.showSuccessToast('Erfolgreich abgemeldet');

      console.log('🔓 performLogout() END');
    } catch (error) {
      console.error('🔓 performLogout() ERROR:', error);
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(error, 'Fehler beim Abmelden');
      sessionStorage.removeItem('logout-in-progress');
    } finally {
      this.isLoggingOut = false;
    }
  }
}
