import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-shared-header',
  templateUrl: './shared-header.component.html',
  styleUrls: ['./shared-header.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class SharedHeaderComponent {
  @Input() title: string = 'Feueralarm';
  @Input() showBackButton: boolean = false;

  isOnline: boolean = navigator.onLine;
  isAdmin: boolean = false;
  canAccessDashboard: boolean = false;

  constructor(
    private router: Router,
    private location: Location,
    private modalCtrl: ModalController
  ) {
    // Online/Offline Listener
    window.addEventListener('online', () => (this.isOnline = true));
    window.addEventListener('offline', () => (this.isOnline = false));

    // User Role aus LocalStorage
    const role = localStorage.getItem('role');
    this.isAdmin = role === 'admin';
    this.canAccessDashboard = role === 'admin' || role === 'management';
  }

  goBack() {
    this.location.back();
  }

  openHome() {
    this.router.navigate(['/home']);
  }

  openDashboard() {
    this.router.navigate(['/dashboard']);
  }

  openAuditLogs() {
    this.router.navigate(['/audit-logs']);
  }

  openUserManagement() {
    this.router.navigate(['/admin-users']);
  }

  openArchive() {
    this.router.navigate(['/archive']);
  }

  async openSettings() {
    try {
      // Dynamically import SettingsModal
      const { SettingsModal } = await import(
        '../../modals/settings/settings.modal'
      );

      const modal = await this.modalCtrl.create({
        component: SettingsModal,
      });

      await modal.present();
    } catch (error) {
      console.error('❌ Error opening Settings Modal:', error);
    }
  }

  async openInformation() {
    try {
      // Dynamically import InformationModal
      const { InformationModal } = await import(
        '../../modals/information/information.modal'
      );

      const modal = await this.modalCtrl.create({
        component: InformationModal,
      });

      await modal.present();
    } catch (error) {
      console.error('❌ Error opening Information Modal:', error);
    }
  }
}
