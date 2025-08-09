import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TriagemService, PacienteTriagem } from '../services/triagem.service';
import { TriagemEventService } from '../services/triagem-event.service';
import { AuthService } from '../auth/auth.service';
import { Subject, interval, takeUntil } from 'rxjs';

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

  usuarioLogado: any;
  horaAtual = new Date();
  private destroy$ = new Subject<void>();
  filaDisponiveisPreview: PacienteTriagem[] = [];
  filaEmTriagemPreview: PacienteTriagem[] = [];
  posTriagemPreview: PacienteTriagem[] = [];
  posEncaminhados = 0;
  posEmAtendimento = 0;

  constructor(
    private triagemService: TriagemService,
    private triagemEventService: TriagemEventService,
    private authService: AuthService,
    private router: Router
  ) {
    this.usuarioLogado = this.authService.user;
  }

  ngOnInit() {
  this.carregarEstatisticas();
  this.carregarFilaDisponiveis();
  this.carregarFilaEmTriagem();
  this.carregarPosTriagemPreview();

    // Escutar notificações de atualização
    this.triagemEventService.atualizarDashboard$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
  console.log('Dashboard: Recebida notificação para atualizar');
  this.carregarEstatisticas();
  this.carregarFilaDisponiveis();
    this.carregarFilaEmTriagem();
  this.carregarPosTriagemPreview();
      });

    // Atualiza as estatísticas a cada 30 segundos
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.carregarEstatisticas();
        this.carregarFilaDisponiveis();
  this.carregarFilaEmTriagem();
        this.carregarPosTriagemPreview();
      });

    // Atualiza a hora a cada minuto
    interval(60000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.horaAtual = new Date());
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarEstatisticas() {
    console.log('Dashboard: Carregando estatísticas...');
    this.triagemService.obterEstatisticasTriagem().subscribe({
      next: (stats: any) => {
        console.log('Dashboard: Estatísticas recebidas:', stats);
        this.estatisticas = stats;
      },
      error: (error: any) => {
        console.error('Dashboard: Erro ao carregar estatísticas:', error);
      }
    });
  }

  carregarFilaDisponiveis() {
    const DISPONIVEIS = new Set([
      'encaminhado para triagem',
      'encaminhado_para_triagem',
      '1 - Encaminhado para triagem'
    ]);
    this.triagemService.listarTodosAtendimentosDia().subscribe({
      next: (pacientes: PacienteTriagem[]) => {
        const lista = (pacientes || [])
          .filter(p => p && DISPONIVEIS.has(p.status))
          .sort((a, b) => (b.tempo_espera || 0) - (a.tempo_espera || 0));
        this.filaDisponiveisPreview = lista.slice(0, 5);
      },
      error: (err) => console.error('Dashboard: Erro ao carregar fila disponíveis:', err)
    });
  }

  carregarPosTriagemPreview() {
  const POS_TRIAGEM = new Set([
      'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica',
      'encaminhado para ambulatório', '5 - Encaminhado para ambulatório', 'encaminhado_para_ambulatorio',
      'encaminhado para exames', '7 - Encaminhado para exames', 'encaminhado_para_exames'
    ]);
    const ENCAMINHADOS = new Set([
      'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica',
      'encaminhado para ambulatório', '5 - Encaminhado para ambulatório', 'encaminhado_para_ambulatorio',
      'encaminhado para exames', '7 - Encaminhado para exames', 'encaminhado_para_exames',
      'aguardando exames'
    ]);
    const EM_ATENDIMENTO = new Set([
      'em atendimento médico', '4 - Em atendimento médico', 'em_atendimento_medico',
      'em atendimento ambulatorial', '6 - Em atendimento ambulatorial', 'em_atendimento_ambulatorial'
    ]);
    this.triagemService.listarTodosAtendimentosDia().subscribe({
      next: (pacientes: PacienteTriagem[]) => {
        const lista = (pacientes || [])
          .filter(p => p && POS_TRIAGEM.has(p.status))
          .sort((a, b) => (b.tempo_espera || 0) - (a.tempo_espera || 0));
        this.posTriagemPreview = lista.slice(0, 5);

        // Contadores para o card de pós-triagem
        const all = pacientes || [];
        this.posEncaminhados = all.filter(p => p && ENCAMINHADOS.has(p.status)).length;
        this.posEmAtendimento = all.filter(p => p && EM_ATENDIMENTO.has(p.status)).length;
      },
      error: (err) => console.error('Dashboard: Erro ao carregar pós-triagem preview:', err)
    });
  }

  carregarFilaEmTriagem() {
    const EM_TRIAGEM = new Set(['em_triagem', 'em triagem', '2 - Em triagem']);
    this.triagemService.listarTodosAtendimentosDia().subscribe({
      next: (pacientes: PacienteTriagem[]) => {
        const lista = (pacientes || [])
          .filter(p => p && EM_TRIAGEM.has(p.status))
          .sort((a, b) => (b.tempo_espera || 0) - (a.tempo_espera || 0));
        this.filaEmTriagemPreview = lista.slice(0, 5);
      },
      error: (err) => console.error('Dashboard: Erro ao carregar em triagem preview:', err)
    });
  }

  irParaFilaTriagem() {
    this.router.navigate(['/triagem']);
  }

  irParaPosTriagem() {
    this.router.navigate(['/pos-triagem']);
  }

  // Abre a tela de atendimento/triagem ao clicar no item do card
  abrirItemFila(p: PacienteTriagem) {
    if (!p || !p.id) return;
    const DISPONIVEIS = new Set([
      'encaminhado para triagem',
      'encaminhado_para_triagem',
      '1 - Encaminhado para triagem'
    ]);
    // Se está disponível para iniciar, dispara a abertura (iniciar triagem) e navega
    if (DISPONIVEIS.has(p.status)) {
      console.log('Dashboard: Iniciando triagem para', p.id);
      this.triagemService.iniciarTriagem(p.id).subscribe({
        next: () => {
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
    const EM_TRIAGEM = new Set(['em_triagem', 'em triagem', '2 - Em triagem']);
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
      '5 - Encaminhado para ambulatório': '5 - Encaminhado para Ambulatório',
      'encaminhado_para_ambulatorio': '5 - Encaminhado para Ambulatório',
      'encaminhado para ambulatório': '5 - Encaminhado para Ambulatório',
      '7 - Encaminhado para exames': '7 - Encaminhado para Exames',
      'encaminhado_para_exames': '7 - Encaminhado para Exames',
      'encaminhado para exames': '7 - Encaminhado para Exames'
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
      '5 - Encaminhado para ambulatório': '#9C27B0',
      'encaminhado_para_ambulatorio': '#9C27B0',
      'encaminhado para ambulatório': '#9C27B0',
      '7 - Encaminhado para exames': '#009688',
      'encaminhado_para_exames': '#009688',
      'encaminhado para exames': '#009688'
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
