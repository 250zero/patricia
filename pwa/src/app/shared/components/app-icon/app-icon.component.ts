import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { IconName } from '../../../core/icons/icon-catalog';
import { IconRegistryService } from '../../../core/icons/icon-registry.service';

const SIZE_MAP = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
} as const;

@Component({
  selector: 'app-icon',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      [attr.stroke-width]="strokeWidth()"
      stroke="currentColor"
      [class]="computedClass()"
      [innerHTML]="svgContent()"
    ></svg>
  `,
})
export class AppIconComponent {
  private readonly registry = inject(IconRegistryService);

  readonly name = input.required<IconName | string>();
  readonly size = input<keyof typeof SIZE_MAP>('md');
  readonly strokeWidth = input<number>(1.75);
  readonly extraClass = input<string>('');

  readonly svgContent = computed(() => this.registry.getIcon(this.name()));
  readonly computedClass = computed(
    () => `inline-block shrink-0 ${SIZE_MAP[this.size()]} ${this.extraClass()}`.trim()
  );
}
