import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TriagemService, PacienteTriagem } from '../../services/triagem.service';
import { TriagemEventService } from '../../services/triagem-event.service';
import { AuthService } from '../../auth/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subject, Subscription, interval, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ClassificacaoDialogComponent } from 'src/app/classificacao-dialog/classificacao-dialog.component';
import { RealtimeService } from '../../services/realtime.service';
import { NotificationService } from 'src/app/services/notification.service';

interface EstatisticasTriagem {
  pacientes_aguardando: number;
  pacientes_em_triagem: number;
  triagens_concluidas: number;
  tempo_medio_espera: number;
  por_classificacao: {
    vermelho: number;
    laranja: number;
    amarelo: number;
    verde: number;
    azul: number;
  };
}

@Component({
  selector: 'app-dashboard-triagem',
  templateUrl: './dashboard-triagem.component.html',
  styleUrls: ['./dashboard-triagem.component.scss'],
  standalone: false
})
export class DashboardTriagemComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  private alertasInterval: any;
  private atualizacaoPendente: any;
  
  estatisticas: EstatisticasTriagem = {
    pacientes_aguardando: 0,
    pacientes_em_triagem: 0,
    triagens_concluidas: 0,
    tempo_medio_espera: 0,
    por_classificacao: {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    }
  };

  totalPosTriagem: number = 0;

  usuarioLogado: any;
  horaAtual = new Date();
  private destroy$ = new Subject<void>();
  filaDisponiveisPreview: PacienteTriagem[] = [];
  filaEmTriagemPreview: PacienteTriagem[] = [];
  posTriagemPreview: PacienteTriagem[] = [];
  posEncaminhados = 0;
  posEmAtendimento = 0;
  alertasCriticos: PacienteTriagem[] = [];
  alertasAtencao: PacienteTriagem[] = [];

    getCorClassificacao(classificacao: string): string {
      switch ((classificacao || '').toLowerCase()) {
        case 'vermelho': return '#ef4444';
        case 'laranja': return '#f97316';
        case 'amarelo': return '#eab308';
        case 'verde': return '#22c55e';
        case 'azul': return '#3b82f6';
        default: return '#d1d5db';
      }
    }
  // Centralização dos conjuntos de status (aliases) para cada card
  private readonly STATUS = {
    DISPONIVEIS: new Set<string>([
      'encaminhado para triagem',
      'encaminhado_para_triagem',
      '1 - Encaminhado para triagem'
    ]),
    EM_TRIAGEM: new Set<string>([
      'em_triagem',
      'em triagem',
      '2 - Em triagem',
      '2 - Em Triagem'
    ]),
    ENCAMINHADOS: new Set<string>([
      'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica',
      'encaminhado para ambulatório', '5 - Encaminhado para ambulatório', 'encaminhado_para_ambulatorio',
      'encaminhado para exames', '7 - Encaminhado para exames', 'encaminhado_para_exames',
      'aguardando exames'
    ]),
    EM_ATENDIMENTO: new Set<string>([
      'em atendimento médico', '4 - Em atendimento médico', 'em_atendimento_medico',
      'em atendimento ambulatorial', '6 - Em atendimento ambulatorial', 'em_atendimento_ambulatorial'
    ])
  } as const;

  constructor(
    private triagemService: TriagemService,
    private triagemEventService: TriagemEventService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private realtimeService: RealtimeService,
    private notificationService: NotificationService
  ) {
    this.usuarioLogado = this.authService.user;
  }

  abrirDialogClassificacao() {
    this.dialog.open(ClassificacaoDialogComponent, {
      panelClass: ['p-0', 'max-w-3xl', 'w-full']
    });
  }

  ngOnInit() {
    // Carregar dados imediatamente
    this.carregarEstatisticas();
    this.carregarFilaDisponiveis();
    this.carregarFilaEmTriagem();
    this.carregarPosTriagemPreview();
    this.carregarAlertasTempo();

    // Força atualização do card por classificação após carregar dados iniciais
    setTimeout(() => {
      this.atualizarCardPorClassificacao();
    }, 500);

    // Escutar notificações de atualização
    this.subscriptions.add(this.triagemEventService.atualizarDashboard$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Dashboard: Recebida notificação para atualizar');
        this.carregarEstatisticas();
        this.carregarFilaDisponiveis();
        this.carregarFilaEmTriagem();
        this.carregarPosTriagemPreview();
        this.carregarAlertasTempo();
      }));

    // Escutar evento global de novo atendimento
    this.subscriptions.add(this.triagemEventService.novoAtendimento$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.snackBar.open('Novo atendimento registrado!', 'Fechar', { duration: 3000 });
      }));

    // 🔌 Conectar WebSocket ao módulo triagem
    this.realtimeService.connect('triagem')
      .then(() => {
        console.log('✅ [DashboardTriagem] Realtime conectado ao módulo triagem');
        this.configurarRealtime();
      })
      .catch((err: any) => {
        console.warn('⚠️ [DashboardTriagem] Realtime indisponível:', err?.message);
        this.configurarRealtime(); // configura mesmo assim (observables falharão silenciosamente)
      });

    // Verificador de tempo: A cada 60 segundos ele busca os atendimentos
    // e recalcula quem está estourando o tempo limite (Manchester)
    this.alertasInterval = setInterval(() => {
      this.carregarAlertasTempo();
    }, 60000);

    // Atualiza a hora a cada minuto
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.horaAtual = new Date());
  }

  private readonly LIMITES_RISCO: Record<string, number> = {
    vermelho: 0,
    laranja: 10,
    amarelo: 60,
    verde: 120,
    azul: 240
  };

  private readonly STATUS_ALERTAS = new Set<string>([
    'encaminhado para triagem', '1 - Encaminhado para triagem', 'encaminhado_para_triagem',
    'em triagem', '2 - Em triagem', 'em_triagem',
    'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica'
  ]);

  private classificacaoOrder(risco: string): number {
    switch ((risco || '').toLowerCase()) {
      case 'vermelho': return 1;
      case 'laranja': return 2;
      case 'amarelo': return 3;
      case 'verde': return 4;
      case 'azul': return 5;
      default: return 6;
    }
  }

  private ordenarPorClassificacaoETempo(lista: any[]): any[] {
    return [...(lista || [])].sort((a, b) => {
      const ca = this.classificacaoOrder(a.classificacao_risco);
      const cb = this.classificacaoOrder(b.classificacao_risco);
      if (ca !== cb) return ca - cb;
      // Prioriza maior tempo de espera
      const ta = a.tempo_espera || this.calcularTempoDecorrido(a);
      const tb = b.tempo_espera || this.calcularTempoDecorrido(b);
      return tb - ta;
    });
  }

  carregarAlertasTempo() {
    console.log('🚀 Dashboard Triagem: Iniciando carregamento de alertas de tempo...');

    this.triagemService.listarTodosAtendimentosDia().subscribe({
      next: (atendimentos: any[]) => {
        console.log('📦 Dados recebidos da API:', atendimentos);
        const agora = new Date();
        const criticos: any[] = [];
        const atencao: any[] = [];

        for (const p of atendimentos || []) {
          let campoData = p.created_at || p.data_hora_atendimento;
          if (!campoData) continue;

          const dataAtendimento = new Date(campoData);
          const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
          if (diffHoras > 24) continue;

          const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
          const limite = this.LIMITES_RISCO[risco];
          let tempoDecorrido = Math.floor((agora.getTime() - dataAtendimento.getTime()) / 60000);

          if (!this.STATUS_ALERTAS.has(p.status)) continue;
          if (!risco || limite === undefined) continue;

          if (limite <= 0) {
            if (tempoDecorrido > 0) criticos.push(p);
            continue;
          }

          const perc = tempoDecorrido / limite;
          if (perc >= 1) {
            criticos.push(p);
          } else if (perc >= 0.8) {
            atencao.push(p);
          }
        }

        this.alertasCriticos = this.ordenarPorClassificacaoETempo(criticos).slice(0, 5);
        this.alertasAtencao = this.ordenarPorClassificacaoETempo(atencao).slice(0, 5);

        console.log('✅ Alertas críticos finais:', this.alertasCriticos);
        console.log('✅ Alertas atenção finais:', this.alertasAtencao);
      },
      error: (err) => console.error('❌ Dashboard: Erro ao carregar alertas de tempo:', err)
    });
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.alertasInterval) {
      clearInterval(this.alertasInterval);
    }
    if (this.atualizacaoPendente) {
      clearTimeout(this.atualizacaoPendente);
    }
    this.destroy$.next();
    this.destroy$.complete();
    this.realtimeService.disconnect();
  }

  /**
   * Configura os listeners de WebSocket para atualizar o dashboard em tempo real
   */
  configurarRealtime() {
    // Escutar quando triagem é iniciada
    this.subscriptions.add(this.realtimeService.onTriagemStarted().subscribe((data) => {
      console.log('🔄 Dashboard Triagem (WebSocket): Triagem iniciada, atualizando dashboard...', data);
      try {
        this.notificationService.info('Triagem iniciada', `Triagem iniciada no módulo triagem`);
      } catch (e) {}
      this.atualizarDashboard();
    }));

    // Escutar quando triagem é finalizada
    this.subscriptions.add(this.realtimeService.onTriagemFinished().subscribe((data) => {
      console.log('🔄 Dashboard Triagem (WebSocket): Triagem finalizada, atualizando dashboard...', data);
      try {
        const payload: any = data as any;
        this.notificationService.triagemFinished(payload?.paciente_nome || 'Paciente', payload?.classificacao_risco || '');
      } catch (e) {}
      this.atualizarDashboard();
    }));

    // Escutar quando paciente é transferido
    this.subscriptions.add(this.realtimeService.onPatientTransferred().subscribe((data) => {
      console.log('🔄 Dashboard Triagem (WebSocket): Paciente transferido, atualizando dashboard...', data);
      try {
        this.notificationService.info('Paciente transferido', `Paciente transferido para outro módulo`);
      } catch (e) {}
      this.atualizarDashboard();
    }));

    // Escutar quando paciente chega
    this.subscriptions.add(this.realtimeService.onPatientArrived().subscribe((data) => {
      console.log('🔄 Dashboard Triagem (WebSocket): Paciente chegou, atualizando dashboard...', data);
      try {
        const payload: any = data as any;
        const nome = payload?.paciente_nome || 'Paciente';
        const origin = (payload?.originModule || payload?.origin || '').toLowerCase();
        if (origin === 'recepcao' || origin === 'recepção') {
          this.notificationService.info('Novo Paciente', `${nome} chegou da recepção`);
        } else {
          this.notificationService.patientArrived(nome, 'triagem', payload?.classificacao_risco || '');
        }
      } catch (e) {}
      this.atualizarDashboard();
    }));

    // Escutar atualizações gerais da fila
    this.subscriptions.add(this.realtimeService.onQueueUpdated().subscribe((data) => {
      console.log('🔄 Dashboard Triagem (WebSocket): Fila atualizada, atualizando dashboard...', data);
      try {
        this.notificationService.info('Fila atualizada', `Fila do módulo triagem atualizada`);
      } catch (e) {}
      this.atualizarDashboard();
    }));

    // Escutar erros de conexão
    this.subscriptions.add(this.realtimeService.onConnectionError().subscribe((error) => {
      console.error('❌ Erro de conexão WebSocket:', error);
    }));
  }

  /**
   * Mostra alerta de erro de conexão
   */
  /**
   * Processa atualização do WebSocket com debounce para evitar múltiplas chamadas simultâneas
   */
  

  /**
   * Atualiza todos os dados do dashboard
   */
  private atualizarDashboard() {
    console.log('🔄 Dashboard Triagem: Atualizando via WebSocket...');
    this.carregarEstatisticas();
    this.carregarFilaDisponiveis();
    this.carregarFilaEmTriagem();
    this.carregarPosTriagemPreview();
    this.carregarAlertasTempo();
    
    // Força atualização do card por classificação com delay
    setTimeout(() => {
      this.atualizarCardPorClassificacao();
    }, 300);
  }

  carregarEstatisticas() {
    console.log('Dashboard: Carregando estatísticas...');
    this.triagemService.obterEstatisticasTriagem().subscribe({
      next: (stats: any) => {
        console.log('Dashboard: Estatísticas recebidas:', stats);
        // Preserva as estatísticas por classificação calculadas localmente
        const porClassificacaoAnterior = this.estatisticas.por_classificacao;
        this.estatisticas = stats;
        // Se as estatísticas da API não incluem por_classificacao ou estão zeradas, mantém as calculadas
        if (!stats.por_classificacao || this.isEstatisticasZeradas(stats.por_classificacao)) {
          this.estatisticas.por_classificacao = porClassificacaoAnterior;
        }
        // Atualiza o total pós-triagem logo após carregar estatísticas
        this.totalPosTriagem = this.estatisticas.triagens_concluidas;
      },
      error: (error: any) => {
        console.error('Dashboard: Erro ao carregar estatísticas:', error);
      }
    });
  }

  // Verifica se todas as estatísticas por classificação estão zeradas
  private isEstatisticasZeradas(porClassificacao: any): boolean {
    if (!porClassificacao) return true;
    return porClassificacao.vermelho === 0 &&
           porClassificacao.laranja === 0 &&
           porClassificacao.amarelo === 0 &&
           porClassificacao.verde === 0 &&
           porClassificacao.azul === 0;
  }

  atualizarCompleto() {
    console.log('🔄 Dashboard: Iniciando atualização completa (simula reload)...');

    // Carregar todos os dados como no ngOnInit
    this.carregarEstatisticas();
    this.carregarFilaDisponiveis();
    this.carregarFilaEmTriagem();
    this.carregarPosTriagemPreview();
    this.carregarAlertasTempo();

    // Força atualização do card por classificação após um pequeno delay
    // para garantir que os dados das estatísticas sejam carregados primeiro
    setTimeout(() => {
      this.atualizarCardPorClassificacao();
    }, 800);

    console.log('✅ Dashboard: Atualização completa finalizada');
  }

  atualizarCardPorClassificacao() {
    console.log('🎯 Atualizando card por classificação...');
    this.triagemService.listarTodosAtendimentosDia().subscribe({
      next: (data: any[]) => {
        console.log('📦 Dados recebidos para classificação:', data?.length, 'atendimentos');
        const novasEstatisticas = this.calcularEstatisticasPorClassificacao(data);
        console.log('🧮 Estatísticas calculadas:', novasEstatisticas);
        this.estatisticas.por_classificacao = novasEstatisticas;
        console.log('✅ Card por classificação atualizado:', this.estatisticas.por_classificacao);
      },
      error: (error: any) => {
        console.error('❌ Erro ao atualizar card por classificação:', error);
      }
    });
  }

  calcularEstatisticasPorClassificacao(data: any[]) {
    const agora = new Date();
    const por_classificacao = {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    };
    for (const p of data || []) {
      let campoData = p.created_at || p.data_hora_atendimento;
      if (!campoData) continue;
      const dataAtendimento = new Date(campoData);
      const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
      if (diffHoras > 24) continue;
      const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
      switch (risco) {
        case 'vermelho':
        case 'laranja':
        case 'amarelo':
        case 'verde':
        case 'azul':
          por_classificacao[risco as keyof typeof por_classificacao]++;
          break;
      }
    }
    return por_classificacao;
  }

  carregarFilaDisponiveis() {
    this.triagemService.listarTodosAtendimentosDia().subscribe({
      next: (pacientes: PacienteTriagem[]) => {
        const agora = new Date().getTime();
        const lista = (pacientes || [])
          .filter(p => {
            if (!p || !this.STATUS.DISPONIVEIS.has(p.status)) return false;
            const dataAtendimento = new Date(p.data_hora_atendimento).getTime();
            return (agora - dataAtendimento) <= 24 * 60 * 60 * 1000;
          });
        this.filaDisponiveisPreview = this.ordenarPorClassificacaoETempo(lista).slice(0, 5);
      },
      error: (err) => console.error('Dashboard: Erro ao carregar fila disponíveis:', err)
    });
  }

  carregarPosTriagemPreview() {
    this.triagemService.listarTodosAtendimentosDia().subscribe({
      next: (pacientes: PacienteTriagem[]) => {
        const agora = new Date().getTime();
        const lista = (pacientes || [])
          .filter(p => {
            if (!p) return false;
            // Considera pós-triagem qualquer atendimento que tenha classificacao_risco preenchido
            if (!p.classificacao_risco) return false;
            const dataAtendimento = new Date(p.data_hora_atendimento).getTime();
            return (agora - dataAtendimento) <= 24 * 60 * 60 * 1000;
          });

        this.posTriagemPreview = this.ordenarPorClassificacaoETempo(lista).slice(0, 5);

  // Contador total de pós-triagem igual ao de triagens concluídas hoje
  this.totalPosTriagem = this.estatisticas.triagens_concluidas;
        this.posEncaminhados = lista.filter(p => p && this.STATUS.ENCAMINHADOS.has(p.status)).length;
        this.posEmAtendimento = lista.filter(p => p && this.STATUS.EM_ATENDIMENTO.has(p.status)).length;
      },
      error: (err) => console.error('❌ Dashboard: Erro ao carregar pós-triagem preview:', err)
    });
  }

  carregarFilaEmTriagem() {
    this.triagemService.listarTodosAtendimentosDia().subscribe({
      next: (pacientes: PacienteTriagem[]) => {
        const agora = new Date().getTime();
        const lista = (pacientes || [])
          .filter(p => {
            if (!p || !this.STATUS.EM_TRIAGEM.has(p.status)) return false;
            const dataAtendimento = new Date(p.data_hora_atendimento).getTime();
            return (agora - dataAtendimento) <= 24 * 60 * 60 * 1000;
          });
        this.filaEmTriagemPreview = this.ordenarPorClassificacaoETempo(lista).slice(0, 5);
      },
      error: (err) => console.error('Dashboard: Erro ao carregar em triagem preview:', err)
    });
  }

  irParaFilaTriagem() {
    console.log('Dashboard: Navegando para fila de triagem...');
    this.router.navigate(['/triagem/fila']);
  }

  abrirItemAlertaTempo(p: any) {
    if (!p || !p.id) return;
    // Se está disponível para triagem, abre a triagem normalmente
    const DISPONIVEIS = this.STATUS.DISPONIVEIS;
    if (DISPONIVEIS.has(p.status)) {
      this.router.navigate(['/triagem/realizar', p.id]);
    } else {
      // Se não está disponível, abre em modo visualização
      this.router.navigate(['/triagem/realizar', p.id], {
        state: {
          modoVisualizacao: true,
          paciente_nome: p.paciente_nome
        }
      });
    }
  }

  calcularTempoDecorrido(p: any): number {
    const inicio = p.data_hora_atendimento || p.created_at;
    if (!inicio) return 0;
    const dataInicio = new Date(inicio);
    const agora = new Date();
    const diffMs = agora.getTime() - dataInicio.getTime();
    return Math.floor(diffMs / 60000); // minutos
  }

  irParaPosTriagem() {
    this.router.navigate(['/pos-triagem']);
  }

  // Abre a tela de atendimento/triagem ao clicar no item do card
  abrirItemFila(p: PacienteTriagem) {
    if (!p || !p.id) return;
    const DISPONIVEIS = this.STATUS.DISPONIVEIS;
    // Se está disponível para iniciar, dispara a abertura (iniciar triagem) e navega
    if (DISPONIVEIS.has(p.status)) {
      console.log('Dashboard: Iniciando triagem para', p.id);
      this.triagemService.iniciarTriagem(p.id).subscribe({
        next: () => {
          // Notificação de novo atendimento registrado
          this.snackBar.open('Novo atendimento registrado!', 'Fechar', { duration: 3000 });
          // pequeno delay para garantir persistência antes da navegação
          setTimeout(() => this.router.navigate(['/triagem/realizar', p.id], { state: { prefill: {
            paciente_nome: p.paciente_nome,
            paciente_nascimento: p.paciente_nascimento,
            paciente_sexo: p.paciente_sexo,
            queixa_principal: p.queixa_principal
          } } }), 300);
        },
        error: (err) => {
          console.error('Dashboard: Erro ao iniciar triagem:', err);
        }
      });
      return;
    }

    // Caso contrário, apenas navega para a tela de triagem (edição/consulta)
  const EM_TRIAGEM = this.STATUS.EM_TRIAGEM;
    const state: any = EM_TRIAGEM.has(p.status) ? { state: { modoEdicao: true } } : undefined;
    console.log('Dashboard: Navegando para triagem do atendimento', p.id, 'status:', p.status);
    if (state) {
      this.router.navigate(['/triagem/realizar', p.id], { ...state, state: { ...(state as any).state, prefill: {
        paciente_nome: p.paciente_nome,
        paciente_nascimento: p.paciente_nascimento,
        paciente_sexo: p.paciente_sexo,
        queixa_principal: p.queixa_principal
      } } });
    } else {
      this.router.navigate(['/triagem/realizar', p.id], { state: { prefill: {
        paciente_nome: p.paciente_nome,
        paciente_nascimento: p.paciente_nascimento,
        paciente_sexo: p.paciente_sexo,
        queixa_principal: p.queixa_principal
      } } });
    }
  }

  irParaPacientes() {
    this.router.navigate(['/pacientes']);
  }

  irParaAtendimentos() {
    this.router.navigate(['/atendimentos']);
  }

  irParaRelatorios() {
    this.router.navigate(['/relatorios']);
  }

  abrirProtocoloManchester() {
    // Por enquanto, vamos criar um alerta com as informações
    // Futuramente pode ser um modal ou uma página dedicada
    alert(`Protocolo de Manchester - Classificação de Risco:

🔴 VERMELHO - Emergência (atendimento imediato)
🟠 LARANJA - Muito urgente (até 10 minutos)
🟡 AMARELO - Urgente (até 60 minutos)
🟢 VERDE - Pouco urgente (até 120 minutos)
🔵 AZUL - Não urgente (até 240 minutos)

Este protocolo é usado para priorizar o atendimento com base na gravidade clínica do paciente.`);
  }

  formatarTempo(minutos: number): string {
    if (minutos < 60) {
      return `${Math.round(minutos)}min`;
    }
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = Math.round(minutos % 60);
    return `${horas}h ${minutosRestantes}min`;
  }

  getDescricaoStatus(status: string): string {
    const descricoes: Record<string, string> = {
      '1 - Encaminhado para triagem': '1 - Encaminhado para Triagem',
      'encaminhado_para_triagem': '1 - Encaminhado para Triagem',
      'encaminhado para triagem': '1 - Encaminhado para Triagem',
      '2 - Em triagem': '2 - Em Triagem',
      'em_triagem': '2 - Em Triagem',
      'em triagem': '2 - Em Triagem',
      '3 - Encaminhado para sala médica': '3 - Encaminhado para Sala Médica',
      'encaminhado_para_sala_medica': '3 - Encaminhado para Sala Médica',
      'encaminhado para sala médica': '3 - Encaminhado para Sala Médica',
  '4 - Em atendimento médico': '4 - Em Atendimento Médico',
  'em_atendimento_medico': '4 - Em Atendimento Médico',
  'em atendimento médico': '4 - Em Atendimento Médico',
      '5 - Encaminhado para ambulatório': '5 - Encaminhado para Ambulatório',
      'encaminhado_para_ambulatorio': '5 - Encaminhado para Ambulatório',
      'encaminhado para ambulatório': '5 - Encaminhado para Ambulatório',
      '7 - Encaminhado para exames': '7 - Encaminhado para Exames',
  'encaminhado_para_exames': '7 - Encaminhado para Exames',
  'encaminhado para exames': '7 - Encaminhado para Exames',
  '6 - Em atendimento ambulatorial': '6 - Em Atendimento Ambulatorial',
  'em_atendimento_ambulatorial': '6 - Em Atendimento Ambulatorial',
  'em atendimento ambulatorial': '6 - Em Atendimento Ambulatorial'
    };
    return descricoes[status] || status;
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      '1 - Encaminhado para triagem': '#2196F3',
      'encaminhado_para_triagem': '#2196F3',
      'encaminhado para triagem': '#2196F3',
      '2 - Em triagem': '#4CAF50',
      'em_triagem': '#4CAF50',
      'em triagem': '#4CAF50',
      '3 - Encaminhado para sala médica': '#FF9800',
      'encaminhado_para_sala_medica': '#FF9800',
      'encaminhado para sala médica': '#FF9800',
  '4 - Em atendimento médico': '#FF5722',
  'em_atendimento_medico': '#FF5722',
  'em atendimento médico': '#FF5722',
      '5 - Encaminhado para ambulatório': '#9C27B0',
      'encaminhado_para_ambulatorio': '#9C27B0',
      'encaminhado para ambulatório': '#9C27B0',
      '7 - Encaminhado para exames': '#009688',
      'encaminhado_para_exames': '#009688',
  'encaminhado para exames': '#009688',
  '6 - Em atendimento ambulatorial': '#3F51B5',
  'em_atendimento_ambulatorial': '#3F51B5',
  'em atendimento ambulatorial': '#3F51B5'
    };
    return cores[status] || '#757575';
  }

  getBoadTarde(): string {
    const hora = this.horaAtual.getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  getNomeCurto(): string {
    if (!this.usuarioLogado?.nome) return '';
    const nomes = this.usuarioLogado.nome.split(' ');
    return nomes.length > 1 ? `${nomes[0]} ${nomes[1]}` : nomes[0];
  }
}
