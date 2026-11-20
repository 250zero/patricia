import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AppIconComponent } from '../app-icon/app-icon.component';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [AppIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div class="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
          <!-- Header -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-900/50">
            <h3 class="text-base font-bold text-white flex items-center gap-2">
              {{ title() }}
            </h3>
            <button
              (click)="close.emit()"
              class="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <app-icon name="x-mark" size="md" />
            </button>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-5">
            <ng-content></ng-content>
          </div>
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly isOpen = input<boolean>(false);
  readonly title = input<string>('');
  readonly close = output<void>();
}
