import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, interval, takeUntil, filter, pairwise, startWith } from 'rxjs';

import {
  DashboardService,
  DadosDashboard,
  DadosOperacional,
  AtendimentoHora,
  MedicoProdutividade,
  FiltroDashboard,
  PeriodoDashboard
} from '../../services/dashboard.service';

import { DashboardKpiCardComponent } from '../components/kpi-card/dashboard-kpi-card.component';
import { DashboardRiskChartComponent } from '../components/risk-chart/dashboard-risk-chart.component';
import { DashboardFlowChartComponent } from '../components/flow-chart/dashboard-flow-chart.component';
import { DashboardDoctorsTableComponent } from '../components/doctors-table/dashboard-doctors-table.component';
import { DashboardCriticalListComponent } from '../components/critical-list/dashboard-critical-list.component';
import { DoctorProductivityDialogComponent } from '../components/doctor-productivity-dialog/doctor-productivity-dialog.component';

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
    MatDialogModule,
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

  readonly periodos: { valor: PeriodoDashboard | 'personalizado'; label: string }[] = [
    { valor: 'dia',          label: 'Hoje'         },
    { valor: 'semana',       label: 'Semana'       },
    { valor: 'mes',          label: 'Mês'          },
    { valor: 'ano',          label: 'Ano'          },
    { valor: 'personalizado', label: 'Personalizado' },
  ];
  periodoSelecionado: PeriodoDashboard | 'personalizado' = 'dia';

  // Intervalo personalizado
  dataInicio = '';
  dataFim    = '';
  dataMaxima = new Date().toISOString().slice(0, 10);

  private readonly destroy$ = new Subject<void>();
  public filtro: FiltroDashboard = { periodo: 'dia' };

  constructor(
    private dashboardService: DashboardService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Inicializa o filtro com o período padrão 'dia'
    this.filtro = { periodo: 'dia' };
    this._carregarStream();

    // Ao voltar para /dashboard vindo de outra rota, reseta o filtro para "Hoje"
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      pairwise(),
      takeUntil(this.destroy$)
    ).subscribe(([prev, curr]) => {
      if (prev !== null) {
        // O usuário navegou de volta ao dashboard — reseta para "Hoje"
        this._resetarParaHoje();
      }
    });

    // Polling só no período "dia" (dados em tempo real)
    interval(INTERVALO_POLLING)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.periodoSelecionado === 'dia') {
          this.dashboardService.refreshDashboard(this.filtro);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  abrirDetalhesMedico(medico: MedicoProdutividade): void {
    this.dialog.open(DoctorProductivityDialogComponent, {
      data: {
        modo: 'medico',
        medico,
        filtro: this.filtro
      },
      width: '850px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-container'
    });
  }

  selecionarPeriodo(periodo: PeriodoDashboard | 'personalizado'): void {
    if (this.periodoSelecionado === periodo) return;
    this.periodoSelecionado = periodo;
    // Modo personalizado não carrega até o usuário aplicar o intervalo
    if (periodo === 'personalizado') return;
    this.filtro = { periodo };
    this.carregando = true;
    this.dashboardService.refreshDashboard(this.filtro);
  }

  aplicarPersonalizado(): void {
    if (!this.dataInicio || !this.dataFim) return;
    this.filtro = { dataInicio: this.dataInicio, dataFim: this.dataFim };
    this.carregando = true;
    this.dashboardService.refreshDashboard(this.filtro);
  }

  refreshManual(): void {
    this.carregando = true;
    this.dashboardService.refreshDashboard(this.filtro);
  }

  private _resetarParaHoje(): void {
    this.periodoSelecionado = 'dia';
    this.dataInicio = '';
    this.dataFim = '';
    this.filtro = { periodo: 'dia' };
    this.carregando = true;
    this.dashboardService.refreshDashboard(this.filtro);
  }

  private _carregarStream(): void {
    this.dashboardService.getDashboardStream()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next:  (dados) => this.aplicarDados(dados),
        error: ()      => this.tratarErro()
      });
  }

  get tituloGraficoHora(): string {
    const labels: Record<PeriodoDashboard | 'personalizado', string> = {
      dia:          'Atendimentos por Hora (hoje)',
      semana:       'Atendimentos por Dia (semana)',
      mes:          'Atendimentos por Dia (mês)',
      ano:          'Atendimentos por Mês (ano)',
      personalizado:'Atendimentos por Dia (período selecionado)',
    };
    return labels[this.periodoSelecionado];
  }

  private aplicarDados(dados: DadosDashboard): void {
    this.operacional     = dados.operacional;
    this.porHora         = dados.por_hora;
    this.medicos         = dados.medicos;
    this.horaAtualizacao = new Date();
    this.carregando      = false;
    this.erro            = false;
  }

  private tratarErro(): void {
    this.erro = true;
    this.carregando = false;
    this.snackBar.open('Erro ao atualizar o dashboard.', 'Fechar', { duration: 4000 });
  }

  get taxaConclusao(): number {
    return this.operacional.total_hoje > 0
      ? Math.round((this.operacional.concluidos / this.operacional.total_hoje) * 100)
      : 0;
  }
}
