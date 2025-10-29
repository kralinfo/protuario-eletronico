import * as jsPDF from 'jspdf';
import { Component, OnInit } from '@angular/core';
import { AtendimentoService } from '../services/atendimento.service';

import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { dataMaxHojeValidator, datasInicioFimValidator } from '../utils/validators-util';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DateInputLimiterDirective } from '../shared/directives/data.directive';

@Component({
  selector: 'app-relatorio-atendimentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputLimiterDirective],
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
      nomePaciente: [''],
      observacoes: ['']
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

  // Novos métodos para contadores de status específicos
  getAtendimentosEncaminhadosTriagem(): number {
    return this.relatorio.filter(a => 
      a.status === 'triagem pendente' || 
      a.status === 'triagem_pendente' ||
      a.status === 'encaminhado para triagem' ||
      a.status === 'encaminhado_para_triagem'
    ).length;
  }

  getAtendimentosEmTriagem(): number {
    return this.relatorio.filter(a => 
      a.status === 'em_triagem' || 
      a.status === 'em triagem'
    ).length;
  }

  getAtendimentosEmObservacao(): number {
    return this.relatorio.filter(a => 
      a.status === 'em observação' || 
      a.status === 'em_observacao'
    ).length;
  }

  getAtendimentosAguardandoMedico(): number {
    return this.relatorio.filter(a => 
      a.status === 'encaminhado_para_sala_medica' || 
      a.status === 'encaminhado para sala médica' ||
      a.status === 'aguardando' ||
      a.status === 'aguardando_atendimento' ||
      a.status === 'aguardando atendimento'
    ).length;
  }

  getAtendimentosEmAtendimento(): number {
    return this.relatorio.filter(a => 
      a.status === 'em_atendimento_medico' || 
      a.status === 'em atendimento médico' ||
      a.status === 'em_atendimento' ||
      a.status === 'em atendimento' ||
      a.status === 'em_atendimento_ambulatorial' ||
      a.status === 'em atendimento ambulatorial'
    ).length;
  }

  getAtendimentosFinalizados(): number {
    return this.relatorio.filter(a => 
      a.status === 'atendimento_concluido' || 
      a.status === 'atendimento concluido' ||
      a.status === 'finalizado' ||
      a.status === 'alta_ambulatorial' ||
      a.status === 'encaminhado_para_exames' ||
      a.status === 'encaminhado para exames'
    ).length;
  }

  getAtendimentosInterrompidos(): number {
    return this.relatorio.filter(a => 
      a.status === 'interrompido' ||
      a.status === 'abandonado'
    ).length;
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

        // Primeiro normalize os atendimentos para um formato consistente (createdAt: Date)
        const atendimentosNorm = (atendimentos || []).map(a => ({
          ...a,
          createdAt: a.created_at ? new Date(a.created_at) : null,
          paciente_nome: a.paciente_nome || '',
          observacoes: a.observacoes || '',
          status: a.status || ''
        }));

        let filtrados = atendimentosNorm;

        // Helper: parse date input (string from <input type=date> is YYYY-MM-DD) as local Date (avoid UTC shift)
        const parseDateInputToLocal = (input: any): Date | null => {
          if (!input && input !== 0) return null;
          if (input instanceof Date) return new Date(input.getFullYear(), input.getMonth(), input.getDate());
          const s = String(input);
          // common HTML date input format: YYYY-MM-DD
          const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (m) {
            const y = Number(m[1]);
            const mm = Number(m[2]) - 1;
            const d = Number(m[3]);
            return new Date(y, mm, d);
          }
          // fallback to Date parsing, then normalize to local date
          const dobj = new Date(s);
          if (isNaN(dobj.getTime())) return null;
          return new Date(dobj.getFullYear(), dobj.getMonth(), dobj.getDate());
        };

        // Converter filtros de data para objetos Date robustamente e aplicar start/end of day
        const dataInicialLocal = parseDateInputToLocal(filtros.dataInicial);
        if (dataInicialLocal) {
          dataInicialLocal.setHours(0, 0, 0, 0);
          filtrados = filtrados.filter((a: any) => a.createdAt && a.createdAt.getTime() >= dataInicialLocal.getTime());
        }
        const dataFinalLocal = parseDateInputToLocal(filtros.dataFinal);
        if (dataFinalLocal) {
          dataFinalLocal.setHours(23, 59, 59, 999);
          filtrados = filtrados.filter((a: any) => a.createdAt && a.createdAt.getTime() <= dataFinalLocal.getTime());
        }
        if (filtros.status) {
          filtrados = filtrados.filter((a: any) => {
            const status = a.status || '';
            const statusSelecionado = filtros.status;
            
            // Mapeia o status selecionado para todas suas variações
            switch(statusSelecionado) {
              case 'encaminhado_para_triagem':
                return status === 'encaminhado para triagem' || status === 'encaminhado_para_triagem' || status === 'triagem pendente' || status === 'triagem_pendente';
              case 'em_triagem':
                return status === 'em triagem' || status === 'em_triagem';
              case 'encaminhado_para_sala_medica':
                return status === 'encaminhado para sala médica' || status === 'encaminhado_para_sala_medica';
              case 'em_atendimento_medico':
                return status === 'em atendimento médico' || status === 'em_atendimento_medico';
              case 'encaminhado_para_ambulatorio':
                return status === 'encaminhado para ambulatório' || status === 'encaminhado_para_ambulatorio';
              case 'em_observacao':
                return status === 'em observação' || status === 'em_observacao';
              case 'atendimento_concluido':
                return status === 'atendimento concluido' || status === 'atendimento_concluido';
              case 'encaminhado_para_exames':
                return status === 'encaminhado para exames' || status === 'encaminhado_para_exames';
              case 'interrompido':
                return status === 'interrompido';
              case 'abandonado':
                return status === 'abandonado';
              default:
                return status === statusSelecionado;
            }
          });
        }
        if (filtros.nomePaciente) {
          const nomePacienteLower = String(filtros.nomePaciente).toLowerCase();
          filtrados = filtrados.filter((a: any) => (a.paciente_nome || '').toLowerCase().includes(nomePacienteLower));
        }
        if (filtros.observacoes) {
          const observacoesLower = String(filtros.observacoes).toLowerCase();
          filtrados = filtrados.filter((a: any) => (a.observacoes || '').toLowerCase().includes(observacoesLower));
        }

        // Mapear para o formato de exibição com a data normalizada
        this.relatorio = filtrados.map((a: any) => ({
          data: a.createdAt || (a.created_at ? new Date(a.created_at) : new Date()),
          paciente_nome: a.paciente_nome || '',
          profissional: a.usuario_id || '',
          procedimento: a.procedencia || a.procedimento || '',
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
  
  limparFiltros() {
    // Reseta o formulário de filtros e recarrega todos os atendimentos
    this.filtrosForm.reset({ dataInicial: '', dataFinal: '', status: '', nomePaciente: '', observacoes: '' });
    this.currentPage = 0;
    this.relatorio = [];
    // Recarregar atendimentos sem filtros
    this.carregarAtendimentosReais();
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
