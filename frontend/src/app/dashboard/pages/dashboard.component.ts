import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject, interval, takeUntil, catchError, of } from 'rxjs';

import {
  DashboardService,
  DadosDashboard,
  DadosOperacional,
  AtendimentoHora,
  MedicoProdutividade
} from '../../services/dashboard.service';

import { DashboardKpiCardComponent } from '../components/kpi-card/dashboard-kpi-card.component';
import { DashboardRiskChartComponent } from '../components/risk-chart/dashboard-risk-chart.component';
import { DashboardFlowChartComponent } from '../components/flow-chart/dashboard-flow-chart.component';
import { DashboardDoctorsTableComponent } from '../components/doctors-table/dashboard-doctors-table.component';
import { DashboardCriticalListComponent } from '../components/critical-list/dashboard-critical-list.component';

const INTERVALO_POLLING = 30_000;

const OPERACIONAL_VAZIO: DadosOperacional = {
  total_hoje: 0, aguardando_triagem: 0, em_triagem: 0,
  pos_triagem: 0, em_atendimento: 0, concluidos: 0,
  abandonos: 0, tempo_medio_espera: 0,
  por_classificacao: { vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0 },
  alertas_criticos: []
};

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    DashboardKpiCardComponent,
    DashboardRiskChartComponent,
    DashboardFlowChartComponent,
    DashboardDoctorsTableComponent,
    DashboardCriticalListComponent
  ]
})
export class DashboardComponent implements OnInit, OnDestroy {
  operacional: DadosOperacional = { ...OPERACIONAL_VAZIO };
  porHora: AtendimentoHora[] = [];
  medicos: MedicoProdutividade[] = [];

  horaAtualizacao = new Date();
  carregando = true;
  erro = false;

  // Filtros (preparados para expansão futura)
  filtroData = '';  // '' = hoje

  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregar();
    interval(INTERVALO_POLLING)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.carregar());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregar(): void {
    this.dashboardService.getTudo()
      .pipe(
        catchError(() => {
          this.erro = true;
          this.carregando = false;
          this.snackBar.open('Erro ao atualizar o dashboard.', 'Fechar', { duration: 4000 });
          return of<DadosDashboard>({
            operacional: { ...OPERACIONAL_VAZIO },
            por_hora: [],
            medicos: []
          });
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((dados) => {
        this.operacional = dados.operacional;
        this.porHora     = dados.por_hora;
        this.medicos     = dados.medicos;
        this.horaAtualizacao = new Date();
        this.carregando = false;
        this.erro = false;
      });
  }

  get taxaConclusao(): number {
    return this.operacional.total_hoje > 0
      ? Math.round((this.operacional.concluidos / this.operacional.total_hoje) * 100)
      : 0;
  }
}
