import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, interval, takeUntil } from 'rxjs';
import {
  DashboardService,
  DadosOperacional,
  AlertaCritico
} from '../../services/dashboard.service';

const INTERVALO_POLLING_MS = 30_000;

@Component({
  selector: 'app-dashboard-operacional',
  templateUrl: './dashboard-operacional.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatPaginatorModule,
    FormsModule,
    RouterModule
  ]
})
export class DashboardOperacionalComponent implements OnInit, OnDestroy {
  dados: DadosOperacional = {
    total_hoje: 0,
    aguardando_triagem: 0,
    em_triagem: 0,
    pos_triagem: 0,
    em_atendimento: 0,
    concluidos: 0,
    abandonos: 0,
    tempo_medio_espera: 0,
    por_classificacao: { vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0 },
    alertas_criticos: []
  };

  horaAtualizacao = new Date();
  carregando = true;
  erro = false;

  // Paginação Alertas
  pageSize = 5;
  pageIndex = 0;
  pageSizeOptions = [5, 10, 15, 25, 50];

  private destroy$ = new Subject<void>();

  constructor(
    private dashboardService: DashboardService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.carregar();

    interval(INTERVALO_POLLING_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.carregar());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregar(): void {
    this.dashboardService.getOperacional().subscribe({
      next: (dados) => {
        this.dados = dados;
        this.horaAtualizacao = new Date();
        this.carregando = false;
        this.erro = false;
      },
      error: () => {
        this.carregando = false;
        this.erro = true;
        this.snackBar.open('Erro ao atualizar o dashboard.', 'Fechar', { duration: 3000 });
      }
    });
  }

  get alertasPaginados(): AlertaCritico[] {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return this.dados.alertas_criticos.slice(start, end);
  }

  onPageChange(event: PageEvent): void {
    this.pageSize = event.pageSize;
    this.pageIndex = event.pageIndex;
  }

  getCorClassificacao(classificacao: string): string {
    switch ((classificacao || '').toLowerCase()) {
      case 'vermelho': return '#ef4444';
      case 'laranja':  return '#f97316';
      case 'amarelo':  return '#eab308';
      case 'verde':    return '#22c55e';
      case 'azul':     return '#3b82f6';
      default:         return '#d1d5db';
    }
  }

  getBgClassificacao(classificacao: string): string {
    switch ((classificacao || '').toLowerCase()) {
      case 'vermelho': return 'bg-red-100 text-red-700';
      case 'laranja':  return 'bg-orange-100 text-orange-700';
      case 'amarelo':  return 'bg-yellow-100 text-yellow-700';
      case 'verde':    return 'bg-green-100 text-green-700';
      case 'azul':     return 'bg-blue-100 text-blue-700';
      default:         return 'bg-gray-100 text-gray-700';
    }
  }

  get totalClassificacao(): number {
    const c = this.dados.por_classificacao;
    return c.vermelho + c.laranja + c.amarelo + c.verde + c.azul;
  }

  pctClassificacao(valor: number): number {
    const total = this.totalClassificacao;
    return total > 0 ? Math.round((valor / total) * 100) : 0;
  }

  trackByAlerta(_: number, alerta: AlertaCritico): number {
    return alerta.id;
  }
}
