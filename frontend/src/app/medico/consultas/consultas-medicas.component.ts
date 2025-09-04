import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';
import { MedicoService } from '../medico.service';

@Component({
  selector: 'app-consultas-medicas',
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
  templateUrl: './consultas-medicas.component.html',
  styleUrls: ['./consultas-medicas.component.scss']
})
export class ConsultasMedicasComponent implements OnInit, OnDestroy {
  consultas: any[] = [];
  tempoMedioEspera: number = 0;
  carregando: boolean = false;
  filtroStatus: string = '';
  atualizacaoSubscription?: Subscription;

  constructor(
    private medicoService: MedicoService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarDados();
    this.iniciarAtualizacaoAutomatica();
  }

  ngOnDestroy(): void {
    this.atualizacaoSubscription?.unsubscribe();
  }

  carregarDados(): void {
    this.carregando = true;
    this.medicoService.getConsultasMedicas().subscribe({
      next: (data: any[]) => {
        const agora = new Date();

        this.consultas = (data || []).filter(consulta => {
          // Filtrar apenas atendimentos das últimas 24h
          const campoData = consulta.created_at || consulta.data_hora_atendimento;
          if (!campoData) return false;
          const dataConsulta = new Date(campoData);
          const diffHoras = (agora.getTime() - dataConsulta.getTime()) / (1000 * 60 * 60);
          if (diffHoras > 24) return false;

          // Filtrar apenas atendimentos que já foram concluídos ou que têm consulta salva
          const status = (consulta.status || '').toLowerCase();
          const temConsultaSalva = consulta.data_consulta || consulta.diagnostico || consulta.prescricao || consulta.observacoes_medicas;

          const statusValido = status.includes('atendimento_concluido') ||
                 status.includes('atendimento concluido') ||
                 status.includes('atendimento concluído') ||
                 status.includes('alta_medica') ||
                 status.includes('alta médica') ||
                 status.includes('alta medica') ||
                 status.includes('encaminhado_para_ambulatorio') ||
                 status.includes('encaminhado para ambulatório') ||
                 status.includes('encaminhado para ambulatorio') ||
                 status.includes('encaminhado_para_exames') ||
                 status.includes('encaminhado para exame') ||
                 status.includes('encaminhado para exames') ||
                 status.includes('transferido') ||
                 status.includes('óbito') ||
                 status.includes('obito');

          return statusValido || !!temConsultaSalva;
        });

        console.log(`Consultas realizadas encontradas: ${this.consultas.length}`);

        this.calcularTempoMedio();
        this.carregando = false;
      },
      error: (error) => {
        console.error('Erro ao carregar consultas:', error);
        this.snackBar.open('Erro ao carregar consultas médicas', 'Fechar', { duration: 3000 });
        this.carregando = false;
      }
    });
  }

  iniciarAtualizacaoAutomatica(): void {
    this.atualizacaoSubscription = interval(30000).subscribe(() => {
      this.carregarDados();
    });
  }

  calcularTempoMedio(): void {
    if (this.consultas.length === 0) {
      this.tempoMedioEspera = 0;
      return;
    }

    const agora = new Date();
    let tempoTotal = 0;
    let consultasValidas = 0;

    for (const consulta of this.consultas) {
      const dataInicio = new Date(consulta.data_hora_atendimento || consulta.created_at);
      if (!isNaN(dataInicio.getTime())) {
        const diffMinutos = Math.floor((agora.getTime() - dataInicio.getTime()) / 60000);
        tempoTotal += diffMinutos;
        consultasValidas++;
      }
    }

    this.tempoMedioEspera = consultasValidas > 0 ? Math.floor(tempoTotal / consultasValidas) : 0;
  }

  get consultasFiltradas(): any[] {
    if (!this.filtroStatus) {
      return this.consultas;
    }

    return this.consultas.filter(consulta => {
      const statusOriginal = consulta.status || '';
      const status = statusOriginal.toLowerCase();
      const filtro = this.filtroStatus.toLowerCase();

      // Verificação específica para cada status
      if (filtro === 'alta médica') {
        return status.includes('alta médica') || status.includes('alta_medica') || status.includes('atendimento_concluido') || status.includes('atendimento concluido') || status.includes('atendimento concluído');
      }
      if (filtro === 'encaminhado para ambulatório') {
        return status.includes('encaminhado para ambulatório') || status.includes('encaminhado_para_ambulatorio');
      }
      if (filtro === 'encaminhado para exames') {
        return status.includes('encaminhado para exames') ||
               status.includes('encaminhado_para_exames') ||
               status.includes('encaminhado para exame');
      }
      if (filtro === 'transferido') {
        return status.includes('transferido');
      }
      if (filtro === 'óbito') {
        return status.includes('óbito') || status.includes('obito');
      }

      // Fallback: busca genérica
      return status.includes(filtro.replace(/ /g, '_')) || status.includes(filtro);
    });
  }

  abrirConsulta(consulta: any): void {
    if (consulta?.id) {
      this.router.navigate(['/medico/atendimento', consulta.id]);
    }
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      'encaminhado_para_sala_medica': '#FF9800',
      'encaminhado para sala médica': '#FF9800',
      '3 - Encaminhado para sala médica': '#FF9800',
      'em_atendimento_medico': '#FF5722',
      'em atendimento médico': '#FF5722',
      '4 - Em atendimento médico': '#FF5722',
      'atendimento_concluido': '#4CAF50',
      '8 - Atendimento Concluído': '#4CAF50',
      'alta_medica': '#2196F3',
      'alta médica': '#2196F3',
      'encaminhado_para_ambulatorio': '#9C27B0',
      'encaminhado para ambulatório': '#9C27B0',
      '5 - Encaminhado para ambulatório': '#9C27B0',
      'encaminhado_para_exames': '#673AB7',
      'encaminhado para exames': '#673AB7',
      'encaminhado para exame': '#673AB7',
      '7 - Encaminhado para exames': '#673AB7',
      'transferido': '#795548',
      'obito': '#424242',
      'óbito': '#424242'
    };
    return cores[status] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    const descricoes: Record<string, string> = {
      'encaminhado_para_sala_medica': 'Encaminhado para Sala Médica',
      'encaminhado para sala médica': 'Encaminhado para Sala Médica',
      '3 - Encaminhado para sala médica': 'Encaminhado para Sala Médica',
      'em_atendimento_medico': 'Em Atendimento Médico',
      'em atendimento médico': 'Em Atendimento Médico',
      '4 - Em atendimento médico': 'Em Atendimento Médico',
      'atendimento_concluido': 'Atendimento Concluído',
      '8 - Atendimento Concluído': 'Atendimento Concluído',
      'alta_medica': 'Alta Médica',
      'alta médica': 'Alta Médica',
      'encaminhado_para_ambulatorio': 'Encaminhado para Ambulatório',
      'encaminhado para ambulatório': 'Encaminhado para Ambulatório',
      '5 - Encaminhado para ambulatório': 'Encaminhado para Ambulatório',
      'encaminhado_para_exames': 'Encaminhado para Exames',
      'encaminhado para exames': 'Encaminhado para Exames',
      'encaminhado para exame': 'Encaminhado para Exames',
      '7 - Encaminhado para exames': 'Encaminhado para Exames',
      'transferido': 'Transferido',
      'obito': 'Óbito',
      'óbito': 'Óbito'
    };
    return descricoes[status] || status;
  }

  getCor(classificacao?: string): string {
    const coresPrioridade: Record<string, string> = {
      'vermelho': '#E53E3E',
      'laranja': '#FF8C00',
      'amarelo': '#F6E05E',
      'verde': '#48BB78',
      'azul': '#4299E1'
    };
    return classificacao ? coresPrioridade[classificacao] || '#757575' : '#757575';
  }

  getIniciais(nome: string): string {
    return nome.split(' ').slice(0, 2).map(n => n.charAt(0)).join('').toUpperCase();
  }

  getIdade(nascimento: string): number {
    if (!nascimento) return 0;
    const hoje = new Date();
    const dataNasc = new Date(nascimento);
    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const mes = hoje.getMonth() - dataNasc.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }
    return idade;
  }

  formatarTempo(minutos: number): string {
    if (!minutos) return '0 min';
    if (minutos < 60) return minutos + ' min';
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    return `${h}h ${m}min`;
  }

  formatarDataHora(dataHora: string): string {
    if (!dataHora) return '';
    return new Date(dataHora).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  atualizar(): void {
    this.carregarDados();
  }
}
