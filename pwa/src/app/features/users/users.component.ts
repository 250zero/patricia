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

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
            <app-icon name="users" size="md" extraClass="text-purple-400" />
            <span>Administración de Usuarios</span>
          </h2>
          <p class="text-xs text-slate-400">Control de acceso basado en roles (RBAC) y asignación de permisos</p>
        </div>

        <span class="px-2.5 py-1 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-bold">
          Super Admin
        </span>
      </div>

      @if (loading()) {
        <div class="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
          <span class="w-6 h-6 border-2 border-slate-700 border-t-purple-500 rounded-full animate-spin"></span>
          <span class="text-xs">Cargando usuarios...</span>
        </div>
      } @else {
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
      }
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly users = signal<AdminUser[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.loadUsers();
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
