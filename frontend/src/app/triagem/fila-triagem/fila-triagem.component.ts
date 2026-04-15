import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ClassificacaoDialogComponent } from 'src/app/classificacao-dialog/classificacao-dialog.component';
import { Router } from '@angular/router';
import { interval, Subscription, firstValueFrom, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TriagemEventService } from 'src/app/services/triagem-event.service';
import { TriagemService } from 'src/app/services/triagem.service';
import { RealtimeService } from 'src/app/services/realtime.service';
import { FilaService } from 'src/app/services/fila.service';
import { ConfirmDialogComponent } from 'src/app/shared/confirm-dialog/confirm-dialog.component';
import { normalizeStatus, getStatusLabel } from '../../utils/normalize-status';

interface PacienteTriagem {
  id: number;
  paciente_nome: string;
  paciente_nascimento: string;
  paciente_sexo: string;
  data_hora_atendimento: string;
  status: string;
  classificacao_risco?: string;
  queixa_principal?: string;
  tempo_espera: number;
  tempo_espera_formatado?: string;
  alerta?: string;
}

interface Estatisticas {
  pacientes_aguardando: number;
  por_classificacao: Record<string, number>;
  tempo_medio_espera: number;
}

@Component({
  selector: 'app-fila-triagem',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
     MatTooltipModule
  ],
    templateUrl: './fila-triagem.component.html',
    styleUrls: ['./fila-triagem.component.scss'],

})
export class FilaTriagemComponent implements OnInit, OnDestroy {
  pacientes: PacienteTriagem[] = [];
  estatisticas: Estatisticas = {
    pacientes_aguardando: 0,
    por_classificacao: {},
    tempo_medio_espera: 0
  };
  carregando = true;
  filtroStatus: string = 'encaminhado_para_triagem';
  chamandoPaciente: Record<number, boolean> = {};

  private atualizacaoSubscription?: Subscription;

  // Cores para classificação de risco
  private coresPrioridade: Record<string, string> = {
    'vermelho': '#E53E3E',
    'laranja': '#FF8C00',
    'amarelo': '#F6E05E',
    'verde': '#48BB78',
    'azul': '#4299E1'
  };

  constructor(
    private triagemService: TriagemService,
    private triagemEventService: TriagemEventService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private realtimeService: RealtimeService,
    private filaService: FilaService,
    private cdr: ChangeDetectorRef
  ) {}

    abrirDialogClassificacao() {
      this.dialog.open(ClassificacaoDialogComponent, {
        panelClass: ['p-0', 'max-w-3xl', 'w-full']
      });
    }

  ngOnInit() {
    this.carregarDados();
    this.iniciarAtualizacaoAutomatica();

    // 🔌 Conectar WebSocket ao módulo triagem
    this.realtimeService.connect('triagem')
      .then(() => console.log('✅ [FilaTriagem] Realtime conectado ao módulo triagem'))
      .catch((err: any) => console.warn('⚠️ [FilaTriagem] Realtime indisponível:', err?.message));

    // 🔄 Ouvir por mudanças em tempo real
    this.realtimeService.on('patient:transferred_out', (event: any) => {
      console.log('[FilaTriagem] Paciente saiu da triagem em tempo real:', event);
      this.carregarDados(false); // Recarregar sem loading
    });

    this.realtimeService.on('patient:arrived', (event: any) => {
      console.log('[FilaTriagem] Novo paciente em triagem em tempo real:', event);
      this.carregarDados(false);
    });
  }

  ngOnDestroy() {
    this.atualizacaoSubscription?.unsubscribe();
    this.realtimeService.disconnect();
  }

  private iniciarAtualizacaoAutomatica() {
    // Atualizar a cada 30 segundos
    this.atualizacaoSubscription = interval(30000).subscribe(() => {
      this.carregarDados(false); // false = não mostrar loading
    });
  }

  async carregarDados(mostrarLoading = true) {
    try {
      if (mostrarLoading) {
        this.carregando = true;
      }

      // Escolhe o endpoint adequado: quando filtrando por "encaminhado para triagem", usa a fila específica
      const usarFilaEndpoint = this.filtroStatus ? this.getStatusAliases('encaminhado_para_triagem').has(this.filtroStatus) : false;
      const [pacientes, estatisticas] = await Promise.all([
        firstValueFrom(usarFilaEndpoint
          ? this.triagemService.listarFilaTriagem()
          : this.triagemService.listarTodosAtendimentosDia()
        ),
        firstValueFrom(this.triagemService.obterEstatisticas())
      ]);

      console.log('Pacientes retornados pela API:', pacientes);

      // Filtrar com base no filtroStatus, considerando aliases/sinônimos
      const lista = (pacientes as PacienteTriagem[]) || [];
      if (!this.filtroStatus) {
        this.pacientes = lista;
      } else {
        this.pacientes = lista.filter(p => normalizeStatus(p.status) === this.filtroStatus);
      }

      this.estatisticas = (estatisticas as Estatisticas) || this.estatisticas;
    } catch (error) {
      console.error('Erro ao carregar dados da triagem:', error);
      this.snackBar.open('Erro ao carregar dados da triagem', 'Fechar', {
        duration: 5000
      });
    } finally {
      this.carregando = false;
      this.cdr.detectChanges();
    }
  }

  private getStatusAliases(statusBase: string): Set<string> {
    // Com normalizeStatus, cada status canônico mapeia apenas para si mesmo
    return new Set([statusBase]);
  }

  chamarPaciente(paciente: PacienteTriagem): void {
    this.chamandoPaciente[paciente.id] = true;
    this.filaService.getEstado().subscribe({
      next: (res) => {
        const chamadoAtual = res.data?.currentTriagem;
        if (chamadoAtual && chamadoAtual.patientId !== paciente.id) {
          const ref = this.dialog.open(ConfirmDialogComponent, {
            width: '420px',
            data: {
              title: 'Chamado em aberto',
              message: `Existe um chamado aberto para ${chamadoAtual.patientName}. Deseja chamar ${paciente.paciente_nome} mesmo assim?`
            }
          });
          ref.afterClosed().subscribe(confirmado => {
            if (confirmado) {
              this.executarChamadaTriagem(paciente);
            } else {
              this.chamandoPaciente[paciente.id] = false;
            }
          });
        } else {
          this.executarChamadaTriagem(paciente);
        }
      },
      error: () => this.executarChamadaTriagem(paciente)
    });
  }

  private executarChamadaTriagem(paciente: PacienteTriagem): void {
    this.filaService.chamarPaciente(paciente.id, 'triagem').subscribe({
      next: () => {
        this.snackBar.open(`${paciente.paciente_nome} chamado(a) para triagem`, 'Fechar', { duration: 3000 });
      },
      error: () => {
        this.snackBar.open('Erro ao chamar paciente', 'Fechar', { duration: 4000 });
      },
      complete: () => {
        setTimeout(() => { this.chamandoPaciente[paciente.id] = false; }, 3000);
      }
    });
  }

  async iniciarTriagem(paciente: PacienteTriagem) {
    try {
      console.log('Iniciando triagem para paciente ID:', paciente.id);
      const statusAnterior = paciente.status; // Salva o status atual para reverter se o usuário voltar sem salvar
      await firstValueFrom(this.triagemService.iniciarTriagem(paciente.id));
      console.log('Triagem iniciada com sucesso');

      // Notificar que uma triagem foi iniciada
      this.triagemEventService.notificarTriagemIniciada();

      this.snackBar.open(`Triagem iniciada para ${paciente.paciente_nome}`, 'Fechar', {
        duration: 3000
      });

      // Pequeno delay para garantir que a mudança foi commitada no banco
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navegar para tela de triagem com dados de prefill e status anterior
      console.log('Navegando para tela de triagem...');
      this.router.navigate(['/triagem/realizar', paciente.id], {
        state: {
          statusAnterior,
          prefill: {
            paciente_nome: paciente.paciente_nome,
            paciente_nascimento: paciente.paciente_nascimento,
            paciente_sexo: paciente.paciente_sexo,
            queixa_principal: paciente.queixa_principal
          }
        }
      });
    } catch (error) {
      console.error('Erro ao iniciar triagem:', error);
      this.snackBar.open('Erro ao iniciar triagem', 'Fechar', {
        duration: 5000
      });
    }
  }

  async continuarTriagem(paciente: PacienteTriagem) {
    try {
      console.log('Continuando triagem para paciente ID:', paciente.id);

      // Navegar diretamente para tela de triagem para edição
      this.snackBar.open(`Continuando triagem de ${paciente.paciente_nome}`, 'Fechar', {
        duration: 3000
      });

      console.log('Navegando para tela de triagem para continuação...');
      this.router.navigate(['/triagem/realizar', paciente.id], {
        state: { modoEdicao: true }
      });
    } catch (error) {
      console.error('Erro ao continuar triagem:', error);
      this.snackBar.open('Erro ao continuar triagem', 'Fechar', {
        duration: 5000
      });
    }
  }

  verDetalhes(paciente: PacienteTriagem) {
    console.log('Abrindo detalhes da triagem:', paciente);

    // Navegar para o componente de triagem em modo visualização (sem edição)
    this.router.navigate(['/triagem/realizar', paciente.id], {
      state: {
        modoVisualizacao: true,
        paciente_nome: paciente.paciente_nome
      }
    });
  }

  getCor(classificacao?: string): string {
    return classificacao ? this.coresPrioridade[classificacao] || '#757575' : '#757575';
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      'encaminhado_para_triagem': '#2196F3',
      'em_triagem': '#4CAF50',
      'encaminhado_para_sala_medica': '#FF9800',
      'em_atendimento_medico': '#FF5722',
      'encaminhado_para_ambulatorio': '#9C27B0',
      'em_atendimento_ambulatorial': '#3F51B5',
      'encaminhado_para_exames': '#009688',
      'atendimento_concluido': '#4CAF50'
    };
    return cores[normalizeStatus(status)] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    return getStatusLabel(normalizeStatus(status));
  }

  getIniciais(nome: string): string {
    return nome.split(' ')
      .slice(0, 2)
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase();
  }

  getIdade(nascimento: string): number {
    const hoje = new Date();
    const dataNasc = new Date(nascimento);
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mes = hoje.getMonth() - dataNasc.getMonth();

    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }

    return idade;
  }

  formatarDataHora(dataHora: string): string {
    return new Date(dataHora).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos para contar pacientes por status
  contarPacientesAguardando(): number {
    return this.pacientes.filter(p => normalizeStatus(p.status) === 'encaminhado_para_triagem').length;
  }

  contarPacientesEmTriagem(): number {
    return this.pacientes.filter(p =>
      p.status === 'em_triagem' ||
      p.status === 'em triagem' ||
      p.status === '2 - Em triagem'
    ).length;
  }

  contarTriagensConcluidas(): number {
    return this.pacientes.filter(p =>
      p.status === 'encaminhado para sala médica' ||
      p.status === 'encaminhado para ambulatório' ||
      p.status === 'encaminhado para exames' ||
      p.status === '3 - Encaminhado para sala médica' ||
      p.status === '5 - Encaminhado para ambulatório' ||
      p.status === '7 - Encaminhado para exames'
    ).length;
  }

  getClassificacaoArray(): Array<{key: string, value: number}> {
    return Object.entries(this.estatisticas.por_classificacao)
      .map(([key, value]) => ({key, value}));
  }

  // Formata minutos em "Xh Ymin" sempre que possível; garante saída consistente mesmo sem back-end formatado
  formatarTempo(minutos?: number | null): string {
    if (minutos === null || minutos === undefined || isNaN(minutos as any)) {
      return '-';
    }
    const total = Math.max(0, Math.round(minutos));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    return `${m} min`;
  }

  isStatusEncaminhadoParaTriagem(status: string): boolean {
    const ENC: Record<string, true> = {
      'encaminhado para triagem': true,
      'encaminhado_para_triagem': true,
      '1 - Encaminhado para triagem': true
    } as const;
    return !!ENC[status];
  }

  isStatusEmTriagem(status: string): boolean {
    const EM: Record<string, true> = {
      'em_triagem': true,
      'em triagem': true,
      '2 - Em triagem': true,
      '2 - Em Triagem': true
    } as const;
    return !!EM[status];
  }
}
