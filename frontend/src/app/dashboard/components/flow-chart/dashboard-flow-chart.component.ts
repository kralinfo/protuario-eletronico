import {
  Component, Input, OnChanges, AfterViewInit,
  SimpleChanges, ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Chart, registerables } from 'chart.js';
import { AtendimentoHora, DadosOperacional, PeriodoDashboard, FiltroDashboard } from '../../../services/dashboard.service';
import { DoctorProductivityDialogComponent } from '../doctor-productivity-dialog/doctor-productivity-dialog.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-flow-chart',
  templateUrl: './dashboard-flow-chart.component.html',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule]
})
export class DashboardFlowChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() dadosHora: AtendimentoHora[] = [];
  @Input() operacional?: DadosOperacional;
  @Input() carregando = false;
  @Input() periodo: PeriodoDashboard | 'personalizado' = 'dia';
  @Input() filtro?: FiltroDashboard;

  @ViewChild('barCanvas') barRef!: ElementRef<HTMLCanvasElement>;

  private chartBar?: Chart;
  private viewReady = false;

  constructor(private dialog: MatDialog) {}

  get tituloGrafico(): string {
    const map: Record<PeriodoDashboard | 'personalizado', string> = {
      dia:          'Atendimentos por Hora (hoje)',
      semana:       'Atendimentos por Dia (esta semana)',
      mes:          'Atendimentos por Dia (este mês)',
      ano:          'Atendimentos por Mês (este ano)',
      personalizado:'Atendimentos por Dia (período selecionado)',
    };
    return map[this.periodo];
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
            const label = labels[index];
            const total = (dados[index] as number);

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
