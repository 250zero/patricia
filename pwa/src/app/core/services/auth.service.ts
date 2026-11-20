import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import type { LoginResponse, UserProfile, UserRole } from '../models/auth.model';

const TOKEN_KEY = 'patricia_auth_token';
const USER_KEY = 'patricia_auth_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(this.getStoredToken());
  readonly currentUser = signal<UserProfile | null>(this.getStoredUser());

  readonly isAuthenticated = computed(() => !!this.token() && !!this.currentUser());
  readonly activeRole = computed(() => this.currentUser()?.activeRole || null);
  readonly permissions = computed(() => new Set(this.currentUser()?.permissions || []));

  login(email: string, password: string): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('auth/login', { email, password }).pipe(
      tap((res) => {
        this.setSession(res.token, res.user);
      })
    );
  }

  register(fullName: string, email: string, password: string): Observable<{ token?: string; user?: UserProfile; message: string }> {
    return this.api.post<{ token?: string; user?: UserProfile; message: string }>('auth/register', {
      fullName,
      email,
      password,
    }).pipe(
      tap((res) => {
        if (res.token && res.user) {
          this.setSession(res.token, res.user);
        }
      })
    );
  }

  switchRole(roleId: number): Observable<{ token: string; activeRole: UserRole }> {
    return this.api.post<{ token: string; activeRole: UserRole }>('auth/switch-role', { roleId }).pipe(
      tap((res) => {
        const user = this.currentUser();
        if (user) {
          const updatedUser: UserProfile = { ...user, activeRole: res.activeRole };
          this.setSession(res.token, updatedUser);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  hasRole(...roleIds: number[]): boolean {
    const current = this.activeRole();
    if (!current) return false;
    if (current.id === 3) return true; // Super Admin
    return roleIds.includes(current.id);
  }

  hasPermission(code: string): boolean {
    const current = this.activeRole();
    if (current?.id === 3) return true;
    return this.permissions().has(code);
  }

  private setSession(token: string, user: UserProfile): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.token.set(token);
    this.currentUser.set(user);
  }

  private getStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private getStoredUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
