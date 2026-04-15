import {
  Component, Input, OnChanges, OnDestroy, SimpleChanges,
  ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, switchMap, takeUntil } from 'rxjs';

import {
  DashboardService,
  AtendimentoDashboard,
  FiltroDashboard
} from '../../../services/dashboard.service';
import { normalizeStatus, getStatusLabel } from '../../../utils/normalize-status';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { HistoricoAtendimentoDetalheComponent } from '../../../pacientes/historico-atendimento-detalhe.component';
import { AuthService } from '../../../auth/auth.service';
import { AtendimentoService } from '../../../services/atendimento.service';
import { AbandonoDialogComponent } from '../../../shared/abandono-dialog/abandono-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { FeedbackDialogComponent } from '../../../shared/feedback-dialog/feedback-dialog.component';

@Component({
  selector: 'app-dashboard-atendimentos-table',
  templateUrl: './dashboard-atendimentos-table.component.html',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatMenuModule,
    MatButtonModule,
    MatDividerModule
  ],
  providers: []
})
export class DashboardAtendimentosTableComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() filtro: FiltroDashboard = { periodo: 'dia' };
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dados: AtendimentoDashboard[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  carregando = true;

  readonly colunas = ['acoes', 'paciente', 'status', 'risco', 'medico', 'dataHora', 'duracao'];
  readonly itensPorPagina = [5, 10, 25, 50];

  private readonly destroy$ = new Subject<void>();
  private readonly carregarPage$ = new Subject<void>();

  get isEditor(): boolean {
    return this.authService.isEditor;
  }

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
    private atendimentoService: AtendimentoService
  ) {
    this.carregarPage$.pipe(
      switchMap(() => {
        this.carregando = true;
        return this.dashboardService.getAtendimentosPaginados(
          this.pageIndex + 1,
          this.pageSize,
          this.filtro
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (resp) => {
        this.dados = resp.dados;
        this.total = resp.total;
        this.carregando = false;
      },
      error: () => {
        this.dados = [];
        this.total = 0;
        this.carregando = false;
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filtro']) {
      // Filtro mudou: volta para a primeira página
      this.pageIndex = 0;
      if (this.paginator) {
        this.paginator.firstPage();
      }
      this.carregarPage$.next();
    }
  }

  ngAfterViewInit(): void {
    // Dispara carga inicial na primeira renderização
    this.carregarPage$.next();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize  = event.pageSize;
    this.carregarPage$.next();
  }

  abrirFicha(row: AtendimentoDashboard): void {
    this.router.navigate(['/atendimento', row.id]);
  }

  isStatusFinal(status: string): boolean {
    const finais = ['atendimento_concluido', 'alta_medica', 'alta_ambulatorial', 'abandonado'];
    return finais.includes((status || '').toLowerCase());
  }

  visualizarDetalhes(row: AtendimentoDashboard): void {
    this.dialog.open(HistoricoAtendimentoDetalheComponent, {
      data: { atendimentoId: row.id },
      width: '90%',
      maxWidth: '1000px'
    });
  }

  registrarAbandono(row: AtendimentoDashboard): void {
    const ref = this.dialog.open(AbandonoDialogComponent, {
      data: { atendimento: row },
      width: '500px'
    });
    ref.afterClosed().subscribe((result: any) => {
      if (result) {
        this.atendimentoService.registrarAbandono(row.id, result).subscribe({
          next: () => {
            this.carregarPage$.next();
            const fb = this.dialog.open(FeedbackDialogComponent, {
              data: { title: 'Abandono Registrado', message: 'Atendimento marcado como abandonado com sucesso!', type: 'success' }
            });
            setTimeout(() => fb.close(), 2000);
          },
          error: () => {
            const fb = this.dialog.open(FeedbackDialogComponent, {
              data: { title: 'Erro', message: 'Falha ao registrar abandono. Tente novamente.', type: 'error' }
            });
            setTimeout(() => fb.close(), 2500);
          }
        });
      }
    });
  }

  registrarConclusao(row: AtendimentoDashboard): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Registrar Conclusão',
        message: `Confirma a conclusão do atendimento do paciente ${(row as any).pacienteNome || ''}?`
      }
    });
    ref.afterClosed().subscribe((result: any) => {
      if (result) {
        const dados = { motivo: (row as any).motivo, status: 'atendimento_concluido' };
        this.atendimentoService.atualizarAtendimento(row.id, dados as any).subscribe({
          next: () => {
            this.carregarPage$.next();
            const fb = this.dialog.open(FeedbackDialogComponent, {
              data: { title: 'Sucesso', message: 'Atendimento concluído com sucesso!', type: 'success' }
            });
            setTimeout(() => fb.close(), 2000);
          },
          error: (err: any) => {
            const fb = this.dialog.open(FeedbackDialogComponent, {
              data: { title: 'Erro', message: err?.error?.message || 'Erro ao concluir atendimento.', type: 'error' }
            });
            setTimeout(() => fb.close(), 2500);
          }
        });
      }
    });
  }

  abrirConsulta(row: AtendimentoDashboard): void {
    // Salva os filtros atuais no sessionStorage para persistir no retorno
    sessionStorage.setItem('dashboard_filtro_retorno', JSON.stringify(this.filtro));
    sessionStorage.setItem('dashboard_periodo_retorno', this.filtro.periodo || 'dia');

    // Navega para o atendimento em modo SOMENTE LEITURA (sem possibilidade de edição)
    this.router.navigate(['/medico/atendimento', row.id], {
      state: {
        origemCard: 'dashboard',
        modoVisualizacao: true,
        consultaRealizada: true,
        podeEditarPorStatus: false
      }
    });
  }

  formatarStatus(status: string): string {
    const mapa: Record<string, string> = {
      'recepcao':                         'Recepção',
      'encaminhado_para_triagem':         'Aguard. Triagem',
      'em_triagem':                       'Em Triagem',
      'encaminhado_para_sala_medica':     'Pós-Triagem',
      'encaminhado_para_ambulatorio':     'Pós-Triagem',
      'em_atendimento_medico':            'Em Atendimento',
      'em_atendimento_ambulatorial':      'Em Atendimento',
      'atendimento_concluido':            'Concluído',
    };
    return mapa[normalizeStatus(status)] ?? getStatusLabel(status) ?? '—';
  }

  getStatusClass(status: string): string {
    const normalized = normalizeStatus(status);
    if (normalized === 'atendimento_concluido') return 'bg-green-100 text-green-800';
    if (normalized?.includes('atendimento')) return 'bg-blue-100 text-blue-800';
    if (normalized?.includes('triagem')) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-700';
  }

  getRiscoClass(risco: string): string {
    const mapa: Record<string, string> = {
      vermelho: 'bg-red-500',
      laranja:  'bg-orange-400',
      amarelo:  'bg-yellow-400',
      verde:    'bg-green-500',
      azul:     'bg-blue-400',
    };
    return mapa[(risco || '').toLowerCase()] ?? 'bg-gray-300';
  }

  calcularDuracao(inicio: string, fim: string): string {
    if (!inicio) return '—';
    const start = new Date(inicio).getTime();
    const end   = fim ? new Date(fim).getTime() : Date.now();
    const mins  = Math.round((end - start) / 60_000);
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}min`;
  }
}
