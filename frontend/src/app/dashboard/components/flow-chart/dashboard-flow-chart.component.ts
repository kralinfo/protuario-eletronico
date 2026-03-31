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
    if (this.isFiltradoPorDia) {
      const dataLabel = this.filtro?.data || '';
      const [y, m, d] = dataLabel.split('-');
      return `Atendimentos em ${d}/${m} (por hora)`;
    }
    if (this.isFiltradoPorSemana) {
      return `Atendimentos por Dia (esta semana)`;
    }
    if (this.isFiltradoPorMes) {
      const dataLabel = this.filtro?.dataInicio || '';
      return `Atendimentos em ${this.getNomeMes(dataLabel)} (por semana)`;
    }
    if (this.isFiltradoPorAnoPersonalizado) {
      const ano = new Date(this.filtro?.dataInicio || '').getUTCFullYear();
      return `Atendimentos em ${ano} (por mês)`;
    }
    if (this.isPersonalizadoMesmoAno) {
      return 'Atendimentos por Mês (período selecionado)';
    }
    if (this.isPersonalizadoMultiAno) {
      return 'Atendimentos por Ano (período selecionado)';
    }
    const map: Record<string, string> = {
      dia:          'Atendimentos por Hora',
      semana:       'Atendimentos por Dia (esta semana)',
      mes:          'Atendimentos por Semana (este mês)',
      ano:          'Atendimentos por Mês (este ano)',
      personalizado:'Atendimentos por Dia (período selecionado)',
    };
    return map[this.periodo] || 'Atendimentos';
  }

  get isFiltradoPorDia(): boolean {
    // Estamos visualizando horas de um dia (drill-down da semana)
    return this.periodo === 'dia' && !!this.filtro?.data;
  }

  get isFiltradoPorMes(): boolean {
    // Estamos visualizando semanas de um mês (drill-down do ano)
    if (this.periodo !== 'mes') return false;
    if (!this.filtro?.dataInicio || !this.filtro?.dataFim) return false;

    const d1 = new Date(this.filtro.dataInicio);
    const d2 = new Date(this.filtro.dataFim);
    const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Se o período for 'mes' e o intervalo for maior que 10 dias, assumimos que é a visão de semanas
    return diffDays > 10;
  }

  get isFiltradoPorSemana(): boolean {
    // Estamos visualizando dias de uma semana (drill-down do mês)
    if (this.periodo !== 'mes') return false;
    if (!this.filtro?.dataInicio || !this.filtro?.dataFim) return false;

    const d1 = new Date(this.filtro.dataInicio);
    const d2 = new Date(this.filtro.dataFim);
    const diffDays = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Se o intervalo for de 7 dias ou menos, é a visão de dias da semana
    return diffDays <= 8;
  }

  private getNomeMes(dataIso: string): string {
    const mesArr = dataIso.split('-');
    if (mesArr.length < 2) return '';
    const mes = parseInt(mesArr[1]);
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[mes - 1] || '';
  }

  get isPersonalizadoMultiAno(): boolean {
    if (this.periodo !== 'personalizado') return false;
    if (!this.filtro?.dataInicio || !this.filtro?.dataFim) return false;
    const yearStart = new Date(this.filtro.dataInicio).getUTCFullYear();
    const yearEnd   = new Date(this.filtro.dataFim).getUTCFullYear();
    return yearEnd > yearStart;
  }

  /** Personalizado dentro do mesmo ano com mais de 31 dias → mostra barras por mês */
  get isPersonalizadoMesmoAno(): boolean {
    if (this.periodo !== 'personalizado') return false;
    if (!this.filtro?.dataInicio || !this.filtro?.dataFim) return false;
    const yearStart = new Date(this.filtro.dataInicio).getUTCFullYear();
    const yearEnd   = new Date(this.filtro.dataFim).getUTCFullYear();
    const diffDays  = Math.ceil(Math.abs(new Date(this.filtro.dataFim).getTime() - new Date(this.filtro.dataInicio).getTime()) / (1000 * 60 * 60 * 24));
    return yearStart === yearEnd && diffDays > 31;
  }

  /** Detecta se a visão mensal atual veio de um personalizado same-year (para saber onde voltar) */
  get origemMesPersonalizadoMesmoAno(): boolean {
    if (!this.filtro?.originalDataInicio || !this.filtro?.originalDataFim) return false;
    const yearStart = new Date(this.filtro.originalDataInicio).getUTCFullYear();
    const yearEnd   = new Date(this.filtro.originalDataFim).getUTCFullYear();
    return yearStart === yearEnd;
  }

  get isFiltradoPorAnoPersonalizado(): boolean {
    return this.periodo === 'ano' && !!this.filtro?.originalDataInicio && !!this.filtro?.originalDataFim;
  }

  voltarParaAno(): void {
    if (this.filtro?.originalDataInicio && this.filtro?.originalDataFim) {
      // Veio de personalizado multi-ano → reconstrói o range do ano que estava visualizando
      const ano        = new Date(this.filtro.dataInicio || this.filtro.originalDataInicio!).getUTCFullYear();
      const oStart     = this.filtro.originalDataInicio!;
      const oEnd       = this.filtro.originalDataFim!;
      const startYear  = new Date(oStart).getUTCFullYear();
      const endYear    = new Date(oEnd).getUTCFullYear();
      const dataInicio = ano === startYear ? oStart : `${ano}-01-01`;
      const dataFim    = ano === endYear   ? oEnd   : `${ano}-12-31`;
      this.filtered.emit({ periodo: 'ano', dataInicio, dataFim, originalDataInicio: oStart, originalDataFim: oEnd });
    } else {
      this.filtered.emit({ periodo: 'ano' });
    }
  }

  voltarParaPersonalizado(): void {
    if (!this.filtro?.originalDataInicio || !this.filtro?.originalDataFim) return;
    this.filtered.emit({
      periodo: 'personalizado',
      dataInicio: this.filtro.originalDataInicio,
      dataFim:    this.filtro.originalDataFim
    });
  }

  voltarParaMes(): void {
    // Reconstrói o range do mês inteiro a partir da data de referência atual
    const ref = (this.filtro?.dataInicio) ? new Date(this.filtro.dataInicio) : new Date();
    const ano = ref.getUTCFullYear();
    const mes = ref.getUTCMonth(); // 0-based
    const mesStr = String(mes + 1).padStart(2, '0');
    const ultimoDia = new Date(ano, mes + 1, 0).getDate();
    const novoFiltro: FiltroDashboard = {
      periodo: 'mes',
      dataInicio: `${ano}-${mesStr}-01`,
      dataFim: `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`,
      ...(this.filtro?.originalDataInicio ? { originalDataInicio: this.filtro.originalDataInicio, originalDataFim: this.filtro.originalDataFim } : {})
    };
    this.filtered.emit(novoFiltro);
  }

  voltarParaSemana(): void {
    // Se veio do filtro nativo 'semana', volta diretamente para ele
    if (this.filtro?.originalPeriodo === 'semana') {
      this.filtered.emit({ periodo: 'semana' });
      return;
    }

    if (!this.filtro?.data) return;

    const dataRef = new Date(this.filtro.data);
    const day = dataRef.getUTCDate();
    const rawSemana = Math.floor((day - 1) / 7) + 1;

    // Recalcula o rande da semana (S1: 01-07, etc)
    const ano = dataRef.getUTCFullYear();
    const mes = dataRef.getUTCMonth();
    const mesStr = String(mes + 1).padStart(2, '0');

    const diaInicioNum = (rawSemana - 1) * 7 + 1;
    const diaInicio = String(diaInicioNum).padStart(2, '0');

    let diaFimNum = rawSemana * 7;
    const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
    if (diaFimNum > ultimoDiaDoMes) diaFimNum = ultimoDiaDoMes;
    const diaFim = String(diaFimNum).padStart(2, '0');

    this.filtered.emit({
      periodo: 'mes',
      dataInicio: `${ano}-${mesStr}-${diaInicio}`,
      dataFim: `${ano}-${mesStr}-${diaFim}`,
      ...(this.filtro?.originalDataInicio ? { originalDataInicio: this.filtro.originalDataInicio, originalDataFim: this.filtro.originalDataFim } : {})
    });
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

            // Drill-down: personalizado mesmo ano → clique em um mês → mostra semanas
            if (this.isPersonalizadoMesmoAno && rawData.mes) {
              const ano    = new Date(this.filtro!.dataInicio!).getUTCFullYear();
              const mesStr = String(rawData.mes).padStart(2, '0');
              const ultimoDia = new Date(ano, rawData.mes, 0).getDate();
              this.filtered.emit({
                periodo: 'mes',
                dataInicio: `${ano}-${mesStr}-01`,
                dataFim: `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}`,
                originalDataInicio: this.filtro!.dataInicio!,
                originalDataFim: this.filtro!.dataFim!
              });
              return;
            }

            // Drill-down: personalizado multi-ano → clique em um ano → mostra meses
            if (this.isPersonalizadoMultiAno && rawData.ano) {
              const ano       = rawData.ano;
              const oStart    = this.filtro!.dataInicio!;
              const oEnd      = this.filtro!.dataFim!;
              const startYear = new Date(oStart).getUTCFullYear();
              const endYear   = new Date(oEnd).getUTCFullYear();
              const dataInicio = ano === startYear ? oStart : `${ano}-01-01`;
              const dataFim    = ano === endYear   ? oEnd   : `${ano}-12-31`;
              this.filtered.emit({ periodo: 'ano', dataInicio, dataFim, originalDataInicio: oStart, originalDataFim: oEnd });
              return;
            }

            // Drill-down: Se clicar em um mês na visão anual
            if (this.periodo === 'ano' && rawData.mes) {
              const dataRef  = (this.filtro && this.filtro.dataInicio) ? new Date(this.filtro.dataInicio) : new Date();
              const anoAtual = dataRef.getUTCFullYear();
              const mesStr   = String(rawData.mes).padStart(2, '0');
              const ultimoDia = new Date(anoAtual, rawData.mes, 0).getDate();
              const novoFiltro: FiltroDashboard = {
                periodo: 'mes',
                dataInicio: `${anoAtual}-${mesStr}-01`,
                dataFim: `${anoAtual}-${mesStr}-${ultimoDia}`,
                ...(this.filtro?.originalDataInicio ? { originalDataInicio: this.filtro.originalDataInicio, originalDataFim: this.filtro.originalDataFim } : {})
              };
              this.filtered.emit(novoFiltro);
              return;
            }

            // Drill-down: Se clicar em uma semana na visão mensal (agrupada por semanas)
            if (this.periodo === 'mes' && this.isFiltradoPorMes && rawData.semana) {
              const dataRef = (this.filtro && this.filtro.dataInicio) ? new Date(this.filtro.dataInicio) : new Date();
              const anoAtual = dataRef.getUTCFullYear();
              const mesRef = dataRef.getUTCMonth();
              const mesStr = String(mesRef + 1).padStart(2, '0');

              const diaInicioNum = (rawData.semana - 1) * 7 + 1;
              const diaInicio = String(diaInicioNum).padStart(2, '0');

              let diaFimNum = rawData.semana * 7;
              const ultimoDiaDoMes = new Date(anoAtual, mesRef + 1, 0).getDate();
              if (diaFimNum > ultimoDiaDoMes) diaFimNum = ultimoDiaDoMes;
              const diaFim = String(diaFimNum).padStart(2, '0');

              const novoFiltro: FiltroDashboard = {
                periodo: 'mes',
                dataInicio: `${anoAtual}-${mesStr}-${diaInicio}`,
                dataFim: `${anoAtual}-${mesStr}-${diaFim}`,
                ...(this.filtro?.originalDataInicio ? { originalDataInicio: this.filtro.originalDataInicio, originalDataFim: this.filtro.originalDataFim } : {})
              };
              this.filtered.emit(novoFiltro);
              return;
            }

            // Drill-down: Se clicar em um dia na visão de semana → abre as horas daquele dia
            if (this.periodo === 'mes' && this.isFiltradoPorSemana && rawData.data) {
              const novoFiltro: FiltroDashboard = {
                periodo: 'dia',
                data: rawData.data,
                ...(this.filtro?.originalDataInicio ? { originalDataInicio: this.filtro.originalDataInicio, originalDataFim: this.filtro.originalDataFim } : {})
              };
              this.filtered.emit(novoFiltro);
              return;
            }

            // Drill-down: filtro nativo 'mes' (sem dataInicio) → clique em semana → dias da semana
            if (this.periodo === 'mes' && !this.filtro?.dataInicio && rawData.semana) {
              const now = new Date();
              const ano = now.getFullYear();
              const mes = now.getMonth(); // 0-based
              const mesStr = String(mes + 1).padStart(2, '0');
              const diaInicioNum = (rawData.semana - 1) * 7 + 1;
              const diaInicio = String(diaInicioNum).padStart(2, '0');
              let diaFimNum = rawData.semana * 7;
              const ultimoDiaDoMes = new Date(ano, mes + 1, 0).getDate();
              if (diaFimNum > ultimoDiaDoMes) diaFimNum = ultimoDiaDoMes;
              const diaFim = String(diaFimNum).padStart(2, '0');
              this.filtered.emit({
                periodo: 'mes',
                dataInicio: `${ano}-${mesStr}-${diaInicio}`,
                dataFim: `${ano}-${mesStr}-${diaFim}`
              });
              return;
            }

            // Drill-down: filtro nativo 'semana' → clique em dia → horas daquele dia
            if (this.periodo === 'semana' && rawData.hora && /^\d{4}-\d{2}-\d{2}$/.test(rawData.hora)) {
              this.filtered.emit({ periodo: 'dia', data: rawData.hora, originalPeriodo: 'semana' });
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
