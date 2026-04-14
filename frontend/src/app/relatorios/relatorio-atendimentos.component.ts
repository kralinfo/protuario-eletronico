import * as jsPDF from 'jspdf';
import { AfterViewInit, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { AtendimentoService } from '../services/atendimento.service';

import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { dataMaxHojeValidator, datasInicioFimValidator } from '../utils/validators-util';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DateInputLimiterDirective } from '../shared/directives/data.directive';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-relatorio-atendimentos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DateInputLimiterDirective, PaginationComponent],
  templateUrl: './relatorio-atendimentos.component.html',
  styleUrls: ['./relatorio-atendimentos.component.scss', '../shared/styles/table-footer.css']
})
export class RelatorioAtendimentosComponent implements OnInit, AfterViewInit {
  filtrosForm: FormGroup;
  get dataInicial() { return this.filtrosForm.get('dataInicial')?.value; }
  get dataFinal() { return this.filtrosForm.get('dataFinal')?.value; }
  get status() { return this.filtrosForm.get('status')?.value; }

  // Dados brutos (TODOS os atendimentos - usados para contadores fixos)
  todosAtendimentos: any[] = [];

  // Dados filtrados (exibidos na tabela)
  relatorio: any[] = [];

  pageSizeOptions = [10, 25, 50];
  pageSize = 10;
  currentPage = 0;

  // Mapeamento de ABA → STATUS(S) do banco
  private readonly STATUS_MAP: Record<string, string[]> = {
    todas: [],
    triagem_pendente: [
      'encaminhado para triagem',
      'encaminhado_para_triagem',
      'triagem pendente',
      'triagem_pendente'
    ],
    em_triagem: [
      'em triagem',
      'em_triagem'
    ],
    aguardando_medico: [
      'aguardando medico',
      'aguardando médico',
      'aguardando_medico',
      'encaminhado para sala medica',
      'encaminhado para sala médica',
      'encaminhado_para_sala_medica',
      'encaminhado para sala médica',
      '3 - encaminhado para sala médica'
    ],
    em_atendimento: [
      'em atendimento',
      'em atendimento médico',
      'em atendimento medico',
      'em_atendimento',
      'em_atendimento_medico',
      'em atendimento ambulatorial',
      'em_atendimento_ambulatorial',
      '4 - em atendimento médico'
    ],
    finalizados: [
      'atendimento concluido',
      'atendimento concluído',
      'atendimento_concluido',
      'finalizado',
      'alta medica',
      'alta médica',
      'alta_medica',
      'alta ambulatorial',
      'alta_ambulatorial',
      'encaminhado para exames',
      'encaminhado_para_exames',
      '7 - encaminhado para exames',
      '8 - atendimento concluído'
    ],
    interrompidos: [
      'interrompido',
      'abandonado'
    ]
  };

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

  onPageChange(pageOneBased: number) {
    const page = Math.max(0, (pageOneBased || 1) - 1);
    this.currentPage = page;
  }

  loading = false;

  // Abas com indicador animado
  abaAtiva = 'todas';
  @ViewChild('tabIndicator') tabIndicator!: ElementRef<HTMLElement>;
  @ViewChildren('tabButton') tabButtons!: QueryList<ElementRef<HTMLElement>>;

  constructor(private fb: FormBuilder, private atendimentoService: AtendimentoService) {
    this.filtrosForm = this.fb.group({
      dataInicial: ['', [dataMaxHojeValidator]],
      dataFinal: ['', [dataMaxHojeValidator]],
      sexo: [''],
      municipio: [''],
      uf: [''],
      estadoCivil: [''],
      escolaridade: ['']
    }, { validators: datasInicioFimValidator });
  }

  ngOnInit() {
    this.carregarTodosAtendimentos();
  }

  /**
   * Carrega TODOS os atendimentos UMA VEZ (contadores fixos)
   */
  carregarTodosAtendimentos() {
    this.loading = true;
    this.atendimentoService.listarTodosParaRelatorio().subscribe({
      next: (response: any) => {
        const atendimentos: any[] = response.data || response || [];
        // Normaliza e salva TODOS os atendimentos (NUNCA muda)
        this.todosAtendimentos = atendimentos.map(a => ({
          ...a,
          createdAt: a.data_criacao ? new Date(a.data_criacao) : (a.data_hora_atendimento ? new Date(a.data_hora_atendimento) : null),
          data: a.data_hora_atendimento ? new Date(a.data_hora_atendimento) : (a.data_criacao ? new Date(a.data_criacao) : null),
          paciente_nome: a.paciente_nome || '',
          observacoes: a.observacoes || '',
          status: (a.status || '').toLowerCase().trim(),
          sexo: a.paciente_sexo || '',
          municipio: a.paciente_municipio || '',
          uf: a.paciente_uf || '',
          estadoCivil: a.paciente_estado_civil || '',
          escolaridade: a.paciente_escolaridade || '',
          procedimento: a.procedimento || a.procedencia || '-'
        }));
        this.aplicarFiltrosLocais();
        }));

        // Aplica o filtro inicial (aba "todas")
        this.aplicarFiltrosLocais();
      },
      error: (error: any) => {
        console.error('Erro ao buscar atendimentos:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Filtra LOCALMENTE os dados já carregados (sem chamar API)
   */
  aplicarFiltrosLocais() {
    const filtros = this.filtrosForm.value;
    const statusDaAba = this.STATUS_MAP[this.abaAtiva] || [];

    let filtrados = [...this.todosAtendimentos];

    // Filtrar por status da aba (se não for "todas")
    if (this.abaAtiva !== 'todas' && statusDaAba.length > 0) {
      filtrados = filtrados.filter(a => {
        return statusDaAba.some(s => a.status === s.toLowerCase());
      });
    }

    // Helper: parse date input (YYYY-MM-DD) como data local
    const parseDateInputToLocal = (input: any): Date | null => {
      if (!input && input !== 0) return null;
      if (input instanceof Date) return new Date(input.getFullYear(), input.getMonth(), input.getDate());
      const s = String(input);
      const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
      }
      const dobj = new Date(s);
      if (isNaN(dobj.getTime())) return null;
      return new Date(dobj.getFullYear(), dobj.getMonth(), dobj.getDate());
    };

    // Filtro por Data Inicial
    const dataInicialLocal = parseDateInputToLocal(filtros.dataInicial);
    if (dataInicialLocal) {
      dataInicialLocal.setHours(0, 0, 0, 0);
      filtrados = filtrados.filter((a: any) => a.createdAt && a.createdAt.getTime() >= dataInicialLocal.getTime());
    }

    // Filtro por Data Final
    const dataFinalLocal = parseDateInputToLocal(filtros.dataFinal);
    if (dataFinalLocal) {
      dataFinalLocal.setHours(23, 59, 59, 999);
      filtrados = filtrados.filter((a: any) => a.createdAt && a.createdAt.getTime() <= dataFinalLocal.getTime());
    }

    // Filtro por Sexo
    if (filtros.sexo) {
      filtrados = filtrados.filter((a: any) => a.paciente_sexo === filtros.sexo);
    }

    // Filtro por Município
    if (filtros.municipio) {
      const municipioLower = String(filtros.municipio).toLowerCase();
      filtrados = filtrados.filter((a: any) => (a.paciente_municipio || '').toLowerCase().includes(municipioLower));
    }

    // Filtro por UF
    if (filtros.uf) {
      filtrados = filtrados.filter((a: any) => (a.paciente_uf || '').toUpperCase() === filtros.uf.toUpperCase());
    }

    // Filtro por Estado Civil
    if (filtros.estadoCivil) {
      filtrados = filtrados.filter((a: any) => {
        const estadoCivilPaciente = (a.paciente_estado_civil || '').toLowerCase().trim();
        return estadoCivilPaciente === filtros.estadoCivil.toLowerCase();
      });
    }

    // Filtro por Escolaridade
    if (filtros.escolaridade) {
      filtrados = filtrados.filter((a: any) => {
        const escolaridadePaciente = (a.paciente_escolaridade || '').toLowerCase().trim();
        return escolaridadePaciente === filtros.escolaridade.toLowerCase();
      });
    }

    // Mapear para o formato de exibição (tabela)
    this.relatorio = filtrados.map((a: any) => ({
      ...a,
      data: a.createdAt || new Date(),
      paciente_nome: a.paciente_nome || '',
      status: a.status || '',
      sexo: a.paciente_sexo || '',
      municipio: a.paciente_municipio || '',
      uf: a.paciente_uf || '',
      estadoCivil: a.paciente_estado_civil || '',
      escolaridade: a.paciente_escolaridade || '',
      procedimento: a.procedimento || a.procedencia || '-'
    }));

    this.currentPage = 0;
    this.loading = false;
  }

  ngAfterViewInit() {
    setTimeout(() => {
      const firstTab = this.tabButtons.first;
      if (firstTab) this.updateIndicator(firstTab.nativeElement);
    });
  }

  setAba(aba: string, event: MouseEvent) {
    this.abaAtiva = aba;
    this.currentPage = 0; // Resetar paginação
    this.updateIndicator(event.currentTarget as HTMLElement);
    this.aplicarFiltrosLocais(); // Filtrar LOCALMENTE (sem chamar API)
  }

  private updateIndicator(el: HTMLElement) {
    if (!this.tabIndicator) return;
    const indicator = this.tabIndicator.nativeElement;

    const rect = el.getBoundingClientRect();
    const parentRect = el.parentElement!.getBoundingClientRect();

    indicator.style.width = rect.width + 'px';
    indicator.style.left = (rect.left - parentRect.left) + 'px';
  }

  filtrarPorBusca(event: Event) {
    const input = event.target as HTMLInputElement;
    const termo = input.value.toLowerCase().trim();

    if (!termo) {
      // Se não há termo de busca, aplicar filtros normais
      this.aplicarFiltrosLocais();
      return;
    }

    // Filtrar por nome do paciente
    const filtrados = this.todosAtendimentos.filter(a =>
      (a.paciente_nome || '').toLowerCase().includes(termo)
    );

    this.relatorio = filtrados.map((a: any) => ({
      data: a.createdAt || new Date(),
      paciente_nome: a.paciente_nome || '',
      profissional: a.usuario_id || '',
      procedimento: a.procedencia || a.procedimento || '',
      observacoes: a.observacoes || '',
      status: a.status || ''
    }));

    this.currentPage = 0;
  }

  carregarAtendimentosReais() {
    this.loading = true;
    this.atendimentoService.listarTodosParaRelatorio().subscribe({
      next: (response: any) => {
        const atendimentos: any[] = response.data || response || [];
        this.relatorio = atendimentos.map((a: any) => ({
          data: a.data_hora_atendimento ? new Date(a.data_hora_atendimento) : (a.created_at ? new Date(a.created_at) : new Date()),
          paciente_nome: a.paciente_nome || '',
          profissional: a.usuario_id || '',
          procedimento: a.procedencia || '',
          observacoes: a.observacoes || '',
          status: a.status || ''
        }));
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

  // Novos métodos para contadores de status específicos (usando STATUS_MAP)
  getAtendimentosEncaminhadosTriagem(): number {
    return this.contarPorStatus('triagem_pendente');
  }

  getAtendimentosEmTriagem(): number {
    return this.contarPorStatus('em_triagem');
  }

  getAtendimentosEmObservacao(): number {
    return this.contarPorStatus('em_observacao');
  }

  getAtendimentosAguardandoMedico(): number {
    return this.contarPorStatus('aguardando_medico');
  }

  getAtendimentosEmAtendimento(): number {
    return this.contarPorStatus('em_atendimento');
  }

  getAtendimentosFinalizados(): number {
    return this.contarPorStatus('finalizados');
  }

  getAtendimentosInterrompidos(): number {
    return this.contarPorStatus('interrompidos');
  }

  /**
   * Conta atendimentos baseado no STATUS_MAP (usando TODOS os atendimentos - contadores fixos)
   */
  private contarPorStatus(aba: string): number {
    const statusList = this.STATUS_MAP[aba] || [];
    if (statusList.length === 0) return 0;

    return this.todosAtendimentos.filter(a => {
      const statusLower = (a.status || '').toLowerCase().trim();
      return statusList.some(s => statusLower === s.toLowerCase());
    }).length;
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

  limparFiltros() {
    // Reseta o formulário de filtros e recarrega todos os atendimentos
    this.filtrosForm.reset({
      dataInicial: '',
      dataFinal: '',
      sexo: '',
      municipio: '',
      uf: '',
      estadoCivil: '',
      escolaridade: ''
    });
    this.abaAtiva = 'todas'; // Resetar aba para "todas"
    this.currentPage = 0;
    // Aplica filtros locais (irá mostrar todos os dados)
    this.aplicarFiltrosLocais();
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
    this.todosAtendimentos.forEach(item => {
      doc.text(new Date(item.data_hora_atendimento || item.created_at).toLocaleDateString('pt-BR'), 20, y);
      doc.text(item.paciente_nome, 60, y);
      doc.text(item.usuario_id || '', 130, y);
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
    this.todosAtendimentos.forEach(item => {
      doc.text(new Date(item.data_hora_atendimento || item.created_at).toLocaleDateString('pt-BR'), 20, y);
      doc.text(item.paciente_nome, 50, y);
      doc.text(item.usuario_id || '', 100, y);
      doc.text(item.procedencia || item.procedimento || '', 140, y);
      y += 8;
      doc.text(item.observacoes || '', 20, y);
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
