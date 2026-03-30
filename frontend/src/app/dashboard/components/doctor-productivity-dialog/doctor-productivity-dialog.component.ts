import { Component, Inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { DashboardService, AtendimentoMedicoDetalhe, MedicoProdutividade, FiltroDashboard } from '../../../services/dashboard.service';

@Component({
  selector: 'app-doctor-productivity-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTableModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="p-6">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h2 mat-dialog-title class="!m-0 text-xl font-bold text-gray-800">
            Atendimentos de {{ data.medico.nome }}
          </h2>
          <p class="text-sm text-gray-500 mt-1">
            Total visitado: {{ data.medico.atendimentos }} atendimentos
          </p>
        </div>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="relative overflow-hidden min-h-[300px]">
        <div *ngIf="carregando" class="absolute inset-0 z-10 bg-white/70 flex items-center justify-center">
          <mat-spinner diameter="40"></mat-spinner>
        </div>

        <table mat-table [dataSource]="dataSource" matSort class="w-full">
          <!-- Paciente Column -->
          <ng-container matColumnDef="paciente">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Paciente </th>
            <td mat-cell *matCellDef="let row">
              <a (click)="abrirFicha(row)" class="text-blue-600 font-medium hover:underline cursor-pointer">
                {{ row.pacienteNome }}
              </a>
            </td>
          </ng-container>

          <!-- Status Column -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Status </th>
            <td mat-cell *matCellDef="let row">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                [ngClass]="{
                  'bg-green-100 text-green-800': row.status === 'atendimento_concluido',
                  'bg-blue-100 text-blue-800': row.status?.includes('atendimento'),
                  'bg-gray-100 text-gray-800': !row.status?.includes('atendimento') && row.status !== 'atendimento_concluido'
                }">
                {{ formatarStatus(row.status) }}
              </span>
            </td>
          </ng-container>

          <!-- Classificação Column -->
          <ng-container matColumnDef="classificacao">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Risco </th>
            <td mat-cell *matCellDef="let row">
              <div class="flex items-center gap-2">
                <div [class]="'w-3 h-3 rounded-full ' + getColorClass(row.classificacao)"></div>
                <span class="text-xs uppercase">{{ row.classificacao || 'N/A' }}</span>
              </div>
            </td>
          </ng-container>

          <!-- Início Column -->
          <ng-container matColumnDef="inicio">
            <th mat-header-cell *matHeaderCellDef mat-sort-header> Início </th>
            <td mat-cell *matCellDef="let row"> {{ row.dataHoraInicio | date:'HH:mm' }} </td>
          </ng-container>

          <!-- Duração Column -->
          <ng-container matColumnDef="duracao">
            <th mat-header-cell *matHeaderCellDef> Duração </th>
            <td mat-cell *matCellDef="let row">
              {{ calcularDuracao(row.dataHoraInicio, row.dataHoraFim) }}
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>

          <!-- Row shown when there is no matching data. -->
          <tr class="mat-row" *matNoDataRow>
            <td class="mat-cell p-8 text-center" colspan="5">
              Nenhum atendimento encontrado para este período.
            </td>
          </tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; width: 800px; max-width: 95vw; }
    .mat-column-paciente { width: 35%; }
    .mat-column-status { width: 25%; }
    .mat-column-classificacao { width: 15%; }
    .mat-column-inicio { width: 10%; }
    .mat-column-duracao { width: 15%; }
  `]
})
export class DoctorProductivityDialogComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['paciente', 'status', 'classificacao', 'inicio', 'duracao'];
  dataSource = new MatTableDataSource<AtendimentoMedicoDetalhe>([]);
  carregando = true;

  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { medico: MedicoProdutividade, filtro: FiltroDashboard },
    private dialogRef: MatDialogRef<DoctorProductivityDialogComponent>,
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarAtendimentos();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  carregarAtendimentos(): void {
    this.carregando = true;
    this.dashboardService.getAtendimentosPorMedico(this.data.medico.medicoId, this.data.filtro)
      .subscribe({
        next: (atendimentos) => {
          this.dataSource.data = atendimentos;
          this.carregando = false;
        },
        error: (err) => {
          console.error('Erro ao carregar atendimentos do médico:', err);
          this.carregando = false;
        }
      });
  }

  formatarStatus(status: string): string {
    if (!status) return '-';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getColorClass(risco: string): string {
    const r = risco?.toLowerCase();
    switch (r) {
      case 'vermelho': return 'bg-red-600';
      case 'laranja': return 'bg-orange-500';
      case 'amarelo': return 'bg-yellow-400';
      case 'verde': return 'bg-green-500';
      case 'azul': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  }

  calcularDuracao(inicio: string, fim: string): string {
    if (!inicio || !fim) return '-';
    const start = new Date(inicio);
    const end = new Date(fim);
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);
    return `${diffMins} min`;
  }

  abrirFicha(row: AtendimentoMedicoDetalhe): void {
    this.dialogRef.close();
    // Navegar para a rota de consulta/atendimento com os parâmetros de visualização
    this.router.navigate(['/medico/atendimento', row.atendimentoId], {
      state: {
        modoVisualizacao: true,
        consultaRealizada: true,
        podeEditarPorStatus: false,
        origemCard: 'dashboard'
      }
    }).then(success => {
      if (!success) {
        console.error('Falha na navegação para /medico/atendimento');
      }
    });
  }
}
