import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {
  AuditLogService,
  AuditLog,
  AuditLogStats,
} from '../../services/audit-log.service';

@Component({
  selector: 'app-audit-logs',
  templateUrl: './audit-logs.page.html',
  styleUrls: ['./audit-logs.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
})
export class AuditLogsPage implements OnInit {
  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  stats: any = null;
  loading = false;
  error: string = '';

  // Filter
  filterEntityType: string = '';
  filterAction: string = '';
  filterDateRange: string = '';
  searchTerm: string = '';

  // Pagination
  currentPage = 0;
  pageSize = 50;
  hasMore = true;

  // Verfügbare Filter-Optionen
  entityTypes = [
    { value: '', label: 'Alle Typen' },
    { value: 'Post', label: 'Klassen' },
    { value: 'Alert', label: 'Alarme' },
    { value: 'Attachment', label: 'Anhänge' },
  ];

  actions = [
    { value: '', label: 'Alle Aktionen' },
    { value: 'status_changed', label: 'Status geändert' },
    { value: 'comment_added', label: 'Kommentar hinzugefügt' },
    { value: 'comment_updated', label: 'Kommentar aktualisiert' },
    { value: 'alert_created', label: 'Alarm erstellt' },
    { value: 'alert_archived', label: 'Alarm archiviert' },
  ];

  dateRanges = [
    { value: '', label: 'Gesamter Zeitraum' },
    { value: '24h', label: 'Letzte 24 Stunden' },
    { value: '7d', label: 'Letzte 7 Tage' },
    { value: '30d', label: 'Letzte 30 Tage' },
  ];

  constructor(private auditLogService: AuditLogService) {}

  ngOnInit() {
    this.loadLogs();
    this.loadStats();
  }

  /**
   * Lädt Audit-Logs vom Backend
   */
  loadLogs(loadMore: boolean = false) {
    if (this.loading) return;

    this.loading = true;
    this.error = '';

    const params: any = {
      limit: this.pageSize,
      skip: loadMore ? this.currentPage * this.pageSize : 0,
    };

    // Filter anwenden
    if (this.filterEntityType) params.entityType = this.filterEntityType;
    if (this.filterAction) params.action = this.filterAction;

    // Datum-Filter
    if (this.filterDateRange) {
      const now = new Date();
      let startDate: Date;

      switch (this.filterDateRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }

      params.startDate = startDate.toISOString();
    }

    this.auditLogService.getAuditLogs(params).subscribe({
      next: (response) => {
        if (response.success) {
          if (loadMore) {
            this.logs = [...this.logs, ...response.logs];
          } else {
            this.logs = response.logs;
            this.currentPage = 0;
          }

          this.hasMore = response.pagination?.hasMore || false;
          this.applySearch();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Fehler beim Laden der Audit-Logs:', err);
        this.error = 'Fehler beim Laden der Audit-Logs';
        this.loading = false;
      },
    });
  }

  /**
   * Lädt Statistiken
   */
  loadStats() {
    this.auditLogService.getStats().subscribe({
      next: (response) => {
        if (response.success) {
          this.stats = response.stats;
        }
      },
      error: (err) => {
        console.error('Fehler beim Laden der Statistiken:', err);
      },
    });
  }

  /**
   * Wendet Such-Filter an
   */
  applySearch() {
    if (!this.searchTerm) {
      this.filteredLogs = this.logs;
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredLogs = this.logs.filter(
      (log) =>
        log.username.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        log.entityType.toLowerCase().includes(term) ||
        JSON.stringify(log.changes).toLowerCase().includes(term)
    );
  }

  /**
   * Filter wurde geändert
   */
  onFilterChange() {
    this.loadLogs();
  }

  /**
   * Suche wurde geändert
   */
  onSearchChange() {
    this.applySearch();
  }

  /**
   * Lädt mehr Logs (Pagination)
   */
  loadMoreLogs(event: any) {
    this.currentPage++;
    this.loadLogs(true);
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  /**
   * Aktualisiert die Liste
   */
  refresh(event: any) {
    this.loadLogs();
    this.loadStats();
    setTimeout(() => {
      event.target.complete();
    }, 500);
  }

  /**
   * Formatiert einen Timestamp
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Formatiert Action für Anzeige
   */
  formatAction(action: string): string {
    return this.auditLogService.formatAction(action);
  }

  /**
   * Formatiert EntityType für Anzeige
   */
  formatEntityType(entityType: string): string {
    return this.auditLogService.formatEntityType(entityType);
  }

  /**
   * Gibt CSS-Klasse für Action zurück
   */
  getActionColor(action: string): string {
    if (action.includes('created')) return 'success';
    if (action.includes('deleted') || action.includes('archived'))
      return 'danger';
    if (action.includes('updated') || action.includes('changed'))
      return 'warning';
    return 'primary';
  }

  /**
   * Formatiert Änderungen für Anzeige
   */
  formatChanges(log: AuditLog): string {
    const { oldValue, newValue } = log.changes;
    if (oldValue === null || oldValue === undefined) {
      return `Neu: ${newValue}`;
    }
    return `${oldValue} → ${newValue}`;
  }
}
