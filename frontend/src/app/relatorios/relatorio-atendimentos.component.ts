import * as jsPDF from 'jspdf';
import { Component } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-relatorio-atendimentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './relatorio-atendimentos.component.html',
  styleUrls: ['./relatorio-atendimentos.component.scss']
})
export class RelatorioAtendimentosComponent {
  dataInicial: string = '';
  dataFinal: string = '';
  profissional: string = '';
  profissionais = [
    { id: '1', nome: 'Dra. Ana' },
    { id: '2', nome: 'Dr. João' },
    { id: '3', nome: 'Enf. Maria' }
  ];
  relatorio: any[] = [];
  pageSizeOptions = [5, 10, 20, 30, 50];
  pageSize = 10;
  currentPage = 0;

  get paginatedRelatorio() {
    const start = this.currentPage * this.pageSize;
    return this.relatorio.slice(start, start + this.pageSize);
  }
  get totalPages() {
    return Math.ceil(this.relatorio.length / this.pageSize) || 1;
  }

  goToFirstPage() { this.currentPage = 0; }
  goToPreviousPage() { if (this.currentPage > 0) this.currentPage--; }
  goToNextPage() { if (this.currentPage < this.totalPages - 1) this.currentPage++; }
  goToLastPage() { this.currentPage = this.totalPages - 1; }
  onPageSizeChange(event: any) {
    this.pageSize = +event.target.value;
    this.currentPage = 0;
  }

  loading = false;

  ngOnInit() {
    this.carregarUltimosAtendimentos();
  }

  carregarUltimosAtendimentos() {
    this.loading = true;
    setTimeout(() => {
      // Simula 30 atendimentos recentes
      const profissionais = ['Dra. Ana', 'Dr. João', 'Enf. Maria'];
      const procedimentos = ['Consulta', 'Retorno', 'Exame', 'Vacina'];
      const nomes = ['José da Silva', 'Maria Souza', 'Carlos Lima', 'Ana Paula', 'João Pedro', 'Fernanda Alves', 'Lucas Rocha', 'Patrícia Gomes'];
      this.relatorio = Array.from({ length: 30 }).map((_, i) => {
        const data = new Date();
        data.setDate(data.getDate() - i);
        return {
          data,
          paciente: nomes[Math.floor(Math.random() * nomes.length)],
          profissional: profissionais[Math.floor(Math.random() * profissionais.length)],
          procedimento: procedimentos[Math.floor(Math.random() * procedimentos.length)],
          observacoes: 'Atendimento gerado automaticamente.'
        };
      });
      this.loading = false;
    }, 800);
  }

  // Funções para totalização dos cards
  getTotalPorProfissional(nome: string): number {
    return this.relatorio.filter(r => r.profissional === nome).length;
  }
  getTotalPorProcedimento(nome: string): number {
    return this.relatorio.filter(r => r.procedimento === nome).length;
  }

  buscarRelatorio() {
    this.loading = true;
    setTimeout(() => {
      // Simula 50 atendimentos para filtrar
      const profissionais = ['Dra. Ana', 'Dr. João', 'Enf. Maria'];
      const procedimentos = ['Consulta', 'Retorno', 'Exame', 'Vacina'];
      const nomes = ['José da Silva', 'Maria Souza', 'Carlos Lima', 'Ana Paula', 'João Pedro', 'Fernanda Alves', 'Lucas Rocha', 'Patrícia Gomes'];
      const atendimentos = Array.from({ length: 50 }).map((_, i) => {
        const data = new Date();
        data.setDate(data.getDate() - i);
        return {
          data,
          paciente: nomes[Math.floor(Math.random() * nomes.length)],
          profissional: profissionais[Math.floor(Math.random() * profissionais.length)],
          procedimento: procedimentos[Math.floor(Math.random() * procedimentos.length)],
          observacoes: 'Atendimento gerado automaticamente.'
        };
      });

      // Filtros
      let filtrados = atendimentos;
      if (this.dataInicial) {
        const dataIni = new Date(this.dataInicial);
        filtrados = filtrados.filter(a => new Date(a.data) >= dataIni);
      }
      if (this.dataFinal) {
        const dataFim = new Date(this.dataFinal);
        // Considera o fim do dia
        dataFim.setHours(23,59,59,999);
        filtrados = filtrados.filter(a => new Date(a.data) <= dataFim);
      }
      if (this.profissional) {
        // O select usa o id, então converte id para nome
        const profObj = this.profissionais.find(p => p.id === this.profissional);
        if (profObj) {
          filtrados = filtrados.filter(a => a.profissional === profObj.nome);
        }
      }
      this.relatorio = filtrados;
      this.currentPage = 0;
      this.loading = false;
    }, 800);
  }
  gerarRelatorioSimples() {
    const doc = new jsPDF.jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Simples de Atendimentos', 20, 20);
    doc.setFontSize(12);
    let y = 35;
    doc.text('Data', 20, y);
    doc.text('Paciente', 60, y);
    doc.text('Profissional', 130, y);
    y += 8;
    doc.setLineWidth(0.2);
    doc.line(20, y - 5, 190, y - 5);
    this.relatorio.forEach(item => {
      doc.text(new Date(item.data).toLocaleDateString('pt-BR'), 20, y);
      doc.text(item.paciente, 60, y);
      doc.text(item.profissional, 130, y);
      y += 8;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save('relatorio-simples-atendimentos.pdf');
  }

  gerarRelatorioDetalhado() {
    const doc = new jsPDF.jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Detalhado de Atendimentos', 20, 20);
    doc.setFontSize(12);
    let y = 35;
    doc.text('Data', 20, y);
    doc.text('Paciente', 50, y);
    doc.text('Profissional', 100, y);
    doc.text('Procedimento', 140, y);
    y += 8;
    doc.text('Observações', 20, y);
    y += 8;
    doc.setLineWidth(0.2);
    doc.line(20, y - 13, 190, y - 13);
    this.relatorio.forEach(item => {
      doc.text(new Date(item.data).toLocaleDateString('pt-BR'), 20, y);
      doc.text(item.paciente, 50, y);
      doc.text(item.profissional, 100, y);
      doc.text(item.procedimento, 140, y);
      y += 8;
      doc.text(item.observacoes, 20, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save('relatorio-detalhado-atendimentos.pdf');
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
