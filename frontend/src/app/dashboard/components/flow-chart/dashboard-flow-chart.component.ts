import {
  Component, Input, OnChanges, AfterViewInit,
  SimpleChanges, ViewChild, ElementRef, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Chart, registerables } from 'chart.js';
import { AtendimentoHora, DadosOperacional } from '../../../services/dashboard.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-flow-chart',
  templateUrl: './dashboard-flow-chart.component.html',
  standalone: true,
  imports: [CommonModule, MatIconModule]
})
export class DashboardFlowChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() dadosHora: AtendimentoHora[] = [];
  @Input() operacional?: DadosOperacional;
  @Input() carregando = false;

  @ViewChild('lineCanvas') lineRef!: ElementRef<HTMLCanvasElement>;

  private chartLine?: Chart;
  private viewReady = false;

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

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.criarLinhaChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['dadosHora'] || changes['operacional']) && this.viewReady) {
      this.destruir();
      this.criarLinhaChart();
    }
  }

  ngOnDestroy(): void {
    this.destruir();
  }

  private destruir(): void {
    this.chartLine?.destroy();
    this.chartLine = undefined;
  }

  private criarLinhaChart(): void {
    if (!this.lineRef?.nativeElement || !this.dadosHora.length) return;

    const labels = this.dadosHora.map(d => `${String(d.hora).padStart(2, '0')}h`);
    const dados  = this.dadosHora.map(d => d.total);

    this.chartLine = new Chart(this.lineRef.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Atendimentos',
          data: dados,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,0.08)',
          borderWidth: 2,
          pointBackgroundColor: '#2563eb',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { font: { size: 10 }, maxRotation: 45 }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { precision: 0, font: { size: 11 } }
          }
        }
      }
    });
  }
}
