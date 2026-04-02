import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter, pairwise, startWith } from 'rxjs';

import {
  DashboardService,
  DadosDashboard,
  DadosOperacional,
  AtendimentoHora,
  MedicoProdutividade,
  FiltroDashboard,
  PeriodoDashboard
} from '../../services/dashboard.service';

import { DashboardInfoHojeComponent } from '../components/info-hoje/dashboard-info-hoje.component';
import { DashboardRiskChartComponent } from '../components/risk-chart/dashboard-risk-chart.component';
import { DashboardFlowChartComponent } from '../components/flow-chart/dashboard-flow-chart.component';
import { DashboardDoctorsTableComponent } from '../components/doctors-table/dashboard-doctors-table.component';
import { DoctorProductivityDialogComponent } from '../components/doctor-productivity-dialog/doctor-productivity-dialog.component';
import { DashboardAtendimentosTableComponent } from '../components/atendimentos-table/dashboard-atendimentos-table.component';

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
    DashboardInfoHojeComponent,
    DashboardRiskChartComponent,
    DashboardFlowChartComponent,
    DashboardDoctorsTableComponent,
    DashboardAtendimentosTableComponent
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
    // Tenta recuperar filtro salvo da sessão (para persistir no reload)
    const filtroSalvo = sessionStorage.getItem('dashboard_filtro');
    const periodoSalvo = sessionStorage.getItem('dashboard_periodo');

    if (filtroSalvo && periodoSalvo) {
      this.filtro = JSON.parse(filtroSalvo);
      this.periodoSelecionado = periodoSalvo as PeriodoDashboard | 'personalizado';

      // Restaura datas se for personalizado
      if (this.filtro.dataInicio) this.dataInicio = this.filtro.dataInicio;
      if (this.filtro.dataFim) this.dataFim = this.filtro.dataFim;

      // Sincroniza o service com o filtro recuperado
      this.dashboardService.refreshDashboard(this.filtro);
    } else {
      this.filtro = { periodo: 'dia' };
      this.periodoSelecionado = 'dia';
    }

    this._carregarStream();

    // Ao voltar para /dashboard vindo de outra rota, reseta o filtro para "Hoje"
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      startWith(null),
      pairwise(),
      takeUntil(this.destroy$)
    ).subscribe(([prev, curr]) => {
      // Se prev for null, é o primeiro carregamento da aplicação ou um RELOAD.
      // Se prev NÃO for null, o usuário navegou de outra rota para cá.
      if (prev !== null) {
        // O usuário navegou de outra rota — reseta para "Hoje" e limpa cache
        this._resetarParaHoje();
      }
    });
  }

  private _salvarFiltro(): void {
    sessionStorage.setItem('dashboard_filtro', JSON.stringify(this.filtro));
    sessionStorage.setItem('dashboard_periodo', this.periodoSelecionado);
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
    this._salvarFiltro();
    this.dashboardService.refreshDashboard(this.filtro);
  }

  aplicarPersonalizado(): void {
    if (!this.dataInicio || !this.dataFim) return;
    this.filtro = { dataInicio: this.dataInicio, dataFim: this.dataFim };
    this.carregando = true;
    this._salvarFiltro();
    this.dashboardService.refreshDashboard(this.filtro);
  }

  limparPersonalizado(): void {
    this.dataInicio = '';
    this.dataFim = '';
    this.periodoSelecionado = 'dia';
    this.filtro = { periodo: 'dia' };
    this.carregando = true;
    this._salvarFiltro();
    this.dashboardService.refreshDashboard(this.filtro);
  }

  aoFiltrarPeloGrafico(novoFiltro: FiltroDashboard): void {
    this.filtro = novoFiltro;

    // Se o filtro vier com dataInicio/dataFim e for um range de semana (<= 8 dias),
    // forçamos o período selecionado para 'semana' para manter sincronia com o seletor superior.
    if (novoFiltro.dataInicio && novoFiltro.dataFim) {
      const d1 = new Date(novoFiltro.dataInicio);
      const d2 = new Date(novoFiltro.dataFim);
      const diff = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      if (diff <= 8) {
        this.periodoSelecionado = 'semana';
      } else if (diff > 10 && diff <= 31) {
        this.periodoSelecionado = 'mes';
      } else {
        this.periodoSelecionado = novoFiltro.periodo || 'ano';
      }
    } else {
      this.periodoSelecionado = novoFiltro.periodo || 'ano';
    }

    // Se for um filtro de data exata vindo do drill-down, preenchemos os campos de data
    if (novoFiltro.dataInicio && novoFiltro.dataFim) {
      this.dataInicio = novoFiltro.dataInicio;
      this.dataFim = novoFiltro.dataFim;
    } else {
      this.dataInicio = '';
      this.dataFim = '';
    }

    this.carregando = true;
    this._salvarFiltro();
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
    sessionStorage.removeItem('dashboard_filtro');
    sessionStorage.removeItem('dashboard_periodo');
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
}
