import * as jsPDF from 'jspdf';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { dataMaxHojeValidator, datasInicioFimValidator } from '../utils/validators-util';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-relatorio-atendimentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './relatorio-atendimentos.component.html',
  styleUrls: ['./relatorio-atendimentos.component.scss']
})
export class RelatorioAtendimentosComponent implements OnInit {
  filtrosForm: FormGroup;
  get dataInicial() { return this.filtrosForm.get('dataInicial')?.value; }
  get dataFinal() { return this.filtrosForm.get('dataFinal')?.value; }
  get profissional() { return this.filtrosForm.get('profissional')?.value; }
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

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.filtrosForm = this.fb.group({
      dataInicial: ['', [dataMaxHojeValidator]],
      dataFinal: ['', [dataMaxHojeValidator]],
      profissional: ['']
    }, { validators: datasInicioFimValidator });
  }

  ngOnInit() {
    this.buscarRelatorio();
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
    const filtros = this.filtrosForm.value;
    const params = new URLSearchParams();
    if (filtros.dataInicial) params.append('dataInicial', filtros.dataInicial);
    if (filtros.dataFinal) params.append('dataFinal', filtros.dataFinal);
    if (filtros.profissional) params.append('profissional', filtros.profissional);
    const url = `${environment.apiUrl}/atendimentos/reports${params.toString() ? '?' + params.toString() : ''}`;
    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.relatorio = response.data || [];
        this.currentPage = 0;
        this.loading = false;
      },
      error: (error) => {
        this.relatorio = [];
        this.loading = false;
      }
    });
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
