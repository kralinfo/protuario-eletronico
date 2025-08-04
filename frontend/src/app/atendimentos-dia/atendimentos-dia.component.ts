import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AtendimentoService } from '../services/atendimento.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';
import { AbandonoDialogComponent } from '../shared/abandono-dialog.component';
// import { EditarAtendimentoDialogComponent } from '../shared/editar-atendimento-dialog.component';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';

import { FormsModule } from '@angular/forms';
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
  pageSizeOptions = [5, 10, 20, 50];
  loading = false;

  constructor(private atendimentoService: AtendimentoService, private dialog: MatDialog, private router: Router) {}

  ngOnInit() {
    this.carregarAtendimentos();
  }

  carregarAtendimentos() {
    this.loading = true;
    // Exemplo de filtro: data do dia atual
    const hoje = new Date();
    const dataInicial = hoje.toISOString().slice(0, 10);
    const dataFinal = dataInicial;
    this.atendimentoService.buscarRelatorioAtendimentos({ dataInicial, dataFinal }).subscribe((res: any) => {
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

  imprimirAtendimentoPDF(atendimento: any) {
    // Exemplo: gerar PDF simples
    const doc = new (window as any).jsPDF();
    doc.text(`Ficha de Atendimento\n\nPaciente: ${atendimento.paciente_nome}\nMotivo: ${atendimento.motivo}\nData: ${atendimento.data_hora_atendimento}\nStatus: ${atendimento.status}`, 10, 10);
    doc.save(`atendimento_${atendimento.id}.pdf`);
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
}
