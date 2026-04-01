import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, BehaviorSubject, interval, switchMap, takeUntil } from 'rxjs';

import {
  DashboardService,
  DadosOperacional,
  PeriodoDashboard,
  FiltroDashboard
} from '../../../services/dashboard.service';
import { DashboardKpiCardComponent } from '../kpi-card/dashboard-kpi-card.component';
import { DashboardCriticalListComponent } from '../critical-list/dashboard-critical-list.component';

const INTERVALO_POLLING = 30_000;

const OPERACIONAL_VAZIO: DadosOperacional = {
  total_hoje: 0, aguardando_triagem: 0, em_triagem: 0,
  pos_triagem: 0, em_atendimento: 0, concluidos: 0,
  abandonos: 0, tempo_medio_espera: 0,
  por_classificacao: { vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0 },
  alertas_criticos: []
};

@Component({
  selector: 'app-dashboard-info-hoje',
  templateUrl: './dashboard-info-hoje.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    DashboardKpiCardComponent,
    DashboardCriticalListComponent
  ]
})
export class DashboardInfoHojeComponent implements OnInit, OnChanges, OnDestroy {

  /** Período global selecionado no dashboard — controla expand/collapse automático */
  @Input() periodo: PeriodoDashboard | 'personalizado' = 'dia';
  @Input() filtro: FiltroDashboard = { periodo: 'dia' };

  operacional: DadosOperacional = { ...OPERACIONAL_VAZIO };
  carregando = true;
  expandido = true;

  private readonly destroy$ = new Subject<void>();
  private readonly refresh$ = new BehaviorSubject<void>(undefined);

  constructor(private dashboardService: DashboardService) {}

  get isHoje(): boolean {
    if (this.periodo !== 'dia') return false;

    // Se tiver uma data específica e NÃO for a data de hoje, não é "hoje real"
    if (this.filtro.data) {
      const hoje = new Date().toISOString().slice(0, 10);
      return this.filtro.data === hoje;
    }

    // Se estiver no período 'dia' sem data específica, assume-se que é o dia atual (nativo)
    return true;
  }

  ngOnInit(): void {
    this.expandido = this.isHoje;

    // Stream independente — sempre busca dados do dia atual (realtime)
    this.refresh$.pipe(
      switchMap(() => this.dashboardService.getOperacional({ periodo: 'dia' })),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (dados) => {
        this.operacional = dados;
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
      }
    });

    // Polling próprio — independente do filtro global
    interval(INTERVALO_POLLING).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => this.refresh$.next());
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Toda mudança de período ou filtro reaplica a regra: só expande quando for "hoje real"
    if ((changes['periodo'] || changes['filtro']) && !changes['periodo']?.firstChange) {
      this.expandido = this.isHoje;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleExpand(): void {
    this.expandido = !this.expandido;
  }

  get taxaConclusao(): number {
    return this.operacional.total_hoje > 0
      ? Math.round((this.operacional.concluidos / this.operacional.total_hoje) * 100)
      : 0;
  }
}
