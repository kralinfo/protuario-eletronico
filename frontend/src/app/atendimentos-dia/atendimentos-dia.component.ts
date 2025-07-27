import { Component, OnInit } from '@angular/core';
import { AtendimentoService } from '../services/atendimento.service';
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

  constructor(private atendimentoService: AtendimentoService) {}

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
    // Implementar lógica de edição se necessário
  }

  imprimirAtendimentoPDF(atendimento: any) {
    // Implementar lógica de impressão PDF se necessário
  }

  removerAtendimento(id: number) {
    // Implementar lógica de remoção se necessário
  }
}
