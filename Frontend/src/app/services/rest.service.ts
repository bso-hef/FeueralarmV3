import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, timeout } from 'rxjs/operators';
import { NavController } from '@ionic/angular';
import { JwtHelperService } from '@auth0/angular-jwt';

interface AuthCredentials {
  username: string;
  password: string;
  token?: string;
}

interface LoginResponse {
  token: string;
}

interface StoredAuthData {
  token: string;
  username: string;
  password: string; // Für Offline-Login (HASHED)
  role: string;
  lastOnlineLogin: string; // ISO timestamp
  offlineLoginEnabled: boolean;
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RestService {
  private readonly API_URL = environment.apiUrl;
  private readonly jwtHelper = new JwtHelperService();
  private readonly ONLINE_LOGIN_TIMEOUT = 10000; // 10 Sekunden
  private readonly OFFLINE_TOKEN_VALIDITY_DAYS = 30;

  private authSubject = new BehaviorSubject<AuthCredentials>({
    username: '',
    password: '',
    token: '',
  });

  private roleSubject = new BehaviorSubject<string>('');
  private isOfflineModeSubject = new BehaviorSubject<boolean>(false);
  private loggedInTimer: any;

  constructor(private http: HttpClient, private navCtrl: NavController) {
    this.checkStoredAuth();
  }

  // ==========================================
  // ONLINE/OFFLINE DETECTION
  // ==========================================

  async isOnline(): Promise<boolean> {
    // Nur Browser-Status prüfen (kein Server-Request!)
    const online = navigator.onLine;
    console.log(online ? '🟢 Online' : '🔴 Offline');
    return online;
  }

  getOfflineMode(): Observable<boolean> {
    return this.isOfflineModeSubject.asObservable();
  }

  isOfflineMode(): boolean {
    return this.isOfflineModeSubject.value;
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  private checkStoredAuth(): void {
    const storedData = this.getStoredAuthData();

    if (!storedData) {
      console.log('ℹ️ Keine gespeicherten Auth-Daten gefunden');
      return;
    }

    // Prüfe ob Offline-Login aktiviert ist
    if (!storedData.offlineLoginEnabled) {
      console.log(
        '⚠️ Offline-Login nicht aktiviert - erster Login erforderlich'
      );
      return;
    }

    // Prüfe Token-Gültigkeit
    if (this.jwtHelper.isTokenExpired(storedData.token)) {
      // Token abgelaufen - prüfe ob innerhalb Offline-Zeitraum
      const lastLogin = new Date(storedData.lastOnlineLogin);
      const now = new Date();
      const daysSinceLogin = Math.floor(
        (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLogin > this.OFFLINE_TOKEN_VALIDITY_DAYS) {
        console.log(
          '⚠️ Offline-Login-Zeitraum abgelaufen - neuer Online-Login erforderlich'
        );
        this.clearStoredAuth();
        return;
      }

      console.log(
        `✅ Offline-Login möglich (${daysSinceLogin}/${this.OFFLINE_TOKEN_VALIDITY_DAYS} Tage)`
      );
      this.isOfflineModeSubject.next(true);
    }

    // Auth wiederherstellen
    this.authSubject.next({
      username: storedData.username,
      password: '',
      token: storedData.token,
    });
    this.roleSubject.next(storedData.role);

    console.log(
      '✅ Auth wiederhergestellt:',
      storedData.username,
      storedData.role
    );
  }

  async login(
    credentials: AuthCredentials
  ): Promise<{ success: boolean; error?: string; isOffline?: boolean }> {
    console.log('🔐 Login gestartet:', credentials.username);

    // Versuche immer zuerst Online-Login
    // Falls fehlschlägt → automatisch Fallback zu Offline
    try {
      return await this.onlineLogin(credentials);
    } catch (error) {
      // Online-Login fehlgeschlagen → Versuche Offline-Login
      console.log('⚠️ Online-Login fehlgeschlagen, versuche Offline-Login...');
      return await this.offlineLogin(credentials);
    }
  }

  private async onlineLogin(
    credentials: AuthCredentials
  ): Promise<{ success: boolean; error?: string; isOffline?: boolean }> {
    try {
      console.log('🌐 Online-Login...');

      const payload = {
        username: credentials.username,
        password: credentials.password,
      };

      const response = await this.http
        .post<LoginResponse>(`${this.API_URL}/users/login`, payload)
        .pipe(timeout(this.ONLINE_LOGIN_TIMEOUT))
        .toPromise();

      if (!response || !response.token) {
        return { success: false, error: 'Ungültige Antwort vom Server' };
      }

      const decoded = this.jwtHelper.decodeToken(response.token);
      console.log('🔓 Token dekodiert:', decoded);

      // Auth setzen
      this.authSubject.next({
        ...credentials,
        token: response.token,
      });
      this.roleSubject.next(decoded.role);

      // Speichere Auth-Daten für Offline-Login
      const authData: StoredAuthData = {
        token: response.token,
        username: credentials.username,
        password: await this.hashPassword(credentials.password), // Hash für Offline-Vergleich
        role: decoded.role,
        lastOnlineLogin: new Date().toISOString(),
        offlineLoginEnabled: true,
      };

      this.saveAuthData(authData);

      console.log('💾 Auth-Daten gespeichert (Offline-Login aktiviert)');

      // Start auto-refresh
      this.startTokenRefresh(credentials);

      this.isOfflineModeSubject.next(false);

      return { success: true, isOffline: false };
    } catch (error: any) {
      console.error('❌ Online-Login Fehler:', error);

      let errorMessage = 'Verbindungsfehler';

      if (error.name === 'TimeoutError') {
        errorMessage = 'Server-Timeout - bitte erneut versuchen';
      } else if (error.status === 404 || error.status === 401) {
        errorMessage = 'Benutzername oder Passwort falsch';
      } else if (error.status === 0) {
        errorMessage = 'Server nicht erreichbar';
      }

      return { success: false, error: errorMessage };
    }
  }

  private async offlineLogin(
    credentials: AuthCredentials
  ): Promise<{ success: boolean; error?: string; isOffline?: boolean }> {
    console.log('📴 Offline-Login-Versuch...');

    const storedData = this.getStoredAuthData();

    // Prüfe ob Offline-Login möglich ist
    if (!storedData || !storedData.offlineLoginEnabled) {
      return {
        success: false,
        error: 'Offline-Login nicht verfügbar. Bitte zuerst online anmelden.',
      };
    }

    // Prüfe Username
    if (credentials.username !== storedData.username) {
      return {
        success: false,
        error: 'Benutzername stimmt nicht überein',
      };
    }

    // Prüfe Passwort
    const passwordHash = await this.hashPassword(credentials.password);
    if (passwordHash !== storedData.password) {
      return {
        success: false,
        error: 'Passwort falsch',
      };
    }

    // Prüfe Offline-Zeitraum
    const lastLogin = new Date(storedData.lastOnlineLogin);
    const now = new Date();
    const daysSinceLogin = Math.floor(
      (now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLogin > this.OFFLINE_TOKEN_VALIDITY_DAYS) {
      this.clearStoredAuth();
      return {
        success: false,
        error: `Offline-Login abgelaufen (>${this.OFFLINE_TOKEN_VALIDITY_DAYS} Tage). Bitte online anmelden.`,
      };
    }

    // Offline-Login erfolgreich
    console.log(
      `✅ Offline-Login erfolgreich (${daysSinceLogin}/${this.OFFLINE_TOKEN_VALIDITY_DAYS} Tage)`
    );

    this.authSubject.next({
      username: storedData.username,
      password: '',
      token: storedData.token,
    });
    this.roleSubject.next(storedData.role);

    this.isOfflineModeSubject.next(true);

    return {
      success: true,
      isOffline: true,
    };
  }

  // ==========================================
  // PASSWORD HASHING (für Offline-Vergleich)
  // ==========================================

  private async hashPassword(password: string): Promise<string> {
    // Einfacher Base64-Hash (funktioniert überall)
    // Für Production: Server-side Hashing verwenden
    const salted = 'bso-app-' + password + '-salt-2025';
    return btoa(salted);
  }

  // ==========================================
  // AUTH DATA STORAGE
  // ==========================================

  private saveAuthData(data: StoredAuthData): void {
    try {
      localStorage.setItem('auth-data', JSON.stringify(data));

      // Legacy-Support (für alte Keys)
      localStorage.setItem('auth-token', data.token);
      localStorage.setItem('auth-email', data.username);
      localStorage.setItem('role', data.role);
    } catch (error) {
      console.error('❌ Fehler beim Speichern der Auth-Daten:', error);
    }
  }

  private getStoredAuthData(): StoredAuthData | null {
    try {
      const stored = localStorage.getItem('auth-data');
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      console.error('❌ Fehler beim Laden der Auth-Daten:', error);
      return null;
    }
  }

  private clearStoredAuth(): void {
    localStorage.removeItem('auth-data');
    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-email');
    localStorage.removeItem('role');
    localStorage.removeItem('stayloggedin');
    localStorage.removeItem('user');
    localStorage.removeItem('password');
  }

  // ==========================================
  // TOKEN REFRESH
  // ==========================================

  private startTokenRefresh(credentials: AuthCredentials): void {
    if (this.loggedInTimer) {
      clearInterval(this.loggedInTimer);
    }

    // Refresh nur im Online-Modus
    this.loggedInTimer = setInterval(async () => {
      const online = await this.isOnline();
      if (!online) {
        console.log('📴 Offline - Token-Refresh übersprungen');
        return;
      }

      try {
        const response = await this.http
          .post<LoginResponse>(`${this.API_URL}/users/login`, {
            username: credentials.username,
            password: credentials.password,
          })
          .pipe(timeout(5000))
          .toPromise();

        if (response && response.token) {
          const decoded = this.jwtHelper.decodeToken(response.token);
          const auth = this.authSubject.value;
          auth.token = response.token;
          this.authSubject.next(auth);
          this.roleSubject.next(decoded.role);

          // Update gespeicherte Daten
          const storedData = this.getStoredAuthData();
          if (storedData) {
            storedData.token = response.token;
            storedData.lastOnlineLogin = new Date().toISOString();
            this.saveAuthData(storedData);
          }

          console.log('🔄 Token refreshed');
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
      }
    }, 300000); // 5 Minuten
  }

  // ==========================================
  // LOGOUT
  // ==========================================

  logout(): void {
    console.log('👋 Logout...');

    if (this.loggedInTimer) {
      clearInterval(this.loggedInTimer);
    }

    this.authSubject.next({ username: '', password: '', token: '' });
    this.roleSubject.next('');
    this.isOfflineModeSubject.next(false);

    this.clearStoredAuth();

    this.navCtrl.navigateRoot('/login');
  }

  // ==========================================
  // GETTERS
  // ==========================================

  getToken(): string {
    return this.authSubject.value.token || '';
  }

  getRole(): Observable<string> {
    return this.roleSubject.asObservable();
  }

  getRoleValue(): string {
    return this.roleSubject.value;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();

    if (!token) return false;

    // Im Offline-Modus: Prüfe nur ob Token vorhanden
    if (this.isOfflineMode()) {
      console.log('📴 Offline-Modus: Auth OK');
      return true;
    }

    // Im Online-Modus: Prüfe Token-Gültigkeit
    const isAuth = !this.jwtHelper.isTokenExpired(token);
    console.log('🔐 isAuthenticated:', isAuth);
    return isAuth;
  }

  getAuthValue(): { username: string; password: string; token?: string } {
    return this.authSubject.value;
  }

  getEmail(): string {
    return this.authSubject.value.username;
  }

  canOfflineLogin(): boolean {
    const storedData = this.getStoredAuthData();
    return storedData?.offlineLoginEnabled || false;
  }

  getLastOnlineLogin(): Date | null {
    const storedData = this.getStoredAuthData();
    return storedData?.lastOnlineLogin
      ? new Date(storedData.lastOnlineLogin)
      : null;
  }

  // ==========================================
  // HTTP HELPERS
  // ==========================================

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.getToken()}`,
    });
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Ein unbekannter Fehler ist aufgetreten';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Fehler: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 401:
          errorMessage = 'Nicht autorisiert - bitte erneut anmelden';
          this.logout();
          break;
        case 404:
          errorMessage = 'Ressource nicht gefunden';
          break;
        case 500:
          errorMessage = 'Serverfehler';
          break;
        default:
          errorMessage = `Fehlercode: ${error.status}`;
      }
    }

    return throwError(() => new Error(errorMessage));
  }

  // ==========================================
  // API CALLS
  // ==========================================

  getAllPosts(): Observable<any> {
    return this.http
      .get(`${this.API_URL}/posts`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  getPostsByTime(time: string, day: string): Observable<any> {
    return this.http
      .post(
        `${this.API_URL}/posts/alert?time=${time}&day=${day}`,
        {},
        { headers: this.getHeaders() }
      )
      .pipe(catchError(this.handleError.bind(this)));
  }

  updateTeacherState(teacherId: string, status: string): Observable<any> {
    return this.http
      .put(
        `${this.API_URL}/posts/${teacherId}`,
        { status },
        { headers: this.getHeaders() }
      )
      .pipe(catchError(this.handleError.bind(this)));
  }

  updateComment(teacherId: string, comment: string): Observable<any> {
    return this.http
      .put(
        `${this.API_URL}/posts/${teacherId}`,
        { comment },
        { headers: this.getHeaders() }
      )
      .pipe(catchError(this.handleError.bind(this)));
  }

  deletePost(teacherId: string): Observable<any> {
    return this.http
      .delete(`${this.API_URL}/posts/${teacherId}`, {
        headers: this.getHeaders(),
      })
      .pipe(catchError(this.handleError.bind(this)));
  }

  // ==========================================
  // TEST LOGIN (NUR FÜR ENTWICKLUNG)
  // ==========================================

  async testLogin(): Promise<{ success: boolean; error?: string }> {
    console.log('🧪 Test Login aktiviert');

    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoyMTQ3NDgzNjQ3fQ.placeholder';

    this.authSubject.next({
      username: 'test@bso.de',
      password: 'test123',
      token: fakeToken,
    });

    this.roleSubject.next('admin');

    const authData: StoredAuthData = {
      token: fakeToken,
      username: 'test@bso.de',
      password: await this.hashPassword('test123'),
      role: 'admin',
      lastOnlineLogin: new Date().toISOString(),
      offlineLoginEnabled: true,
    };

    this.saveAuthData(authData);

    console.log('✅ Test-Login erfolgreich (Offline-Login aktiviert)');
    return { success: true };
  }
}
