/**
 * AtendimentosDiaComponent - Refactored
 * Responsabilidade: Orquestração da lista de atendimentos do dia
 * Extracted: Pagination, Filtering, Print, Realtime listeners
 */

import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DatePipe } from '@angular/common';
import { AtendimentoService } from '../services/atendimento.service';
import { PdfGeneratorService } from '../services/pdf-generator.service';
import { RealtimeService } from '../services/realtime.service';
import { AtendimentosPaginationService } from '../services/atendimentos-pagination.service';
import { AtendimentosFilterService } from '../services/atendimentos-filter.service';
import { AtendimentosPrintService } from '../services/atendimentos-print.service';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';
import { AbandonoDialogComponent } from '../shared/abandono-dialog/abandono-dialog.component';
import { AuthService } from '../auth/auth.service';

@Component({
  selector: 'app-atendimentos-dia',
  templateUrl: './atendimentos-dia.component.html',
  styleUrls: ['../shared/styles/table-footer.css'],
  standalone: false,
  providers: [DatePipe]
})
export class AtendimentosDiaComponent implements OnInit, OnDestroy {
  // Data
  atendimentos: any[] = [];
  filtro = '';
  dataInicial: string = '';
  dataFinal: string = '';
  loading = false;
  mostrarFiltroData = true;
  openMenuId: number | null = null;
  menuPos = { top: 0, left: 0 };

  constructor(
    private atendimentoService: AtendimentoService,
    private pdfGeneratorService: PdfGeneratorService,
    private dialog: MatDialog,
    private router: Router,
    private authService: AuthService,
    private realtimeService: RealtimeService,
    private paginationService: AtendimentosPaginationService,
    private filterService: AtendimentosFilterService,
    private printService: AtendimentosPrintService
  ) {
    console.log('🚀 [AtendimentosDia] Inicializando');
  }

  ngOnInit(): void {
    console.log('🔌 [AtendimentosDia] Configurando listeners realtime');

    // Inicializar com data atual
    const hoje = new Date();
    this.dataInicial = hoje.toISOString().slice(0, 10);
    this.dataFinal = hoje.toISOString().slice(0, 10);

    this.loadAtendimentos();

    // Conectar ao WebSocket
    this.realtimeService.connect('atendimentos').then(() => {
      console.log('✅ [AtendimentosDia] Conectado ao WebSocket');
      this.setupRealtimeListeners();
    }).catch(error => {
      console.error('❌ [AtendimentosDia] Erro ao conectar:', error);
    });
  }

  ngOnDestroy(): void {
    console.log('🔌 [AtendimentosDia] Destruindo componente');
    this.realtimeService.disconnect();
  }

  /**
   * Carrega atendimentos do dia
   */
  loadAtendimentos(): void {
    this.loading = true;
    this.atendimentoService.buscarRelatorioAtendimentos({
      dataInicial: this.dataInicial,
      dataFinal: this.dataFinal
    }).subscribe(
      (res: any) => {
        this.atendimentos = res.data || [];
        this.updatePagination();
        this.loading = false;
      },
      () => { this.loading = false; }
    );
  }

  /**
   * Atualiza status de paginação
   */
  private updatePagination(): void {
    const filtrados = this.getFilteredItems();
    this.paginationService.calculateTotalPages(filtrados.length);
  }

  /**
   * Retorna items filtrados
   */
  private getFilteredItems(): any[] {
    return this.filterService.filterByText(this.atendimentos, this.filtro);
  }

  /**
   * Retorna items filtrados e paginados
   */
  get atendimentosFiltrados(): any[] {
    const filtrados = this.getFilteredItems();
    return this.paginationService.paginate(filtrados);
  }

  /**
   * Configura listeners de eventos realtime
   */
  private setupRealtimeListeners(): void {
    console.log('📡 [AtendimentosDia] Registrando listeners');

    this.realtimeService.onPatientTransferred().subscribe(data => {
      console.log('📤 [AtendimentosDia] Paciente saiu:', data.patientName);
      const index = this.atendimentos.findIndex(a => a.paciente_id === data.patientId);
      if (index > -1) {
        this.atendimentos.splice(index, 1);
        this.updatePagination();
      }
    });

    this.realtimeService.onPatientArrived().subscribe(() => {
      console.log('🆕 [AtendimentosDia] Novo paciente chegou');
      this.loadAtendimentos();
    });

    console.log('✅ [AtendimentosDia] Listeners configurados');
  }

  /**
   * Tratamento de cliques no documento
   */
  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuId = null;
  }

  /**
   * Alterna visibilidade do menu
   */
  toggleMenu(event: Event, id: number): void {
    event.stopPropagation();
    if (this.openMenuId === id) {
      this.openMenuId = null;
    } else {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      this.menuPos = { top: rect.bottom + 4, left: rect.left };
      this.openMenuId = id;
    }
  }

  /**
   * Verifica se pode finalizar atendimento
   */
  get podeFinalizarAtendimento(): boolean {
    return this.authService.getSelectedModule() !== 'recepcao';
  }

  // ============ PAGINATION ============

  paginaAnterior(): void {
    this.paginationService.previousPage();
  }

  proximaPagina(): void {
    this.paginationService.nextPage();
  }

  goToFirstPage(): void {
    this.paginationService.goToFirstPage();
  }

  goToLastPage(): void {
    this.paginationService.goToLastPage();
  }

  onPageSizeChange(event: any): void {
    this.paginationService.setPageSize(+event.target.value);
    this.updatePagination();
  }

  get paginaAtual(): number {
    return this.paginationService.currentPage;
  }

  get itensPorPagina(): number {
    return this.paginationService.pageSize;
  }

  get pageSizeOptions(): number[] {
    return this.paginationService.pageSizeOptions;
  }

  get totalPaginas(): number {
    return this.paginationService.totalPages;
  }

  get canPrevious(): boolean {
    return this.paginationService.canPrevious;
  }

  get canNext(): boolean {
    return this.paginationService.canNext;
  }

  // ============ OPERATIONS ============

  editarAtendimento(atendimento: any): void {
    if (atendimento.abandonado) {
      this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Edição não permitida',
          message: 'Não é possível editar um atendimento abandonado.',
          type: 'warning'
        }
      });
      return;
    }
    this.router.navigate(['/atendimentos/editar', atendimento.id]);
  }

  imprimirAtendimento(atendimento: any): void {
    const printWindow = this.printService.openPrintWindow();
    if (!printWindow) {
      this.showError('Não foi possível abrir a janela de impressão');
      return;
    }

    const htmlContent = this.printService.generatePrintHTML(atendimento);
    this.printService.writePrintContent(printWindow, htmlContent);
    this.printService.triggerPrint(printWindow);
  }

  gerarPDF(atendimento: any): void {
    try {
      this.pdfGeneratorService.gerarPDFAtendimento(atendimento);
    } catch (error: any) {
      this.showError(`Erro ao gerar PDF: ${error?.message}`);
    }
  }

  registrarAbandono(atendimento: any): void {
    const dialogRef = this.dialog.open(AbandonoDialogComponent, {
      data: { atendimento },
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.atendimentoService.registrarAbandono(atendimento.id, result).subscribe(
          () => {
            this.loadAtendimentos();
            this.showSuccess('Abandono registrado com sucesso!');
          },
          error => {
            console.error('Erro:', error);
            this.showError('Falha ao registrar abandono');
          }
        );
      }
    });
  }

  removerAtendimento(id: number): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar exclusão',
        message: 'Deseja realmente remover este atendimento?'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.atendimentoService.removerAtendimento(id).subscribe(
          () => {
            this.loadAtendimentos();
            this.showSuccess('Atendimento excluído com sucesso!');
          },
          () => this.showError('Falha ao excluir atendimento')
        );
      }
    });
  }

  finalizarAtendimento(atendimento: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Finalizar Atendimento',
        message: `Confirma a finalização do atendimento de ${atendimento.paciente_nome}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.atendimentoService.atualizarStatus(atendimento.id, 'finalizado').subscribe(
          () => {
            this.loadAtendimentos();
            this.showSuccess('Atendimento finalizado com sucesso!');
          },
          () => this.showError('Falha ao finalizar atendimento')
        );
      }
    });
  }

  // ============ HELPERS ============

  private showSuccess(message: string): void {
    const ref = this.dialog.open(FeedbackDialogComponent, {
      data: { title: 'Sucesso', message, type: 'success' }
    });
    setTimeout(() => ref.close(), 2000);
  }

  private showError(message: string): void {
    const ref = this.dialog.open(FeedbackDialogComponent, {
      data: { title: 'Erro', message, type: 'error' }
    });
    setTimeout(() => ref.close(), 2500);
  }
}
