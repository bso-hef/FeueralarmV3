import { Component, OnInit, OnDestroy, inject, Injector } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RestService } from '../services/rest.service';
import {
  ExportService,
  ExportAlarmData,
  ExportTeacherData,
} from '../services/export.service';
import { AlarmFooterComponent } from '../components/alarm-footer/alarm-footer.component';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSearchbar,
  IonSpinner,
  IonChip,
  IonCard,
  IonCardContent,
  IonProgressBar,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  settingsOutline,
  informationCircleOutline,
  notifications,
  locationOutline,
  chatboxOutline,
  chatbox,
  trashOutline,
  closeCircle,
  checkmarkCircle,
  searchOutline,
  peopleOutline,
  archiveOutline,
  statsChartOutline,
  wifi,
  cloudOffline,
  syncOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import moment from 'moment';

import {
  Teacher,
  TeacherState,
  TeacherStateLabel,
} from '../interfaces/teacher.interface';
import { SocketService } from '../services/socket.service';
import { SyncService } from '../services/sync.service';
import { DataService } from '../services/data.service';
import { FeedbackService } from '../services/feedback.service';
import { SettingsService } from '../services/settings.service';
import { SettingsModal } from '../modals/settings/settings.modal';
import { InformationModal } from '../modals/information/information.modal';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
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
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSearchbar,
    IonSpinner,
    IonChip,
    IonCard,
    IonCardContent,
    IonProgressBar,
    AlarmFooterComponent,
  ],
})
export class HomePage implements OnInit, OnDestroy {
  // Socket Service optional
  private socketService?: SocketService;

  // Data
  teachers: Teacher[] = [];
  filteredTeachers: Teacher[] = [];

  // UI State
  isLoading = true;
  isAdmin = false;
  canAccessDashboard = false;
  searchTerm = '';
  selectedStatus: string = '4'; // 4 = All
  sortBy: 'teacher' | 'class' = 'teacher';

  // Sync Status
  isOnline = true;
  isSyncing = false;
  pendingActions = 0;

  // Alarm State
  hasActiveAlarm = false;
  currentAlarmId: string | null = null;
  isProcessingAlarm = false;

  // Stats
  stats = {
    total: 0,
    open: 0,
    present: 0,
    incomplete: 0,
  };

  // School Hours
  schoolHours = [
    { time: '0745', label: '1. Stunde (07:45)' },
    { time: '0830', label: '2. Stunde (08:30)' },
    { time: '0930', label: '3. Stunde (09:30)' },
    { time: '1015', label: '4. Stunde (10:15)' },
    { time: '1115', label: '5. Stunde (11:15)' },
    { time: '1200', label: '6. Stunde (12:00)' },
    { time: '1315', label: '7. Stunde (13:15)' },
    { time: '1400', label: '8. Stunde (14:00)' },
  ];
  selectedHour = this.getCurrentSchoolHour();

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private restService: RestService,
    private dataService: DataService,
    private feedbackService: FeedbackService,
    private settingsService: SettingsService,
    private modalCtrl: ModalController,
    private router: Router,
    private syncService: SyncService,
    private exportService: ExportService
  ) {
    // Socket Service optional injizieren
    try {
      const injector = inject(Injector);
      this.socketService = injector.get(SocketService, null) ?? undefined;
      if (this.socketService) {
        console.log('✅ SocketService verfügbar');
      } else {
        console.warn('⚠️ SocketService nicht verfügbar - läuft ohne Socket');
      }
    } catch (error) {
      console.warn('⚠️ SocketService konnte nicht geladen werden:', error);
    }

    // Register icons
    addIcons({
      settingsOutline,
      informationCircleOutline,
      notifications,
      locationOutline,
      chatboxOutline,
      chatbox,
      trashOutline,
      closeCircle,
      checkmarkCircle,
      searchOutline,
      peopleOutline,
      archiveOutline,
      statsChartOutline,
      wifi,
      cloudOffline,
      syncOutline,
      documentTextOutline,
    });
  }

  async ngOnInit() {
    // Check if user is admin or verwaltung
    const role = this.restService.getRoleValue();
    this.isAdmin = role === 'admin';
    this.canAccessDashboard = role === 'admin' || role === 'verwaltung';

    // Get settings
    this.sortBy = this.settingsService.getSortBy();
    this.selectedStatus = this.settingsService
      .getDefaultStatusAsNumber()
      .toString();

    // Sync-Status überwachen
    this.subscriptions.push(
      this.syncService.getOnlineStatus().subscribe((online) => {
        this.isOnline = online;
        console.log(online ? '🟢 Online' : '🔴 Offline');
      }),
      this.syncService.isSyncing().subscribe((syncing) => {
        this.isSyncing = syncing;
      }),
      this.syncService.getPendingActionsCount().subscribe((count) => {
        this.pendingActions = count;
      })
    );

    // Socket nur verbinden wenn verfügbar
    if (this.socketService && !this.socketService.isSocketConnected()) {
      try {
        await this.socketService.connect();
        console.log('✅ Socket connected');
      } catch (error) {
        console.warn('⚠️ Socket connection failed:', error);
      }
    }

    // Setup socket listeners nur wenn Socket verfügbar
    if (this.socketService) {
      this.setupSocketListeners();
    }

    // Load data
    await this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe());

    // Disconnect socket wenn verfügbar
    if (this.socketService) {
      this.socketService.disconnect();
    }
  }

  // ==========================================
  // DATA LOADING
  // ==========================================

  private setupSocketListeners(): void {
    if (!this.socketService) return;

    // Listen to posts
    const postsSub = this.socketService.posts$.subscribe((data) => {
      if (data && data.posts) {
        this.teachers = this.dataService.parseTeachersFromAPI(data.posts);
        this.applyFilters();
        this.updateStats();
        this.isLoading = false;

        // Check for active alarm
        this.checkForActiveAlarm().catch((err) =>
          console.error('Error checking alarm:', err)
        );
      }
    });

    // Listen to updates
    const updateSub = this.socketService.update$.subscribe((update) => {
      if (update) {
        this.handleTeacherUpdate(update);
      }
    });

    this.subscriptions.push(postsSub, updateSub);
  }

  private async loadData(): Promise<void> {
    try {
      await this.feedbackService.showLoading('Lade Daten...');

      if (this.socketService) {
        // Mit Socket
        this.socketService.getPosts();
        await this.delay(2000);

        if (!this.socketService.hasFetchedData()) {
          throw new Error('Daten konnten nicht geladen werden');
        }
      } else {
        // Ohne Socket - Mock Daten
        console.log('📦 Lade Mock-Daten (kein Socket verfügbar)');
        this.teachers = this.getMockTeachers();
        this.applyFilters();
        this.updateStats();
        this.isLoading = false;
      }

      // Check for active alarm
      await this.checkForActiveAlarm();

      await this.feedbackService.hideLoading();
    } catch (error) {
      console.error('Error loading data:', error);
      await this.feedbackService.hideLoading();

      // Fallback zu Mock-Daten
      console.log('📦 Fallback zu Mock-Daten');
      this.teachers = this.getMockTeachers();
      this.applyFilters();
      this.updateStats();
      this.isLoading = false;

      // Check for active alarm
      await this.checkForActiveAlarm();
    }
  }

  private handleTeacherUpdate(update: any): void {
    const teacher = this.teachers.find((t) => t.id === update._id);
    if (teacher) {
      teacher.state = this.dataService.parseTeachersFromAPI([update])[0].state;
      teacher.comment = update.comment === ' ' ? '' : update.comment;
      this.applyFilters();
      this.updateStats();

      // Show toast if notifications enabled
      if (
        this.settingsService.getNotifications() &&
        this.socketService?.getSocketId() !==
          this.socketService?.getLastChangeSocketId()
      ) {
        this.showUpdateToast(teacher);
      }
    }
  }

  private async showUpdateToast(teacher: Teacher): Promise<void> {
    const names = this.dataService.formatTeacherNames(teacher.names);
    const status = this.getStatusLabel(teacher.state);
    await this.feedbackService.showInfoToast(`${names}: ${status}`);
  }

  // ==========================================
  // MOCK DATA
  // ==========================================

  private getMockTeachers(): Teacher[] {
    return [
      {
        id: '1',
        names: ['Max Mustermann'],
        class: '10A',
        classNumber: 'IT101',
        room: ['R101'],
        state: TeacherState.OPEN,
        comment: '',
      },
      {
        id: '2',
        names: ['Anna Schmidt'],
        class: '11B',
        classNumber: 'BW201',
        room: ['R205'],
        state: TeacherState.PRESENT,
        comment: '',
      },
      {
        id: '3',
        names: ['Thomas Müller'],
        class: '12C',
        classNumber: 'EL301',
        room: ['R312'],
        state: TeacherState.INCOMPLETE,
        comment: 'Nur 15 Schüler anwesend',
      },
      {
        id: '4',
        names: ['Julia Weber', 'Klaus Fischer'],
        class: '9D',
        classNumber: 'MET202',
        room: ['W103', 'W104'],
        state: TeacherState.OPEN,
        comment: '',
      },
      {
        id: '5',
        names: ['Peter Schneider'],
        class: '13A',
        classNumber: 'BWL401',
        room: ['H201'],
        state: TeacherState.PRESENT,
        comment: 'Alle anwesend',
      },
    ];
  }

  // ==========================================
  // FILTERING & SORTING
  // ==========================================

  applyFilters(): void {
    const statusFilter =
      this.selectedStatus === '4'
        ? 'all'
        : (parseInt(this.selectedStatus) as TeacherState);

    let filtered = this.dataService.filterTeachers(
      this.teachers,
      this.searchTerm,
      statusFilter
    );

    if (this.sortBy === 'teacher') {
      filtered = this.dataService.sortTeachersByName(filtered);
    } else {
      filtered = this.dataService.sortTeachersByClass(filtered);
    }

    this.filteredTeachers = filtered;
  }

  onSearch(): void {
    this.applyFilters();
  }

  onStatusChange(): void {
    this.settingsService.setDefaultStatus(
      this.selectedStatus === '4'
        ? 'all'
        : (parseInt(this.selectedStatus) as TeacherState)
    );
    this.applyFilters();
  }

  private updateStats(): void {
    this.stats = this.dataService.getTeacherStats(this.teachers);
  }

  // ==========================================
  // TEACHER ACTIONS
  // ==========================================

  async setPresent(teacher: Teacher): Promise<void> {
    if (teacher.state !== TeacherState.PRESENT) {
      teacher.state = TeacherState.PRESENT;
      const status = this.dataService.statusToAPIString(TeacherState.PRESENT);

      if (this.socketService) {
        await this.socketService.updatePost(teacher.id, status);
      } else {
        this.applyFilters();
        this.updateStats();
      }
    }
  }

  async setIncomplete(teacher: Teacher): Promise<void> {
    if (teacher.state !== TeacherState.INCOMPLETE) {
      teacher.state = TeacherState.INCOMPLETE;
      const status = this.dataService.statusToAPIString(
        TeacherState.INCOMPLETE
      );

      if (this.socketService) {
        await this.socketService.updatePost(teacher.id, status);
      } else {
        this.applyFilters();
        this.updateStats();
      }
    }
  }

  async addComment(teacher: Teacher): Promise<void> {
    const comment = await this.feedbackService.showPrompt(
      'Kommentar hinzufügen',
      'Bitte KEINE Schülernamen eingeben! Nur allgemeine Informationen zur Situation.',
      'text',
      teacher.comment || ''
    );

    if (comment !== null && comment.trim() !== '') {
      const validationWarning = this.validateCommentForPrivacy(comment.trim());

      if (validationWarning) {
        const proceed = await this.feedbackService.showConfirm(
          'Datenschutz-Warnung',
          validationWarning +
            '\n\nMöchten Sie den Kommentar trotzdem speichern?',
          'Ja, speichern',
          'Abbrechen'
        );

        if (!proceed) {
          return;
        }
      }

      teacher.comment = comment.trim();

      if (this.socketService) {
        await this.socketService.updateComment(teacher.id, comment.trim());
      }
    }
  }

  private validateCommentForPrivacy(comment: string): string | null {
    const namePattern = /\b[A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ][a-zäöüß]+\b/;
    const datePattern = /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/;
    const suspiciousWords = [
      'schüler.*name',
      'student.*name',
      'heißt',
      'ist.*jahre.*alt',
      'geburtsdatum',
      'adresse',
      'wohnt',
      'telefon',
      'handy',
      'email',
    ];

    if (namePattern.test(comment)) {
      return '⚠️ Der Kommentar enthält möglicherweise Namen. Bitte verwenden Sie KEINE Schülernamen!';
    }

    if (datePattern.test(comment)) {
      return '⚠️ Der Kommentar enthält ein Datum. Bitte keine Geburtsdaten oder persönliche Daten eingeben!';
    }

    for (const word of suspiciousWords) {
      const regex = new RegExp(word, 'i');
      if (regex.test(comment)) {
        return '⚠️ Der Kommentar enthält möglicherweise personenbezogene Daten. Bitte nur allgemeine Informationen eingeben!';
      }
    }

    return null;
  }

  async deleteComment(teacher: Teacher): Promise<void> {
    const confirmed = await this.feedbackService.showConfirm(
      'Kommentar löschen',
      'Möchtest du den Kommentar wirklich löschen?',
      'Löschen',
      'Abbrechen'
    );

    if (confirmed) {
      teacher.comment = '';

      if (this.socketService) {
        await this.socketService.updateComment(teacher.id, ' ');
      }
    }
  }

  // ==========================================
  // ALARM MANAGEMENT
  // ==========================================

  private async checkForActiveAlarm(): Promise<void> {
    console.log('🔍 === checkForActiveAlarm() START ===');
    console.log('🔍 teachers.length:', this.teachers.length);

    this.hasActiveAlarm = this.teachers.length > 0;

    if (this.hasActiveAlarm && this.teachers.length > 0) {
      // Hole IMMER die aktuelle Alarm-ID von der API
      console.log('🔍 Hole aktuelle Alarm-ID von API...');
      try {
        const response = await this.restService.getCurrentAlert().toPromise();
        if (response && response.alert && response.alert._id) {
          this.currentAlarmId = response.alert._id;
          console.log('✅ Alert-ID von API erhalten:', this.currentAlarmId);
        } else {
          console.log('⚠️ Keine aktuelle Alarm von API - verwende Fallback');
          const firstTeacher = this.teachers[0] as any;
          this.currentAlarmId =
            firstTeacher.alert || firstTeacher._id || firstTeacher.id;
        }
      } catch (error) {
        console.error('❌ Fehler beim Holen der Alert-ID:', error);
        // Fallback: Verwende ID vom ersten Teacher
        const firstTeacher = this.teachers[0] as any;
        this.currentAlarmId =
          firstTeacher.alert || firstTeacher._id || firstTeacher.id;
      }

      console.log('🔍 Final currentAlarmId:', this.currentAlarmId);

      if (this.currentAlarmId) {
        console.log('🚨 Active alarm detected:', this.currentAlarmId);
      } else {
        console.log('⚠️ Active alarm but NO ID found!');
      }
    } else {
      this.currentAlarmId = null;
      console.log('🔍 No active alarm');
    }
    console.log('🔍 === checkForActiveAlarm() END ===');
  }

  /**
   * Prüft ob noch offene Klassen existieren
   */
  private hasOpenClasses(): boolean {
    const result = this.teachers.some((t) => t.state === TeacherState.OPEN);
    console.log('🔍 hasOpenClasses():', result);
    return result;
  }

  /**
   * Gibt die Anzahl der offenen Klassen zurück
   */
  private getOpenClassesCount(): number {
    const count = this.teachers.filter(
      (t) => t.state === TeacherState.OPEN
    ).length;
    console.log('🔍 getOpenClassesCount():', count);
    return count;
  }

  /**
   * Gibt die Namen der offenen Klassen zurück
   */
  private getOpenClassesNames(): string[] {
    const names = this.teachers
      .filter((t) => t.state === TeacherState.OPEN)
      .map((t) => `${t.class} (${t.classNumber})`)
      .slice(0, 5);
    console.log('🔍 getOpenClassesNames():', names);
    return names;
  }

  async endAndArchiveAlarm(): Promise<void> {
    console.log('🔥 === endAndArchiveAlarm() CALLED ===');
    console.log('🔥 currentAlarmId:', this.currentAlarmId);
    console.log('🔥 hasActiveAlarm:', this.hasActiveAlarm);
    console.log('🔥 teachers.length:', this.teachers.length);
    console.log('🔥 teachers:', this.teachers);

    if (!this.currentAlarmId) {
      console.log('⚠️ Kein Alarm ID - Abbruch');
      await this.feedbackService.showWarningToast(
        'Kein aktiver Alarm vorhanden'
      );
      return;
    }

    // ✅ VALIDIERUNG: Prüfe auf offene Klassen
    if (this.hasOpenClasses()) {
      const openCount = this.getOpenClassesCount();
      const openClasses = this.getOpenClassesNames();

      console.log('⚠️ Es gibt noch offene Klassen:', openCount);

      let message = `⚠️ Es ${
        openCount === 1 ? 'ist' : 'sind'
      } noch ${openCount} Klasse${openCount === 1 ? '' : 'n'} offen:\n\n`;
      message += openClasses.join('\n');

      if (openCount > 5) {
        message += `\n... und ${openCount - 5} weitere`;
      }

      message +=
        '\n\n❌ Bitte schließe alle Klassen ab (Anwesend oder Unvollständig), bevor du den Alarm beendest!';

      console.log('🚨 Zeige Alert mit Message:', message);

      // Zeige Alert mit nur OK Button
      await this.feedbackService.showConfirm(
        '⚠️ Alarm kann nicht beendet werden',
        message,
        'OK',
        '' // Leerer String = kein Cancel-Button
      );

      console.log('🚨 Alert wurde geschlossen');
      return;
    }

    console.log('✅ Alle Klassen geschlossen - fahre fort');

    const confirmed = await this.feedbackService.showConfirm(
      'Alarm beenden',
      'Alle Klassen sind abgeschlossen. Möchtest du den Alarm jetzt beenden und archivieren?',
      'Ja, beenden',
      'Abbrechen'
    );

    if (!confirmed) {
      console.log('❌ Benutzer hat abgebrochen');
      return;
    }

    try {
      this.isProcessingAlarm = true;
      console.log('📦 Starte Archivierung...');
      await this.feedbackService.showLoading('Beende Alarm...');

      console.log('🔗 API Call: archiveAlert(' + this.currentAlarmId + ')');
      console.log('🔗 Calling restService.archiveAlert()...');

      // ✅ NEU: Verwende lastValueFrom statt toPromise
      const response = await new Promise((resolve, reject) => {
        console.log('🔗 Inside Promise - subscribing...');
        this.restService.archiveAlert(this.currentAlarmId!).subscribe({
          next: (res) => {
            console.log('📥 Response received:', res);
            resolve(res);
          },
          error: (err) => {
            console.error('📥 Error received:', err);
            reject(err);
          },
        });
        console.log('🔗 Subscribe called');
      });

      console.log('✅ API Response:', response);

      await this.feedbackService.hideLoading();
      await this.feedbackService.showSuccessToast(
        'Alarm erfolgreich beendet und archiviert'
      );

      // ✅ UI zurücksetzen
      console.log('🔄 Setze UI zurück...');
      this.teachers = [];
      this.filteredTeachers = [];
      this.hasActiveAlarm = false;
      this.currentAlarmId = null;
      this.updateStats();

      console.log('✅ UI zurückgesetzt');
      console.log('🔥 teachers.length:', this.teachers.length);
      console.log('🔥 hasActiveAlarm:', this.hasActiveAlarm);
    } catch (error) {
      console.error('❌ === ERROR beim Archivieren ===');
      console.error('❌ Error:', error);
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(
        error,
        'Fehler beim Beenden des Alarms'
      );
    } finally {
      this.isProcessingAlarm = false;
      console.log('🔥 === endAndArchiveAlarm() ENDE ===');
    }
  }

  async exportCurrentAlarmPDF(): Promise<void> {
    console.log('📄 === exportCurrentAlarmPDF() CALLED ===');
    console.log('📄 hasActiveAlarm:', this.hasActiveAlarm);
    console.log('📄 teachers.length:', this.teachers.length);
    console.log('📄 currentAlarmId:', this.currentAlarmId);

    if (!this.hasActiveAlarm || this.teachers.length === 0) {
      console.log('⚠️ Kein aktiver Alarm - Abbruch');
      await this.feedbackService.showWarningToast(
        'Kein aktiver Alarm vorhanden'
      );
      return;
    }

    try {
      console.log('📄 Starte PDF-Export...');
      await this.feedbackService.showLoading('Erstelle PDF...');

      const alarmData: ExportAlarmData = {
        _id: this.currentAlarmId || 'unknown',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        archived: false,
        classCount: this.teachers.length,
        triggeredBy: this.restService.getEmail(),
        description: 'Feueralarm',
        location: 'Schule',
      };

      const teacherData: ExportTeacherData[] = this.teachers.map((t) => ({
        name: t.names.join(', '),
        klasse: `${t.class} (${t.classNumber})`,
        status: this.getStatusLabel(t.state),
        comment: t.comment || '-',
        raum: t.room?.join(', ') || '-',
      }));

      console.log('📄 AlarmData:', alarmData);
      console.log('📄 TeacherData:', teacherData);
      console.log('📄 Rufe exportService.exportAlarmToPDF() auf...');

      this.exportService.exportAlarmToPDF(alarmData, teacherData);

      console.log('✅ PDF-Export erfolgreich');
      await this.feedbackService.hideLoading();
      await this.feedbackService.showSuccessToast('PDF erfolgreich erstellt');
    } catch (error) {
      console.error('❌ Error exporting PDF:', error);
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(error, 'Fehler beim PDF-Export');
    }
  }

  async exportCurrentAlarmCSV(): Promise<void> {
    console.log('📊 === exportCurrentAlarmCSV() CALLED ===');
    console.log('📊 hasActiveAlarm:', this.hasActiveAlarm);
    console.log('📊 teachers.length:', this.teachers.length);
    console.log('📊 currentAlarmId:', this.currentAlarmId);

    if (!this.hasActiveAlarm || this.teachers.length === 0) {
      console.log('⚠️ Kein aktiver Alarm - Abbruch');
      await this.feedbackService.showWarningToast(
        'Kein aktiver Alarm vorhanden'
      );
      return;
    }

    try {
      console.log('📊 Starte CSV-Export...');
      await this.feedbackService.showLoading('Erstelle CSV...');

      const alarmData: ExportAlarmData = {
        _id: this.currentAlarmId || 'unknown',
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        archived: false,
        classCount: this.teachers.length,
        triggeredBy: this.restService.getEmail(),
        description: 'Feueralarm',
        location: 'Schule',
      };

      const teacherData: ExportTeacherData[] = this.teachers.map((t) => ({
        name: t.names.join(', '),
        klasse: `${t.class} (${t.classNumber})`,
        status: this.getStatusLabel(t.state),
        comment: t.comment || '-',
        raum: t.room?.join(', ') || '-',
      }));

      console.log('📊 AlarmData:', alarmData);
      console.log('📊 TeacherData:', teacherData);
      console.log('📊 Rufe exportService.exportAlarmToCSV() auf...');

      this.exportService.exportAlarmToCSV(alarmData, teacherData);

      console.log('✅ CSV-Export erfolgreich');
      await this.feedbackService.hideLoading();
      await this.feedbackService.showSuccessToast('CSV erfolgreich erstellt');
    } catch (error) {
      console.error('❌ Error exporting CSV:', error);
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(error, 'Fehler beim CSV-Export');
    }
  }

  async triggerAlarm(): Promise<void> {
    console.log('🚨 triggerAlarm() START');

    try {
      const day = moment().format('YYYYMMDD');
      console.log('📅 Day:', day);
      console.log('⏰ Hour:', this.selectedHour);
      console.log('🔌 SocketService exists:', !!this.socketService);

      if (this.socketService) {
        console.log('🔌 Calling socketService.triggerAlert...');
        this.socketService.triggerAlert(this.selectedHour, day);
        console.log('✅ triggerAlert called successfully!');

        setTimeout(() => {
          console.log('🔄 Reloading data...');
          this.loadData();
        }, 2000);
      } else {
        console.log('❌ No socketService available!');
      }
    } catch (error) {
      console.error('❌ Error in triggerAlarm:', error);
    }
  }

  private getMockTeachersForAlarm(): Teacher[] {
    return [
      {
        id: 'mock-1',
        names: ['Max Mustermann', 'Anna Schmidt'],
        class: '10A',
        classNumber: 'IT101',
        room: ['R101', 'R102'],
        state: TeacherState.OPEN,
        comment: '',
      },
    ];
  }

  private getHourLabel(time: string): string {
    const hour = this.schoolHours.find((h) => h.time === time);
    return hour ? hour.label : time;
  }

  private getCurrentSchoolHour(): string {
    const now = moment();
    const currentTime = now.format('HHmm');

    for (let i = this.schoolHours.length - 1; i >= 0; i--) {
      if (currentTime >= this.schoolHours[i].time) {
        return this.schoolHours[i].time;
      }
    }

    return this.schoolHours[0].time;
  }

  // ==========================================
  // NAVIGATION
  // ==========================================

  openUserManagement(): void {
    this.router.navigate(['/admin-users']);
  }

  openArchive(): void {
    this.router.navigate(['/archive']);
  }

  openDashboard(): void {
    console.log('🎯 Opening Dashboard...');
    this.router.navigate(['/dashboard']);
  }

  openAuditLogs(): void {
    console.log('📋 Opening Audit-Logs...');
    this.router.navigate(['/audit-logs']);
  }

  async openSettings(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: SettingsModal,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();

    this.sortBy = this.settingsService.getSortBy();
    this.selectedStatus = this.settingsService
      .getDefaultStatusAsNumber()
      .toString();
    this.applyFilters();
  }

  async openInformation(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: InformationModal,
      componentProps: {
        stats: this.stats,
      },
    });

    await modal.present();
  }

  // ==========================================
  // SYNC
  // ==========================================

  async forceSyncNow(): Promise<void> {
    if (!this.isOnline) {
      await this.feedbackService.showWarningToast('Keine Internetverbindung');
      return;
    }

    try {
      await this.feedbackService.showLoading('Synchronisiere...');
      await this.syncService.forceSyncNow();
      await this.feedbackService.hideLoading();
      await this.feedbackService.showSuccessToast(
        'Synchronisation erfolgreich!'
      );
    } catch (error) {
      await this.feedbackService.hideLoading();
      await this.feedbackService.showError(
        error,
        'Synchronisation fehlgeschlagen'
      );
    }
  }

  // ==========================================
  // HELPERS
  // ==========================================

  getStatusLabel(state?: TeacherState): string {
    if (!state) return 'Unbekannt';
    return TeacherStateLabel[state];
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
