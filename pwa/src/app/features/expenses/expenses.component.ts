import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { NetworkStatusService } from '../../core/services/network-status.service';
import { OfflineCacheService } from '../../core/services/offline-cache.service';
import { AppIconComponent } from '../../shared/components/app-icon/app-icon.component';
import { CurrencyInputComponent } from '../../shared/components/currency-input/currency-input.component';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { ModalComponent } from '../../shared/components/modal/modal.component';
import {
  RECEIPT_CATEGORIES,
  type Receipt,
  type ReceiptCategory,
} from '../../core/models/receipt.model';

const CATEGORY_LABELS: Record<string, string> = {
  alimentos: 'Alimentos',
  combustible: 'Combustible',
  transporte: 'Transporte',
  oficina: 'Oficina',
  servicios: 'Servicios',
  otros: 'Otros',
};

@Component({
  selector: 'app-expenses',
  standalone: true,
  imports: [RouterLink, FormsModule, AppIconComponent, CurrencyInputComponent, MoneyPipe, ModalComponent],
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

      <!-- Resumen del Mes y Desglose por Categoría (RF-25) -->
      <div class="bg-[#111827] border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Resumen Mensual ({{ currentMonthLabel() }}) — Confirmados
            </span>
            <span class="text-2xl font-black text-emerald-400 font-mono tabular-nums">
              {{ monthlyConfirmedTotal() | money:'DOP' }}
            </span>
          </div>
          <div class="text-right text-[11px] text-slate-400">
            <div><strong class="text-white">{{ monthlyConfirmedCount() }}</strong> comprobantes aprobados</div>
            <div>{{ monthlyPendingTotal() | money:'DOP' }} en revisión</div>
          </div>
        </div>

        @if (monthlyByCategory().length > 0) {
          <div class="space-y-1.5 pt-2 border-t border-slate-800/80">
            @for (row of monthlyByCategory(); track row.category) {
              <div class="space-y-1">
                <div class="flex items-center justify-between text-[11px]">
                  <span class="text-slate-300 font-semibold">{{ getCategoryLabel(row.category) }}</span>
                  <span class="font-mono text-slate-200 tabular-nums">
                    {{ row.amount | money:'DOP' }} ({{ row.percent.toFixed(0) }}%)
                  </span>
                </div>
                <div class="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    class="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                    [style.width.%]="row.percent"
                  ></div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Buscador y Filtros Combinables (RF-23) -->
      <div class="bg-[#111827] border border-slate-800 rounded-2xl p-3 space-y-2.5">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            [ngModel]="searchQuery()"
            (ngModelChange)="searchQuery.set($event)"
            placeholder="Buscar comercio, RNC o NCF..."
            class="sm:col-span-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
          <select
            [ngModel]="filterCategory()"
            (ngModelChange)="filterCategory.set($event)"
            class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="">Todas las categorías</option>
            @for (cat of categories; track cat.value) {
              <option [value]="cat.value">{{ cat.label }}</option>
            }
          </select>
          <select
            [ngModel]="filterStatus()"
            (ngModelChange)="filterStatus.set($event)"
            class="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
          >
            <option [ngValue]="0">Todos los estados</option>
            <option [ngValue]="1">Borrador</option>
            <option [ngValue]="2">Enviado</option>
            <option [ngValue]="3">Aprobado</option>
            <option [ngValue]="4">Rechazado</option>
          </select>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center text-[11px]">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500">Desde:</span>
            <input
              type="date"
              [ngModel]="fromDate()"
              (ngModelChange)="fromDate.set($event)"
              class="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500">Hasta:</span>
            <input
              type="date"
              [ngModel]="toDate()"
              (ngModelChange)="toDate.set($event)"
              class="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div class="col-span-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              (click)="setFilter('ALL')"
              [class.bg-emerald-600]="activeFilter() === 'ALL'"
              [class.text-white]="activeFilter() === 'ALL'"
              [class.bg-slate-900]="activeFilter() !== 'ALL'"
              [class.text-slate-400]="activeFilter() !== 'ALL'"
              class="px-2.5 py-1 rounded-lg border border-slate-800 font-semibold transition-all"
            >
              Todos
            </button>
            <button
              type="button"
              (click)="setFilter('FACTURA')"
              [class.bg-emerald-600]="activeFilter() === 'FACTURA'"
              [class.text-white]="activeFilter() === 'FACTURA'"
              [class.bg-slate-900]="activeFilter() !== 'FACTURA'"
              [class.text-slate-400]="activeFilter() !== 'FACTURA'"
              class="px-2.5 py-1 rounded-lg border border-slate-800 font-semibold transition-all"
            >
              Facturas
            </button>
            <button
              type="button"
              (click)="setFilter('RECIBO')"
              [class.bg-emerald-600]="activeFilter() === 'RECIBO'"
              [class.text-white]="activeFilter() === 'RECIBO'"
              [class.bg-slate-900]="activeFilter() !== 'RECIBO'"
              [class.text-slate-400]="activeFilter() !== 'RECIBO'"
              class="px-2.5 py-1 rounded-lg border border-slate-800 font-semibold transition-all"
            >
              Recibos
            </button>
            @if (searchQuery() || filterCategory() || filterStatus() !== 0 || fromDate() || toDate() || activeFilter() !== 'ALL') {
              <button
                type="button"
                (click)="clearFilters()"
                class="px-2 py-1 rounded-lg text-rose-400 hover:bg-rose-500/10 font-semibold"
              >
                Limpiar
              </button>
            }
          </div>
        </div>
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

              <!-- Main Row: Miniatura + Comercio e Importes (RF-22) -->
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-start gap-3 min-w-0">
                  @if (r.image_url) {
                    <img
                      [src]="r.image_url"
                      alt="Miniatura"
                      (click)="openDetail(r)"
                      class="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-900 shrink-0 cursor-pointer hover:opacity-90"
                    />
                  } @else {
                    <div class="w-12 h-12 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center text-slate-600 shrink-0">
                      <app-icon name="receipt" size="sm" />
                    </div>
                  }

                  <div class="min-w-0">
                    <h4 class="text-sm font-bold text-white truncate">{{ r.merchant_name }}</h4>
                    <div class="flex flex-wrap items-center gap-1.5 mt-1">
                      <span class="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                        {{ getCategoryLabel(r.category) }}
                      </span>
                      <span class="text-[11px] text-slate-400 font-mono">
                        @if (r.ncf) { NCF: {{ r.ncf }} }
                        @if (r.rnc) { · RNC: {{ r.rnc }} }
                      </span>
                    </div>
                  </div>
                </div>

                <div class="text-right shrink-0">
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
              <div class="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs gap-2">
                @if (r.status === 1) {
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      (click)="submitDirectly(r.id)"
                      class="text-emerald-400 hover:text-emerald-300 font-bold"
                    >
                      Enviar →
                    </button>
                    <button
                      type="button"
                      (click)="openEdit(r)"
                      class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Editar borrador"
                    >
                      <app-icon name="pencil" size="xs" />
                    </button>
                    <button
                      type="button"
                      (click)="confirmDelete(r)"
                      class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                      title="Eliminar gasto e imagen"
                    >
                      <app-icon name="trash" size="xs" />
                    </button>
                  </div>
                } @else {
                  <span class="text-slate-500">
                    Revisor: {{ r.reviewer_name || 'Pendiente' }}
                  </span>
                }

                <button
                  type="button"
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
            <!-- Imagen ampliable si existe (RF-24) -->
            @if (item.image_url || item.image_path) {
              <div class="rounded-xl overflow-hidden border border-slate-800 bg-black p-2 space-y-2">
                <div class="flex items-center justify-between text-slate-400 px-1">
                  <span class="text-[11px]">Comprobante adjunto</span>
                  <div class="flex items-center gap-1">
                    <button type="button" (click)="detailZoomOut()" class="p-1 rounded hover:bg-slate-800 hover:text-white" title="Zoom -">
                      <app-icon name="zoom-out" size="xs" />
                    </button>
                    <button type="button" (click)="detailZoomIn()" class="p-1 rounded hover:bg-slate-800 hover:text-white" title="Zoom +">
                      <app-icon name="zoom-in" size="xs" />
                    </button>
                  </div>
                </div>
                <div class="max-h-56 overflow-auto flex items-center justify-center">
                  <img
                    [src]="item.image_url || ('/api/v1/receipts/' + item.id + '/image')"
                    alt="Recibo"
                    [style.transform]="'scale(' + detailZoom() + ')'"
                    class="max-h-52 object-contain transition-transform duration-150"
                  />
                </div>
              </div>
            }

            <div class="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono">
              <div>
                <span class="text-slate-500 block">Tipo Documento:</span>
                <span class="text-white font-bold">{{ item.document_type === 2 ? 'Factura Fiscal' : 'Recibo' }}</span>
              </div>
              <div>
                <span class="text-slate-500 block">Categoría:</span>
                <span class="text-teal-300 font-bold">{{ getCategoryLabel(item.category) }}</span>
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
      <!-- Modal de Edición de Borrador (RF-21) -->
      <app-modal
        [isOpen]="isEditModalOpen()"
        [title]="'Editar Borrador: ' + (editingReceipt()?.merchant_name || '')"
        (close)="isEditModalOpen.set(false)"
      >
        @if (editingReceipt()) {
          <div class="space-y-3 text-xs">
            <div>
              <label class="block text-slate-400 font-semibold mb-1">Comercio / Proveedor</label>
              <input
                type="text"
                [(ngModel)]="editMerchant"
                class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-400 font-semibold mb-1">Categoría</label>
                <select
                  [(ngModel)]="editCategory"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                >
                  @for (cat of categories; track cat.value) {
                    <option [value]="cat.value">{{ cat.label }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="block text-slate-400 font-semibold mb-1">Fecha</label>
                <input
                  type="date"
                  [(ngModel)]="editDate"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-400 font-semibold mb-1">RNC</label>
                <input
                  type="text"
                  [(ngModel)]="editRnc"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label class="block text-slate-400 font-semibold mb-1">NCF</label>
                <input
                  type="text"
                  [(ngModel)]="editNcf"
                  class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <app-currency-input label="Subtotal" [currency]="editCurrency" [(ngModel)]="editSubtotal" />
              <app-currency-input label="ITBIS" [currency]="editCurrency" [(ngModel)]="editItbis" />
              <app-currency-input label="Total" [currency]="editCurrency" [(ngModel)]="editTotal" />
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                (click)="isEditModalOpen.set(false)"
                class="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="saveEdit()"
                [disabled]="savingEdit()"
                class="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                {{ savingEdit() ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
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

  readonly categories = RECEIPT_CATEGORIES;
  readonly receipts = signal<Receipt[]>([]);
  readonly loading = signal(true);
  readonly activeFilter = signal<'ALL' | 'FACTURA' | 'RECIBO' | 'APROBADO'>('ALL');
  readonly searchQuery = signal('');
  readonly filterCategory = signal('');
  readonly filterStatus = signal<number>(0);
  readonly fromDate = signal('');
  readonly toDate = signal('');

  readonly isModalOpen = signal(false);
  readonly selectedReceipt = signal<Receipt | null>(null);
  readonly detailZoom = signal(1);

  readonly isEditModalOpen = signal(false);
  readonly editingReceipt = signal<Receipt | null>(null);
  readonly savingEdit = signal(false);
  editMerchant = '';
  editCategory: ReceiptCategory = 'otros';
  editDate = '';
  editRnc = '';
  editNcf = '';
  editCurrency = 'DOP';
  editSubtotal = 0;
  editItbis = 0;
  editTotal = 0;

  readonly currentMonthPrefix = new Date().toISOString().substring(0, 7);
  readonly currentMonthLabel = computed(() => {
    const now = new Date();
    return now.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
  });

  readonly monthlyConfirmedReceipts = computed(() =>
    this.receipts().filter(
      (r) => r.status === 3 && (r.issue_date || '').startsWith(this.currentMonthPrefix)
    )
  );

  readonly monthlyConfirmedCount = computed(() => this.monthlyConfirmedReceipts().length);

  readonly monthlyConfirmedTotal = computed(() =>
    this.monthlyConfirmedReceipts().reduce((acc, r) => acc + Number(r.total || 0), 0)
  );

  readonly monthlyPendingTotal = computed(() =>
    this.receipts()
      .filter((r) => r.status === 2 && (r.issue_date || '').startsWith(this.currentMonthPrefix))
      .reduce((acc, r) => acc + Number(r.total || 0), 0)
  );

  readonly monthlyByCategory = computed(() => {
    const total = this.monthlyConfirmedTotal();
    if (total <= 0) return [];
    const grouped = new Map<string, number>();
    for (const r of this.monthlyConfirmedReceipts()) {
      const cat = r.category || 'otros';
      grouped.set(cat, (grouped.get(cat) || 0) + Number(r.total || 0));
    }
    return Array.from(grouped.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percent: Math.min(100, (amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  ngOnInit(): void {
    this.loadReceipts();
  }

  getCategoryLabel(cat?: string | null): string {
    return CATEGORY_LABELS[cat || 'otros'] || 'Otros';
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
        const sorted = [...res.receipts].sort((a, b) =>
          String(b.issue_date || b.created_at).localeCompare(String(a.issue_date || a.created_at))
        );
        this.receipts.set(sorted);
        this.offlineCache.saveReceipts(sorted);
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

  clearFilters(): void {
    this.activeFilter.set('ALL');
    this.searchQuery.set('');
    this.filterCategory.set('');
    this.filterStatus.set(0);
    this.fromDate.set('');
    this.toDate.set('');
  }

  filteredReceipts(): Receipt[] {
    let list = this.receipts();

    switch (this.activeFilter()) {
      case 'FACTURA':
        list = list.filter((r) => r.document_type === 2);
        break;
      case 'RECIBO':
        list = list.filter((r) => r.document_type === 1);
        break;
      case 'APROBADO':
        list = list.filter((r) => r.status === 3);
        break;
    }

    const st = this.filterStatus();
    if (st !== 0) {
      list = list.filter((r) => r.status === st);
    }

    const cat = this.filterCategory();
    if (cat) {
      list = list.filter((r) => (r.category || 'otros') === cat);
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.merchant_name || '').toLowerCase().includes(q) ||
          (r.rnc || '').toLowerCase().includes(q) ||
          (r.ncf || '').toLowerCase().includes(q)
      );
    }

    const from = this.fromDate();
    if (from) {
      list = list.filter((r) => String(r.issue_date).substring(0, 10) >= from);
    }

    const to = this.toDate();
    if (to) {
      list = list.filter((r) => String(r.issue_date).substring(0, 10) <= to);
    }

    return list;
  }

  submitDirectly(receiptId: string): void {
    this.api.post(`receipts/${receiptId}/submit`, {}).subscribe({
      next: () => this.loadReceipts(),
    });
  }

  openDetail(r: Receipt): void {
    this.detailZoom.set(1);
    this.api.get<{ receipt: Receipt }>(`receipts/${r.id}`).subscribe({
      next: (res) => {
        this.selectedReceipt.set(res.receipt);
        this.isModalOpen.set(true);
      },
    });
  }

  detailZoomIn(): void {
    this.detailZoom.update((z) => Math.min(z + 0.25, 2.5));
  }

  detailZoomOut(): void {
    this.detailZoom.update((z) => Math.max(z - 0.25, 0.75));
  }

  openEdit(r: Receipt): void {
    this.editingReceipt.set(r);
    this.editMerchant = r.merchant_name;
    this.editCategory = (r.category as ReceiptCategory) || 'otros';
    this.editDate = String(r.issue_date).substring(0, 10);
    this.editRnc = r.rnc || '';
    this.editNcf = r.ncf || '';
    this.editCurrency = r.currency_code || 'DOP';
    this.editSubtotal = Number(r.subtotal || 0);
    this.editItbis = Number(r.itbis || 0);
    this.editTotal = Number(r.total || 0);
    this.isEditModalOpen.set(true);
  }

  saveEdit(): void {
    const target = this.editingReceipt();
    if (!target) return;
    this.savingEdit.set(true);

    this.api
      .put(`receipts/${target.id}`, {
        merchant_name: this.editMerchant,
        category: this.editCategory,
        issue_date: this.editDate,
        rnc: this.editRnc || null,
        ncf: this.editNcf || null,
        currency_code: this.editCurrency,
        subtotal: this.editSubtotal,
        itbis: this.editItbis,
        total: this.editTotal,
      })
      .subscribe({
        next: () => {
          this.savingEdit.set(false);
          this.isEditModalOpen.set(false);
          this.loadReceipts();
        },
        error: (err) => {
          this.savingEdit.set(false);
          alert('No se pudo actualizar: ' + (err.error?.error || err.message));
        },
      });
  }

  confirmDelete(r: Receipt): void {
    const ok = confirm(`¿Seguro que deseas eliminar el borrador "${r.merchant_name}" y su imagen adjunta? Esta acción no se puede deshacer.`);
    if (!ok) return;

    this.api.delete(`receipts/${r.id}`).subscribe({
      next: () => this.loadReceipts(),
      error: (err) => alert('No se pudo eliminar: ' + (err.error?.error || err.message)),
    });
  }
}
