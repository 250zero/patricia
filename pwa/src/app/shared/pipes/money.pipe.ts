import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'money',
  standalone: true,
})
export class MoneyPipe implements PipeTransform {
  transform(value: number | string | null | undefined, currency = 'DOP'): string {
    const num = Number(value || 0);
    const prefix = currency === 'DOP' ? 'RD$' : currency === 'USD' ? 'US$' : '€';
    const formatted = num.toLocaleString('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${prefix} ${formatted}`;
  }
}
