import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import type { Receipt } from '../../core/models/receipt.model';

@Component({
  selector: 'app-accounting',
  standalone: true,
  imports: [FormsModule, AppIconComponent, MoneyPipe, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Top Header & Export -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-extrabold text-white flex items-center gap-2">
            <app-icon name="accounting" size="md" extraClass="text-emerald-400" />
            <span>Bandeja de Contabilidad</span>
          </h2>
          <p class="text-xs text-slate-400">Revisión fiscal, Segregación de Funciones (SoD) y dictamen</p>
        </div>

        <button
          (click)="exportCsv()"
          [disabled]="exporting()"
          class="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-emerald-400 shadow-md flex items-center gap-1.5 transition-all"
        >
          <app-icon name="arrow-down-tray" size="sm" />
          <span>{{ exporting() ? 'Generando...' : 'Exportar CSV' }}</span>
        </button>
      </div>

      <!-- Tarjetas de Resumen Contador -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div class="p-3 rounded-xl bg-[#111827] border border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Pendientes</span>
          <span class="text-lg font-black text-blue-400">{{ countPending() }}</span>
        </div>
        <div class="p-3 rounded-xl bg-[#111827] border border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Aprobados</span>
          <span class="text-lg font-black text-emerald-400">{{ countApproved() }}</span>
        </div>
        <div class="p-3 rounded-xl bg-[#111827] border border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Facturas</span>
          <span class="text-lg font-black text-teal-400">{{ countInvoices() }}</span>
        </div>
        <div class="p-3 rounded-xl bg-[#111827] border border-slate-800">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Recibos</span>
          <span class="text-lg font-black text-amber-400">{{ countReceipts() }}</span>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          (click)="filterStatus.set(0)"
          [class.bg-emerald-600]="filterStatus() === 0"
          [class.text-white]="filterStatus() === 0"
          [class.bg-slate-900]="filterStatus() !== 0"
          [class.text-slate-400]="filterStatus() !== 0"
          class="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold whitespace-nowrap transition-all"
        >
          Todos
        </button>
        <button
          (click)="filterStatus.set(2)"
          [class.bg-blue-600]="filterStatus() === 2"
          [class.text-white]="filterStatus() === 2"
          [class.bg-slate-900]="filterStatus() !== 2"
          [class.text-slate-400]="filterStatus() !== 2"
          class="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold whitespace-nowrap transition-all"
        >
          Pendientes ({{ countPending() }})
        </button>
        <button
          (click)="filterStatus.set(3)"
          [class.bg-emerald-600]="filterStatus() === 3"
          [class.text-white]="filterStatus() === 3"
          [class.bg-slate-900]="filterStatus() !== 3"
          [class.text-slate-400]="filterStatus() !== 3"
          class="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold whitespace-nowrap transition-all"
        >
          Aprobados
        </button>
        <button
          (click)="filterStatus.set(4)"
          [class.bg-rose-600]="filterStatus() === 4"
          [class.text-white]="filterStatus() === 4"
          [class.bg-slate-900]="filterStatus() !== 4"
          [class.text-slate-400]="filterStatus() !== 4"
          class="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold whitespace-nowrap transition-all"
        >
          Rechazados
        </button>
      </div>

      <!-- Listado de Comprobantes a Revisar -->
      @if (loading()) {
        <div class="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
          <span class="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></span>
          <span class="text-xs">Cargando bandeja contable...</span>
        </div>
      } @else if (filteredInbox().length === 0) {
        <div class="py-12 bg-[#111827] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2">
          <app-icon name="check" size="lg" extraClass="text-emerald-400" />
          <p class="text-sm font-bold text-slate-300">Bandeja al día</p>
          <p class="text-xs text-slate-500">No hay comprobantes pendientes en este filtro.</p>
        </div>
      } @else {
        <div class="space-y-3">
          @for (r of filteredInbox(); track r.id) {
            <div class="bg-[#111827] border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 shadow-lg space-y-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border"
                    [class]="r.document_type === 2 ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'"
                  >
                    {{ r.document_type === 2 ? 'Factura Fiscal' : 'Recibo' }}
                  </span>

                  <span class="text-xs text-slate-400 font-mono">{{ r.issue_date }}</span>
                </div>

                <span
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                  [class]="r.status === 2 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                           r.status === 3 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                           'bg-rose-500/10 text-rose-400 border-rose-500/20'"
                >
                  @switch (r.status) {
                    @case (2) { Por Revisar }
                    @case (3) { Aprobado }
                    @case (4) { Rechazado }
                  }
                </span>
              </div>

              <!-- Main Info -->
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="text-sm font-bold text-white">{{ r.merchant_name }}</h4>
                  <p class="text-xs text-slate-400">
                    Emisor: <strong class="text-slate-300">{{ r.submitter_name }}</strong>
                    @if (r.ncf) { · NCF: <span class="font-mono text-emerald-400">{{ r.ncf }}</span> }
                  </p>
                </div>

                <div class="text-right font-mono">
                  <div class="text-base font-extrabold text-white tabular-nums">
                    {{ r.total | money:r.currency_code }}
                  </div>
                  <div class="text-[11px] text-slate-400 tabular-nums">
                    ITBIS: {{ r.itbis | money:r.currency_code }}
                  </div>
                </div>
              </div>

              <!-- Requerimiento CS-01: Boton para Ver Captura, Recibo/Factura y Comentar -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-800">
                <span class="text-[11px] text-slate-500 font-mono">
                  RNC: {{ r.rnc || 'Sin RNC' }}
                </span>

                <button
                  type="button"
                  (click)="openInspection(r)"
                  class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
                >
                  <app-icon name="zoom-in" size="sm" />
                  <span>Ver Captura, Recibo/Factura y Comentar</span>
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal de Inspeccion Contable (Visor Zoom/Rotacion, Datos y Dictamen SoD) -->
      <app-modal
        [isOpen]="isModalOpen()"
        [title]="'Inspección Contable: ' + (activeReceipt()?.merchant_name || '')"
        (close)="isModalOpen.set(false)"
      >
        @if (activeReceipt(); as item) {
          <div class="space-y-4 text-xs">
            <!-- 1. Visor de Imagen con Zoom y Rotacion -->
            <div class="bg-black/90 rounded-2xl p-2 border border-slate-800 flex flex-col items-center">
              <div class="w-full flex items-center justify-between px-2 py-1 mb-2 border-b border-slate-800 text-slate-400">
                <span class="text-[11px] font-semibold">Comprobante Original</span>
                <div class="flex items-center gap-1">
                  <button
                    type="button"
                    (click)="rotateImage()"
                    title="Rotar 90°"
                    class="p-1 rounded hover:bg-slate-800 hover:text-white"
                  >
                    <app-icon name="rotate" size="sm" />
                  </button>
                  <button
                    type="button"
                    (click)="zoomIn()"
                    title="Zoom +"
                    class="p-1 rounded hover:bg-slate-800 hover:text-white"
                  >
                    <app-icon name="zoom-in" size="sm" />
                  </button>
                  <button
                    type="button"
                    (click)="zoomOut()"
                    title="Zoom -"
                    class="p-1 rounded hover:bg-slate-800 hover:text-white"
                  >
                    <app-icon name="zoom-out" size="sm" />
                  </button>
                </div>
              </div>

              <div class="w-full max-h-64 overflow-auto flex items-center justify-center p-2">
                @if (item.image_path) {
                  <img
                    [src]="'/api/v1/receipts/' + item.id + '/image'"
                    alt="Visor"
                    [style.transform]="'rotate(' + rotation() + 'deg) scale(' + zoom() + ')'"
                    class="max-h-56 object-contain transition-transform duration-200"
                  />
                } @else {
                  <div class="py-10 text-slate-500">Sin imagen adjunta</div>
                }
              </div>
            </div>

            <!-- 2. Detalle Fiscal Capturado -->
            <div class="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono">
              <div>
                <span class="text-slate-500 block">Tipo:</span>
                <span class="font-bold text-white">{{ item.document_type === 2 ? 'Factura Fiscal' : 'Recibo' }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Emisor:</span>
                <span class="font-bold text-white">{{ item.submitter_name }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">RNC DGII:</span>
                <span class="font-bold text-white">{{ item.rnc || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">NCF / e-CF:</span>
                <span class="font-bold text-emerald-400">{{ item.ncf || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Subtotal:</span>
                <span class="font-bold text-white">{{ item.subtotal | money:item.currency_code }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">ITBIS (18%):</span>
                <span class="font-bold text-emerald-400">{{ item.itbis | money:item.currency_code }}</span>
              </div>
              <div class="col-span-2 pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                <span class="text-slate-400">Total Comprobante:</span>
                <span class="text-emerald-400 font-extrabold">{{ item.total | money:item.currency_code }}</span>
              </div>
            </div>

            <!-- 3. Alerta de Segregacion de Funciones SoD Cuatro Ojos -->
            @if (isSodBlocked(item)) {
              <div class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <app-icon name="shield-exclamation" size="md" />
                <div>
                  <strong class="block font-bold">Bloqueo por SoD (Principio de Cuatro Ojos)</strong>
                  <span>No puedes dictaminar tus propios comprobantes. Un Super Admin debe revisar este comprobante.</span>
                </div>
              </div>
            }

            <!-- 4. Area de Comentarios Contables (Requerimiento CS-01) -->
            <div class="space-y-2">
              <label class="block text-xs font-bold text-slate-300">
                Comentarios / Observaciones Contables:
              </label>
              <textarea
                [(ngModel)]="reviewComment"
                rows="2"
                placeholder="Escribe un comentario (será visible directamente en los Gastos del empleado)..."
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
              ></textarea>
            </div>

            <!-- 5. Botones de Dictamen Contable -->
            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                (click)="dictaminar('reject')"
                [disabled]="reviewing() || isSodBlocked(item)"
                class="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all disabled:opacity-40"
              >
                Rechazar
              </button>

              <button
                type="button"
                (click)="dictaminar('approve')"
                [disabled]="reviewing() || isSodBlocked(item)"
                class="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-40"
              >
                {{ reviewing() ? 'Procesando...' : 'Aprobar Comprobante' }}
              </button>
            </div>
          </div>
        }
      </app-modal>
    </div>
  `,
})
export class AccountingComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);

  readonly inbox = signal<Receipt[]>([]);
  readonly loading = signal(true);
  readonly filterStatus = signal<number>(2); // Por revisar por defecto
  readonly exporting = signal(false);

  readonly isModalOpen = signal(false);
  readonly activeReceipt = signal<Receipt | null>(null);
  readonly zoom = signal(1);
  readonly rotation = signal(0);
  reviewComment = '';
  readonly reviewing = signal(false);

  ngOnInit(): void {
    this.loadInbox();
  }

  loadInbox(): void {
    this.loading.set(true);
    this.api.get<{ receipts: Receipt[] }>('accounting/inbox').subscribe({
      next: (res) => {
        this.inbox.set(res.receipts);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  filteredInbox(): Receipt[] {
    const list = this.inbox();
    const st = this.filterStatus();
    if (st === 0) return list;
    return list.filter((r) => r.status === st);
  }

  countPending(): number {
    return this.inbox().filter((r) => r.status === 2).length;
  }

  countApproved(): number {
    return this.inbox().filter((r) => r.status === 3).length;
  }

  countInvoices(): number {
    return this.inbox().filter((r) => r.document_type === 2).length;
  }

  countReceipts(): number {
    return this.inbox().filter((r) => r.document_type === 1).length;
  }

  isSodBlocked(receipt: Receipt): boolean {
    const user = this.auth.currentUser();
    if (!user) return true;
    if (user.activeRole.id === 3) return false; // Super Admin puede dictaminar todo
    return receipt.user_id === user.id; // Contador emisor bloqueado
  }

  openInspection(r: Receipt): void {
    this.activeReceipt.set(r);
    this.zoom.set(1);
    this.rotation.set(0);
    this.reviewComment = '';
    this.isModalOpen.set(true);
  }

  zoomIn(): void {
    this.zoom.update((z) => Math.min(z + 0.25, 2.5));
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(z - 0.25, 0.75));
  }

  rotateImage(): void {
    this.rotation.update((deg) => (deg + 90) % 360);
  }

  dictaminar(action: 'approve' | 'reject'): void {
    const item = this.activeReceipt();
    if (!item) return;

    this.reviewing.set(true);
    this.api.post(`accounting/${item.id}/review`, {
      action,
      comment: this.reviewComment,
    }).subscribe({
      next: () => {
        this.reviewing.set(false);
        this.isModalOpen.set(false);
        this.loadInbox();
      },
      error: (err) => {
        this.reviewing.set(false);
        alert('Error en dictamen: ' + (err.error?.error || err.message));
      },
    });
  }

  exportCsv(): void {
    this.exporting.set(true);
    window.open('/api/v1/accounting/export', '_blank');
    setTimeout(() => this.exporting.set(false), 1500);
  }
}
