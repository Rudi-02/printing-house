import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_URL } from './api';
import { Role, User } from './models';

const TOKEN_KEY = 'ph_token';
const USER_KEY = 'ph_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<User | null>(this.readUser());
  readonly isLoggedIn = computed(() => !!this.user());
  readonly role = computed<Role | null>(() => this.user()?.role ?? null);
  readonly isClient = computed(() => ['INDIVIDUAL', 'LEGAL'].includes(this.role() ?? ''));
  readonly isLegal = computed(() => this.role() === 'LEGAL');
  readonly isPrinter = computed(() => this.role() === 'PRINTER');
  readonly isAdmin = computed(() => this.role() === 'ADMIN');

  private readUser(): User | null {
    try { const raw = localStorage.getItem(USER_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  }
  get token(): string | null { return localStorage.getItem(TOKEN_KEY); }

  private store(token: string, user: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  login(username: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${API_URL}/auth/login`, { username, password })
      .pipe(tap(r => this.store(r.token, r.user)));
  }
  adminLogin(username: string, password: string) {
    return this.http.post<{ token: string; user: User }>(`${API_URL}/auth/admin/login`, { username, password })
      .pipe(tap(r => this.store(r.token, r.user)));
  }
  register(data: FormData) {
    return this.http.post<{ message: string; status: string }>(`${API_URL}/auth/register`, data);
  }
  forgotPassword(identifier: string) {
    return this.http.post<{ message: string; devLink?: string }>(`${API_URL}/auth/forgot-password`, { identifier });
  }
  validateResetToken(token: string) {
    return this.http.get<{ valid: boolean; message: string }>(`${API_URL}/auth/reset-password/${token}`);
  }
  resetPassword(token: string, password: string) {
    return this.http.post<{ message: string }>(`${API_URL}/auth/reset-password`, { token, password });
  }
  refreshUser() {
    return this.http.get<User>(`${API_URL}/auth/me`).pipe(tap(u => {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
      this.user.set(u);
    }));
  }
  setUser(u: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    this.user.set(u);
  }
  logout(toAdmin = false) {
    const wasAdmin = toAdmin || this.isAdmin();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigateByUrl(wasAdmin ? '/admin-login' : '/login');
  }

  homeRoute(): string {
    switch (this.role()) {
      case 'ADMIN': return '/admin/users';
      case 'PRINTER': return '/printer/products';
      case 'LEGAL':
      case 'INDIVIDUAL': return '/client/search';
      default: return '/';
    }
  }
}
