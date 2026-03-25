import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AtendimentoService } from '../services/atendimento.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';
import { AbandonoDialogComponent } from '../shared/abandono-dialog/abandono-dialog.component';
import { AuthService } from '../auth/auth.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-atendimentos-dia',
  templateUrl: './atendimentos-dia.component.html',
  styleUrls: ['../shared/styles/table-footer.css'],
  standalone: false,
  providers: [DatePipe]
})
export class AtendimentosDiaComponent implements OnInit {
  atendimentos: any[] = [];
  filtro = '';
  paginaAtual = 1;
  itensPorPagina = 10;
  totalPaginas = 1;
  pageSizeOptions = [10, 25, 50];
  loading = false;

  // Filtros de data
  dataInicial: string = '';
  dataFinal: string = '';
  // O filtro de data deve estar sempre visível
  mostrarFiltroData = true;
  openMenuId: number | null = null;
  menuPos = { top: 0, left: 0 };

  @HostListener('document:click')
  onDocumentClick() {
    this.openMenuId = null;
  }

  toggleMenu(event: Event, id: number) {
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

  // Verificar se o usuário pode dar baixa no atendimento (não é módulo recepção)
  get podeFinalizarAtendimento(): boolean {
    return this.authService.getSelectedModule() !== 'recepcao';
  }

  constructor(private atendimentoService: AtendimentoService, private dialog: MatDialog, private router: Router, private authService: AuthService) {}

  ngOnInit() {
    // Inicializar com a data atual
    const hoje = new Date();
    this.dataInicial = hoje.toISOString().slice(0, 10);
    this.dataFinal = hoje.toISOString().slice(0, 10);
    this.carregarAtendimentos();
  }

  carregarAtendimentos() {
    this.loading = true;
    this.atendimentoService.buscarRelatorioAtendimentos({
      dataInicial: this.dataInicial,
      dataFinal: this.dataFinal
    }).subscribe((res: any) => {
      this.atendimentos = res.data || [];
      this.totalPaginas = Math.max(1, Math.ceil(this.atendimentosFiltradosSemPaginacao.length / this.itensPorPagina));
      this.paginaAtual = 1;
      this.loading = false;
    }, () => { this.loading = false; });
  }

  get atendimentosFiltradosSemPaginacao() {
    if (!this.filtro) return this.atendimentos;
    return this.atendimentos.filter(a =>
      a.paciente_nome?.toLowerCase().includes(this.filtro.toLowerCase()) ||
      a.motivo?.toLowerCase().includes(this.filtro.toLowerCase())
    );
  }

  get atendimentosFiltrados() {
    const inicio = (this.paginaAtual - 1) * this.itensPorPagina;
    const fim = inicio + this.itensPorPagina;
    return this.atendimentosFiltradosSemPaginacao.slice(inicio, fim);
  }

  paginaAnterior() {
    if (this.paginaAtual > 1) {
      this.paginaAtual--;
    }
  }

  proximaPagina() {
    if (this.paginaAtual < this.totalPaginas) {
      this.paginaAtual++;
    }
  }

  goToFirstPage() {
    this.paginaAtual = 1;
  }

  goToLastPage() {
    this.paginaAtual = this.totalPaginas;
  }

  onPageSizeChange(event: any) {
    this.itensPorPagina = +event.target.value;
    this.totalPaginas = Math.max(1, Math.ceil(this.atendimentosFiltradosSemPaginacao.length / this.itensPorPagina));
    this.paginaAtual = 1;
  }

  editarAtendimento(atendimento: any) {
    // Verificar se o atendimento foi abandonado
    if (atendimento.abandonado) {
      this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Edição não permitida',
          message: 'Não é possível editar um atendimento que foi abandonado.',
          type: 'warning'
        }
      });
      return;
    }

    // Navegar para o formulário de edição
    this.router.navigate(['/atendimentos/editar', atendimento.id]);
  }

  imprimirAtendimento(atendimento: any) {
    // Criar uma nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Erro',
          message: 'Não foi possível abrir a janela de impressão. Verifique se pop-ups estão bloqueados.',
          type: 'error'
        }
      });
      return;
    }

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ficha de Atendimento - ${atendimento.paciente_nome}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 20px; }
          .info { margin-bottom: 10px; }
          .label { font-weight: bold; }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
          }
          .status.abandonado { background-color: #fee2e2; color: #dc2626; }
          .status.concluido { background-color: #dcfce7; color: #16a34a; }
          .status.recepcao { background-color: #fef3c7; color: #d97706; }
          .status.triagem { background-color: #dbeafe; color: #2563eb; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">FICHA DE ATENDIMENTO</div>
        </div>

        <div class="info">
          <span class="label">Paciente:</span> ${atendimento.paciente_nome}
        </div>

        <div class="info">
          <span class="label">Motivo:</span> ${atendimento.motivo}
        </div>

        ${atendimento.observacoes ? `<div class="info"><span class="label">Observações:</span> ${atendimento.observacoes}</div>` : ''}

        ${atendimento.acompanhante ? `<div class="info"><span class="label">Acompanhante:</span> ${atendimento.acompanhante}</div>` : ''}

        ${atendimento.procedencia ? `<div class="info"><span class="label">Procedência:</span> ${atendimento.procedencia}</div>` : ''}

        <div class="info">
          <span class="label">Data/Hora:</span> ${new Date(atendimento.data_hora_atendimento).toLocaleString('pt-BR')}
        </div>

        <div class="info">
          <span class="label">Status:</span>
          <span class="status ${atendimento.abandonado ? 'abandonado' : atendimento.status}">
            ${atendimento.abandonado ? 'ABANDONADO' : atendimento.status?.toUpperCase()}
          </span>
        </div>

        ${atendimento.abandonado && atendimento.motivo_abandono ?
          `<div class="info"><span class="label">Motivo do Abandono:</span> ${atendimento.motivo_abandono}</div>` : ''}

        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() {
              window.close();
            };
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
  }

  async gerarAtendimentoPDF(atendimento: any) {
    try {
      // Importar jsPDF dinamicamente
      let jsPDF;

      // Tentar importar jsPDF
      try {
        const jsPDFModule = await import('jspdf');
        jsPDF = jsPDFModule.default;
      } catch (importError) {
        // Fallback para window.jsPDF se a importação falhar
        if ((window as any).jsPDF) {
          jsPDF = (window as any).jsPDF;
        } else {
          throw new Error('jsPDF não encontrado');
        }
      }

      if (!jsPDF) {
        const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
          data: {
            title: 'Erro',
            message: 'Biblioteca de geração de PDF não encontrada. Verifique se o jsPDF está instalado.',
            type: 'error'
          }
        });
        setTimeout(() => feedbackRef.close(), 3000);
        return;
      }

      // Gerar PDF do atendimento
      const doc = new jsPDF();

      // Configurar fonte e título
      doc.setFontSize(16);
      doc.text('FICHA DE ATENDIMENTO', 20, 20);

      doc.setFontSize(12);
      let yPosition = 40;

      // Dados do paciente
      doc.text(`Paciente: ${atendimento.paciente_nome}`, 20, yPosition);
      yPosition += 10;

      doc.text(`Motivo: ${atendimento.motivo}`, 20, yPosition);
      yPosition += 10;

      if (atendimento.observacoes) {
        doc.text(`Observações: ${atendimento.observacoes}`, 20, yPosition);
        yPosition += 10;
      }

      if (atendimento.acompanhante) {
        doc.text(`Acompanhante: ${atendimento.acompanhante}`, 20, yPosition);
        yPosition += 10;
      }

      if (atendimento.procedencia) {
        doc.text(`Procedência: ${atendimento.procedencia}`, 20, yPosition);
        yPosition += 10;
      }

      doc.text(`Data/Hora: ${new Date(atendimento.data_hora_atendimento).toLocaleString('pt-BR')}`, 20, yPosition);
      yPosition += 10;

      doc.text(`Status: ${atendimento.status?.toUpperCase()}`, 20, yPosition);
      yPosition += 10;

      if (atendimento.abandonado) {
        doc.text(`ATENDIMENTO ABANDONADO`, 20, yPosition);
        if (atendimento.motivo_abandono) {
          yPosition += 10;
          doc.text(`Motivo do Abandono: ${atendimento.motivo_abandono}`, 20, yPosition);
        }
      }

      // Salvar o PDF
      doc.save(`atendimento_${atendimento.paciente_nome}_${atendimento.id}.pdf`);

      // Mostrar feedback de sucesso
      const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Sucesso',
          message: 'PDF gerado com sucesso!',
          type: 'success'
        }
      });
      setTimeout(() => feedbackRef.close(), 2000);

    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
        data: {
          title: 'Erro',
          message: `Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}`,
          type: 'error'
        }
      });
      setTimeout(() => feedbackRef.close(), 3000);
    }
  }

  registrarAbandono(atendimento: any) {
    // Criar dialog customizado para abandono
    const dialogRef = this.dialog.open(AbandonoDialogComponent, {
      data: {
        atendimento: atendimento
      },
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.atendimentoService.registrarAbandono(atendimento.id, result).subscribe({
          next: () => {
            this.carregarAtendimentos();
            const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
              data: {
                title: 'Abandono Registrado',
                message: 'Atendimento marcado como abandonado com sucesso!',
                type: 'success'
              }
            });
            setTimeout(() => feedbackRef.close(), 2000);
          },
          error: (error: any) => {
            console.error('Erro ao registrar abandono:', error);
            const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
              data: {
                title: 'Erro',
                message: 'Falha ao registrar abandono. Tente novamente.',
                type: 'error'
              }
            });
            setTimeout(() => feedbackRef.close(), 2500);
          }
        });
      }
    });
  }

  removerAtendimento(id: number) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar exclusão',
        message: 'Deseja realmente remover este atendimento?'
      }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.atendimentoService.removerAtendimento(id).subscribe({
          next: () => {
            this.carregarAtendimentos();
            const dialogRef = this.dialog.open(FeedbackDialogComponent, {
              data: {
                title: 'Sucesso',
                message: 'Atendimento excluído com sucesso!',
                type: 'success'
              }
            });
            setTimeout(() => dialogRef.close(), 1800);
          },
          error: () => {
            const dialogRef = this.dialog.open(FeedbackDialogComponent, {
              data: {
                title: 'Erro',
                message: 'Falha ao excluir atendimento. Tente novamente.',
                type: 'error'
              }
            });
            setTimeout(() => dialogRef.close(), 2200);
          }
        });
      }
    });
  }

  finalizarAtendimento(atendimento: any) {
    // Confirmar finalização
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Finalizar Atendimento',
        message: `Confirma a finalização do atendimento do paciente ${atendimento.paciente_nome}?`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Atualizar status para 'concluido', mantendo outros dados
        const dadosAtualizacao = {
          motivo: atendimento.motivo,
          observacoes: atendimento.observacoes,
          status: 'concluido',
          procedencia: atendimento.procedencia,
          acompanhante: atendimento.acompanhante
        };

        this.atendimentoService.atualizarAtendimento(atendimento.id, dadosAtualizacao).subscribe({
          next: () => {
            this.dialog.open(FeedbackDialogComponent, {
              data: {
                title: 'Sucesso',
                message: 'Atendimento finalizado com sucesso!',
                type: 'success'
              }
            });
            // Recarregar lista
            this.carregarAtendimentos();
          },
          error: (err) => {
            this.dialog.open(FeedbackDialogComponent, {
              data: {
                title: 'Erro',
                message: err?.error?.message || 'Erro ao finalizar atendimento.',
                type: 'error'
              }
            });
          }
        });
      }
    });
  }

  toggleFiltroData() {
    this.mostrarFiltroData = !this.mostrarFiltroData;
  }

  aplicarFiltroData() {
    if (this.dataInicial && this.dataFinal) {
      if (this.dataInicial > this.dataFinal) {
        this.dialog.open(FeedbackDialogComponent, {
          data: {
            title: 'Data inválida',
            message: 'A data inicial não pode ser maior que a data final.',
            type: 'warning'
          }
        });
        return;
      }
      this.carregarAtendimentos();
    }
  }

  limparFiltroData() {
    const hoje = new Date();
    this.dataInicial = hoje.toISOString().slice(0, 10);
    this.dataFinal = hoje.toISOString().slice(0, 10);
    this.carregarAtendimentos();
  }

  formatarPeriodo(): string {
    if (this.dataInicial === this.dataFinal) {
      return new Date(this.dataInicial + 'T00:00:00').toLocaleDateString('pt-BR');
    } else {
      const inicio = new Date(this.dataInicial + 'T00:00:00').toLocaleDateString('pt-BR');
      const fim = new Date(this.dataFinal + 'T00:00:00').toLocaleDateString('pt-BR');
      return `${inicio} até ${fim}`;
    }
  }
}
