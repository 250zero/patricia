import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { OfflineCacheService } from '../../core/services/offline-cache.service';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import type { Receipt } from '../../core/models/receipt.model';

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [RouterLink, AppIconComponent, MoneyPipe, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-extrabold text-white">Mis Gastos</h2>
          <p class="text-xs text-slate-400">Historial de comprobantes y dictámenes contables</p>
        </div>

        <a
          routerLink="/capture"
          class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
        >
          <app-icon name="camera" size="sm" />
          <span>Nuevo</span>
        </a>
      </div>

      <!-- Filtros Rapidos -->
      <div class="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          (click)="setFilter('ALL')"
          [class.bg-emerald-600]="activeFilter() === 'ALL'"
          [class.text-white]="activeFilter() === 'ALL'"
          [class.bg-slate-900]="activeFilter() !== 'ALL'"
          [class.text-slate-400]="activeFilter() !== 'ALL'"
          class="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold whitespace-nowrap transition-all"
        >
          Todos ({{ receipts().length }})
        </button>

        <button
          (click)="setFilter('FACTURA')"
          [class.bg-emerald-600]="activeFilter() === 'FACTURA'"
          [class.text-white]="activeFilter() === 'FACTURA'"
          [class.bg-slate-900]="activeFilter() !== 'FACTURA'"
          [class.text-slate-400]="activeFilter() !== 'FACTURA'"
          class="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold whitespace-nowrap transition-all"
        >
          Facturas
        </button>

        <button
          (click)="setFilter('RECIBO')"
          [class.bg-emerald-600]="activeFilter() === 'RECIBO'"
          [class.text-white]="activeFilter() === 'RECIBO'"
          [class.bg-slate-900]="activeFilter() !== 'RECIBO'"
          [class.text-slate-400]="activeFilter() !== 'RECIBO'"
          class="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold whitespace-nowrap transition-all"
        >
          Recibos
        </button>

        <button
          (click)="setFilter('APROBADO')"
          [class.bg-emerald-600]="activeFilter() === 'APROBADO'"
          [class.text-white]="activeFilter() === 'APROBADO'"
          [class.bg-slate-900]="activeFilter() !== 'APROBADO'"
          [class.text-slate-400]="activeFilter() !== 'APROBADO'"
          class="px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-semibold whitespace-nowrap transition-all"
        >
          Aprobados
        </button>
      </div>

      <!-- Listado de Comprobantes -->
      @if (loading()) {
        <div class="py-12 flex flex-col items-center justify-center text-slate-500 space-y-2">
          <span class="w-6 h-6 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></span>
          <span class="text-xs">Cargando comprobantes...</span>
        </div>
      } @else if (filteredReceipts().length === 0) {
        <div class="py-12 bg-[#111827] border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
          <div class="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
            <app-icon name="receipt" size="lg" />
          </div>
          <p class="text-sm font-bold text-slate-300">No hay comprobantes en esta vista</p>
          <p class="text-xs text-slate-500 max-w-xs">Comienza tomando una foto o cargando una factura para enviarla a revisión.</p>
          <a routerLink="/capture" class="text-xs font-bold text-emerald-400 hover:underline">Escanear primer comprobante</a>
        </div>
      } @else {
        <div class="space-y-3">
          @for (r of filteredReceipts(); track r.id) {
            <div class="bg-[#111827] border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 shadow-lg transition-all space-y-3">
              <!-- Top Row: Tipo, Fecha y Estado -->
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

                <!-- Badge Estado -->
                <span
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                  [class]="r.status === 1 ? 'bg-slate-800 text-slate-400 border-slate-700' :
                           r.status === 2 ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                           r.status === 3 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                           'bg-rose-500/10 text-rose-400 border-rose-500/20'"
                >
                  @switch (r.status) {
                    @case (1) { Borrador }
                    @case (2) { Enviado }
                    @case (3) { Aprobado }
                    @case (4) { Rechazado }
                  }
                </span>
              </div>

              <!-- Main Row: Comercio e Importes -->
              <div class="flex items-start justify-between">
                <div>
                  <h4 class="text-sm font-bold text-white">{{ r.merchant_name }}</h4>
                  <p class="text-xs text-slate-400 font-mono mt-0.5">
                    @if (r.ncf) { NCF: {{ r.ncf }} }
                    @if (r.rnc) { · RNC: {{ r.rnc }} }
                  </p>
                </div>

                <div class="text-right">
                  <div class="text-base font-extrabold text-white font-mono tabular-nums">
                    {{ r.total | money:r.currency_code }}
                  </div>
                  <div class="text-[11px] text-slate-400 font-mono tabular-nums">
                    ITBIS: {{ r.itbis | money:r.currency_code }}
                  </div>
                </div>
              </div>

              <!-- Comentario / Nota Contable Destacada (Requerimiento CS-01) -->
              @if (r.latest_accounting_note) {
                <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs space-y-1">
                  <div class="flex items-center gap-1.5 font-bold">
                    <app-icon name="chat-bubble" size="xs" />
                    <span>Nota de Contabilidad:</span>
                  </div>
                  <p class="text-slate-200 pl-4">{{ r.latest_accounting_note }}</p>
                </div>
              }

              <!-- Bottom Actions -->
              <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                @if (r.status === 1) {
                  <button
                    (click)="submitDirectly(r.id)"
                    class="text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    Enviar a Contabilidad →
                  </button>
                } @else {
                  <span class="text-slate-500">
                    Revisor: {{ r.reviewer_name || 'Pendiente' }}
                  </span>
                }

                <button
                  (click)="openDetail(r)"
                  class="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Ver Detalle
                </button>
              </div>
            </div>
          }
        </div>
      }

      <!-- Modal de Detalle de Comprobante -->
      <app-modal
        [isOpen]="isModalOpen()"
        [title]="selectedReceipt()?.merchant_name || 'Detalle de Comprobante'"
        (close)="isModalOpen.set(false)"
      >
        @if (selectedReceipt(); as item) {
          <div class="space-y-4 text-xs">
            <!-- Imagen si existe -->
            @if (item.image_path) {
              <div class="rounded-xl overflow-hidden border border-slate-800 bg-black max-h-56 flex items-center justify-center">
                <img
                  [src]="'/api/v1/receipts/' + item.id + '/image'"
                  alt="Recibo"
                  class="max-h-56 object-contain"
                />
              </div>
            }

            <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono">
              <div>
                <span class="text-slate-500 block">Tipo Documento:</span>
                <span class="text-white font-bold">{{ item.document_type === 2 ? 'Factura Fiscal' : 'Recibo' }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Fecha:</span>
                <span class="text-white font-bold">{{ item.issue_date }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">RNC:</span>
                <span class="text-white font-bold">{{ item.rnc || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">NCF:</span>
                <span class="text-white font-bold">{{ item.ncf || 'N/A' }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Subtotal:</span>
                <span class="text-white font-bold">{{ item.subtotal | money:item.currency_code }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">ITBIS (18%):</span>
                <span class="text-emerald-400 font-bold">{{ item.itbis | money:item.currency_code }}</span>
              </div>
              <div class="col-span-2 pt-2 border-t border-slate-800 flex justify-between items-center text-sm">
                <span class="text-slate-400">Total General:</span>
                <span class="text-emerald-400 font-extrabold">{{ item.total | money:item.currency_code }}</span>
              </div>
            </div>

            <!-- Historial de Comentarios -->
            @if (item.comments && item.comments.length > 0) {
              <div class="space-y-2 pt-2 border-t border-slate-800">
                <h5 class="font-bold text-slate-300">Observaciones y Notas Contables:</h5>
                @for (c of item.comments; track c.id) {
                  <div class="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                    <div class="flex items-center justify-between text-[11px] text-slate-400">
                      <span class="font-bold text-white">{{ c.author_name }}</span>
                      <span class="font-mono text-[10px]">{{ c.created_at.substring(0, 10) }}</span>
                    </div>
                    <p class="text-slate-300">{{ c.comment }}</p>
                  </div>
                }
              </div>
            }
          </div>
        }
      </app-modal>
    </div>
  `,
})
export class ExpensesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly network = inject(NetworkStatusService);
  private readonly offlineCache = inject(OfflineCacheService);

  readonly receipts = signal<Receipt[]>([]);
  readonly loading = signal(true);
  readonly activeFilter = signal<'ALL' | 'FACTURA' | 'RECIBO' | 'APROBADO'>('ALL');

  readonly isModalOpen = signal(false);
  readonly selectedReceipt = signal<Receipt | null>(null);

  ngOnInit(): void {
    this.loadReceipts();
  }

  loadReceipts(): void {
    this.loading.set(true);

    if (!this.network.isOnline()) {
      this.offlineCache.getReceipts().then((cached) => {
        if (cached && cached.length > 0) {
          this.receipts.set(cached as unknown as Receipt[]);
        }
        this.loading.set(false);
      });
      return;
    }

    this.api.get<{ receipts: Receipt[] }>('receipts').subscribe({
      next: (res) => {
        this.receipts.set(res.receipts);
        this.offlineCache.saveReceipts(res.receipts);
        this.loading.set(false);
      },
      error: async () => {
        const cached = await this.offlineCache.getReceipts();
        if (cached && cached.length > 0) {
          this.receipts.set(cached as unknown as Receipt[]);
        }
        this.loading.set(false);
      },
    });
  }

  setFilter(filter: 'ALL' | 'FACTURA' | 'RECIBO' | 'APROBADO'): void {
    this.activeFilter.set(filter);
  }

  filteredReceipts(): Receipt[] {
    const list = this.receipts();
    switch (this.activeFilter()) {
      case 'FACTURA':
        return list.filter((r) => r.document_type === 2);
      case 'RECIBO':
        return list.filter((r) => r.document_type === 1);
      case 'APROBADO':
        return list.filter((r) => r.status === 3);
      default:
        return list;
    }
  }

  submitDirectly(receiptId: string): void {
    this.api.post(`receipts/${receiptId}/submit`, {}).subscribe({
      next: () => this.loadReceipts(),
    });
  }

  openDetail(r: Receipt): void {
    this.api.get<{ receipt: Receipt }>(`receipts/${r.id}`).subscribe({
      next: (res) => {
        this.selectedReceipt.set(res.receipt);
        this.isModalOpen.set(true);
      },
    });
  }
}
