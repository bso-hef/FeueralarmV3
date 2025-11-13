import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { RestService } from './rest.service';

export interface Alarm {
  _id: string;
  classCount: number;
  archived: boolean;
  created: string;
  updated: string;
  triggeredBy?: string;
  description?: string;
  location?: string;
  stats?: {
    total: number;
    complete: number;
    incomplete: number;
    undefined: number;
  };
}

// ✅ AlarmData als Alias für Alarm exportieren (für Kompatibilität)
export type AlarmData = Alarm;

export interface AlarmListResponse {
  success: boolean;
  message: string;
  alerts: Alarm[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AlarmDetailResponse {
  success: boolean;
  alert: Alarm;
  posts: any[];
}

@Injectable({
  providedIn: 'root',
})
export class AlarmService {
  private readonly API_URL = environment.apiUrl;
  private readonly STORAGE_KEY = 'feueralarm_cached_alarms';
  private readonly STORAGE_TIMESTAMP_KEY = 'feueralarm_cached_alarms_timestamp';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 Minuten

  constructor(private http: HttpClient, private restService: RestService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.restService.getToken()}`,
    });
  }

  // ==========================================
  // LOCAL STORAGE METHODS
  // ==========================================

  /**
   * Speichert Alarme im LocalStorage
   */
  saveAlarmsToLocalStorage(alarms: Alarm[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(alarms));
      localStorage.setItem(
        this.STORAGE_TIMESTAMP_KEY,
        new Date().getTime().toString()
      );
      console.log('💾 Alarme im LocalStorage gespeichert:', alarms.length);
    } catch (error) {
      console.error('❌ Fehler beim Speichern im LocalStorage:', error);
    }
  }

  /**
   * Lädt Alarme aus dem LocalStorage
   */
  getAlarmsFromLocalStorage(): Alarm[] | null {
    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const alarms = JSON.parse(cached);
        console.log('📦 Alarme aus LocalStorage geladen:', alarms.length);
        return alarms;
      }
      return null;
    } catch (error) {
      console.error('❌ Fehler beim Laden aus LocalStorage:', error);
      return null;
    }
  }

  /**
   * Prüft ob Cache noch gültig ist
   */
  isCacheValid(): boolean {
    try {
      const timestamp = localStorage.getItem(this.STORAGE_TIMESTAMP_KEY);
      if (!timestamp) return false;

      const cacheAge = new Date().getTime() - parseInt(timestamp);
      const isValid = cacheAge < this.CACHE_DURATION;

      console.log(
        `🕐 Cache-Alter: ${Math.round(cacheAge / 1000)}s, Gültig: ${isValid}`
      );
      return isValid;
    } catch (error) {
      return false;
    }
  }

  /**
   * Löscht Cache
   */
  clearCache(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.STORAGE_TIMESTAMP_KEY);
      console.log('🗑️ Cache gelöscht');
    } catch (error) {
      console.error('❌ Fehler beim Löschen des Cache:', error);
    }
  }

  // ==========================================
  // API METHODS
  // ==========================================

  /**
   * Alle Alarme abrufen mit Pagination
   * Speichert automatisch im LocalStorage
   */
  getAllAlarms(
    page: number = 1,
    limit: number = 50
  ): Observable<AlarmListResponse> {
    return this.http
      .get<AlarmListResponse>(
        `${this.API_URL}/alerts?page=${page}&limit=${limit}`,
        { headers: this.getHeaders() }
      )
      .pipe(
        tap((response) => {
          // Automatisch im LocalStorage speichern
          if (response.success && response.alerts) {
            this.saveAlarmsToLocalStorage(response.alerts);
          }
        })
      );
  }

  /**
   * Einzelnen Alarm mit Posts abrufen
   */
  getAlarmById(id: string): Observable<AlarmDetailResponse> {
    return this.http.get<AlarmDetailResponse>(`${this.API_URL}/alerts/${id}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Alarm löschen (Admin only)
   */
  deleteAlarm(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/alerts/${id}`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Alarm archivieren (Admin only)
   */
  archiveAlarm(id: string): Observable<any> {
    return this.http.put(
      `${this.API_URL}/alerts/${id}/archive`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Formatiert Datum für Anzeige
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * ✅ Alias-Methode für formatDate (für Kompatibilität mit archive.page.ts)
   */
  formatAlarmDate(dateString: string): string {
    return this.formatDate(dateString);
  }

  /**
   * Berechnet Zeitdifferenz für "vor X Minuten"
   */
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;

    return this.formatDate(dateString);
  }

  /**
   * ✅ Alias-Methode für getTimeAgo (für Kompatibilität mit archive.page.ts)
   */
  getTimeSince(dateString: string): string {
    return this.getTimeAgo(dateString);
  }

  /**
   * Gibt Prozentsatz für Fortschritt zurück
   */
  getCompletionPercentage(alarm: Alarm): number {
    if (!alarm.stats || alarm.stats.total === 0) return 0;
    return Math.round((alarm.stats.complete / alarm.stats.total) * 100);
  }
}
