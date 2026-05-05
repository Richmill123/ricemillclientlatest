import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

export interface StoredUser {
  _id: string;
  name: string;
  username: string;
  email: string;
  role: string;
}

const KEYS = {
  ACCESS_TOKEN:  'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER:          'user',
  USER_TYPE:     'user_type',
} as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = environment.apiUrl;

  // Shared stream used by the interceptor to coordinate concurrent refreshes
  private _refreshing = false;
  readonly refreshDone$ = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {}

  // ── Token accessors ─────────────────────────────────────────────────────────

  getAccessToken(): string | null {
    return sessionStorage.getItem(KEYS.ACCESS_TOKEN);
  }

  getRefreshToken(): string | null {
    return sessionStorage.getItem(KEYS.REFRESH_TOKEN);
  }

  getUser(): StoredUser | null {
    try {
      const raw = sessionStorage.getItem(KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  getClientId(): string {
    return this.getUser()?._id ?? '';
  }

  getUserType(): string {
    return sessionStorage.getItem(KEYS.USER_TYPE) ?? 'merchant';
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    return !!token && !this.isTokenExpired(token);
  }

  get isRefreshing(): boolean {
    return this._refreshing;
  }

  // ── Session management ──────────────────────────────────────────────────────

  saveSession(res: LoginResponse, userType: string): void {
    sessionStorage.setItem(KEYS.ACCESS_TOKEN,  res.accessToken);
    sessionStorage.setItem(KEYS.REFRESH_TOKEN, res.refreshToken);
    sessionStorage.setItem(KEYS.USER_TYPE, userType);

    const { accessToken, refreshToken, expiresIn, ...userData } = res;
    sessionStorage.setItem(KEYS.USER, JSON.stringify(userData));
  }

  updateAccessToken(token: string): void {
    sessionStorage.setItem(KEYS.ACCESS_TOKEN, token);
  }

  updateRefreshToken(token: string): void {
    sessionStorage.setItem(KEYS.REFRESH_TOKEN, token);
  }

  clearSession(): void {
    sessionStorage.removeItem(KEYS.ACCESS_TOKEN);
    sessionStorage.removeItem(KEYS.REFRESH_TOKEN);
    sessionStorage.removeItem(KEYS.USER);
    sessionStorage.removeItem(KEYS.USER_TYPE);
  }

  // ── HTTP calls ──────────────────────────────────────────────────────────────

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/admins/login`, credentials);
  }

  refreshAccessToken(): Observable<RefreshResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token'));
    }
    this._refreshing = true;
    return this.http
      .post<RefreshResponse>(`${this.apiUrl}/admins/refresh-token`, { refreshToken })
      .pipe(
        tap((res) => {
          this.updateAccessToken(res.accessToken);
          if (res.refreshToken) this.updateRefreshToken(res.refreshToken);
          this._refreshing = false;
          this.refreshDone$.next(res.accessToken);
        }),
        catchError((err) => {
          this._refreshing = false;
          this.refreshDone$.next(null);
          return throwError(() => err);
        })
      );
  }

  logout(): void {
    const token = this.getAccessToken();
    // Best-effort server logout; don't wait for response
    if (token) {
      this.http
        .post(`${this.apiUrl}/admins/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  // ── JWT helpers ─────────────────────────────────────────────────────────────

  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // Give a 10-second buffer before expiry
      return Date.now() / 1000 > payload.exp - 10;
    } catch {
      return true;
    }
  }
}
