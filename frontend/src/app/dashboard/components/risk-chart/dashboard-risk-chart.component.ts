import {
  Component, Input, OnChanges, AfterViewInit,
  SimpleChanges, ViewChild, ElementRef, OnDestroy, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Chart, registerables } from 'chart.js';
import { PorClassificacao, FiltroDashboard } from '../../../services/dashboard.service';
import { DoctorProductivityDialogComponent } from '../doctor-productivity-dialog/doctor-productivity-dialog.component';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-risk-chart',
  templateUrl: './dashboard-risk-chart.component.html',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule]
})
export class DashboardRiskChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() dados: PorClassificacao = { vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0 };
  @Input() carregando = false;
  @Input() filtro: FiltroDashboard = { periodo: 'dia' };

  private readonly MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  get labelPeriodo(): string {
    if (!this.filtro) return 'hoje';
    // Drill-down para dia específico
    if (this.filtro.data) {
      const [y, m, d] = this.filtro.data.split('-');
      return `em ${d}/${m}/${y}`;
    }
    // Range com dataInicio/dataFim
    if (this.filtro.dataInicio && this.filtro.dataFim) {
      const d1 = new Date(this.filtro.dataInicio);
      const d2 = new Date(this.filtro.dataFim);
      const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      // Mês inteiro (>10 dias, mesmo mês)
      if (d1.getUTCMonth() === d2.getUTCMonth() && d1.getUTCFullYear() === d2.getUTCFullYear() && diffDays > 10) {
        return `em ${this.MESES[d1.getUTCMonth()]} ${d1.getUTCFullYear()}`;
      }
      // Semana (<=10 dias)
      if (diffDays <= 10) {
        const di = this.filtro.dataInicio.split('-');
        const df = this.filtro.dataFim.split('-');
        return `de ${di[2]}/${di[1]} a ${df[2]}/${df[1]}`;
      }
      // Range maior (ano ou personalizado)
      const di = this.filtro.dataInicio.split('-');
      const df = this.filtro.dataFim.split('-');
      return `de ${di[2]}/${di[1]}/${di[0]} a ${df[2]}/${df[1]}/${df[0]}`;
    }
    switch (this.filtro.periodo) {
      case 'dia': return 'hoje';
      case 'semana': return 'nesta semana';
      case 'mes': return 'neste mês';
      case 'ano': return 'neste ano';
      case 'personalizado': return 'no período selecionado';
      default: return 'hoje';
    }
  }

  @ViewChild('riskCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart?: Chart;
  private viewReady = false;

  readonly LABELS  = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'];
  readonly COLORS  = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6'];
  readonly BORDERS = ['#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#2563eb'];

  constructor(private dialog: MatDialog) {}

  abrirDetalheRisco(nivel: string): void {
    const idx = this.LABELS.findIndex(l => l.toLowerCase() === nivel.toLowerCase());
    const total = idx >= 0 ? this.valores[idx] : this.total;
    if (total === 0) return;
    this.dialog.open(DoctorProductivityDialogComponent, {
      data: {
        modo: 'etapa',
        etapaNome: nivel,
        total,
        filtro: this.filtro,
        tipoDetalhe: 'risco'
      },
      width: '850px',
      maxWidth: '95vw'
    });
  }

  get total(): number {
    const d = this.dados;
    return d.vermelho + d.laranja + d.amarelo + d.verde + d.azul;
  }

  get valores(): number[] {
    const d = this.dados;
    return [d.vermelho, d.laranja, d.amarelo, d.verde, d.azul];
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.criarGrafico();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['dados'] || (changes['carregando'] && !this.carregando)) && this.viewReady) {
      this.destruirGrafico();
      // O timeout garante que o canvas já saiu do estado de skeleton/ngIf e está no DOM
      setTimeout(() => this.criarGrafico());
    }
  }

  ngOnDestroy(): void {
    this.destruirGrafico();
  }

  private destruirGrafico(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = undefined;
    }
  }

  private criarGrafico(): void {
    if (!this.canvasRef?.nativeElement || this.total === 0) return;

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'doughnut',
      data: {
        labels: this.LABELS,
        datasets: [{
          data:            this.valores,
          backgroundColor: this.COLORS,
          borderColor:     this.BORDERS,
          borderWidth: 2,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '66%',
        onClick: (_event: any, elements: any[]) => {
          if (elements.length > 0) {
            const idx = elements[0].index;
            this.abrirDetalheRisco(this.LABELS[idx]);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${ctx.parsed} (${Math.round((ctx.parsed / this.total) * 100)}%)`
            }
          }
        }
      }
    });
  }
}
