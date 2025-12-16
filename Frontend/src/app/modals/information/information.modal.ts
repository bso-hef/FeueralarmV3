import { Component, OnInit, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButtons,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  ModalController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  flame,
  statsChart,
  alarm,
  person,
  informationCircle,
  shieldCheckmark,
  logOut,
} from 'ionicons/icons';

import { RestService } from '../../services/rest.service';
import { SocketService } from '../../services/socket.service';
import { FeedbackService } from '../../services/feedback.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-information-modal',
  templateUrl: './information.modal.html',
  styleUrls: ['./information.modal.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonFooter,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
  ],
})
export class InformationModal implements OnInit {
  @Input() stats?: {
    total: number;
    open: number;
    present: number;
    incomplete: number;
  };

  username = '';
  userRole = '';
  alertDate?: Date;
  isLiveData = true;

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController,
    private restService: RestService,
    private socketService: SocketService,
    private feedbackService: FeedbackService,
    private settingsService: SettingsService,
    private router: Router
  ) {
    addIcons({
      close,
      flame,
      statsChart,
      alarm,
      person,
      informationCircle,
      shieldCheckmark,
      logOut,
    });
  }

  ngOnInit() {
    // Get user info
    this.username = this.restService.getAuthValue().username;
    this.userRole = this.capitalizeRole(this.restService.getRoleValue());

    // Check if viewing live or archive
    const chosenArchive = this.settingsService.getChosenArchive();
    const liveArchive = this.settingsService.getLiveArchive();
    this.isLiveData = !chosenArchive || chosenArchive === liveArchive;

    // Get alert date
    this.alertDate = new Date(); // TODO: Get from app information
  }

  private capitalizeRole(role: string): string {
    if (role === 'admin') return 'Administrator';
    if (role === 'user') return 'Benutzer';
    return role;
  }

  private isLoggingOut = false;

  async logout(): Promise<void> {
    console.log('🚨 logout() called - isLoggingOut:', this.isLoggingOut);

    // Prüfe globalen Flag im sessionStorage
    const globalLogoutFlag = sessionStorage.getItem('logout-in-progress');
    if (globalLogoutFlag === 'true') {
      console.log('🚨 Global logout in progress, skipping...');
      return;
    }

    if (this.isLoggingOut) {
      console.log('🔓 Logout already in progress, skipping alert...');
      return;
    }

    // Setze beide Flags
    this.isLoggingOut = true;
    sessionStorage.setItem('logout-in-progress', 'true');

    console.log('🚨 Creating alert...');

    const alert = await this.alertCtrl.create({
      header: 'Abmelden',
      message: 'Möchtest du dich wirklich abmelden?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
          handler: () => {
            console.log('🚨 Abbrechen clicked');
            this.isLoggingOut = false;
            sessionStorage.removeItem('logout-in-progress');
          },
        },
        {
          text: 'Abmelden',
          role: 'confirm',
          handler: async () => {
            console.log('🚨 Abmelden clicked');
            await this.performLogout();
            return true;
          },
        },
      ],
    });

    console.log('🚨 Presenting alert...');
    await alert.present();

    // Cleanup wenn Alert geschlossen wird (egal wie)
    alert.onDidDismiss().then(() => {
      console.log('🚨 Alert dismissed');
      if (this.isLoggingOut) {
        // Wenn noch im Logout-Prozess, Flag NICHT entfernen
        console.log('🚨 Still logging out, keeping flag');
      } else {
        // Wenn abgebrochen wurde, Flag entfernen
        console.log('🚨 Logout cancelled, removing flag');
        sessionStorage.removeItem('logout-in-progress');
      }
    });
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

      console.log('🔓 Clearing storage (keeping logout flag)...');
      // Speichere Flag temporär
      const logoutFlag = sessionStorage.getItem('logout-in-progress');

      localStorage.clear();
      sessionStorage.clear();

      // Setze Flag zurück
      if (logoutFlag) {
        sessionStorage.setItem('logout-in-progress', logoutFlag);
      }

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

      console.log('🔓 Closing modal...');
      await this.modalCtrl.dismiss();

      console.log('🔓 Showing toast...');
      await this.feedbackService.showSuccessToast('Erfolgreich abgemeldet');

      console.log('🔓 Navigating to login...');
      await this.router.navigate(['/login'], { replaceUrl: true });

      console.log('🔓 Clearing logout flag after delay...');
      setTimeout(() => {
        sessionStorage.removeItem('logout-in-progress');
        console.log('🔓 Logout flag cleared');
      }, 1000);

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

  close(): void {
    this.modalCtrl.dismiss();
  }

  /**
   * DSGVO: Öffnet die Datenschutzerklärung
   */
  async openPrivacy(): Promise<void> {
    // Close modal first
    await this.modalCtrl.dismiss();

    // Navigate to privacy page
    this.router.navigate(['/privacy']);
  }
}
