import {
  Component, Input, OnChanges,
  SimpleChanges, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PorClassificacao, FiltroDashboard } from '../../../services/dashboard.service';
import { DoctorProductivityDialogComponent } from '../doctor-productivity-dialog/doctor-productivity-dialog.component';

interface Segmento {
  cor: string;
  label: string;
  valor: number;
  rotateDeg: number;
  finalOffset: number;
  delay: number;
  originalIndex: number;
}

@Component({
  selector: 'app-dashboard-risk-chart',
  templateUrl: './dashboard-risk-chart.component.html',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatDialogModule]
})
export class DashboardRiskChartComponent implements OnChanges, OnDestroy {
  @Input() dados: PorClassificacao = { vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0, aguardando: 0 };
  @Input() carregando = false;
  @Input() filtro: FiltroDashboard = { periodo: 'dia' };

  private readonly MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  get labelPeriodo(): string {
    if (!this.filtro) return 'hoje';
    if (this.filtro.data) {
      const [y, m, d] = this.filtro.data.split('-');
      return `em ${d}/${m}/${y}`;
    }
    if (this.filtro.dataInicio && this.filtro.dataFim) {
      const d1 = new Date(this.filtro.dataInicio);
      const d2 = new Date(this.filtro.dataFim);
      const diffDays = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (d1.getUTCMonth() === d2.getUTCMonth() && d1.getUTCFullYear() === d2.getUTCFullYear() && diffDays > 10) {
        return `em ${this.MESES[d1.getUTCMonth()]} ${d1.getUTCFullYear()}`;
      }
      if (diffDays <= 10) {
        const di = this.filtro.dataInicio.split('-');
        const df = this.filtro.dataFim.split('-');
        return `de ${di[2]}/${di[1]} a ${df[2]}/${df[1]}`;
      }
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

  readonly LABELS = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul', 'Aguardando Triagem'];
  readonly COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#cbd5e1'];
  readonly RAIO   = 76;
  readonly CIRCUM = 2 * Math.PI * 76;

  animando = false;
  hoveredOriginalIndex: number | null = null;
  private animTimeout?: ReturnType<typeof setTimeout>;

  // Cache — recalculado apenas quando `dados` muda (evita thrashing do *ngFor)
  total   = 0;
  valores: number[] = [0, 0, 0, 0, 0, 0];
  segmentos: Segmento[] = [];

  get hoveredSeg(): Segmento | null {
    if (this.hoveredOriginalIndex === null) return null;
    return this.segmentos.find(s => s.originalIndex === this.hoveredOriginalIndex) ?? null;
  }

  constructor(private dialog: MatDialog) {}

  private _recalcular(): void {
    const d = this.dados;
    this.valores = [d.vermelho, d.laranja, d.amarelo, d.verde, d.azul, d.aguardando || 0];
    this.total   = this.valores.reduce((a, b) => a + b, 0);

    if (this.total === 0) { this.segmentos = []; return; }

    let cumDeg = 0;
    this.segmentos = this.LABELS
      .map((label, i) => {
        const val  = this.valores[i];
        const frac = val / this.total;
        const segLen    = frac * this.CIRCUM;
        const rotateDeg = cumDeg - 90;
        cumDeg += frac * 360;
        return { cor: this.COLORS[i], label, valor: val, rotateDeg,
                 finalOffset: this.CIRCUM - segLen, delay: i * 0.1, originalIndex: i };
      })
      .filter(s => s.valor > 0);
  }

  trackBySeg(_: number, seg: Segmento): number { return seg.originalIndex; }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dados']) {
      this._recalcular();
      this.animando = false;
      clearTimeout(this.animTimeout);
      this.animTimeout = setTimeout(() => { this.animando = true; }, 30);
    } else if (changes['carregando'] && !this.carregando) {
      this.animando = false;
      clearTimeout(this.animTimeout);
      this.animTimeout = setTimeout(() => { this.animando = true; }, 30);
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.animTimeout);
  }

  /** Calcula qual segmento foi clicado/hovado pelo ângulo do mouse no SVG */
  private _segmentoPorAngulo(event: MouseEvent): Segmento | null {
    const svg = (event.target as SVGElement).closest('svg') as SVGSVGElement | null;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const scaleX = 200 / rect.width;
    const scaleY = 200 / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    // Ângulo a partir do topo (12h), sentido horário, 0-360
    let angle = Math.atan2(y - 100, x - 100) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    let cumDeg = 0;
    for (let i = 0; i < this.LABELS.length; i++) {
      const val = this.valores[i];
      if (val <= 0) continue;
      const segDeg = (val / this.total) * 360;
      if (angle >= cumDeg && angle < cumDeg + segDeg) {
        return this.segmentos.find(s => s.originalIndex === i) ?? null;
      }
      cumDeg += segDeg;
    }
    return null;
  }

  onDonutClick(event: MouseEvent): void {
    const seg = this._segmentoPorAngulo(event);
    if (seg) this.abrirDetalheRisco(seg.label);
  }

  onDonutHover(event: MouseEvent): void {
    const seg = this._segmentoPorAngulo(event);
    this.hoveredOriginalIndex = seg ? seg.originalIndex : null;
  }

  abrirDetalheRisco(nivel: string): void {
    const idx = this.LABELS.findIndex(l => l.toLowerCase() === nivel.toLowerCase());
    const total = idx >= 0 ? this.valores[idx] : this.total;
    if (total === 0) return;
    this.dialog.open(DoctorProductivityDialogComponent, {
      data: { modo: 'etapa', etapaNome: nivel, total, filtro: this.filtro, tipoDetalhe: 'risco' },
      width: '850px',
      maxWidth: '95vw'
    });
  }
}
