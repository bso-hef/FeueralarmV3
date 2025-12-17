import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface User {
  _id: string;
  username: string;
  role: string;
}

export interface CreateUserData {
  username: string;
  password: string;
  role: string;
}

export interface UpdateUserData {
  username?: string;
  password?: string;
  role?: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserManagementService {
  private readonly API_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth-token') || '';
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    });
  }

  private handleError(error: any) {
    console.error('API Error:', error);
    const message = error.error?.message || 'Ein Fehler ist aufgetreten';
    return throwError(() => new Error(message));
  }

  // ==========================================
  // API METHODS
  // ==========================================

  /**
   * Alle Benutzer abrufen (Admin only)
   */
  getAllUsers(): Observable<{ users: User[]; count: number }> {
    return this.http
      .get<{ users: User[]; count: number }>(`${this.API_URL}/users`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Benutzer erstellen
   */
  createUser(userData: CreateUserData): Observable<any> {
    return this.http
      .post(`${this.API_URL}/users`, userData, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Benutzer bearbeiten (Admin only)
   */
  updateUser(userId: string, userData: UpdateUserData): Observable<any> {
    return this.http
      .put(`${this.API_URL}/users/${userId}`, userData, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Benutzer löschen (Admin only)
   */
  deleteUser(userId: string): Observable<any> {
    return this.http
      .delete(`${this.API_URL}/users/${userId}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError));
  }

  /**
   * Admin-Benutzer erstellen
   */
  createAdminUser(
    username: string,
    password: string,
    adminSecret: string
  ): Observable<any> {
    return this.http
      .post(
        `${this.API_URL}/users/create-admin`,
        { username, password, adminSecret },
        { headers: this.getHeaders() }
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * Rolle zu lesbarem Text
   */
  getRoleLabel(role: string): string {
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'user':
        return 'Benutzer';
      default:
        return role;
    }
  }

  /**
   * Rolle zu Icon
   */
  getRoleIcon(role: string): string {
    switch (role) {
      case 'admin':
        return 'shield-checkmark';
      case 'user':
        return 'person';
      default:
        return 'person-outline';
    }
  }

  /**
   * Rolle zu Farbe
   */
  getRoleColor(role: string): string {
    switch (role) {
      case 'admin':
        return 'danger';
      case 'user':
        return 'primary';
      default:
        return 'medium';
    }
  }
}
