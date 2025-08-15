import * as jsPDF from 'jspdf';
import { Component, OnInit } from '@angular/core';
import { AtendimentoService } from '../services/atendimento.service';

import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { dataMaxHojeValidator, datasInicioFimValidator } from '../utils/validators-util';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-relatorio-atendimentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './relatorio-atendimentos.component.html',
  styleUrls: ['./relatorio-atendimentos.component.scss', '../shared/styles/table-footer.css']
})
export class RelatorioAtendimentosComponent implements OnInit {
  filtrosForm: FormGroup;
  get dataInicial() { return this.filtrosForm.get('dataInicial')?.value; }
  get dataFinal() { return this.filtrosForm.get('dataFinal')?.value; }
  get status() { return this.filtrosForm.get('status')?.value; }
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

  constructor(private fb: FormBuilder, private atendimentoService: AtendimentoService) {
    this.filtrosForm = this.fb.group({
      dataInicial: ['', [dataMaxHojeValidator]],
      dataFinal: ['', [dataMaxHojeValidator]],
      status: [''],
      nomePaciente: ['']
    }, { validators: datasInicioFimValidator });
  }

  ngOnInit() {
    this.carregarAtendimentosReais();
  }

  carregarAtendimentosReais() {
    this.loading = true;
    this.atendimentoService.listarTodosAtendimentos().subscribe({
      next: (atendimentos: any[]) => {
        console.log('Total de atendimentos retornados pela API:', atendimentos.length);
        this.relatorio = atendimentos.map((a: any) => ({
          data: a.created_at ? new Date(a.created_at) : new Date(),
          paciente_nome: a.paciente_nome || '',
          profissional: a.usuario_id || '',
          procedimento: a.procedencia || '',
          observacoes: a.observacoes || '',
          status: a.status || ''
        }));
        console.log('Total de atendimentos processados:', this.relatorio.length);
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erro ao buscar atendimentos:', error);
        this.loading = false;
      }
    });
  }

  // Totalização por status para o card
  getTotalStatus(): number {
    return this.relatorio.length;
  }
  getStatusList(): { status: string, total: number }[] {
    // Status possíveis conforme cadastro
    const statusPossiveis = [
      { key: 'encaminhado_para_triagem', label: 'Encaminhado para Triagem' },
      { key: 'em_triagem', label: 'Em Triagem' },
      { key: 'encaminhado_para_sala_medica', label: 'Encaminhado para Sala Médica' },
      { key: 'em_atendimento_medico', label: 'Em Atendimento Médico' },
      { key: 'encaminhado_para_ambulatorio', label: 'Encaminhado para Ambulatório' },
      { key: 'em_atendimento_ambulatorial', label: 'Em Atendimento Ambulatorial' },
      { key: 'encaminhado_para_exames', label: 'Encaminhado para Exames' }
    ];
    const statusMap: { [key: string]: number } = {};

    // Processa cada atendimento individualmente
    this.relatorio.forEach((r, index) => {
      const status = r.status || '';
      console.log(`Atendimento ${index + 1}: Status original: "${status}", Paciente: ${r.paciente_nome}`);

      // Mapeia os status conforme aparecem no banco
      let statusKey = '';
      if (status.toLowerCase() === 'recepcao') {
        statusKey = 'recepcao';
      } else if (status.toLowerCase() === 'triagem') {
        statusKey = 'triagem';
      } else if (status.toLowerCase() === 'sala_medica') {
        statusKey = 'sala_medica';
      } else if (status.toLowerCase() === 'ambulatorio') {
        statusKey = 'ambulatorio';
      } else if (status.toLowerCase() === 'finalizado') {
        statusKey = 'finalizado';
      } else if (status.toLowerCase() === 'interrompido') {
        statusKey = 'interrompido';
      }

      if (statusKey) {
        statusMap[statusKey] = (statusMap[statusKey] || 0) + 1;
        console.log(`Status mapeado: ${statusKey}, Total atual: ${statusMap[statusKey]}`);
      } else {
        console.warn(`Status não reconhecido: "${status}"`);
      }
    });

    console.log('Mapa de status final:', statusMap);
    console.log('Total de atendimentos processados:', this.relatorio.length);
    return statusPossiveis.map(s => ({ status: s.label, total: statusMap[s.key] || 0 }));
  }

  buscarRelatorio() {
    this.loading = true;
    this.atendimentoService.listarTodosAtendimentos().subscribe({
      next: (atendimentos: any[]) => {
        const filtros = this.filtrosForm.value;
        let filtrados = atendimentos;
        if (filtros.dataInicial) {
          const dataIni = new Date(filtros.dataInicial);
          filtrados = filtrados.filter((a: any) => new Date(a.created_at) >= dataIni);
        }
        if (filtros.dataFinal) {
          const dataFim = new Date(filtros.dataFinal);
          dataFim.setHours(23,59,59,999);
          filtrados = filtrados.filter((a: any) => new Date(a.created_at) <= dataFim);
        }
        if (filtros.status) {
          filtrados = filtrados.filter((a: any) => (a.status || 'Sem status') === filtros.status);
        }
        if (filtros.nomePaciente) {
          const nomePacienteLower = filtros.nomePaciente.toLowerCase();
          filtrados = filtrados.filter((a: any) => (a.paciente_nome || '').toLowerCase().includes(nomePacienteLower));
        }
        this.relatorio = filtrados.map((a: any) => ({
          data: a.created_at ? new Date(a.created_at) : new Date(),
          paciente_nome: a.paciente_nome || '',
          profissional: a.usuario_id || '',
          procedimento: a.procedencia || '',
          observacoes: a.observacoes || '',
          status: a.status || ''
        }));
        this.currentPage = 0;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Erro ao buscar atendimentos:', error);
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
      doc.text(item.paciente_nome, 60, y);
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
      doc.text(item.paciente_nome, 50, y);
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
