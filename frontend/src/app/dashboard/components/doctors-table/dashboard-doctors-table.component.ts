import {
  Component, Input, OnChanges, SimpleChanges,
  ViewChild, AfterViewInit, Output, EventEmitter
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MedicoProdutividade, PeriodoDashboard, FiltroDashboard } from '../../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-doctors-table',
  templateUrl: './dashboard-doctors-table.component.html',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule]
})
export class DashboardDoctorsTableComponent implements OnChanges, AfterViewInit {
  @Input() medicos: MedicoProdutividade[] = [];
  @Input() carregando = false;
  @Input() periodo: PeriodoDashboard | 'personalizado' = 'dia';
  @Input() filtro: FiltroDashboard = { periodo: 'dia' };
  @Output() medicoSelecionado = new EventEmitter<MedicoProdutividade>();
  @ViewChild(MatSort) sort!: MatSort;

  private readonly MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  readonly colunas = ['posicao', 'nome', 'atendimentos', 'tempoMedio'];
  dataSource = new MatTableDataSource<MedicoProdutividade>([]);

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
      // Range maior
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medicos']) {
      this.dataSource.data = this.medicos ?? [];
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  onAtendimentosClick(row: MedicoProdutividade): void {
    if (row.atendimentos > 0) {
      this.medicoSelecionado.emit(row);
    }
  }
}
