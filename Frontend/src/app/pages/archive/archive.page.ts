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
  documentTextOutline,
  downloadOutline,
} from 'ionicons/icons';

import { AlarmService, AlarmData } from '../../services/alarm.service';
import { FeedbackService } from '../../services/feedback.service';
import { DataService } from '../../services/data.service';
import {
  ExportService,
  ExportTeacherData,
} from '../../services/export.service';

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
    private router: Router,
    private exportService: ExportService
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
      documentTextOutline,
      downloadOutline,
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
  // EXPORT FUNCTIONS (ÜBERARBEITET - OHNE showLoading!)
  // ==========================================

  async exportAlarmPDF(alarm: AlarmData) {
    console.log('📄 === exportAlarmPDF() CALLED ===');
    console.log('📄 Alarm:', alarm);
    console.log('📄 Alarm ID:', alarm._id);

    try {
      console.log('📄 Starte PDF-Export...');

      // Lade vollständige Alarm-Daten
      console.log('📄 Lade vollständige Alarm-Daten...');

      const response = await new Promise<any>((resolve, reject) => {
        this.alarmService.getAlarmById(alarm._id).subscribe({
          next: (res) => {
            console.log('✅ Alarm-Daten geladen:', res);
            resolve(res);
          },
          error: (err) => {
            console.error('❌ Fehler beim Laden:', err);
            reject(err);
          },
        });
      });

      if (!response || !response.posts) {
        throw new Error('Keine Daten verfügbar');
      }

      console.log('📄 Posts:', response.posts.length);

      const teachers = this.dataService.parseTeachersFromAPI(response.posts);
      console.log('📄 Teachers parsed:', teachers.length);

      // Konvertiere Teacher[] zu ExportTeacherData[]
      const exportData: ExportTeacherData[] = teachers.map((t) => ({
        name: t.names && t.names.length > 0 ? t.names.join(', ') : 'Unbekannt',
        klasse: t.class || t.classNumber || '',
        status: this.mapTeacherStateToStatus(t.state),
        comment: t.comment || '',
        raum: t.room && t.room.length > 0 ? t.room.join(', ') : '',
      }));

      console.log('📄 ExportData:', exportData.length, 'Einträge');

      // Exportiere PDF
      console.log('📄 Rufe exportService.exportAlarmToPDF() auf...');
      this.exportService.exportAlarmToPDF(alarm, exportData);

      console.log('✅ PDF-Export erfolgreich!');
      await this.feedbackService.showSuccessToast(
        'PDF erfolgreich exportiert! 📄'
      );
    } catch (error) {
      console.error('❌ PDF-Export fehlgeschlagen:', error);
      await this.feedbackService.showError(error, 'PDF-Export fehlgeschlagen');
    }
  }

  async exportAlarmCSV(alarm: AlarmData) {
    console.log('📊 === exportAlarmCSV() CALLED ===');
    console.log('📊 Alarm:', alarm);
    console.log('📊 Alarm ID:', alarm._id);

    try {
      console.log('📊 Starte CSV-Export...');

      // Lade vollständige Alarm-Daten
      console.log('📊 Lade vollständige Alarm-Daten...');

      const response = await new Promise<any>((resolve, reject) => {
        this.alarmService.getAlarmById(alarm._id).subscribe({
          next: (res) => {
            console.log('✅ Alarm-Daten geladen:', res);
            resolve(res);
          },
          error: (err) => {
            console.error('❌ Fehler beim Laden:', err);
            reject(err);
          },
        });
      });

      if (!response || !response.posts) {
        throw new Error('Keine Daten verfügbar');
      }

      console.log('📊 Posts:', response.posts.length);

      const teachers = this.dataService.parseTeachersFromAPI(response.posts);
      console.log('📊 Teachers parsed:', teachers.length);

      // Konvertiere Teacher[] zu ExportTeacherData[]
      const exportData: ExportTeacherData[] = teachers.map((t) => ({
        name: t.names && t.names.length > 0 ? t.names.join(', ') : 'Unbekannt',
        klasse: t.class || t.classNumber || '',
        status: this.mapTeacherStateToStatus(t.state),
        comment: t.comment || '',
        raum: t.room && t.room.length > 0 ? t.room.join(', ') : '',
      }));

      console.log('📊 ExportData:', exportData.length, 'Einträge');

      // Exportiere CSV
      console.log('📊 Rufe exportService.exportAlarmToCSV() auf...');
      this.exportService.exportAlarmToCSV(alarm, exportData);

      console.log('✅ CSV-Export erfolgreich!');
      await this.feedbackService.showSuccessToast(
        'CSV erfolgreich exportiert! 📊'
      );
    } catch (error) {
      console.error('❌ CSV-Export fehlgeschlagen:', error);
      await this.feedbackService.showError(error, 'CSV-Export fehlgeschlagen');
    }
  }

  async exportAllAlarmsCSV() {
    console.log('📊 === exportAllAlarmsCSV() CALLED ===');

    try {
      if (this.alarms.length === 0) {
        await this.feedbackService.showWarningToast(
          'Keine Alarme zum Exportieren vorhanden'
        );
        return;
      }

      console.log('📊 Exportiere', this.alarms.length, 'Alarme...');
      this.exportService.exportAllAlarmsToCSV(this.alarms);

      console.log('✅ CSV-Übersicht exportiert!');
      await this.feedbackService.showSuccessToast(
        'CSV-Übersicht exportiert! 📊'
      );
    } catch (error) {
      console.error('❌ CSV-Export fehlgeschlagen:', error);
      await this.feedbackService.showError(error, 'CSV-Export fehlgeschlagen');
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  /**
   * Konvertiert TeacherState Enum zu lesbarem Status-String
   */
  private mapTeacherStateToStatus(state?: number): string {
    if (state === undefined || state === null) {
      return 'unbekannt';
    }

    // TeacherState Enum mapping
    switch (state) {
      case 1: // OPEN
        return 'unbekannt';
      case 2: // PRESENT
        return 'anwesend';
      case 3: // INCOMPLETE
        return 'abwesend';
      default:
        return 'unbekannt';
    }
  }

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
