import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { interval, Subscription, firstValueFrom } from 'rxjs';
import { TriagemService } from '../services/triagem.service';
import { TriagemEventService } from '../services/triagem-event.service';

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
    MatSnackBarModule
  ],
  templateUrl: './fila-triagem.component.html',
  styleUrls: ['./fila-triagem.component.scss']
})
export class FilaTriagemComponent implements OnInit, OnDestroy {
  pacientes: PacienteTriagem[] = [];
  estatisticas: Estatisticas = {
    pacientes_aguardando: 0,
    por_classificacao: {},
    tempo_medio_espera: 0
  };
  carregando = true;
  filtroStatus: string = 'encaminhado para triagem'; // Ajustado para corresponder ao valor retornado pela API

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
    private router: Router
  ) {}

  ngOnInit() {
    this.carregarDados();
    this.iniciarAtualizacaoAutomatica();
  }

  ngOnDestroy() {
    this.atualizacaoSubscription?.unsubscribe();
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
      const usarFilaEndpoint = this.filtroStatus ? this.getStatusAliases('encaminhado para triagem').has(this.filtroStatus) : false;
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
        const aliases = this.getStatusAliases(this.filtroStatus);
        this.pacientes = lista.filter(p => aliases.has(p.status));
      }

      this.estatisticas = (estatisticas as Estatisticas) || this.estatisticas;
    } catch (error) {
      console.error('Erro ao carregar dados da triagem:', error);
      this.snackBar.open('Erro ao carregar dados da triagem', 'Fechar', {
        duration: 5000
      });
    } finally {
      this.carregando = false;
    }
  }

  private getStatusAliases(statusBase: string): Set<string> {
    // Mapeia filtros para variações de status vindas do backend
    const map: Record<string, string[]> = {
      'encaminhado para triagem': [
        'encaminhado para triagem', 'encaminhado_para_triagem', '1 - Encaminhado para triagem'
      ],
      'em_triagem': [
        'em_triagem', 'em triagem', '2 - Em triagem'
      ],
      'encaminhado para sala médica': [
        'encaminhado para sala médica', 'encaminhado_para_sala_medica', '3 - Encaminhado para sala médica'
      ],
      'em atendimento médico': [
        'em atendimento médico', 'em_atendimento_medico', '4 - Em atendimento médico'
      ],
      'encaminhado para ambulatório': [
        'encaminhado para ambulatório', 'encaminhado_para_ambulatorio', '5 - Encaminhado para ambulatório'
      ],
      'em atendimento ambulatorial': [
        'em atendimento ambulatorial', 'em_atendimento_ambulatorial', '6 - Em atendimento ambulatorial'
      ],
      'encaminhado para exames': [
        'encaminhado para exames', 'encaminhado_para_exames', '7 - Encaminhado para exames'
      ],
      'aguardando exames': [
        'aguardando exames'
      ],
      'exames concluídos': [
        'exames concluídos'
      ],
      'alta médica': [
        'alta médica'
      ],
      'transferido': [
        'transferido'
      ],
      'óbito': [
        'óbito'
      ]
    };
    const arr = map[statusBase] || [statusBase];
    return new Set(arr);
  }

  async iniciarTriagem(paciente: PacienteTriagem) {
    try {
      console.log('Iniciando triagem para paciente ID:', paciente.id);
      await firstValueFrom(this.triagemService.iniciarTriagem(paciente.id));
      console.log('Triagem iniciada com sucesso');

      // Notificar que uma triagem foi iniciada
      this.triagemEventService.notificarTriagemIniciada();

      this.snackBar.open(`Triagem iniciada para ${paciente.paciente_nome}`, 'Fechar', {
        duration: 3000
      });

      // Pequeno delay para garantir que a mudança foi commitada no banco
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navegar para tela de triagem com dados de prefill
      console.log('Navegando para tela de triagem...');
      this.router.navigate(['/triagem/realizar', paciente.id], {
        state: { prefill: {
          paciente_nome: paciente.paciente_nome,
          paciente_nascimento: paciente.paciente_nascimento,
          paciente_sexo: paciente.paciente_sexo,
          queixa_principal: paciente.queixa_principal
        }}
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
      '6 - Em atendimento ambulatorial': '#3F51B5',
      'em_atendimento_ambulatorial': '#3F51B5',
      'em atendimento ambulatorial': '#3F51B5',
      '7 - Encaminhado para exames': '#009688',
      'encaminhado_para_exames': '#009688',
      'encaminhado para exames': '#009688',
      '8 - Atendimento concluído': '#4CAF50',
      'atendimento_concluido': '#4CAF50',
      'atendimento concluído': '#4CAF50'
    };
    return cores[status] || '#757575';
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
      '6 - Em atendimento ambulatorial': '6 - Em Atendimento Ambulatorial',
      'em_atendimento_ambulatorial': '6 - Em Atendimento Ambulatorial',
      'em atendimento ambulatorial': '6 - Em Atendimento Ambulatorial',
      '7 - Encaminhado para exames': '7 - Encaminhado para Exames',
      'encaminhado_para_exames': '7 - Encaminhado para Exames',
      'encaminhado para exames': '7 - Encaminhado para Exames',
      '8 - Atendimento concluído': '8 - Atendimento Concluído',
      'atendimento_concluido': '8 - Atendimento Concluído',
      'atendimento concluído': '8 - Atendimento Concluído'
    };
    return descricoes[status] || status;
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
    return this.pacientes.filter(p =>
      p.status === 'encaminhado para triagem' ||
      p.status === '1 - Encaminhado para triagem'
    ).length;
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
