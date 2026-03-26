import {
  Component, Input, OnChanges, SimpleChanges,
  ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MedicoProdutividade } from '../../../services/dashboard.service';

@Component({
  selector: 'app-dashboard-doctors-table',
  templateUrl: './dashboard-doctors-table.component.html',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatSortModule, MatIconModule, MatProgressSpinnerModule]
})
export class DashboardDoctorsTableComponent implements OnChanges, AfterViewInit {
  @Input() medicos: MedicoProdutividade[] = [];
  @Input() carregando = false;
  @ViewChild(MatSort) sort!: MatSort;

  readonly colunas = ['posicao', 'nome', 'atendimentos', 'tempoMedio'];
  dataSource = new MatTableDataSource<MedicoProdutividade>([]);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['medicos']) {
      this.dataSource.data = this.medicos ?? [];
    }
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }
}
