import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ApiService } from '../../core/services/api.service';
import { RECEIPT_CATEGORIES, type ReceiptCategory } from '../../core/models/receipt.model';

interface ExtractedData {
  merchant_name: string;
  rnc: string | null;
  ncf: string | null;
  document_type: 1 | 2; // 1 = recibo, 2 = factura
  category?: ReceiptCategory;
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

interface ProcessImageResponse {
  success: boolean;
  image_path: string;
  image_url?: string | null;
  is_duplicate?: boolean;
  duplicate_id?: string | null;
  extracted_data: ExtractedData;
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

          <!-- Indicador de Compresión, Progreso de Subida y Procesamiento IA -->
          @if (compressionInfo()) {
            <div class="mt-3 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Optimización móvil (max 1600px)</span>
              <span class="font-mono text-emerald-400">{{ compressionInfo() }}</span>
            </div>
          }

          @if (processing()) {
            <div class="mt-3 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2 text-emerald-400">
              <div class="flex items-center gap-3">
                <span class="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin shrink-0"></span>
                <div class="text-xs flex-1">
                  <p class="font-bold">
                    {{ uploadProgress() < 100 ? 'Subiendo comprobante a Supabase Storage...' : 'Analizando con Gemini Flash IA...' }}
                  </p>
                  <p class="text-emerald-500/80">Extrayendo RNC, NCF, categoría, ITBIS 18% y desglose</p>
                </div>
                <span class="text-xs font-mono font-bold">{{ uploadProgress() }}%</span>
              </div>
              <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                  [style.width.%]="uploadProgress()"
                ></div>
              </div>
            </div>
          }

          @if (uploadError()) {
            <div class="mt-3 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <app-icon name="shield-exclamation" size="sm" />
                <span>{{ uploadError() }}</span>
              </div>
              <button
                type="button"
                (click)="retryUpload()"
                class="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold shrink-0"
              >
                Reintentar
              </button>
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

          <!-- Alerta de Posible Comprobante Duplicado (RF-20) -->
          @if (isDuplicateWarning()) {
            <div class="p-3.5 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-300 text-xs space-y-1">
              <div class="flex items-center gap-2 font-bold">
                <app-icon name="shield-exclamation" size="sm" extraClass="text-orange-400" />
                <span>Posible Comprobante Duplicado Detectado</span>
              </div>
              <p class="text-[11px] text-orange-200/90">
                Ya existe un gasto registrado con el mismo comercio ({{ formMerchant }}), fecha ({{ formDate }}) y monto total. Verifica antes de confirmar.
              </p>
            </div>
          }

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
              <label class="block text-xs font-semibold text-slate-400 mb-1">
                <span>RNC</span>
                @if (formDocumentType === 1) {
                  <span class="text-[10px] text-slate-500 font-normal ml-1">(Opcional en recibo informal)</span>
                } @else {
                  <span class="text-[10px] text-slate-400 font-normal ml-1">(9 dígitos)</span>
                }
              </label>
              <input
                type="text"
                [(ngModel)]="formRnc"
                [placeholder]="formDocumentType === 1 ? 'Opcional / No aplica' : '101010101'"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-mono text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-1">
                <span>NCF / Comprobante</span>
                @if (formDocumentType === 1) {
                  <span class="text-[10px] text-slate-500 font-normal ml-1">(Opcional en recibo informal)</span>
                } @else {
                  <span class="text-[10px] text-slate-400 font-normal ml-1">(B01.. / E31..)</span>
                }
              </label>
              <input
                type="text"
                [(ngModel)]="formNcf"
                [placeholder]="formDocumentType === 1 ? 'Opcional / No aplica' : 'B0100000001'"
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
              <label class="block text-xs font-semibold text-slate-400 mb-1">Categoría (Sugerida por IA)</label>
              <select
                [(ngModel)]="formCategory"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                @for (cat of categories; track cat.value) {
                  <option [value]="cat.value">{{ cat.label }}</option>
                }
              </select>
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

  readonly categories = RECEIPT_CATEGORIES;
  readonly previewUrl = signal<string | null>(null);
  readonly processing = signal<boolean>(false);
  readonly uploadProgress = signal<number>(0);
  readonly compressionInfo = signal<string>('');
  readonly uploadError = signal<string>('');
  readonly isDuplicateWarning = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly extracted = signal<ExtractedData | null>(null);

  private lastProcessedFile: File | null = null;
  savedImagePath: string | null = null;
  formDocumentType: 1 | 2 = 2; // Factura por defecto
  formCategory: ReceiptCategory = 'otros';
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

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const rawFile = input.files[0];
    this.previewUrl.set(URL.createObjectURL(rawFile));
    this.uploadError.set('');
    this.isDuplicateWarning.set(false);

    const { file: compressedFile, originalKb, compressedKb } = await this.compressImageClientSide(rawFile);
    if (rawFile.type.startsWith('image/')) {
      this.compressionInfo.set(`${originalKb} KB → ${compressedKb} KB`);
    } else {
      this.compressionInfo.set(`${originalKb} KB`);
    }

    this.lastProcessedFile = compressedFile;
    this.uploadAndExtract(compressedFile);
  }

  retryUpload(): void {
    if (this.lastProcessedFile) {
      this.uploadAndExtract(this.lastProcessedFile);
    }
  }

  private uploadAndExtract(file: File): void {
    this.processing.set(true);
    this.uploadProgress.set(10);
    this.uploadError.set('');

    const formData = new FormData();
    formData.append('file', file);

    this.http
      .post<ProcessImageResponse>('/api/v1/receipts/process-image', formData, {
        reportProgress: true,
        observe: 'events',
      })
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            const pct = Math.min(95, Math.round((100 * event.loaded) / event.total));
            this.uploadProgress.set(pct);
          } else if (event.type === HttpEventType.Response && event.body) {
            this.uploadProgress.set(100);
            this.processing.set(false);
            const res = event.body;
            this.savedImagePath = res.image_path;
            this.isDuplicateWarning.set(!!res.is_duplicate);
            this.extracted.set(res.extracted_data);

            const d = res.extracted_data;
            this.formDocumentType = d.document_type;
            this.formCategory = d.category || 'otros';
            this.formMerchant = d.merchant_name;
            this.formRnc = d.rnc || '';
            this.formNcf = d.ncf || '';
            this.formDate = d.issue_date || this.formDate;
            this.formCurrency = d.currency_code || 'DOP';
            this.formSubtotal = d.subtotal;
            this.formItbis = d.itbis;
            this.formTotal = d.total;
          }
        },
        error: (err) => {
          this.processing.set(false);
          this.uploadProgress.set(0);
          this.uploadError.set(err.error?.error || err.message || 'No se pudo procesar el comprobante.');
        },
      });
  }

  // RF-07: Reducir a max 1600 px por lado y comprimir < 1.5 MB en el navegador
  private async compressImageClientSide(
    file: File
  ): Promise<{ file: File; originalKb: number; compressedKb: number }> {
    const originalKb = Math.max(1, Math.round(file.size / 1024));
    if (!file.type.startsWith('image/')) {
      return { file, originalKb, compressedKb: originalKb };
    }

    try {
      const imgUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = imgUrl;
      });
      URL.revokeObjectURL(imgUrl);

      const maxDim = 1600;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDim || height > maxDim) {
        if (width >= height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return { file, originalKb, compressedKb: originalKb };
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.82;
      let blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
      );

      // Si aun supera 1.4 MB, bajar calidad a 0.65
      if (blob && blob.size > 1.4 * 1024 * 1024) {
        quality = 0.65;
        blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
        );
      }

      if (!blob) {
        return { file, originalKb, compressedKb: originalKb };
      }

      const baseName = file.name.replace(/\.[^.]+$/, '') || 'comprobante';
      const compressedFile = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
      const compressedKb = Math.max(1, Math.round(compressedFile.size / 1024));
      return { file: compressedFile, originalKb, compressedKb };
    } catch {
      return { file, originalKb, compressedKb: originalKb };
    }
  }

  saveReceipt(targetStatus: 1 | 2): void {
    this.saving.set(true);
    const payload = {
      merchant_name: this.formMerchant || 'Comprobante',
      rnc: this.formRnc || null,
      ncf: this.formNcf || null,
      document_type: this.formDocumentType,
      category: this.formCategory,
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
