import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-currency-input',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CurrencyInputComponent),
      multi: true,
    },
  ],
  template: `
    <div class="w-full">
      @if (label()) {
        <label class="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-400">
          {{ label() }}
          @if (required()) { <span class="text-rose-400">*</span> }
        </label>
      }

      <div
        class="relative flex items-center rounded-xl border border-slate-800 bg-slate-900/80 transition-colors focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20"
        [class.opacity-60]="disabled()"
      >
        <span class="pl-3 pr-2 text-xs font-mono font-bold text-emerald-400 select-none">
          {{ currency() === 'DOP' ? 'RD$' : currency() === 'USD' ? 'US$' : '€' }}
        </span>

        <input
          type="text"
          inputmode="decimal"
          [value]="displayValue()"
          [disabled]="disabled()"
          [placeholder]="placeholder()"
          (input)="onInputChange($event)"
          (blur)="onBlur()"
          (focus)="onFocus()"
          class="w-full bg-transparent py-2.5 pr-3 text-sm font-mono font-bold text-white placeholder-slate-600 focus:outline-none tabular-nums"
        />
      </div>
    </div>
  `,
})
export class CurrencyInputComponent implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly required = input<boolean>(false);
  readonly placeholder = input<string>('0.00');
  readonly currency = input<string>('DOP');

  readonly value = signal<number>(0);
  readonly displayValue = signal<string>('0.00');
  readonly disabled = signal<boolean>(false);
  private isFocused = false;

  private onChange: (val: number) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: number | null | undefined): void {
    const num = Number(val || 0);
    this.value.set(num);
    if (!this.isFocused) {
      this.displayValue.set(num.toFixed(2));
    }
  }

  registerOnChange(fn: (val: number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  onInputChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const clean = raw.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean) || 0;
    this.value.set(num);
    this.displayValue.set(clean);
    this.onChange(num);
  }

  onFocus(): void {
    this.isFocused = true;
    const current = this.value();
    this.displayValue.set(current ? String(current) : '');
  }

  onBlur(): void {
    this.isFocused = false;
    this.onTouched();
    const current = this.value();
    this.displayValue.set(current.toFixed(2));
  }
}
