import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  createdAt: string;
  roles: { id: number; name: string; isPrimary: boolean }[];
}

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  client_ip: string;
  user_agent: string;
  changes: Record<string, unknown>;
  created_at: string;
  actor_email: string;
  actor_name: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
            <app-icon name="users" size="md" extraClass="text-purple-400" />
            <span>Panel Super Admin</span>
          </h2>
          <p class="text-xs text-slate-400">Control de acceso RBAC, roles y bitácora de auditoría inmutable</p>
        </div>

        <span class="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold">
          Super Admin
        </span>
      </div>

      <!-- Selector de Pestañas -->
      <div class="flex border-b border-slate-800 text-sm font-bold">
        <button
          (click)="setTab('USERS')"
          class="pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2"
          [class]="activeTab() === 'USERS' ? 'border-purple-400 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <app-icon name="users" size="sm" />
          <span>Usuarios y Roles</span>
        </button>

        <button
          (click)="setTab('AUDIT')"
          class="pb-2.5 px-3 border-b-2 transition-colors flex items-center gap-2"
          [class]="activeTab() === 'AUDIT' ? 'border-purple-400 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'"
        >
          <app-icon name="shield" size="sm" />
          <span>Bitácora de Auditoría</span>
        </button>
      </div>

      @if (loading()) {
        <div class="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
          <span class="w-6 h-6 border-2 border-slate-700 border-t-purple-500 rounded-full animate-spin"></span>
          <span class="text-xs">Cargando datos...</span>
        </div>
      } @else if (activeTab() === 'USERS') {
        <!-- Pestaña 1: Usuarios y Roles -->
        <div class="space-y-3">
          @for (u of users(); track u.id) {
            <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <h4 class="text-sm font-bold text-white">{{ u.fullName }}</h4>
                  <p class="text-xs text-slate-400 font-mono">{{ u.email }}</p>
                </div>

                <span
                  class="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  [class.bg-emerald-500]="u.isActive"
                  [class.text-emerald-300]="u.isActive"
                  [class.bg-rose-500]="!u.isActive"
                  [class.text-rose-300]="!u.isActive"
                >
                  {{ u.isActive ? 'Activo' : 'Inactivo' }}
                </span>
              </div>

              <!-- Selector de Rol -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                <span class="text-slate-400 font-semibold">Rol Asignado:</span>

                <select
                  [value]="getPrimaryRoleId(u)"
                  (change)="changeRole(u.id, $event)"
                  class="bg-slate-900 border border-slate-700 text-xs font-bold text-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="1">1 — Empleado</option>
                  <option value="2">2 — Contador</option>
                  <option value="3">3 — Super Admin</option>
                </select>
              </div>
            </div>
          }
        </div>
      } @else {
        <!-- Pestaña 2: Bitácora de Auditoría -->
        <div class="space-y-3">
          <div class="flex items-center justify-between text-xs text-slate-400">
            <span>Últimos registros auditados (IP, Actor, Operación)</span>
            <button (click)="loadAuditLogs()" class="text-purple-400 hover:underline font-bold">Refrescar</button>
          </div>

          @if (auditLogs().length === 0) {
            <div class="py-8 text-center text-slate-500 text-xs">
              No hay eventos de auditoría registrados aún.
            </div>
          } @else {
            <div class="space-y-2">
              @for (log of auditLogs(); track log.id) {
                <div class="bg-[#111827] border border-slate-800 rounded-xl p-3 text-xs space-y-1.5 shadow-md">
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-white uppercase tracking-wider text-[11px] font-mono">
                      {{ log.action }} <span class="text-slate-500 font-normal">({{ log.entity_type }})</span>
                    </span>
                    <span class="text-[10px] text-slate-400 font-mono">{{ log.created_at.substring(0, 19).replace('T', ' ') }}</span>
                  </div>

                  <div class="flex items-center justify-between text-slate-400 text-[11px]">
                    <div>
                      Actor: <strong class="text-slate-200">{{ log.actor_name || log.actor_email || 'Sistema' }}</strong>
                    </div>
                    <div class="font-mono text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-300">
                      IP: {{ log.client_ip || '127.0.0.1' }}
                    </div>
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly users = signal<AdminUser[]>([]);
  readonly auditLogs = signal<AuditLog[]>([]);
  readonly activeTab = signal<'USERS' | 'AUDIT'>('USERS');
  readonly loading = signal(true);

  ngOnInit(): void {
    this.loadUsers();
  }

  setTab(tab: 'USERS' | 'AUDIT'): void {
    this.activeTab.set(tab);
    if (tab === 'AUDIT' && this.auditLogs().length === 0) {
      this.loadAuditLogs();
    }
  }

  loadUsers(): void {
    this.loading.set(true);
    this.api.get<{ users: AdminUser[] }>('users').subscribe({
      next: (res) => {
        this.users.set(res.users);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  loadAuditLogs(): void {
    this.loading.set(true);
    this.api.get<{ logs: AuditLog[] }>('users/audit-logs').subscribe({
      next: (res) => {
        this.auditLogs.set(res.logs || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getPrimaryRoleId(u: AdminUser): number {
    const primary = u.roles.find((r) => r.isPrimary);
    return primary ? primary.id : (u.roles[0]?.id || 1);
  }

  changeRole(userId: string, event: Event): void {
    const roleId = Number((event.target as HTMLSelectElement).value);
    this.api.patch(`users/${userId}/role`, { roleId }).subscribe({
      next: () => this.loadUsers(),
    });
  }
}
