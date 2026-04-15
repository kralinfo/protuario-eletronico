import * as jsPDF from 'jspdf';
import { AfterViewInit, Component, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { AtendimentoService } from '../services/atendimento.service';
import { AuthService } from '../auth/auth.service';

import { FormBuilder, FormGroup, FormsModule, Validators } from '@angular/forms';
import { dataMaxHojeValidator, datasInicioFimValidator } from '../utils/validators-util';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DateInputLimiterDirective } from '../shared/directives/data.directive';
import { PaginationComponent } from '../shared/components/pagination/pagination.component';
import { normalizeStatus, getStatusLabel } from '../utils/normalize-status';
import { MatDialog } from '@angular/material/dialog';
import { AbandonoDialogComponent } from '../shared/abandono-dialog/abandono-dialog.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog/confirm-dialog.component';
import { FeedbackDialogComponent } from '../shared/feedback-dialog/feedback-dialog.component';
import { HistoricoAtendimentoDetalheComponent } from '../pacientes/historico-atendimento-detalhe.component';

@Component({
  selector: 'app-relatorio-atendimentos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DateInputLimiterDirective,
    PaginationComponent
  ],
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

  // Mapeamento de ABA → STATUS(S) canônicos (snake_case)
  private readonly STATUS_MAP: Record<string, string[]> = {
    todas: [],
    triagem_pendente: ['encaminhado_para_triagem'],
    em_triagem: ['em_triagem'],
    aguardando_medico: ['encaminhado_para_sala_medica'],
    em_atendimento: ['em_atendimento_medico', 'em_atendimento_ambulatorial'],
    finalizados: ['atendimento_concluido', 'alta_medica', 'alta_ambulatorial', 'encaminhado_para_exames'],
    interrompidos: ['interrompido', 'abandonado']
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

  // Filtros rápidos de data
  filtroRapidoAtivo: 'hoje' | '7dias' | '30dias' | 'personalizado' | '' = '';

  // Menu de ações
  openMenuId: number | null = null;

  // Abas com indicador animado
  abaAtiva = 'todas';
  @ViewChild('tabIndicator') tabIndicator!: ElementRef<HTMLElement>;
  @ViewChildren('tabButton') tabButtons!: QueryList<ElementRef<HTMLElement>>;

  constructor(
    private fb: FormBuilder,
    private atendimentoService: AtendimentoService,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.filtrosForm = this.fb.group({
      dataInicial: ['', [dataMaxHojeValidator]],
      dataFinal: ['', [dataMaxHojeValidator]],
      sexo: [''],
      municipio: [''],
      uf: [''],
      estadoCivil: ['']
    }, { validators: datasInicioFimValidator });
  }

  // Verificar se o usuário é editor (admin ou editor)
  get isEditor(): boolean {
    const result = this.authService.isEditor;
    console.log('[DEBUG] isEditor:', result, '| nivel:', this.authService.user?.nivel);
    return result;
  }

  /**
   * Fecha o menu ao clicar fora
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.relative.inline-block')) {
      this.closeMenu();
    }
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
          status: normalizeStatus(a.status),
          sexo: a.paciente_sexo || '',
          municipio: a.paciente_municipio || '',
          uf: a.paciente_uf || '',
          estadoCivil: a.paciente_estado_civil || '',
          escolaridade: a.paciente_escolaridade || '',
          hipotese_diagnostica: a.hipotese_diagnostica || '',
          procedimento: a.procedimento || a.procedencia || '-'
        }));

        // Ordenar do mais novo para o mais velho
        this.todosAtendimentos.sort((a, b) => {
          const dateA = a.createdAt?.getTime() || 0;
          const dateB = b.createdAt?.getTime() || 0;
          return dateB - dateA; // Descrescente: mais recente primeiro
        });

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
        return statusDaAba.includes(a.status);
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
      filtrados = filtrados.filter((a: any) => a.sexo === filtros.sexo);
    }

    // Filtro por Município
    if (filtros.municipio) {
      const municipioLower = String(filtros.municipio).toLowerCase();
      filtrados = filtrados.filter((a: any) => (a.municipio || '').toLowerCase().includes(municipioLower));
    }

    // Filtro por UF
    if (filtros.uf) {
      filtrados = filtrados.filter((a: any) => (a.uf || '').toUpperCase() === filtros.uf.toUpperCase());
    }

    // Filtro por Estado Civil
    if (filtros.estadoCivil) {
      filtrados = filtrados.filter((a: any) => {
        return (a.estadoCivil || '').toLowerCase().trim() === filtros.estadoCivil.toLowerCase();
      });
    }

    // Mapear para o formato de exibição (tabela)
    this.relatorio = filtrados.map((a: any) => ({
      ...a,
      data: a.createdAt || new Date(),
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
      estadoCivil: ''
    });
    this.filtroRapidoAtivo = '';
    this.abaAtiva = 'todas'; // Resetar aba para "todas"
    this.currentPage = 0;
    // Aplica filtros locais (irá mostrar todos os dados)
    this.aplicarFiltrosLocais();
  }

  /**
   * Aplica filtro rápido de data
   */
  setFiltroRapido(tipo: 'hoje' | '7dias' | '30dias' | 'personalizado') {
    this.filtroRapidoAtivo = tipo;
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    let dataInicial: Date | null = null;
    let dataFinal: Date | null = null;

    switch (tipo) {
      case 'hoje':
        dataInicial = new Date(hoje);
        dataInicial.setHours(0, 0, 0, 0);
        dataFinal = new Date(hoje);
        break;
      case '7dias':
        dataInicial = new Date(hoje);
        dataInicial.setDate(dataInicial.getDate() - 6);
        dataInicial.setHours(0, 0, 0, 0);
        dataFinal = new Date(hoje);
        break;
      case '30dias':
        dataInicial = new Date(hoje);
        dataInicial.setDate(dataInicial.getDate() - 29);
        dataInicial.setHours(0, 0, 0, 0);
        dataFinal = new Date(hoje);
        break;
      case 'personalizado':
        // Mantém os campos de data visíveis, mas limpa os valores para mostrar tudo
        this.filtrosForm.patchValue({
          dataInicial: '',
          dataFinal: ''
        });
        this.aplicarFiltrosLocais();
        return;
    }

    // Formata as datas para o formato YYYY-MM-DD
    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Atualiza o formulário com as datas calculadas
    this.filtrosForm.patchValue({
      dataInicial: formatDate(dataInicial),
      dataFinal: formatDate(dataFinal)
    });

    this.aplicarFiltrosLocais();
  }
  gerarRelatorioSimples() {
    const doc = new jsPDF.jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório Simples de Atendimentos', 20, 20);
    doc.setFontSize(12);

    // Adiciona informações do filtro
    if (this.filtroRapidoAtivo) {
      doc.setFontSize(10);
      const filtroTexto = this.getFiltroRapidoTexto();
      doc.text(`Filtro: ${filtroTexto}`, 20, 30);
    }

    let y = this.filtroRapidoAtivo ? 38 : 35;
    doc.setFontSize(12);

    doc.text('Data', 20, y);
    doc.text('Paciente', 60, y);
    doc.text('Hipótese Diagnóstica', 120, y);
    y += 8;
    doc.setLineWidth(0.2);
    doc.line(20, y - 5, 190, y - 5);

    const dados = this.relatorio.length > 0 ? this.relatorio : this.todosAtendimentos;
    dados.forEach(item => {
      doc.text(new Date(item.data_hora_atendimento || item.created_at).toLocaleDateString('pt-BR'), 20, y);
      doc.text(item.paciente_nome.substring(0, 25), 60, y);
      const hipotese = item.hipotese_diagnostica ? item.hipotese_diagnostica.substring(0, 30) : '-';
      doc.text(hipotese, 120, y);
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

    // Adiciona informações do filtro
    if (this.filtroRapidoAtivo) {
      doc.setFontSize(10);
      const filtroTexto = this.getFiltroRapidoTexto();
      doc.text(`Filtro: ${filtroTexto}`, 20, 30);
    }

    let y = this.filtroRapidoAtivo ? 38 : 35;
    doc.setFontSize(12);

    doc.text('Data', 20, y);
    doc.text('Paciente', 50, y);
    doc.text('Procedimento', 100, y);
    doc.text('Hipótese', 145, y);
    y += 8;
    doc.setLineWidth(0.2);
    doc.line(20, y - 5, 190, y - 5);

    const dados = this.relatorio.length > 0 ? this.relatorio : this.todosAtendimentos;
    dados.forEach(item => {
      doc.text(new Date(item.data_hora_atendimento || item.created_at).toLocaleDateString('pt-BR'), 20, y);
      doc.text(item.paciente_nome.substring(0, 20), 50, y);
      doc.text((item.procedencia || item.procedimento || '-').substring(0, 20), 100, y);
      const hipotese = item.hipotese_diagnostica ? item.hipotese_diagnostica.substring(0, 20) : '-';
      doc.text(hipotese, 145, y);
      y += 8;
      doc.text('Obs:', 20, y);
      doc.text((item.observacoes || '').substring(0, 80), 30, y);
      y += 10;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    doc.save('relatorio-detalhado-atendimentos.pdf');
  }

  /**
   * Retorna texto descritivo para o filtro rápido ativo
   */
  getFiltroRapidoTexto(): string {
    switch (this.filtroRapidoAtivo) {
      case 'hoje':
        return 'Atendimentos de Hoje';
      case '7dias':
        return 'Últimos 7 dias';
      case '30dias':
        return 'Últimos 30 dias';
      case 'personalizado':
        const dataIni = this.filtrosForm.get('dataInicial')?.value;
        const dataFin = this.filtrosForm.get('dataFinal')?.value;
        if (dataIni && dataFin) {
          return `Período: ${dataIni} até ${dataFin}`;
        }
        return 'Período personalizado';
      default:
        return 'Todos os atendimentos';
    }
  }

  /**
   * Toggle do menu de ações
   */
  toggleMenu(event: Event, atendimentoId: number, index: number) {
    event.stopPropagation();
    if (this.openMenuId === atendimentoId) {
      this.closeMenu();
    } else {
      this.openMenuId = atendimentoId;
    }
  }

  /**
   * Fecha o menu de ações
   */
  closeMenu() {
    this.openMenuId = null;
  }

  /**
   * Verifica se o status é um status final (não permite mais ações)
   */
  isStatusFinal(status: string): boolean {
    const statusFinal = [
      'atendimento_concluido',
      'alta_medica',
      'alta_ambulatorial',
      'encaminhado_para_exames'
    ];
    const statusLower = (status || '').toLowerCase().trim();
    return statusFinal.some(s => statusLower === s.toLowerCase());
  }

  /**
   * Registra abandono do atendimento
   */
  registrarAbandono(atendimento: any) {
    const dialogRef = this.dialog.open(AbandonoDialogComponent, {
      data: { atendimento: atendimento },
      width: '500px'
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result) {
          this.atendimentoService.registrarAbandono(atendimento.id, result).subscribe({
            next: () => {
              this.carregarTodosAtendimentos();
              this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Abandono Registrado',
                  message: 'Atendimento marcado como abandonado com sucesso!',
                  type: 'success'
                }
              });
              setTimeout(() => this.dialog.closeAll(), 2000);
            },
            error: (error: any) => {
              console.error('Erro ao registrar abandono:', error);
              this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Erro',
                  message: 'Falha ao registrar abandono. Tente novamente.',
                  type: 'error'
                }
              });
              setTimeout(() => this.dialog.closeAll(), 2500);
            }
          });
        }
      }
    });
  }

  /**
   * Finaliza o atendimento (muda status para atendimento_concluido)
   */
  finalizarAtendimento(atendimento: any) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Finalizar Atendimento',
        message: `Confirma a finalização do atendimento do paciente ${atendimento.paciente_nome}?`
      }
    });

    dialogRef.afterClosed().subscribe({
      next: (result) => {
        if (result) {
          const dadosAtualizacao = {
            motivo: atendimento.motivo,
            observacoes: atendimento.observacoes,
            status: 'atendimento_concluido',
            procedencia: atendimento.procedencia,
            acompanhante: atendimento.acompanhante
          };

          this.atendimentoService.atualizarAtendimento(atendimento.id, dadosAtualizacao).subscribe({
            next: () => {
              this.carregarTodosAtendimentos();
              this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Sucesso',
                  message: 'Atendimento finalizado com sucesso!',
                  type: 'success'
                }
              });
              setTimeout(() => this.dialog.closeAll(), 2000);
            },
            error: (err: any) => {
              this.dialog.open(FeedbackDialogComponent, {
                data: {
                  title: 'Erro',
                  message: err?.error?.message || 'Erro ao finalizar atendimento.',
                  type: 'error'
                }
              });
              setTimeout(() => this.dialog.closeAll(), 2500);
            }
          });
        }
      }
    });
  }

  /**
   * Visualiza a ficha completa do atendimento
   */
  visualizarDetalhes(atendimento: any) {
    this.dialog.open(HistoricoAtendimentoDetalheComponent, {
      data: { atendimentoId: atendimento.id },
      width: '90%',
      maxWidth: '1200px',
      maxHeight: '90vh'
    });
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  getStatusLabel = getStatusLabel;
}
