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
import { MedicoProdutividade, PeriodoDashboard } from '../../../services/dashboard.service';

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
  @Output() medicoSelecionado = new EventEmitter<MedicoProdutividade>();
  @ViewChild(MatSort) sort!: MatSort;

  readonly colunas = ['posicao', 'nome', 'atendimentos', 'tempoMedio'];
  dataSource = new MatTableDataSource<MedicoProdutividade>([]);

  get labelPeriodo(): string {
    switch (this.periodo) {
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
