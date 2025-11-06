import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RestService {
  private readonly API_URL = environment.apiUrl;
  private readonly jwtHelper = new JwtHelperService();

  private authSubject = new BehaviorSubject<AuthCredentials>({
    username: '',
    password: '',
    token: '',
  });

  private roleSubject = new BehaviorSubject<string>('');
  private loggedInTimer: any;

  constructor(private http: HttpClient, private navCtrl: NavController) {
    this.checkStoredAuth();
  }

  // ==========================================
  // AUTHENTICATION
  // ==========================================

  private checkStoredAuth(): void {
    const token = localStorage.getItem('auth-token');
    const email = localStorage.getItem('auth-email');

    if (token && email && !this.jwtHelper.isTokenExpired(token)) {
      const decoded = this.jwtHelper.decodeToken(token);
      this.authSubject.next({ username: email, password: '', token });
      this.roleSubject.next(decoded.role);
      console.log(
        '✅ Gespeicherte Auth wiederhergestellt:',
        email,
        decoded.role
      );
    }
  }

  async login(
    credentials: AuthCredentials
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📤 Sende Login Request:', credentials.username);

      const payload = {
        username: credentials.username,
        password: credentials.password,
      };

      const response = await this.http
        .post<LoginResponse>(`${this.API_URL}/users/login`, payload)
        .toPromise();

      console.log('📥 Login Response erhalten:', response);

      if (response && response.token) {
        const decoded = this.jwtHelper.decodeToken(response.token);
        console.log('🔓 Token dekodiert:', decoded);

        this.authSubject.next({
          ...credentials,
          token: response.token,
        });

        this.roleSubject.next(decoded.role);

        // Store auth data
        localStorage.setItem('auth-token', response.token);
        localStorage.setItem('auth-email', credentials.username);

        console.log('💾 Auth Daten gespeichert');

        // Start auto-refresh
        this.startTokenRefresh(credentials);

        return { success: true };
      }

      console.warn('⚠️ Keine gültige Response vom Server');
      return { success: false, error: 'Ungültige Antwort vom Server' };
    } catch (error: any) {
      console.error('❌ Login error:', error);

      let errorMessage = 'Verbindungsfehler';

      if (error.status === 404 || error.status === 401) {
        errorMessage = 'Benutzername oder Passwort falsch';
      } else if (error.status === 0) {
        errorMessage = 'Server nicht erreichbar';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  private startTokenRefresh(credentials: AuthCredentials): void {
    // Clear existing timer
    if (this.loggedInTimer) {
      clearInterval(this.loggedInTimer);
    }

    // Refresh token every 5 minutes
    this.loggedInTimer = setInterval(async () => {
      try {
        const refreshPayload = {
          username: credentials.username,
          password: credentials.password,
        };
        const response = await this.http
          .post<LoginResponse>(`${this.API_URL}/users/login`, refreshPayload)
          .toPromise();

        if (response && response.token) {
          const auth = this.authSubject.value;
          auth.token = response.token;
          this.authSubject.next(auth);
          localStorage.setItem('auth-token', response.token);
          console.log('🔄 Token refreshed');
        }
      } catch (error) {
        console.error('❌ Token refresh failed:', error);
        this.logout();
      }
    }, 300000); // 5 minutes
  }

  logout(): void {
    console.log('👋 Logout...');

    if (this.loggedInTimer) {
      clearInterval(this.loggedInTimer);
    }

    this.authSubject.next({ username: '', password: '', token: '' });
    this.roleSubject.next('');

    localStorage.removeItem('auth-token');
    localStorage.removeItem('auth-email');
    localStorage.removeItem('stayloggedin');
    localStorage.removeItem('user');
    localStorage.removeItem('password');

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
    const isAuth = token !== '' && !this.jwtHelper.isTokenExpired(token);
    console.log(
      '🔐 isAuthenticated:',
      isAuth,
      'Token:',
      token ? 'vorhanden' : 'fehlt'
    );
    return isAuth;
  }

  getAuthValue(): { username: string; password: string; token?: string } {
    return this.authSubject.value;
  }

  getEmail(): string {
    return this.authSubject.value.username;
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

    // Fake Token
    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMiwiZXhwIjoyMTQ3NDgzNjQ3fQ.placeholder';

    // Setze Auth
    this.authSubject.next({
      username: 'test@bso.de',
      password: 'test123',
      token: fakeToken,
    });

    this.roleSubject.next('admin');

    // Speichere im localStorage
    localStorage.setItem('auth-token', fakeToken);
    localStorage.setItem('auth-email', 'test@bso.de');

    console.log('✅ Test-Login erfolgreich');
    return { success: true };
  }
}
