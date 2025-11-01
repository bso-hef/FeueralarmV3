import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { close, sunny, moon, contrast } from 'ionicons/icons';

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

  constructor(
    private modalCtrl: ModalController,
    private settingsService: SettingsService,
    private themeService: ThemeService,
    private socketService: SocketService
  ) {
    addIcons({ close, sunny, moon, contrast });
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
}
