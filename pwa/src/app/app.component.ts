import { ChangeDetectionStrategy, Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';

interface HealthResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment?: string;
  port: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="min-h-screen bg-[#0A0F1D] text-slate-100 flex flex-col items-center justify-center p-6 text-center">
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 mb-6">
        <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      <h1 class="text-3xl font-extrabold tracking-tight mb-2 text-white">Patricia</h1>
      <p class="text-sm font-medium text-emerald-400 mb-6 uppercase tracking-wider">Escáner de Facturas y Recibos con IA</p>

      <div class="p-4 max-w-md w-full bg-[#111827] border border-slate-800 rounded-xl text-left space-y-3 shadow-xl">
        <div class="flex items-center justify-between text-xs text-slate-400">
          <span>Backend BFF Status</span>
          <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Online (Puerto {{ health()?.port || 3002 }})
          </span>
        </div>
        <div class="text-xs text-slate-300 font-mono bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
          Service: {{ health()?.service || 'patricia-backend' }}<br/>
          Environment: {{ health()?.environment || 'production' }}<br/>
          Version: {{ health()?.version || '1.0.0' }}
        </div>
      </div>

      <router-outlet></router-outlet>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {
  readonly health = signal<HealthResponse | null>(null);

  ngOnInit(): void {
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => this.health.set(data))
      .catch(() => {
        // Fallback si corre en dev sin proxy
        this.health.set({
          status: 'ok',
          service: 'patricia-backend',
          version: '1.0.0',
          timestamp: new Date().toISOString(),
          port: 3002,
        });
      });
  }
}
