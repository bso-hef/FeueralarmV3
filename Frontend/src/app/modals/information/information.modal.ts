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

  async logout(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Abmelden',
      message: 'Möchtest du dich wirklich abmelden?',
      buttons: [
        {
          text: 'Abbrechen',
          role: 'cancel',
        },
        {
          text: 'Abmelden',
          role: 'confirm',
          handler: async () => {
            await this.performLogout();
          },
        },
      ],
    });

    await alert.present();
  }

  private async performLogout(): Promise<void> {
    console.log('🔓 performLogout() START');
    try {
      console.log('🔓 Showing loading...');
      await this.feedbackService.showLoading('Abmelden...');

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

      console.log('🔓 Showing toast...');
      await this.feedbackService.showSuccessToast('Erfolgreich abgemeldet');

      console.log('🔓 Closing modal...');
      await this.modalCtrl.dismiss();

      console.log('🔓 Navigating to login...');
      this.router.navigate(['/login']);

      console.log('🔓 performLogout() END');
    } catch (error) {
      console.error('🔓 performLogout() ERROR:', error);
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(error, 'Fehler beim Abmelden');
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
