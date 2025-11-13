import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  refresh,
  calendarOutline,
  peopleOutline,
  timeOutline,
  eyeOutline,
  archiveOutline,
  checkmarkCircle,
  closeCircle,
  chevronForwardOutline,
} from 'ionicons/icons';

import { AlarmService, AlarmData } from '../../services/alarm.service';
import { FeedbackService } from '../../services/feedback.service';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.page.html',
  styleUrls: ['./archive.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
  ],
})
export class ArchivePage implements OnInit {
  alarms: AlarmData[] = [];
  filteredAlarms: AlarmData[] = [];
  filterStatus: 'all' | 'active' | 'archived' = 'all';
  isLoading = true;
  loadedFromCache = false;

  // Stats
  get activeAlarmsCount(): number {
    return this.alarms.filter((a) => !a.archived).length;
  }

  get archivedAlarmsCount(): number {
    return this.alarms.filter((a) => a.archived).length;
  }

  constructor(
    private alarmService: AlarmService,
    private feedbackService: FeedbackService,
    private dataService: DataService,
    private router: Router
  ) {
    addIcons({
      arrowBack,
      refresh,
      calendarOutline,
      peopleOutline,
      timeOutline,
      eyeOutline,
      archiveOutline,
      checkmarkCircle,
      closeCircle,
      chevronForwardOutline,
    });
  }

  ngOnInit() {
    this.loadAlarms();
  }

  // ==========================================
  // DATA LOADING WITH LOCAL STORAGE
  // ==========================================

  async loadAlarms() {
    try {
      this.isLoading = true;

      // 1️⃣ SCHRITT: Versuche erst aus dem Cache zu laden (schnell!)
      const cachedAlarms = this.alarmService.getAlarmsFromLocalStorage();
      const isCacheValid = this.alarmService.isCacheValid();

      if (cachedAlarms && isCacheValid) {
        console.log('⚡ Verwende gecachte Alarme (Cache ist noch gültig)');
        this.alarms = cachedAlarms;
        this.applyFilter();
        this.isLoading = false;
        this.loadedFromCache = true;

        // Zeige kurzen Hinweis
        await this.feedbackService.showInfoToast('Alarme aus Cache geladen');

        // Optional: Trotzdem im Hintergrund aktualisieren
        this.loadAlarmsFromServer(false);
      } else if (cachedAlarms && !isCacheValid) {
        console.log(
          '⏱️ Cache ist abgelaufen, zeige alte Daten und aktualisiere'
        );
        this.alarms = cachedAlarms;
        this.applyFilter();
        this.isLoading = false;
        this.loadedFromCache = true;

        // Lade neue Daten vom Server
        this.loadAlarmsFromServer(true);
      } else {
        console.log('🌐 Kein Cache vorhanden, lade vom Server');
        // Kein Cache vorhanden, direkt vom Server laden
        this.loadAlarmsFromServer(true);
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden:', error);
      this.isLoading = false;
      await this.feedbackService.showError(
        error,
        'Fehler beim Laden der Alarme'
      );
    }
  }

  // 2️⃣ SCHRITT: Vom Server laden
  private loadAlarmsFromServer(showLoading: boolean = true) {
    if (showLoading && !this.loadedFromCache) {
      this.isLoading = true;
    }

    this.alarmService.getAllAlarms().subscribe({
      next: (response: any) => {
        console.log('✅ Alarme vom Server geladen:', response);

        this.alarms = response.alerts;
        this.applyFilter();
        this.isLoading = false;
        this.loadedFromCache = false;

        // Automatisch im LocalStorage gespeichert durch tap() in service
        console.log('💾 Alarme wurden automatisch im Cache gespeichert');
      },
      error: async (error: any) => {
        console.error('❌ Fehler beim Laden vom Server:', error);

        // Wenn wir Cache haben, verwenden wir den weiter
        if (this.loadedFromCache) {
          await this.feedbackService.showWarningToast(
            'Keine Verbindung zum Server, zeige gecachte Daten'
          );
        } else {
          this.isLoading = false;
          await this.feedbackService.showError(
            error,
            'Fehler beim Laden der Alarme'
          );
        }
      },
    });
  }

  async doRefresh(event: any) {
    console.log('🔄 Pull-to-Refresh ausgelöst');

    // Cache löschen für erzwungenes Neuladen
    this.alarmService.clearCache();

    await this.loadAlarms();
    event.target.complete();
  }

  async refreshAlarms() {
    await this.feedbackService.showLoading('Aktualisiere...');

    // Cache löschen
    this.alarmService.clearCache();

    await this.loadAlarms();
    await this.feedbackService.hideLoading();
    await this.feedbackService.showSuccessToast('Alarme aktualisiert!');
  }

  // ==========================================
  // FILTERING
  // ==========================================

  applyFilter() {
    switch (this.filterStatus) {
      case 'active':
        this.filteredAlarms = this.alarms.filter((a) => !a.archived);
        break;
      case 'archived':
        this.filteredAlarms = this.alarms.filter((a) => a.archived);
        break;
      default:
        this.filteredAlarms = [...this.alarms];
    }
  }

  onFilterChange() {
    this.applyFilter();
  }

  // ==========================================
  // ALARM ACTIONS
  // ==========================================

  async viewAlarmDetails(alarm: AlarmData) {
    console.log('📋 Alarm Details anzeigen:', alarm._id);

    try {
      await this.feedbackService.showLoading('Lade Alarm-Details...');

      this.alarmService.getAlarmById(alarm._id).subscribe({
        next: async (response: any) => {
          console.log('✅ Alarm-Details geladen:', response);

          await this.feedbackService.hideLoading();

          // Parse und zeige die Daten auf der Home-Seite an
          const teachers = this.dataService.parseTeachersFromAPI(
            response.posts
          );

          console.log('👥 Parsed Teachers:', teachers);

          // Navigiere zur Home-Seite mit den Alarm-Daten
          this.router.navigate(['/home'], {
            state: {
              alarmData: response,
              isArchive: true,
            },
          });
        },
        error: async (error: any) => {
          await this.feedbackService.hideLoading();
          await this.feedbackService.showError(
            error,
            'Fehler beim Laden der Alarm-Details'
          );
        },
      });
    } catch (error) {
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(
        error,
        'Fehler beim Laden der Alarm-Details'
      );
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  formatAlarmDate(dateString: string): string {
    return this.alarmService.formatAlarmDate(dateString);
  }

  getTimeSince(dateString: string): string {
    return this.alarmService.getTimeSince(dateString);
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
