import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuditLog {
  _id: string;
  userId: {
    _id: string;
    username: string;
    role: string;
  };
  username: string;
  timestamp: string;
  entityType: 'Post' | 'Alert' | 'User' | 'Attachment';
  entityId: string;
  action: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  };
  metadata?: {
    alertId?: string;
    className?: string;
    classNumber?: string;
  };
}

export interface AuditLogResponse {
  success: boolean;
  message: string;
  logs: AuditLog[];
  pagination?: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export interface AuditLogStats {
  success: boolean;
  stats: {
    total: number;
    last24h: number;
    byAction: Array<{ _id: string; count: number }>;
    byEntityType: Array<{ _id: string; count: number }>;
    topUsers: Array<{ _id: string; count: number }>;
  };
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Ruft alle Audit-Logs mit Filteroptionen ab
   */
  getAuditLogs(params: {
    startDate?: string;
    endDate?: string;
    entityType?: string;
    action?: string;
    userId?: string;
    limit?: number;
    skip?: number;
  }): Observable<AuditLogResponse> {
    const queryParams = new URLSearchParams();

    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.entityType) queryParams.append('entityType', params.entityType);
    if (params.action) queryParams.append('action', params.action);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.skip) queryParams.append('skip', params.skip.toString());

    const url = `${this.API_URL}/audit-logs?${queryParams.toString()}`;

    return this.http.get<AuditLogResponse>(url, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Ruft Audit-Logs für eine bestimmte Entity ab
   */
  getEntityLogs(
    entityType: string,
    entityId: string,
    limit: number = 100
  ): Observable<AuditLogResponse> {
    return this.http.get<AuditLogResponse>(
      `${this.API_URL}/audit-logs/entity/${entityType}/${entityId}?limit=${limit}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Ruft Statistiken über Audit-Logs ab
   */
  getStats(): Observable<AuditLogStats> {
    return this.http.get<AuditLogStats>(`${this.API_URL}/audit-logs/stats`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Formatiert einen Action-String für die Anzeige
   */
  formatAction(action: string): string {
    const actionMap: { [key: string]: string } = {
      status_changed: 'Status geändert',
      comment_added: 'Kommentar hinzugefügt',
      comment_updated: 'Kommentar aktualisiert',
      alert_created: 'Alarm erstellt',
      alert_archived: 'Alarm archiviert',
      attachment_added: 'Anhang hinzugefügt',
      attachment_deleted: 'Anhang gelöscht',
    };
    return actionMap[action] || action;
  }

  /**
   * Formatiert einen EntityType für die Anzeige
   */
  formatEntityType(entityType: string): string {
    const typeMap: { [key: string]: string } = {
      Post: 'Klasse',
      Alert: 'Alarm',
      User: 'Benutzer',
      Attachment: 'Anhang',
    };
    return typeMap[entityType] || entityType;
  }
}
