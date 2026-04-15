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
import { normalizeStatus, getStatusLabel } from '../../utils/normalize-status';

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

  // Contadores por status
  totalConsultas: number = 0;
  altasMedicas: number = 0;
  encaminhadosAmbulatorio: number = 0;
  encaminhadosExames: number = 0;
  transferidos: number = 0;
  obitos: number = 0;

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
    this.medicoService.getTodosAtendimentos().subscribe({
      next: (data: any[]) => {
        console.log('🔍 TOTAL de atendimentos recebidos:', data?.length || 0);
        const agora = new Date();

        this.consultas = (data || []).filter(consulta => {
          // Filtrar apenas atendimentos das últimas 24h (mesma lógica do dashboard)
          const campoData = consulta.created_at || consulta.data_hora_atendimento;
          if (!campoData) {
            console.log('❌ Atendimento sem data:', consulta.id);
            return false;
          }

          const dataAtendimento = new Date(campoData);
          const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);

          if (diffHoras > 24) {
            console.log(`⏰ Atendimento ${consulta.id} fora das 24h: ${diffHoras.toFixed(2)}h - Data: ${dataAtendimento.toLocaleString()}`);
            return false;
          }

          // Incluir todos os status que representam consultas realizadas (mesma lógica do dashboard)
          const statusNorm = normalizeStatus(consulta.status);
          const statusValido = statusNorm === 'atendimento_concluido' ||
            statusNorm === 'alta_medica' ||
            statusNorm === 'encaminhado_para_ambulatorio' ||
            statusNorm === 'encaminhado_para_exames' ||
            statusNorm === 'transferido' ||
            statusNorm === 'obito' ||
            statusNorm === 'retornar_atendimento_medico';

          if (!statusValido) {
            console.log(`❌ Status inválido para consulta ${consulta.id}: "${consulta.status}"`);
            return false;
          }

          console.log(`✅ Consulta válida ${consulta.id}: ${diffHoras.toFixed(2)}h - Status: "${consulta.status}" - Data: ${dataAtendimento.toLocaleString()}`);
          return statusValido;
        });

        console.log(`🎯 RESULTADO FINAL: ${this.consultas.length} consultas realizadas encontradas`);
        console.log('📊 Comparar com dashboard que mostra: 1 consulta');

        this.calcularContadores();
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

  calcularContadores(): void {
    this.totalConsultas = this.consultas.length;
    this.altasMedicas = 0;
    this.encaminhadosAmbulatorio = 0;
    this.encaminhadosExames = 0;
    this.transferidos = 0;
    this.obitos = 0;

    for (const consulta of this.consultas) {
      const statusNorm = normalizeStatus(consulta.status);

      if (statusNorm === 'alta_medica') {
        this.altasMedicas++;
      } else if (statusNorm === 'encaminhado_para_ambulatorio') {
        this.encaminhadosAmbulatorio++;
      } else if (statusNorm === 'encaminhado_para_exames') {
        this.encaminhadosExames++;
      } else if (statusNorm === 'transferido') {
        this.transferidos++;
      } else if (statusNorm === 'obito') {
        this.obitos++;
      }
    }
  }

  get consultasFiltradas(): any[] {
    if (!this.filtroStatus) {
      return this.consultas;
    }

    return this.consultas.filter(consulta => {
      const statusNorm = normalizeStatus(consulta.status);
      const filtro = this.filtroStatus.toLowerCase();

      if (filtro === 'alta médica') {
        return statusNorm === 'alta_medica' || statusNorm === 'atendimento_concluido';
      }
      if (filtro === 'encaminhado para ambulatório') {
        return statusNorm === 'encaminhado_para_ambulatorio';
      }
      if (filtro === 'encaminhado para exames') {
        return statusNorm === 'encaminhado_para_exames';
      }
      if (filtro === 'transferido') {
        return statusNorm === 'transferido';
      }
      if (filtro === 'óbito') {
        return statusNorm === 'obito';
      }
      if (filtro === 'reencaminhado para sala médica') {
        return statusNorm === 'retornar_atendimento_medico';
      }

      return statusNorm.includes(filtro.replace(/ /g, '_'));
    });
  }

  abrirConsulta(consulta: any): void {
    if (consulta?.id) {
      // Navegar em modo visualização para evitar que o componente atualize o status automaticamente
      this.router.navigate(['/medico/atendimento', consulta.id], {
        state: {
          modoVisualizacao: true,
          consultaRealizada: true,
          // Ao abrir a partir do card 'consultas' não queremos permitir edição por padrão
          podeEditarPorStatus: false,
          origemCard: 'consultas'
        }
      });
    }
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      'encaminhado_para_sala_medica': '#FF9800',
      'em_atendimento_medico': '#FF5722',
      'atendimento_concluido': '#4CAF50',
      'alta_medica': '#2196F3',
      'encaminhado_para_ambulatorio': '#9C27B0',
      'encaminhado_para_exames': '#673AB7',
      'transferido': '#795548',
      'obito': '#424242',
      'retornar_atendimento_medico': '#FF9800'
    };
    return cores[normalizeStatus(status)] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    return getStatusLabel(normalizeStatus(status));
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
