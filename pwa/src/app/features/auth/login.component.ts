import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[#0A0F1D] text-slate-100 flex items-center justify-center p-4">
      <div class="w-full max-w-sm flex flex-col items-center">
        <!-- Logo Header -->
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/25 mb-4">
          <app-icon name="receipt" size="xl" extraClass="text-white" />
        </div>
        <h1 class="text-2xl font-extrabold tracking-tight text-white mb-1">Patricia</h1>
        <p class="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-6">Escáner de Comprobantes con IA</p>

        <!-- Toggle Iniciar Sesión / Registrarse (RF-01) -->
        <div class="w-full grid grid-cols-2 gap-1 p-1 bg-[#111827] border border-slate-800 rounded-xl mb-4 text-xs font-bold">
          <button
            type="button"
            (click)="setMode('login')"
            [class]="mode() === 'login' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
            class="py-2 rounded-lg transition-all"
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            (click)="setMode('register')"
            [class]="mode() === 'register' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'"
            class="py-2 rounded-lg transition-all"
          >
            Crear Cuenta
          </button>
        </div>

        @if (mode() === 'login') {
          <!-- Quick Login Profiles -->
          <div class="w-full bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl mb-4 space-y-3">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Acceso Rápido por Perfil</span>

            <button
              type="button"
              (click)="quickLogin('admin@patricia.vis7ar.com')"
              [disabled]="loading()"
              class="w-full flex items-center justify-between p-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs font-semibold transition-all"
            >
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-purple-400"></span>
                <span>Super Admin</span>
              </div>
              <span class="text-[10px] text-purple-400/80">Acceso Total & SoD</span>
            </button>

            <button
              type="button"
              (click)="quickLogin('contador@patricia.vis7ar.com')"
              [disabled]="loading()"
              class="w-full flex items-center justify-between p-2.5 rounded-xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-semibold transition-all"
            >
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-teal-400"></span>
                <span>Contador</span>
              </div>
              <span class="text-[10px] text-teal-400/80">Revisión & Dictamen</span>
            </button>

            <button
              type="button"
              (click)="quickLogin('empleado1@patricia.vis7ar.com')"
              [disabled]="loading()"
              class="w-full flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold transition-all"
            >
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Empleado Ventas</span>
              </div>
              <span class="text-[10px] text-emerald-400/80">Captura & Gastos</span>
            </button>
          </div>
        }

        <!-- Formulario de Login / Registro -->
        <form (ngSubmit)="onSubmit()" class="w-full bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          @if (errorMessage()) {
            <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <app-icon name="shield-exclamation" size="sm" />
              <span>{{ errorMessage() }}</span>
            </div>
          }
          @if (successMessage()) {
            <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <app-icon name="check" size="sm" />
              <span>{{ successMessage() }}</span>
            </div>
          }

          @if (mode() === 'register') {
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Nombre Completo</label>
              <input
                type="text"
                [(ngModel)]="fullName"
                name="fullName"
                required
                placeholder="Ej. María Rodríguez"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          }

          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Correo Electrónico</label>
            <input
              type="email"
              [(ngModel)]="email"
              name="email"
              required
              placeholder="tu@vis7ar.com"
              class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-400 mb-1">Contraseña</label>
            <input
              type="password"
              [(ngModel)]="password"
              name="password"
              required
              [placeholder]="mode() === 'register' ? 'Mínimo 6 caracteres' : '••••••••'"
              class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            [disabled]="loading()"
            class="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
          >
            @if (loading()) {
              <span class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              <span>{{ mode() === 'register' ? 'Registrando en Supabase...' : 'Ingresando...' }}</span>
            } @else {
              <span>{{ mode() === 'register' ? 'Crear Cuenta y Entrar' : 'Iniciar Sesión' }}</span>
            }
          </button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly mode = signal<'login' | 'register'>('login');
  fullName = '';
  email = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  setMode(newMode: 'login' | 'register'): void {
    this.mode.set(newMode);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  quickLogin(accountEmail: string): void {
    this.mode.set('login');
    this.email = accountEmail;
    this.password = 'Patricia2026!';
    this.onSubmit();
  }

  onSubmit(): void {
    if (!this.email || !this.password) return;
    if (this.mode() === 'register' && this.fullName.trim().length < 2) {
      this.errorMessage.set('Ingresa tu nombre completo (mínimo 2 caracteres).');
      return;
    }
    if (this.mode() === 'register' && this.password.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.mode() === 'register') {
      this.auth.register(this.fullName.trim(), this.email.trim(), this.password).subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.token && res.user) {
            this.router.navigate(['/capture']);
          } else {
            this.successMessage.set('Cuenta creada en Supabase Auth. Ahora puedes iniciar sesión.');
            this.mode.set('login');
          }
        },
        error: (err) => {
          this.loading.set(false);
          this.errorMessage.set(err.error?.error || 'No se pudo completar el registro.');
        },
      });
      return;
    }

    this.auth.login(this.email, this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        // Redirigir segun el rol activo
        if (res.user.activeRole.id === 2) {
          this.router.navigate(['/accounting']);
        } else {
          this.router.navigate(['/capture']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.error?.error || 'Credenciales incorrectas.');
      },
    });
  }
}
