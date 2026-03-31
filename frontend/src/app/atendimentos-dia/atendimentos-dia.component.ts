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
    // Carregar brasão e converter para data URL para a janela de impressão
    const img = new window.Image();
    img.src = 'assets/brasao-alianca.png';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const logoDataUrl = canvas.toDataURL('image/png');

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
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 20mm; color: #222; font-size: 11px; }
            .inst-header { display: flex; align-items: center; margin-bottom: 6px; padding-bottom: 6px; }
            .brasao { width: 72px; height: 72px; margin-right: 14px; object-fit: contain; }
            .inst-name { font-size: 14px; font-weight: bold; margin-bottom: 1px; }
            .inst-dept, .inst-unit { font-size: 10px; margin-bottom: 1px; }
            .inst-addr { font-size: 9px; color: #555; }
            .title-bar { text-align: center; font-size: 14px; font-weight: bold; padding: 7px 0; border-top: 2px solid #333; border-bottom: 2px solid #333; margin-bottom: 14px; letter-spacing: 1px; }
            .section { border: 1px solid #aaa; border-radius: 4px; padding: 10px 14px; margin-bottom: 10px; }
            .section-title { font-weight: bold; font-size: 11px; color: #1565c0; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
            .field { margin: 5px 0; font-size: 11px; line-height: 1.6; }
            .label { font-weight: bold; color: #333; }
            .status-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; }
            .status-badge.abandonado { background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; }
            .status-badge.concluido { background-color: #dcfce7; color: #16a34a; border: 1px solid #86efac; }
            .status-badge.recepcao { background-color: #fef3c7; color: #d97706; border: 1px solid #fcd34d; }
            .status-badge.triagem, .status-badge.encaminhado { background-color: #dbeafe; color: #2563eb; border: 1px solid #93c5fd; }
            .signature-area { margin-top: 50px; text-align: center; }
            .signature-line { width: 55%; border-top: 1px solid #666; margin: 0 auto 4px; }
            .signature-label { font-size: 10px; color: #666; }
            .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #999; border-top: 1px solid #ddd; padding-top: 6px; }
            @media print { body { margin: 15mm; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="inst-header">
            <img src="${logoDataUrl}" alt="Brasão Aliança" class="brasao" />
            <div>
              <div class="inst-name">PREFEITURA DA ALIANÇA</div>
              <div class="inst-dept">SECRETARIA MUNICIPAL DE SAÚDE</div>
              <div class="inst-unit">UNIDADE MISTA MUNICIPAL DE ALIANÇA</div>
              <div class="inst-addr">Rua Marechal Deodoro, s/n - Aliança - PE - CEP: 55.890-000</div>
              <div class="inst-addr">Fones: 3637.1340 / 3637.1388</div>
              <div class="inst-addr">E-mail: unidademista2009@hotmail.com</div>
            </div>
          </div>

          <div class="title-bar">FICHA DE ATENDIMENTO</div>

          <div class="section">
            <div class="section-title">Dados do Atendimento</div>
            <div class="field"><span class="label">Paciente:</span> ${atendimento.paciente_nome}</div>
            <div class="field"><span class="label">Data/Hora:</span> ${new Date(atendimento.data_hora_atendimento).toLocaleString('pt-BR')}</div>
            <div class="field">
              <span class="label">Status:</span>
              <span class="status-badge ${atendimento.abandonado ? 'abandonado' : atendimento.status}">
                ${atendimento.abandonado ? 'ABANDONADO' : atendimento.status?.toUpperCase()}
              </span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Informações Clínicas</div>
            <div class="field"><span class="label">Motivo:</span> ${atendimento.motivo || '-'}</div>
            ${atendimento.observacoes ? '<div class="field"><span class="label">Observações:</span> ' + atendimento.observacoes + '</div>' : ''}
          </div>

          ${atendimento.acompanhante || atendimento.procedencia ? '<div class="section"><div class="section-title">Informações Complementares</div>' + (atendimento.acompanhante ? '<div class="field"><span class="label">Acompanhante:</span> ' + atendimento.acompanhante + '</div>' : '') + (atendimento.procedencia ? '<div class="field"><span class="label">Procedência:</span> ' + atendimento.procedencia + '</div>' : '') + '</div>' : ''}

          ${atendimento.abandonado && atendimento.motivo_abandono ? '<div class="section"><div class="section-title">Registro de Abandono</div><div class="field"><span class="label">Motivo do Abandono:</span> ' + atendimento.motivo_abandono + '</div></div>' : ''}

          <div class="signature-area">
            <div class="signature-line"></div>
            <div class="signature-label">Assinatura do Profissional</div>
          </div>

          <div class="footer">
            <div>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</div>
            <div>Sistema e-Prontuário - Unidade Mista Municipal de Aliança-PE</div>
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            }
          </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
    };
  }

  async gerarAtendimentoPDF(atendimento: any) {
    try {
      // Importar jsPDF dinamicamente
      let jsPDF;
      try {
        const jsPDFModule = await import('jspdf');
        jsPDF = jsPDFModule.default;
      } catch (importError) {
        if ((window as any).jsPDF) {
          jsPDF = (window as any).jsPDF;
        } else {
          throw new Error('jsPDF não encontrado');
        }
      }

      if (!jsPDF) {
        const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
          data: { title: 'Erro', message: 'Biblioteca de geração de PDF não encontrada.', type: 'error' }
        });
        setTimeout(() => feedbackRef.close(), 3000);
        return;
      }

      // Carregar brasão para o cabeçalho institucional
      const brasao = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Erro ao carregar brasão'));
        image.src = 'assets/brasao-alianca.png';
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = 210;

      // Cabeçalho institucional (igual ficha em branco)
      const logoX = 10;
      const logoY = 4;
      const logoH = 32;
      const logoW = 32;
      const textX = logoX + logoW + 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.addImage(brasao, 'PNG', logoX, logoY, logoW, logoH);
      doc.text('PREFEITURA DA ALIANÇA', textX, 13);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('SECRETARIA MUNICIPAL DE SAÚDE', textX, 18);
      doc.text('UNIDADE MISTA MUNICIPAL DE ALIANÇA', textX, 22);
      doc.setFontSize(8);
      doc.text('Rua Marechal Deodoro, s/n - Aliança - PE - CEP: 55.890-000', textX, 26);
      doc.text('Fones: 3637.1340 / 3637.1388', textX, 29);
      doc.text('E-mail: unidademista2009@hotmail.com', textX, 32);

      // Título centralizado
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      const titulo = 'FICHA DE ATENDIMENTO';
      const tituloW = doc.getTextWidth(titulo);
      doc.text(titulo, (pageWidth - tituloW) / 2, 40);

      // Quadro principal
      const marginX = 20;
      const quadroW = 170;
      const quadroH = 215;
      doc.rect(marginX, 45, quadroW, quadroH, 'S');

      // Título da seção
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('DADOS DO ATENDIMENTO', marginX + 5, 52);
      doc.line(marginX, 55, marginX + quadroW, 55);

      // Campos
      doc.setFontSize(10);
      let y = 65;
      const labelX = marginX + 7;
      const valueX = marginX + 55;
      const lineH = 10;

      doc.setFont('helvetica', 'bold');
      doc.text('Data/Hora:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(atendimento.data_hora_atendimento).toLocaleString('pt-BR'), valueX, y);
      y += lineH;

      doc.setFont('helvetica', 'bold');
      doc.text('Status:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(atendimento.abandonado ? 'ABANDONADO' : (atendimento.status?.toUpperCase() || ''), valueX, y);
      y += lineH;

      doc.setFont('helvetica', 'bold');
      doc.text('Paciente:', labelX, y);
      doc.setFont('helvetica', 'normal');
      doc.text(atendimento.paciente_nome || '', valueX, y);
      y += lineH;

      doc.setFont('helvetica', 'bold');
      doc.text('Motivo:', labelX, y);
      doc.setFont('helvetica', 'normal');
      const motivoLines = doc.splitTextToSize(atendimento.motivo || '', quadroW - 65);
      doc.text(motivoLines, valueX, y);
      y += lineH * Math.max(1, motivoLines.length);

      if (atendimento.observacoes) {
        doc.setFont('helvetica', 'bold');
        doc.text('Observações:', labelX, y);
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(atendimento.observacoes, quadroW - 65);
        doc.text(obsLines, valueX, y);
        y += lineH * Math.max(1, obsLines.length);
      }

      if (atendimento.acompanhante) {
        doc.setFont('helvetica', 'bold');
        doc.text('Acompanhante:', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(atendimento.acompanhante, valueX, y);
        y += lineH;
      }

      if (atendimento.procedencia) {
        doc.setFont('helvetica', 'bold');
        doc.text('Procedência:', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(atendimento.procedencia, valueX, y);
        y += lineH;
      }

      if (atendimento.abandonado && atendimento.motivo_abandono) {
        y += 5;
        doc.setFont('helvetica', 'bold');
        doc.text('Motivo do Abandono:', labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(atendimento.motivo_abandono, valueX, y);
      }

      // Assinatura do profissional
      const assinaturaY = 45 + quadroH - 7;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text('Assinatura do Profissional:', marginX + 5, assinaturaY);
      doc.setDrawColor(100);
      doc.line(marginX + 50, assinaturaY + 1, marginX + quadroW - 10, assinaturaY + 1);

      // Rodapé
      doc.setFontSize(8);
      doc.setTextColor(150);
      const pageHeight = doc.internal.pageSize.height;
      const rodape = 'Gerado em: ' + new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR') + ' - Sistema e-Prontuário Aliança-PE';
      const rodapeW = doc.getTextWidth(rodape);
      doc.text(rodape, (pageWidth - rodapeW) / 2, pageHeight - 10);

      doc.save(`atendimento_${atendimento.paciente_nome}_${atendimento.id}.pdf`);

      const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
        data: { title: 'Sucesso', message: 'PDF gerado com sucesso!', type: 'success' }
      });
      setTimeout(() => feedbackRef.close(), 2000);

    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      const feedbackRef = this.dialog.open(FeedbackDialogComponent, {
        data: { title: 'Erro', message: `Erro ao gerar PDF: ${error?.message || 'Erro desconhecido'}`, type: 'error' }
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
