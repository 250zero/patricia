import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-role-switcher',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (auth.currentUser(); as user) {
      <div class="relative inline-flex items-center">
        @if (user.roles.length > 1) {
          <select
            [value]="user.activeRole.id"
            (change)="onRoleChange($event)"
            class="bg-slate-900 border border-slate-700/80 text-xs font-semibold text-emerald-400 rounded-lg px-2.5 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            @for (r of user.roles; track r.id) {
              <option [value]="r.id" class="bg-slate-900 text-slate-200">
                {{ r.name }}
              </option>
            }
          </select>
        } @else {
          <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {{ user.activeRole.name }}
          </span>
        }
      </div>
    }
  `,
})
export class RoleSwitcherComponent {
  protected readonly auth = inject(AuthService);

  onRoleChange(event: Event): void {
    const roleId = Number((event.target as HTMLSelectElement).value);
    this.auth.switchRole(roleId).subscribe();
  }
}
