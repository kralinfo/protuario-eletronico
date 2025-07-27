import { Component, OnInit } from '@angular/core';
import { AtendimentoService } from '../services/atendimento.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog.component';
// import { CommonModule } from '@angular/common';
// import { FormsModule } from '@angular/forms';

import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-atendimentos-dia',
  templateUrl: './atendimentos-dia.component.html',
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

  constructor(private atendimentoService: AtendimentoService, private dialog: MatDialog) {}

  ngOnInit() {
    this.carregarAtendimentos();
  }

  carregarAtendimentos() {
    this.loading = true;
    this.atendimentoService.listarAtendimentosDoDia().subscribe((dados: any[]) => {
      this.atendimentos = dados;
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
    // Exemplo: navegar para tela de edição ou abrir modal
    // this.router.navigate(['/atendimentos/editar', atendimento.id]);
    alert('Função de edição de atendimento ainda não implementada.');
  }

  imprimirAtendimentoPDF(atendimento: any) {
    // Exemplo: gerar PDF simples
    const doc = new (window as any).jsPDF();
    doc.text(`Ficha de Atendimento\n\nPaciente: ${atendimento.paciente_nome}\nMotivo: ${atendimento.motivo}\nData: ${atendimento.data_hora_atendimento}\nStatus: ${atendimento.status}`, 10, 10);
    doc.save(`atendimento_${atendimento.id}.pdf`);
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
}
