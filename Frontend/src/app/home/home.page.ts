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
  searchTerm = '';
  selectedStatus: string = '4'; // 4 = All
  sortBy: 'teacher' | 'class' = 'teacher';

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
    private router: Router
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
    });
  }

  async ngOnInit() {
    // Check if user is admin
    this.isAdmin = this.restService.getRoleValue() === 'admin';

    // Get settings
    this.sortBy = this.settingsService.getSortBy();
    this.selectedStatus = this.settingsService
      .getDefaultStatusAsNumber()
      .toString();

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
        this.socketService.updatePost(teacher.id, status);
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
        this.socketService.updatePost(teacher.id, status);
      } else {
        // Ohne Socket: Nur lokale Änderung
        this.applyFilters();
        this.updateStats();
      }
    }
  }

  async addComment(teacher: Teacher): Promise<void> {
    const comment = await this.feedbackService.showPrompt(
      'Kommentar hinzufügen',
      'Kommentar eingeben...',
      'text',
      teacher.comment || ''
    );

    if (comment !== null && comment.trim() !== '') {
      teacher.comment = comment.trim();

      if (this.socketService) {
        this.socketService.updateComment(teacher.id, comment.trim());
      }
    }
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
        this.socketService.updateComment(teacher.id, ' ');
      }
    }
  }

  // ==========================================
  // ALARM
  // ==========================================

  async triggerAlarm(): Promise<void> {
    const confirmed = await this.feedbackService.showConfirm(
      'Feueralarm auslösen',
      `Möchtest du den Feueralarm für die ${this.getHourLabel(
        this.selectedHour
      )} auslösen?`,
      'Auslösen',
      'Abbrechen'
    );

    if (confirmed) {
      try {
        await this.feedbackService.showLoading('Feueralarm wird ausgelöst...');
        const day = moment().format('YYYYMMDD');

        if (this.socketService) {
          this.socketService.triggerAlert(this.selectedHour, day);
          await this.delay(2000);
          await this.feedbackService.hideLoading();
          await this.feedbackService.showSuccessToast('Feueralarm ausgelöst!');
          await this.loadData();
        } else {
          await this.feedbackService.hideLoading();
          await this.feedbackService.showWarningToast(
            'Alarm-Funktion ohne Socket nicht verfügbar'
          );
        }
      } catch (error) {
        await this.feedbackService.hideLoading();
        await this.feedbackService.showError(
          error,
          'Fehler beim Auslösen des Alarms'
        );
      }
    }
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
