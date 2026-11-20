import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ApiService } from '../../core/services/api.service';

interface ExtractedData {
  merchant_name: string;
  rnc: string | null;
  ncf: string | null;
  document_type: 1 | 2; // 1 = recibo, 2 = factura
  currency_code: string;
  issue_date: string;
  subtotal: number;
  itbis: number;
  total: number;
  confidence_score: number;
  items: { description: string; quantity: number; unit_price: number; subtotal: number; itbis: number; total: number }[];
  is_balanced: boolean;
  notes?: string;
}

@Component({
  selector: 'app-capture',
  standalone: true,
  imports: [FormsModule, AppIconComponent, CurrencyInputComponent, MoneyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-6">
      <!-- 1. Header con Disparador de Captura -->
      <div class="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h2 class="text-lg font-extrabold text-white mb-1 flex items-center gap-2">
          <app-icon name="camera" size="md" extraClass="text-emerald-400" />
          <span>Escanear Comprobante con IA</span>
        </h2>
        <p class="text-xs text-slate-400 mb-4">
          Toma una foto de tu factura o recibo. La IA de Google Gemini extraerá RNC, NCF, ITBIS 18% y verificará el cuadre contable.
        </p>

        <!-- Zona de Carga / Boton Camara -->
        <div class="relative">
          <input
            #fileInput
            type="file"
            accept="image/*"
            capture="environment"
            (change)="onFileSelected($event)"
            class="hidden"
          />

          @if (!previewUrl()) {
            <button
              type="button"
              (click)="fileInput.click()"
              [disabled]="processing()"
              class="w-full py-8 border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-emerald-400 transition-all cursor-pointer"
            >
              <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <app-icon name="camera" size="lg" />
              </div>
              <span class="text-sm font-bold">Tomar Foto o Subir Comprobante</span>
              <span class="text-[11px] text-slate-500">Admite JPEG, PNG o PDF (hasta 10 MB)</span>
            </button>
          } @else {
            <div class="relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900 flex flex-col items-center p-3">
              <img [src]="previewUrl()" alt="Preview" class="max-h-64 object-contain rounded-xl mb-3" />

              <div class="flex items-center gap-3">
                <button
                  type="button"
                  (click)="fileInput.click()"
                  [disabled]="processing()"
                  class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
                >
                  Cambiar Foto
                </button>
              </div>
            </div>
          }

          <!-- Indicador de procesamiento IA -->
          @if (processing()) {
            <div class="mt-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3 text-emerald-400">
              <span class="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></span>
              <div class="text-xs">
                <p class="font-bold">Analizando con Gemini Flash IA...</p>
                <p class="text-emerald-500/80">Extrayendo RNC, NCF, ITBIS 18% y desglose de artículos</p>
              </div>
            </div>
          }
        </div>
      </div>

      <!-- 2. Formulario de Verificacion y Cuadre -->
      @if (extracted()) {
        <div class="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4 animate-fade-in">
          <div class="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <app-icon name="sparkles" size="sm" extraClass="text-emerald-400" />
              <span>Datos Extraídos del Comprobante</span>
            </h3>

            <!-- Selector de Clasificacion: Recibo vs Factura -->
            <div class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                (click)="setDocumentType(1)"
                [class.bg-emerald-600]="formDocumentType === 1"
                [class.text-white]="formDocumentType === 1"
                [class.text-slate-400]="formDocumentType !== 1"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
              >
                Recibo
              </button>
              <button
                type="button"
                (click)="setDocumentType(2)"
                [class.bg-emerald-600]="formDocumentType === 2"
                [class.text-white]="formDocumentType === 2"
                [class.text-slate-400]="formDocumentType !== 2"
                class="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
              >
                Factura (Fiscal)
              </button>
            </div>
          </div>

          <!-- Alerta de Confianza / Imagen Borrosa -->
          @if (extracted() && ((extracted()!.confidence_score < 0.75) || extracted()!.notes)) {
            <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1">
              <div class="flex items-center gap-2 font-bold">
                <app-icon name="shield-exclamation" size="sm" extraClass="text-amber-400" />
                <span>Calidad Visual: {{ (extracted()!.confidence_score * 100).toFixed(0) }}% de certeza</span>
              </div>
              <p class="text-[11px] text-amber-200/90 leading-relaxed">
                {{ extracted()!.notes || 'La imagen presenta zonas borrosas, sombras o falta de nitidez. Por favor verifique y complete los campos antes de guardar.' }}
              </p>
            </div>
          }

          <!-- Banner Reactivo de Cuadre Aritmetico -->
          @if (isBalanced()) {
            <div class="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <app-icon name="check" size="sm" />
              <span>Cuadre Aritmético Correcto: Subtotal + ITBIS = Total ({{ formTotal | money:formCurrency }})</span>
            </div>
          } @else {
            <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-2">
              <app-icon name="shield-exclamation" size="sm" />
              <span>⚠️ Descuadre Detectado: Subtotal + ITBIS ({{ formSubtotal + formItbis | money:formCurrency }}) difiere del Total ({{ formTotal | money:formCurrency }})</span>
            </div>
          }

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="sm:col-span-2">
              <label class="block text-xs font-semibold text-slate-400 mb-1">Comercio / Proveedor</label>
              <input
                type="text"
                [(ngModel)]="formMerchant"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">RNC (9 dígitos)</label>
              <input
                type="text"
                [(ngModel)]="formRnc"
                placeholder="101010101"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">NCF / e-CF</label>
              <input
                type="text"
                [(ngModel)]="formNcf"
                placeholder="B0100000001"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Fecha de Emisión</label>
              <input
                type="date"
                [(ngModel)]="formDate"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">Moneda</label>
              <select
                [(ngModel)]="formCurrency"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="DOP">DOP (Peso Dominicano)</option>
                <option value="USD">USD (Dólar Estadounidense)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>
          </div>

          <!-- Campos Financieros con CurrencyInput -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <app-currency-input
              label="Subtotal Neto"
              [currency]="formCurrency"
              [ngModel]="formSubtotal"
              (ngModelChange)="onSubtotalChange($event)"
            />

            <app-currency-input
              label="ITBIS (18%)"
              [currency]="formCurrency"
              [ngModel]="formItbis"
              (ngModelChange)="onItbisChange($event)"
            />

            <app-currency-input
              label="Total General"
              [currency]="formCurrency"
              [ngModel]="formTotal"
              (ngModelChange)="onTotalChange($event)"
            />
          </div>

          <!-- Botones de Accion -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              (click)="saveReceipt(1)"
              [disabled]="saving()"
              class="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition-colors"
            >
              Guardar Borrador
            </button>

            <button
              type="button"
              (click)="saveReceipt(2)"
              [disabled]="saving()"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
            >
              @if (saving()) {
                <span class="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
              }
              <span>Enviar a Contabilidad</span>
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class CaptureComponent {
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly previewUrl = signal<string | null>(null);
  readonly processing = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly extracted = signal<ExtractedData | null>(null);

  savedImagePath: string | null = null;
  formDocumentType: 1 | 2 = 2; // Factura por defecto
  formMerchant = '';
  formRnc = '';
  formNcf = '';
  formDate = new Date().toISOString().substring(0, 10);
  formCurrency = 'DOP';
  formSubtotal = 0;
  formItbis = 0;
  formTotal = 0;

  isBalanced(): boolean {
    return Math.abs(this.formSubtotal + this.formItbis - this.formTotal) < 0.05;
  }

  setDocumentType(type: 1 | 2): void {
    this.formDocumentType = type;
  }

  onSubtotalChange(val: number): void {
    this.formSubtotal = val;
    // Auto sugerir ITBIS al 18% si es factura y no tiene ITBIS
    if (this.formDocumentType === 2 && this.formItbis === 0) {
      this.formItbis = Math.round(val * 0.18 * 100) / 100;
    }
    this.formTotal = Math.round((this.formSubtotal + this.formItbis) * 100) / 100;
  }

  onItbisChange(val: number): void {
    this.formItbis = val;
    this.formTotal = Math.round((this.formSubtotal + this.formItbis) * 100) / 100;
  }

  onTotalChange(val: number): void {
    this.formTotal = val;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.previewUrl.set(URL.createObjectURL(file));
    this.processing.set(true);

    const formData = new FormData();
    formData.append('file', file);

    this.http.post<{ success: boolean; image_path: string; extracted_data: ExtractedData }>('/api/v1/receipts/process-image', formData).subscribe({
      next: (res) => {
        this.processing.set(false);
        this.savedImagePath = res.image_path;
        this.extracted.set(res.extracted_data);

        // Prellenar formulario
        const d = res.extracted_data;
        this.formDocumentType = d.document_type;
        this.formMerchant = d.merchant_name;
        this.formRnc = d.rnc || '';
        this.formNcf = d.ncf || '';
        this.formDate = d.issue_date || this.formDate;
        this.formCurrency = d.currency_code || 'DOP';
        this.formSubtotal = d.subtotal;
        this.formItbis = d.itbis;
        this.formTotal = d.total;
      },
      error: (err) => {
        this.processing.set(false);
        alert('Error al procesar comprobante con IA: ' + (err.error?.error || err.message));
      },
    });
  }

  saveReceipt(targetStatus: 1 | 2): void {
    this.saving.set(true);
    const payload = {
      merchant_name: this.formMerchant || 'Comprobante',
      rnc: this.formRnc || null,
      ncf: this.formNcf || null,
      document_type: this.formDocumentType,
      currency_code: this.formCurrency,
      issue_date: this.formDate,
      subtotal: this.formSubtotal,
      itbis: this.formItbis,
      total: this.formTotal,
      status: targetStatus,
      image_path: this.savedImagePath,
      items: this.extracted()?.items || [],
    };

    this.api.post<{ success: boolean; receipt: { id: string } }>('receipts', payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/expenses']);
      },
      error: (err) => {
        this.saving.set(false);
        alert('Error al guardar comprobante: ' + (err.error?.error || err.message));
      },
    });
  }
}
