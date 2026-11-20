import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/services/auth.service';
import { NetworkStatusService } from '../core/services/network-status.service';
import { RoleSwitcherComponent } from './role-switcher.component';
import { AppIconComponent } from '../shared/components/app-icon/app-icon.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, RoleSwitcherComponent, AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      <!-- Topbar Header -->
      <header class="sticky top-0 z-40 bg-[#0E1526]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
        <div class="max-w-2xl mx-auto flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
              <app-icon name="receipt" size="sm" extraClass="text-white" />
            </div>
            <div>
              <h1 class="text-base font-extrabold tracking-tight text-white leading-none">Patricia</h1>
              <span class="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">IA Recibos & Facturas</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <app-role-switcher />

            <button
              (click)="auth.logout()"
              title="Cerrar Sesión"
              class="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/60 transition-colors"
            >
              <app-icon name="arrow-right-on-rectangle" size="sm" />
            </button>
          </div>
        </div>
      </header>

      <!-- Offline Indicator Banner -->
      @if (!network.isOnline()) {
        <div class="bg-amber-500/20 border-b border-amber-500/30 text-amber-300 px-4 py-2 text-xs flex items-center justify-center gap-2 sticky top-[57px] z-30 backdrop-blur-sm">
          <span class="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span class="font-medium">Modo sin conexión — mostrando datos locales almacenados</span>
        </div>
      }

      <!-- Main Content Area -->
      <main class="flex-1 max-w-2xl w-full mx-auto p-4 pb-24">
        <router-outlet></router-outlet>
      </main>

      <!-- Bottom Navigation Bar (Mobile-First) -->
      <nav class="fixed bottom-0 left-0 right-0 z-40 bg-[#0E1526]/95 backdrop-blur-md border-t border-slate-800 px-2 py-2">
        <div class="max-w-md mx-auto grid grid-cols-3 gap-1" [class.grid-cols-4]="auth.hasRole(3)">
          <!-- 1. Captura -->
          <a
            routerLink="/capture"
            routerLinkActive="text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
            class="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-slate-200 border border-transparent transition-all"
          >
            <app-icon name="camera" size="md" />
            <span class="text-[11px] font-medium mt-1">Escanear</span>
          </a>

          <!-- 2. Mis Gastos -->
          <a
            routerLink="/expenses"
            routerLinkActive="text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
            class="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-slate-200 border border-transparent transition-all"
          >
            <app-icon name="receipt" size="md" />
            <span class="text-[11px] font-medium mt-1">Gastos</span>
          </a>

          <!-- 3. Contabilidad (Contador y Super Admin) -->
          @if (auth.hasRole(2, 3)) {
            <a
              routerLink="/accounting"
              routerLinkActive="text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
              class="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-slate-200 border border-transparent transition-all"
            >
              <app-icon name="accounting" size="md" />
              <span class="text-[11px] font-medium mt-1">Contabilidad</span>
            </a>
          }

          <!-- 4. Usuarios (Super Admin) -->
          @if (auth.hasRole(3)) {
            <a
              routerLink="/users"
              routerLinkActive="text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
              class="flex flex-col items-center justify-center py-2 px-1 rounded-xl text-slate-400 hover:text-slate-200 border border-transparent transition-all"
            >
              <app-icon name="users" size="md" />
              <span class="text-[11px] font-medium mt-1">Usuarios</span>
            </a>
          }
        </div>
      </nav>
    </div>
  `,
})
export class LayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly network = inject(NetworkStatusService);
}
