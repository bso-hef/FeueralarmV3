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
  email: string;
  password: string;
  token?: string;
}

interface LoginResponse {
  token: string;
}

interface Teacher {
  id: string;
  names: string[];
  class?: string;
  classNumber?: string;
  room?: string[];
  state?: number;
  comment?: string;
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RestService {
  private readonly API_URL = environment.apiUrl;
  private readonly jwtHelper = new JwtHelperService();

  private authSubject = new BehaviorSubject<AuthCredentials>({
    email: '',
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
      this.authSubject.next({ email, password: '', token });
      this.roleSubject.next(decoded.role);
    }
  }

  async login(
    credentials: AuthCredentials
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await this.http
        .post<LoginResponse>(`${this.API_URL}/users/login`, credentials)
        .toPromise();

      if (response && response.token) {
        const decoded = this.jwtHelper.decodeToken(response.token);

        this.authSubject.next({
          ...credentials,
          token: response.token,
        });

        this.roleSubject.next(decoded.role);

        // Store auth data
        localStorage.setItem('auth-token', response.token);
        localStorage.setItem('auth-email', credentials.email);

        // Start auto-refresh
        this.startTokenRefresh(credentials);

        return { success: true };
      }

      return { success: false, error: 'Ungültige Antwort vom Server' };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error:
          error.status === 404
            ? 'Benutzername oder Passwort falsch'
            : 'Verbindungsfehler',
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
        const response = await this.http
          .post<LoginResponse>(`${this.API_URL}/users/login`, {
            email: credentials.email,
            password: credentials.password,
          })
          .toPromise();

        if (response && response.token) {
          const auth = this.authSubject.value;
          auth.token = response.token;
          this.authSubject.next(auth);
          localStorage.setItem('auth-token', response.token);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        this.logout();
      }
    }, 300000); // 5 minutes
  }

  logout(): void {
    if (this.loggedInTimer) {
      clearInterval(this.loggedInTimer);
    }

    this.authSubject.next({ email: '', password: '', token: '' });
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
    return token !== '' && !this.jwtHelper.isTokenExpired(token);
  }
  getAuthValue(): { email: string; password: string; token?: string } {
    return this.authSubject.value;
  }

  getEmail(): string {
    return this.authSubject.value.email;
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
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IlRlc3QgVXNlciIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTUxNjIzOTAyMn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    // Setze Auth
    this.authSubject.next({
      email: 'test@bso.de',
      password: 'test123',
      token: fakeToken,
    });

    this.roleSubject.next('admin');

    // Speichere im localStorage
    localStorage.setItem('auth_token', fakeToken);
    localStorage.setItem('user_email', 'test@bso.de');
    localStorage.setItem('user_role', 'admin');

    return { success: true };
  }
}
