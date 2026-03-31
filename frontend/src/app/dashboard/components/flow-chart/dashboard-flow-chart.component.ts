import {
  Component, Input, OnChanges, AfterViewInit,
  SimpleChanges, ViewChild, ElementRef, OnDestroy, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Chart, registerables } from 'chart.js';
import { AtendimentoHora, DadosOperacional, PeriodoDashboard, FiltroDashboard, DashboardService } from '../../../services/dashboard.service';
import { DoctorProductivityDialogComponent } from '../doctor-productivity-dialog/doctor-productivity-dialog.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-flow-chart',
  templateUrl: './dashboard-flow-chart.component.html',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule, MatDialogModule]
})
export class DashboardFlowChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() dadosHora: AtendimentoHora[] = [];
  @Input() operacional?: DadosOperacional;
  @Input() carregando = false;
  @Input() periodo: PeriodoDashboard | 'personalizado' = 'dia';
  @Input() filtro?: FiltroDashboard;
  @Output() filtered = new EventEmitter<FiltroDashboard>();

  @ViewChild('barCanvas') barRef!: ElementRef<HTMLCanvasElement>;

  private chartBar?: Chart;
  private viewReady = false;

  constructor(private dialog: MatDialog, private dashboardService: DashboardService) {}

  get tituloGrafico(): string {
    if (this.isFiltradoPorMes) {
      const dataLabel = this.filtro?.dataInicio || '';
      return `Atendimentos em ${this.getNomeMes(dataLabel)}`;
    }

    const map: Record<PeriodoDashboard | 'personalizado', string> = {
      dia:          'Atendimentos por Hora (hoje)',
      semana:       'Atendimentos por Dia (esta semana)',
      mes:          'Atendimentos por Dia (este mês)',
      ano:          'Atendimentos por Mês (este ano)',
      personalizado:'Atendimentos por Dia (período selecionado)',
    };
    return map[this.periodo];
  }

  get isFiltradoPorMes(): boolean {
    // Detecta se estamos no modo drill-down: período é 'ano' mas existe intervalo personalizado
    return this.periodo === 'ano' && !!(this.filtro?.dataInicio && this.filtro?.dataFim);
  }

  private getNomeMes(dataIso: string): string {
    const mes = parseInt(dataIso.split('-')[1]);
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1] || '';
  }

  voltarParaAno(): void {
    this.filtered.emit({ periodo: 'ano' });
  }

  readonly ETAPAS: { label: string; campo: keyof DadosOperacional; cor: string }[] = [
    { label: 'Aguard. Triagem', campo: 'aguardando_triagem', cor: '#ef4444' },
    { label: 'Em Triagem',      campo: 'em_triagem',         cor: '#f97316' },
    { label: 'Pós-Triagem',     campo: 'pos_triagem',        cor: '#eab308' },
    { label: 'Em Atendimento',  campo: 'em_atendimento',     cor: '#3b82f6' },
    { label: 'Concluídos',      campo: 'concluidos',         cor: '#22c55e' },
  ];

  getValorEtapa(campo: keyof DadosOperacional): number {
    return (this.operacional?.[campo] as number) ?? 0;
  }

  getBarWidth(campo: keyof DadosOperacional): number {
    const max = Math.max(...this.ETAPAS.map(e => this.getValorEtapa(e.campo)), 1);
    return Math.max((this.getValorEtapa(campo) / max) * 100, 0);
  }

  abrirDetalheEtapa(etapa: { label: string; campo: keyof DadosOperacional }): void {
    const total = this.getValorEtapa(etapa.campo);
    if (total === 0) return;

    this.dialog.open(DoctorProductivityDialogComponent, {
      data: {
        modo: 'etapa',
        etapaNome: etapa.label,
        total: total,
        filtro: this.filtro || { periodo: 'dia' }
      },
      width: '850px',
      maxWidth: '95vw'
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.criarBarChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['dadosHora'] || changes['operacional']) && this.viewReady) {
      this.destruir();
      // setTimeout garante que o canvas já existe no DOM após *ngIf mudar
      setTimeout(() => this.criarBarChart());
    }
  }

  ngOnDestroy(): void {
    this.destruir();
  }

  private destruir(): void {
    this.chartBar?.destroy();
    this.chartBar = undefined;
  }

  private criarBarChart(): void {
    if (!this.barRef?.nativeElement || !this.dadosHora.length) return;

    // hora já vem como "08:00" do backend — usa diretamente
    const labels = this.dadosHora.map(d => d.hora);
    const dados  = this.dadosHora.map(d => d.total);

    this.chartBar = new Chart(this.barRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Atendimentos',
          data: dados,
          backgroundColor: '#2563eb',
          borderRadius: 4,
          maxBarThickness: 32
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event: any, elements: any[]) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const label = labels[index] || '';
            const total = (dados[index] as number);
            const rawData = this.dadosHora[index];

            // Drill-down: Se clicar em um mês na visão anual
            if (this.periodo === 'ano' && !this.isFiltradoPorMes && rawData.mes) {
              const anoAtual = new Date().getFullYear();
              const mesStr = String(rawData.mes).padStart(2, '0');
              const ultimoDia = new Date(anoAtual, rawData.mes, 0).getDate();

              const novoFiltro: FiltroDashboard = {
                periodo: 'ano', // Mantemos 'ano' mas injetamos o range do mês
                dataInicio: `${anoAtual}-${mesStr}-01`,
                dataFim: `${anoAtual}-${mesStr}-${ultimoDia}`
              };
              this.filtered.emit(novoFiltro);
              return;
            }

            if (total > 0) {
              const novoFiltro = { ...this.filtro };

              if (this.periodo !== 'dia' && label.includes('-')) {
                novoFiltro.data = label;
                delete novoFiltro.dataInicio;
                delete novoFiltro.dataFim;
              }

              this.dialog.open(DoctorProductivityDialogComponent, {
                data: {
                  modo: 'etapa',
                  etapaNome: 'Qualquer', // Nome especial para buscar todos do período
                  total: total,
                  filtro: novoFiltro
                },
                width: '850px',
                maxWidth: '95vw'
              });
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.04)', display: false },
            ticks: { font: { size: 10 }, maxRotation: 45 }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { precision: 0, font: { size: 11 }, stepSize: 1 }
          }
        }
      }
    });
  }
}
