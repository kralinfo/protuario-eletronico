import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ClassificacaoDialogComponent } from 'src/app/classificacao-dialog/classificacao-dialog.component';
import { MedicoService } from 'src/app/medico/medico.service';
import { TriagemService } from 'src/app/services/triagem.service';
import { RealtimeService } from 'src/app/services/realtime.service';
import { FilaService } from 'src/app/services/fila.service';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';
import { normalizeStatus, getStatusLabel } from '../../utils/normalize-status';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-dashboard-medico',
  templateUrl: './dashboard-medico.component.html',
  styleUrls: ['./dashboard-medico.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule, MatSnackBarModule]
})
export class DashboardMedicoComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  private atualizacaoPendente: any;
  mostrarAlertaAtualizacao: boolean = false;
  alertaEstado: 'carregando' | 'sucesso' | 'erro' = 'carregando';
  private ocultarAlertaTimeout: any;
  private alertasInterval: any;
  chamandoPaciente: Record<number, boolean> = {};

  constructor(
    private medicoService: MedicoService,
    private triagemService: TriagemService,
    private router: Router,
    private dialog: MatDialog,
    private realtimeService: RealtimeService,
    private snackBar: MatSnackBar,
    private filaService: FilaService
  ) {}

  chamarPaciente(p: any, evento: Event): void {
    evento.stopPropagation();
    this.chamandoPaciente[p.id] = true;
    this.filaService.getEstado().subscribe({
      next: (res) => {
        const chamadoAtual = res.data?.currentMedico;
        if (chamadoAtual && chamadoAtual.patientId !== p.id) {
          const ref = this.dialog.open(ConfirmDialogComponent, {
            width: '420px',
            data: {
              title: 'Chamado em aberto',
              message: `Existe um chamado aberto para ${chamadoAtual.patientName}. Deseja chamar ${p.paciente_nome} mesmo assim?`
            }
          });
          ref.afterClosed().subscribe(confirmado => {
            if (confirmado) {
              this.executarChamadaMedicoDash(p);
            } else {
              this.chamandoPaciente[p.id] = false;
            }
          });
        } else {
          this.executarChamadaMedicoDash(p);
        }
      },
      error: () => this.executarChamadaMedicoDash(p)
    });
  }

  private executarChamadaMedicoDash(p: any): void {
    this.filaService.chamarPaciente(p.id, 'medico').subscribe({
      next: () => this.snackBar.open(`${p.paciente_nome} chamado(a) para sala médica`, 'Fechar', { duration: 3000 }),
      error: () => this.snackBar.open('Erro ao chamar paciente', 'Fechar', { duration: 4000 }),
      complete: () => setTimeout(() => { this.chamandoPaciente[p.id] = false; }, 3000)
    });
  }

  abrirDialogClassificacao() {
    this.dialog.open(ClassificacaoDialogComponent, {
      panelClass: ['p-0', 'max-w-3xl', 'w-full']
    });
  }
  abrirItemAlertaTempo(p: any) {
    if (!p || !p.id) return;
    // Usar a mesma navegação que funciona no card de fila
    this.router.navigate(['/medico/atendimento', p.id]);
  }
  private readonly LIMITES_RISCO: Record<string, number> = {
    vermelho: 0,
    laranja: 10,
    amarelo: 60,
    verde: 120,
    azul: 240
  };

  private readonly STATUS_ALERTAS = new Set<string>([
    'encaminhado_para_sala_medica',
    'em_atendimento_medico',
    'retornar_atendimento_medico',
    'encaminhado_para_ambulatorio',
    'encaminhado_para_exames'
  ]);

  carregarAlertasTempo() {
    // DEBUG: Listar todos os atendimentos com status 'em atendimento médico'
    const atendimentosEmAtendimentoMedico: any[] = [];
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
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
  if (normalizeStatus(p.status) !== 'encaminhado_para_sala_medica' && normalizeStatus(p.status) !== 'em_atendimento_medico') continue;
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
      const sortByGravidade = (a: any, b: any) => (b.tempo_espera || 0) - (a.tempo_espera || 0);
      this.alertasCriticos = this.ordenarPorClassificacaoETempo(criticos).slice(0, 5);
      this.alertasAtencao = this.ordenarPorClassificacaoETempo(atencao).slice(0, 5);
    });
  }
  estatisticas: any = {
    pacientes_aguardando: 0,
    pacientes_em_atendimento: 0,
    consultas_concluidas: 0,
    por_classificacao: {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    }
  };
  filaDisponiveisPreview: any[] = [];
  filaSalaMedicaPreview: any[] = [];
  quantidadeEncaminhados: number = 0;
  quantidadeEmAtendimentoMedico: number = 0;
  filaEmAtendimentoPreview: any[] = [];
  consultasPreview: any[] = [];
  consultasEncaminhadas: number = 0;
  consultasEmAtendimento: number = 0;
  consultasRealizadasTotal: number = 0;
  alertasCriticos: any[] = [];
  alertasAtencao: any[] = [];
  atendimentos: any[] = [];

  atualizarEstatisticasPorClassificacao(data: any[]) {
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
    this.estatisticas.por_classificacao = por_classificacao;
  }

  ngOnInit() {
    this.atualizarDashboard();

    // 🔌 Conectar WebSocket ao módulo médico antes de configurar eventos
    this.realtimeService.connect('medico')
      .then(() => {
        console.log('✅ [DashboardMedico] Realtime conectado ao módulo medico');
        this.configurarRealtime();
      })
      .catch((err: any) => {
        console.warn('⚠️ [DashboardMedico] Realtime indisponível:', err?.message);
        this.configurarRealtime(); // configura mesmo assim (observables falharão silenciosamente)
      });

    // Verificador de tempo: A cada 60 segundos ele busca os atendimentos
    // e recalcula quem está estourando o tempo limite (Manchester),
    // além de forçar a atualização visual dos minutos corridos na tela.
    this.alertasInterval = setInterval(() => {
      this.carregarAlertasTempo();
    }, 60000);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    if (this.alertasInterval) {
      clearInterval(this.alertasInterval);
    }
    this.realtimeService.disconnect();
  }

  configurarRealtime() {
    this.subscriptions.add(this.realtimeService.onPatientArrived().subscribe((data) => {
      console.log('🔄 Dashboard Medico (WebSocket): Paciente chegou, atualizando dashboard...', data);
      this.processarAtualizacaoSocket();
    }));

    this.subscriptions.add(this.realtimeService.onPatientTransferred().subscribe((data) => {
      console.log('🔄 Dashboard Medico (WebSocket): Paciente transferido, atualizando dashboard...', data);
      this.processarAtualizacaoSocket();
    }));

    this.subscriptions.add(this.realtimeService.onQueueUpdated().subscribe((data) => {
      console.log('🔄 Dashboard Medico (WebSocket): Fila atualizada, atualizando dashboard...', data);
      this.processarAtualizacaoSocket();
    }));

    this.subscriptions.add(this.realtimeService.onConnectionError().subscribe((error) => {
      console.error('❌ Erro de conexão WebSocket:', error);
      this.mostrarAlertaErro();
    }));
  }

  mostrarAlertaErro() {
    this.mostrarAlertaAtualizacao = true;
    this.alertaEstado = 'erro';
    if (this.ocultarAlertaTimeout) clearTimeout(this.ocultarAlertaTimeout);
    this.ocultarAlertaTimeout = setTimeout(() => {
      this.mostrarAlertaAtualizacao = false;
    }, 5000);
  }

  processarAtualizacaoSocket() {
    if (this.ocultarAlertaTimeout) {
      clearTimeout(this.ocultarAlertaTimeout);
    }

    this.mostrarAlertaAtualizacao = true;
    this.alertaEstado = 'carregando';

    if (this.atualizacaoPendente) {
      clearTimeout(this.atualizacaoPendente);
    }

    this.atualizacaoPendente = setTimeout(() => {
      this.atualizarDashboard();

      setTimeout(() => {
        this.alertaEstado = 'sucesso';
        this.ocultarAlertaTimeout = setTimeout(() => {
          this.mostrarAlertaAtualizacao = false;
        }, 5000);
      }, 500);

      this.atualizacaoPendente = null;
    }, 800);
  }

  atualizarDashboard() {
    // Resetar variáveis locais para garantir atualização total (NÃO resetar quantidadeEncaminhados)
    this.estatisticas = {
      pacientes_aguardando: 0,
      pacientes_em_atendimento: 0,
      consultas_concluidas: 0,
      por_classificacao: {
        vermelho: 0,
        laranja: 0,
        amarelo: 0,
        verde: 0,
        azul: 0
      }
    };
    this.filaDisponiveisPreview = [];
    this.filaSalaMedicaPreview = [];
    this.filaEmAtendimentoPreview = [];
    this.consultasPreview = [];
    this.consultasEncaminhadas = 0;
    this.consultasEmAtendimento = 0;
    this.consultasRealizadasTotal = 0;
    this.alertasCriticos = [];
    this.alertasAtencao = [];

    // Disparar todos os endpoints na ordem correta
    this.carregarEstatisticas();
    this.carregarFilaSalaMedica();
    this.carregarGridAtendimentos();
    this.carregarAlertasTempo();
    this.atualizarCardPorClassificacao();
    this.carregarConsultasMedicas();
  }

  carregarGridAtendimentos() {
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      this.filaDisponiveisPreview = this.ordenarPorClassificacaoETempo(atendimentos || []);
    });
  }

  carregarFilaSalaMedica() {
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      const agora = new Date();
      const atendimentos24h = (atendimentos || []).filter(a => {
        let campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;
        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        return diffHoras <= 24;
      });

      // Filtrar atendimentos para fila: "em atendimento médico" + "encaminhado para sala médica"
      const filaAtendimento = atendimentos24h.filter(a => {
        const statusNorm = normalizeStatus(a.status);
        return statusNorm === 'em_atendimento_medico' ||
               statusNorm === 'encaminhado_para_sala_medica' ||
               statusNorm === 'retornar_atendimento_medico';
      });
      this.filaSalaMedicaPreview = this.ordenarPorClassificacaoETempo(filaAtendimento).slice(0, 5);

      // Contador "Encaminhados" (esquerda) - "encaminhado para sala medica" ou "retornar_atendimento_medico"
      this.quantidadeEncaminhados = atendimentos24h.filter(a => {
        const statusNorm = normalizeStatus(a.status);
        return statusNorm === 'encaminhado_para_sala_medica' || statusNorm === 'retornar_atendimento_medico';
      }).length;

      // Contador "Em Atendimento Médico" (direita) - apenas "em atendimento médico"
      this.quantidadeEmAtendimentoMedico = atendimentos24h.filter(a => normalizeStatus(a.status) === 'em_atendimento_medico').length;

      // Card "Aguardando Atendimento" - manter como estava
      this.estatisticas.pacientes_aguardando = this.quantidadeEncaminhados;
    });
  }

  getAguardandoSalaMedicaHoje(): number {
    const hoje = new Date();
    return this.filaSalaMedicaPreview?.filter(a => {
      if (normalizeStatus(a.status) !== 'encaminhado_para_sala_medica') return false;
      let campoData = a.created_at || a.data_hora_atendimento;
      if (!campoData) return false;
      const data = new Date(campoData);
      return data.getDate() === hoje.getDate() &&
        data.getMonth() === hoje.getMonth() &&
        data.getFullYear() === hoje.getFullYear();
    })?.length || 0;
  }

  carregarEstatisticas() {
    // Buscar todos os atendimentos para calcular estatísticas mais abrangentes
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
      const agora = new Date();
      const concluidosUltimas24Horas = atendimentos.filter(a => {
        const campoData = a.created_at || a.data_hora_atendimento;
        if (!campoData) return false;

        const dataAtendimento = new Date(campoData);
        const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
        if (diffHoras > 24) return false;

        // Incluir todos os status que representam consultas realizadas
        const statusNorm = normalizeStatus(a.status);
        const statusValido = statusNorm === 'atendimento_concluido' ||
               statusNorm === 'alta_medica' ||
               statusNorm === 'encaminhado_para_ambulatorio' ||
               statusNorm === 'encaminhado_para_exames' ||
               statusNorm === 'transferido' ||
               statusNorm === 'obito';

        return statusValido;
      });

      this.estatisticas.consultas_concluidas = concluidosUltimas24Horas.length;
      console.log('Total de consultas realizadas nas últimas 24 horas:', this.estatisticas.consultas_concluidas);
    });
  }

  irParaFilaSalaMedica() {
    this.router.navigate(['/medico/fila']);
  }

  irParaConsultas() {
    this.router.navigate(['/medico/consultas']);
  }

  abrirItemSalaMedica(item: any) {
    this.router.navigate(['/medico/atendimento', item.id]);
  }

  abrirItemConsulta(item: any) {
    // Para consultas realizadas, navegar normalmente mas em modo de visualização
    // O modo de visualização será controlado na página de atendimento baseado no status
    this.router.navigate(['/medico/atendimento', item.id], {
      state: { modoVisualizacao: true, consultaRealizada: true }
    });
  }

  abrirConsultaRealizada(consulta: any) {
    if (!consulta || !consulta.id) return;

    console.log('🔍 Abrindo consulta realizada:', consulta.id, 'Status:', consulta.status);

    // Status que permitem edição no card de consultas
    const statusPermiteEdicao = [
      'em_atendimento_medico',
      'retornar_atendimento_medico'
    ];

    const podeEditar = statusPermiteEdicao.includes(normalizeStatus(consulta.status));

    console.log('🔍 Status permite edição:', podeEditar);

    // Navegar para a tela de atendimento médico
    this.router.navigate(['/medico/atendimento', consulta.id], {
      state: {
        modoVisualizacao: true,
        consultaRealizada: true,
        podeEditarPorStatus: podeEditar,
        origemCard: 'consultas'
      }
    });
  }

  abrirConsultaVisualizacao(consulta: any, isConsultaRealizada: boolean = false) {
    if (!consulta || !consulta.id) return;

    // Se for uma consulta realizada (do card "Consultas Realizadas"), abrir em modo somente leitura
    if (isConsultaRealizada) {
      console.log('🔍 Consulta realizada. Abrindo em modo de visualização (somente leitura).');

      // Abrir o modal em modo de visualização (somente leitura)
      this.dialog.open(ClassificacaoDialogComponent, {
        data: { consulta, modoVisualizacao: true, somenteLeitura: true },
        panelClass: ['p-0', 'max-w-3xl', 'w-full']
      });

      return; // Não alterar o status nem permitir edição
    }

    // Para outros casos, seguir o fluxo normal
    // Salvar o status original antes de qualquer alteração
    const statusOriginal = consulta.status;
    console.log('📋 Status original antes do modal:', statusOriginal);

    // Alterar o status para "em atendimento médico"
    this.medicoService.atualizarStatus(String(consulta.id), 'em_atendimento_medico').subscribe({
      next: () => {
        console.log('✅ Status alterado para: em atendimento médico');

        // Abrir o modal
        const dialogRef = this.dialog.open(ClassificacaoDialogComponent, {
          data: { consulta, modoVisualizacao: false },
          panelClass: ['p-0', 'max-w-3xl', 'w-full']
        });

        dialogRef.afterClosed().subscribe((resultado) => {
          // Restaurar o status original caso o modal seja fechado sem salvar
          if (!resultado || resultado.cancelado) {
            console.log('🔄 Restaurando status original:', statusOriginal);
            this.medicoService.atualizarStatus(String(consulta.id), statusOriginal).subscribe({
              next: () => {
                console.log('✅ Status restaurado para:', statusOriginal);
                this.atualizarDashboard();
              },
              error: (error: any) => {
                console.error('❌ Erro ao restaurar status:', error);
              }
            });
          } else {
            // Atualizar o dashboard caso o modal seja salvo
            this.atualizarDashboard();
          }
        });
      },
      error: (error: any) => {
        console.error('❌ Erro ao alterar status para "em atendimento médico":', error);
      }
    });
  }

  getDescricaoStatus(status: string): string {
    return getStatusLabel(normalizeStatus(status));
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      'encaminhado_para_sala_medica': '#FF9800',
      'em_atendimento_medico': '#FF5722',
      'encaminhado_para_triagem': '#2196F3',
      'em_triagem': '#4CAF50'
    };
    return cores[normalizeStatus(status)] || '#a0aec0';
  }

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

  formatarTempo(minutos: number): string {
    if (!minutos) return '0 min';
    if (minutos < 60) return minutos + ' min';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}min`;
  }

  calcularTempoDecorrido(p: any): number {
    const inicio = p.data_hora_atendimento || p.created_at;
    if (!inicio) {
      console.warn('⚠️ Campo de data ausente no atendimento:', p);
      return 0;
    }

    const dataInicio = new Date(inicio);
    if (isNaN(dataInicio.getTime())) {
      console.error('❌ Data inválida encontrada no atendimento:', p);
      return 0;
    }

    const agora = new Date();
    const diffMs = agora.getTime() - dataInicio.getTime();
    return Math.floor(diffMs / 60000); // minutos
  }

  calcularEstatisticasPorClassificacaoFila(data: any[]) {
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

  atualizarCardPorClassificacao() {
    this.medicoService.getTodosAtendimentos().subscribe((data: any[]) => {
      this.estatisticas.por_classificacao = this.calcularEstatisticasPorClassificacaoFila(data);
    });
  }

  carregarConsultasMedicas() {
    // Buscar atendimentos que já passaram por consulta médica
    this.medicoService.getTodosAtendimentos().subscribe((atendimentos: any[]) => {
        console.log('🔍 Total atendimentos recebidos:', atendimentos?.length || 0);


    const agora = new Date();

    // Filtrar atendimentos das últimas 24h que passaram por consulta médica
    const consultasRealizadas = (atendimentos || []).filter(atendimento => {
      const campoData = atendimento.created_at || atendimento.data_hora_atendimento;
      if (!campoData) return false;

      const dataAtendimento = new Date(campoData);
      const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
      if (diffHoras > 24) return false;

      // Verificar se passou por consulta médica:
      // 1. Campo hipotese_diagnostica preenchido OU
      // 2. Status indica que já foi atendido pelo médico
      const temConsultaRealizada = (atendimento.hipotese_diagnostica &&
                    atendimento.hipotese_diagnostica.trim() !== '');

      const statusNorm = normalizeStatus(atendimento.status);
      const statusPosConsulta = statusNorm === 'encaminhado_para_ambulatorio' ||
                  statusNorm === 'em_atendimento_ambulatorial' ||
                  statusNorm === 'encaminhado_para_exames' ||
                  statusNorm === 'atendimento_concluido' ||
                  statusNorm === 'alta_medica' ||
                  statusNorm === 'transferido' ||
                  statusNorm === 'em_observacao';

      return temConsultaRealizada || statusPosConsulta;
    }).map(consulta => {
      // Calcular e atribuir o tempo decorrido para cada consulta
      consulta.tempo_espera = this.calcularTempoDecorrido(consulta);
      return consulta;
    });

        // Calcular contadores específicos
        this.calcularContadoresConsultas(consultasRealizadas);

        // Atualizar lista de consultas para exibição
        this.consultasPreview = this.ordenarPorClassificacaoETempo(consultasRealizadas);

        console.log(`🎯 Consultas realizadas listadas: ${consultasRealizadas.length}`);
    });
  }

  calcularContadoresConsultas(consultasRealizadas: any[]) {
    // Total Realizadas - quantidade de consultas listadas no card
    this.consultasRealizadasTotal = consultasRealizadas.length;

    // Encaminhadas - atendimentos com status "encaminhado_para_exames" ou "encaminhado_para_ambulatorio"
    this.consultasEncaminhadas = consultasRealizadas.filter(consulta => {
      const status = (consulta.status || '').toLowerCase();
      return status === 'encaminhado_para_exames' || status === 'encaminhado_para_ambulatorio';
    }).length;

    // Em Observação - atendimentos com status "em_observacao" nas últimas 24h
    const agora = new Date();
    this.consultasEmAtendimento = consultasRealizadas.filter(consulta => {
      const status = (consulta.status || '').toLowerCase();
      if (status !== 'em_observacao') return false;
      const campoData = consulta.created_at || consulta.data_hora_atendimento;
      if (!campoData) return false;
      const dataAtendimento = new Date(campoData);
      const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
      return diffHoras <= 24;
    }).length;

    console.log(`📊 Contadores - Total: ${this.consultasRealizadasTotal}, Encaminhadas: ${this.consultasEncaminhadas}, Em Observação: ${this.consultasEmAtendimento}`);
  }

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
}
