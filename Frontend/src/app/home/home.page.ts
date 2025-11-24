import { Component, OnInit, OnDestroy, inject, Injector } from '@angular/core';
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
import { RestService } from '../services/rest.service';
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
  canAccessDashboard = false; // ✅ NEU: Separate Variable für Dashboard-Zugriff
  searchTerm = '';
  selectedStatus: string = '4'; // 4 = All
  sortBy: 'teacher' | 'class' = 'teacher';

  // *** NEU: Sync Status ***
  isOnline = true;
  isSyncing = false;
  pendingActions = 0;

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
    private syncService: SyncService
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
    // ✅ GEÄNDERT: Check if user is admin or verwaltung
    const role = this.restService.getRoleValue();
    this.isAdmin = role === 'admin';
    this.canAccessDashboard = role === 'admin' || role === 'verwaltung';

    // Get settings
    this.sortBy = this.settingsService.getSortBy();
    this.selectedStatus = this.settingsService
      .getDefaultStatusAsNumber()
      .toString();

    // *** NEU: Sync-Status überwachen ***
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
  // MOCK DATA (für Development ohne Backend)
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
        // DSGVO: Kommentar enthält KEINE Schülernamen - nur Anzahl
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

    // Filter
    let filtered = this.dataService.filterTeachers(
      this.teachers,
      this.searchTerm,
      statusFilter
    );

    // Sort
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
        // Ohne Socket: Nur lokale Änderung
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
        // Ohne Socket: Nur lokale Änderung
        this.applyFilters();
        this.updateStats();
      }
    }
  }

  async addComment(teacher: Teacher): Promise<void> {
    // DSGVO: Warnung anzeigen, keine Schülernamen in Kommentare
    const comment = await this.feedbackService.showPrompt(
      'Kommentar hinzufügen',
      'Bitte KEINE Schülernamen eingeben! Nur allgemeine Informationen zur Situation.',
      'text',
      teacher.comment || ''
    );

    if (comment !== null && comment.trim() !== '') {
      // DSGVO: Validiere Kommentar auf verdächtige Patterns
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

  /**
   * DSGVO: Validiert Kommentare auf personenbezogene Daten
   * Warnt vor möglichen Schülernamen oder sensiblen Daten
   */
  private validateCommentForPrivacy(comment: string): string | null {
    // Pattern für mögliche Namen (Großbuchstabe gefolgt von Kleinbuchstaben)
    const namePattern = /\b[A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ][a-zäöüß]+\b/;

    // Pattern für Geburtsdaten
    const datePattern = /\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/;

    // Verdächtige Begriffe
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
  // ALARM
  // ==========================================

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

        // Warte kurz und lade dann Daten neu
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

  /**
   * Erstellt Mock-Lehrer-Daten für einen Test-Alarm
   * DSGVO: Enthält nur Klassenbezeichnungen, KEINE Schülerdaten
   */
  private getMockTeachersForAlarm(): Teacher[] {
    const hourLabel = this.getHourLabel(this.selectedHour);

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
      {
        id: 'mock-2',
        names: ['Thomas Müller'],
        class: '11B',
        classNumber: 'BW201',
        room: ['R205'],
        state: TeacherState.OPEN,
        comment: '',
      },
      {
        id: 'mock-3',
        names: ['Julia Weber'],
        class: '12C',
        classNumber: 'EL301',
        room: ['R312'],
        state: TeacherState.OPEN,
        comment: '',
      },
      {
        id: 'mock-4',
        names: ['Peter Schneider', 'Klaus Fischer'],
        class: '9D',
        classNumber: 'MET202',
        room: ['W103'],
        state: TeacherState.OPEN,
        comment: '',
      },
      {
        id: 'mock-5',
        names: ['Maria Wagner'],
        class: '13A',
        classNumber: 'BWL401',
        room: ['H201'],
        state: TeacherState.OPEN,
        comment: '',
      },
      {
        id: 'mock-6',
        names: ['Stefan Becker'],
        class: '10B',
        classNumber: 'IT102',
        room: ['R103'],
        state: TeacherState.OPEN,
        comment: '',
      },
      {
        id: 'mock-7',
        names: ['Lisa Hoffmann'],
        class: '11A',
        classNumber: 'BW101',
        room: ['R201'],
        state: TeacherState.OPEN,
        comment: '',
      },
      {
        id: 'mock-8',
        names: ['Michael Braun', 'Sandra Klein'],
        class: '12A',
        classNumber: 'EL201',
        room: ['R310', 'R311'],
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

  // ✅ Dashboard-Navigation (nur für Admin/Verwaltung)
  openDashboard(): void {
    console.log('🎯 Opening Dashboard...');
    this.router.navigate(['/dashboard']);
  }

  // ✅ Audit-Logs-Navigation (nur für Admin/Verwaltung)
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

    // Reload settings
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
