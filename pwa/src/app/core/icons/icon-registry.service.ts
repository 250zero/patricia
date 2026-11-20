import { Injectable, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ICON_CATALOG, IconName } from './icon-catalog';

@Injectable({ providedIn: 'root' })
export class IconRegistryService {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cache = new Map<string, SafeHtml>();

  getIcon(name: IconName | string): SafeHtml {
    const cached = this.cache.get(name);
    if (cached) return cached;

    const raw = (ICON_CATALOG as Record<string, string>)[name] || ICON_CATALOG['receipt'];
    const safe = this.sanitizer.bypassSecurityTrustHtml(raw);
    this.cache.set(name, safe);
    return safe;
  }
}
