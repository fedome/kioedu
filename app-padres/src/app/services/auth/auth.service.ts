import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Preferences } from '@capacitor/preferences';
import { UserProfile } from "../../interfaces/child.interface";

interface LoginResponse {
  access_token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private readonly TOKEN_KEY = 'auth_token';

  private _isAuthenticated = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this._isAuthenticated.asObservable();

  constructor() {
    this.checkToken();
    // Sync check from localStorage for immediate guard access
    if (localStorage.getItem(this.TOKEN_KEY)) {
      this._isAuthenticated.next(true);
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(async (res) => {
        if (res.access_token) {
          await this.saveToken(res.access_token);
          this._isAuthenticated.next(true);
        }
      })
    );
  }

  async logout() {
    await Preferences.remove({ key: this.TOKEN_KEY });
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem('mk-parent-profile');
    this._isAuthenticated.next(false);
  }

  private async saveToken(token: string) {
    await Preferences.set({ key: this.TOKEN_KEY, value: token });
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private async checkToken() {
    const { value } = await Preferences.get({ key: this.TOKEN_KEY });
    if (value) this._isAuthenticated.next(true);
  }

  async getToken() {
    const { value } = await Preferences.get({ key: this.TOKEN_KEY });
    return value || localStorage.getItem(this.TOKEN_KEY);
  }

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/auth/me`);
  }

  isLoggedIn(): boolean {
    return this._isAuthenticated.value || !!localStorage.getItem(this.TOKEN_KEY);
  }

  registerParent(payload: {
    name: string;
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/signup`, payload);
  }

  registerParentFromAdmin(payload: {
    name: string;
    email: string;
    password: string;
    role: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users`, payload);
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/auth/password/forgot`, { email });
  }

  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.http.post<void>(`${this.apiUrl}/auth/change-password`, {
      oldPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
  }
}
