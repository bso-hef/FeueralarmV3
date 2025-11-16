import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonChip,
  IonLabel,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBack,
  refresh,
  statsChartOutline,
  timeOutline,
  peopleOutline,
  checkmarkCircle,
  closeCircle,
  alertCircle,
  trendingUp,
  calendar,
  location,
  wifi,
  cloudOffline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';

import { AlarmService, AlarmData } from '../../services/alarm.service';
import { SocketService } from '../../services/socket.service';
import { SyncService } from '../../services/sync.service';
import { RestService } from '../../services/rest.service';
import { FeedbackService } from '../../services/feedback.service';
import { DataService } from '../../services/data.service';

/**
 * UAP 6.2.1: Dashboard für Schulleitung
 *
 * Echtzeit-Visualisierung laufender Alarme
 * - WebSocket-Integration für Live-Updates
 * - Nur für Verwaltungs-Accounts sichtbar
 * - Übersicht aller aktiven Alarme
 * - Live-Statistiken
 */

interface DashboardStats {
  activeAlarms: number;
  totalClasses: number;
  completedClasses: number;
  incompleteClasses: number;
  openClasses: number;
  completionRate: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonChip,
    IonLabel,
    IonProgressBar,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonGrid,
    IonRow,
    IonCol,
  ],
  // ✅ NEU: Providers hinzugefügt für Standalone Component
  providers: [
    AlarmService,
    SocketService,
    SyncService,
    RestService,
    FeedbackService,
    DataService,
  ],
})
export class DashboardPage implements OnInit, OnDestroy {
  // Data
  activeAlarms: AlarmData[] = [];
  stats: DashboardStats = {
    activeAlarms: 0,
    totalClasses: 0,
    completedClasses: 0,
    incompleteClasses: 0,
    openClasses: 0,
    completionRate: 0,
  };

  // UI State
  isLoading = true;
  isOnline = true;
  lastUpdate: Date | null = null;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  constructor(
    private alarmService: AlarmService,
    private socketService: SocketService,
    private syncService: SyncService,
    private restService: RestService,
    private feedbackService: FeedbackService,
    private dataService: DataService,
    private router: Router
  ) {
    addIcons({
      arrowBack,
      refresh,
      statsChartOutline,
      timeOutline,
      peopleOutline,
      checkmarkCircle,
      closeCircle,
      alertCircle,
      trendingUp,
      calendar,
      location,
      wifi,
      cloudOffline,
    });
  }

  async ngOnInit() {
    console.log('🎯 Dashboard ngOnInit gestartet');

    // Prüfe ob User Admin/Verwaltung ist
    await this.checkAdminAccess();

    // Lade Daten
    await this.loadDashboardData();

    // Setup Echtzeit-Updates
    this.setupRealtimeUpdates();

    // Setup Online-Status
    this.setupOnlineStatus();
  }

  ngOnDestroy() {
    // Cleanup Subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }

  // ==========================================
  // ACCESS CONTROL
  // ==========================================

  private async checkAdminAccess() {
    // Hole Role direkt aus localStorage (nicht Observable)
    const role = localStorage.getItem('role');
    console.log('🔐 Dashboard - User Role:', role);

    if (role !== 'admin' && role !== 'verwaltung') {
      console.warn('⚠️ Kein Admin-Zugriff - Weiterleitung zu Home');
      await this.feedbackService.showWarningToast(
        'Diese Seite ist nur für Verwaltungs-Accounts verfügbar'
      );
      this.router.navigate(['/home']);
    }
  }

  // ==========================================
  // DATA LOADING
  // ==========================================

  async loadDashboardData() {
    try {
      this.isLoading = true;
      console.log('📊 Lade Dashboard-Daten...');

      // Lade alle Alarme
      const response = await this.alarmService.getAllAlarms(1, 100).toPromise();

      if (response && response.alerts) {
        // Nur aktive Alarme
        this.activeAlarms = response.alerts.filter((a) => !a.archived);

        console.log(`✅ ${this.activeAlarms.length} aktive Alarme geladen`);

        // Berechne Statistiken
        this.calculateStats();

        this.lastUpdate = new Date();
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Dashboard-Daten:', error);
      await this.feedbackService.showError(
        error,
        'Fehler beim Laden des Dashboards'
      );
    } finally {
      this.isLoading = false;
    }
  }

  private calculateStats() {
    this.stats.activeAlarms = this.activeAlarms.length;

    // Summiere alle Klassen-Stats aus allen aktiven Alarmen
    let totalClasses = 0;
    let completedClasses = 0;
    let incompleteClasses = 0;
    let openClasses = 0;

    this.activeAlarms.forEach((alarm) => {
      if (alarm.stats) {
        totalClasses += alarm.stats.total || 0;
        completedClasses += alarm.stats.complete || 0;
        incompleteClasses += alarm.stats.incomplete || 0;
        openClasses += alarm.stats.undefined || 0;
      }
    });

    this.stats.totalClasses = totalClasses;
    this.stats.completedClasses = completedClasses;
    this.stats.incompleteClasses = incompleteClasses;
    this.stats.openClasses = openClasses;

    // Completion Rate berechnen
    if (totalClasses > 0) {
      this.stats.completionRate = Math.round(
        (completedClasses / totalClasses) * 100
      );
    } else {
      this.stats.completionRate = 0;
    }

    console.log('📊 Dashboard Stats aktualisiert:', this.stats);
  }

  // ==========================================
  // REALTIME UPDATES
  // ==========================================

  private setupRealtimeUpdates() {
    // Periodisches Auto-Refresh alle 30 Sekunden für Live-Updates
    const intervalId = setInterval(() => {
      if (this.isOnline) {
        console.log('🔄 Auto-Refresh Dashboard (alle 30s)');
        this.loadDashboardData();
      }
    }, 30000); // 30 Sekunden

    // Cleanup bei Component Destroy
    this.subscriptions.push({
      unsubscribe: () => clearInterval(intervalId),
    } as any);
  }

  private setupOnlineStatus() {
    const sub = this.syncService.getOnlineStatus().subscribe((isOnline) => {
      this.isOnline = isOnline;
    });

    this.subscriptions.push(sub);
  }

  // ==========================================
  // USER ACTIONS
  // ==========================================

  async doRefresh(event: any) {
    console.log('🔄 Dashboard Refresh');
    await this.loadDashboardData();
    event.target.complete();
  }

  async refreshDashboard() {
    await this.feedbackService.showLoading('Aktualisiere Dashboard...');
    await this.loadDashboardData();
    await this.feedbackService.hideLoading();
    await this.feedbackService.showSuccessToast('Dashboard aktualisiert!');
  }

  viewAlarmDetails(alarm: AlarmData) {
    console.log('📋 Öffne Alarm-Details:', alarm._id);

    this.router.navigate(['/home'], {
      state: {
        alarmId: alarm._id,
        fromDashboard: true,
      },
    });
  }

  openArchive() {
    this.router.navigate(['/archive']);
  }

  goBack() {
    this.router.navigate(['/home']);
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

  getCompletionColor(): string {
    if (this.stats.completionRate >= 80) return 'success';
    if (this.stats.completionRate >= 50) return 'warning';
    return 'danger';
  }

  getStatusBadgeColor(alarm: AlarmData): string {
    if (!alarm.stats) return 'medium';

    const completionRate =
      alarm.stats.total > 0
        ? (alarm.stats.complete / alarm.stats.total) * 100
        : 0;

    if (completionRate >= 80) return 'success';
    if (completionRate >= 50) return 'warning';
    return 'danger';
  }

  getAlarmCompletionRate(alarm: AlarmData): number {
    if (!alarm.stats || alarm.stats.total === 0) {
      return 0;
    }
    return Math.round((alarm.stats.complete / alarm.stats.total) * 100);
  }
}
