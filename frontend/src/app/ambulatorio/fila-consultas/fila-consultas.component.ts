import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AmbulatorioService } from '../ambulatorio.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { interval, Subscription } from 'rxjs';

interface ConsultaAmbulatorial {
  id: number;
  paciente_nome: string;
  paciente_nascimento: string;
  paciente_sexo: string;
  especialidade?: string;
  medico?: string;
  status: string;
  tempo_espera?: number;
  data_hora_consulta: string;
  alerta?: string;
}


@Component({
  selector: 'app-fila-consultas',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    FormsModule,
    MatChipsModule

  ],
  standalone: true,
  templateUrl: './fila-consultas.component.html',
  styleUrl: './fila-consultas.component.scss'
})
export class FilaConsultasComponent implements OnInit, OnDestroy {
  consultas: ConsultaAmbulatorial[] = [];
  filtroStatus = 'encaminhados'; // valor padrão: Encaminhados para ambulatorio
  carregando = false;

  estatisticas: { 
    por_classificacao: Record<string, number>,
    tempo_medio_espera: number
  } = {
    por_classificacao: {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    },
    tempo_medio_espera: 0
  };
  private subs = new Subscription();

  constructor(
    private ambulatorioService: AmbulatorioService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    this.carregarDados();
    this.subs.add(interval(30000).subscribe(() => this.carregarDados()));
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  carregarDados() {
    this.carregando = true;
    this.subs.add(
      this.ambulatorioService.getTodosAtendimentos().subscribe({
        next: (atendimentos: any[]) => {
          const agora = new Date();
          // Filtrar apenas últimas 24h
          const atendimentos24h = (atendimentos || []).filter(a => {
            let campoData = a.created_at || a.data_hora_atendimento;
            if (!campoData) return false;
            const dataAtendimento = new Date(campoData);
            const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
            return diffHoras <= 24;
          });

          let filtrados: any[] = [];
          switch (this.filtroStatus) {
            case 'todos':
              filtrados = atendimentos24h;
              break;
            case 'encaminhados':
              filtrados = atendimentos24h.filter(a => {
                const status = (a.status || '').toLowerCase();
                return status.includes('encaminhado para ambulatório') ||
                       status.includes('encaminhado_para_ambulatorio') ||
                       status === '5 - encaminhado para ambulatório';
              });
              break;
            case 'em_atendimento':
              filtrados = atendimentos24h.filter(a => {
                const status = (a.status || '').toLowerCase();
                return status === 'em atendimento ambulatorial' || status === 'em_atendimento_ambulatorial';
              });
              break;
            case 'em_observacao':
              filtrados = atendimentos24h.filter(a => (a.status || '').toLowerCase() === 'em_observacao');
              break;
            case 'alta':
              filtrados = atendimentos24h.filter(a => (a.status || '').toLowerCase() === 'atendimento_concluido');
              break;
            case 'reencaminhado':
              filtrados = atendimentos24h.filter(a => (a.status || '').toLowerCase() === 'retornar_atendimento_medico');
              break;
            default:
              filtrados = atendimentos24h;
          }

          // Corrige tempo_espera de cada consulta
          filtrados.forEach(a => {
            const inicio = a.data_hora_atendimento || a.created_at;
            if (!inicio) {
              a.tempo_espera = 0;
            } else {
              const dataInicio = new Date(inicio);
              a.tempo_espera = Math.floor((agora.getTime() - dataInicio.getTime()) / 60000); // minutos
            }
          });
          this.consultas = filtrados;
          this.atualizarEstatisticas(filtrados);

          // Calcular tempo médio de espera dos filtrados
          if (filtrados.length > 0) {
            const tempos = filtrados.map(a => a.tempo_espera ?? 0);
            this.estatisticas.tempo_medio_espera = Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length);
          } else {
            this.estatisticas.tempo_medio_espera = 0;
          }

          this.carregando = false;
        },
        error: () => {
          this.carregando = false;
          this.snackBar.open('Erro ao carregar consultas', 'Fechar', { duration: 3000 });
        }
      })
    );
  }

  atualizarEstatisticas(aguardando: any[]) {
    // Zera contadores
    this.estatisticas.por_classificacao = {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    };
    for (const atendimento of aguardando) {
      const risco = typeof atendimento.classificacao_risco === 'string'
        ? atendimento.classificacao_risco.toLowerCase()
        : '';
      if (this.estatisticas.por_classificacao.hasOwnProperty(risco)) {
        this.estatisticas.por_classificacao[risco as keyof typeof this.estatisticas.por_classificacao]++;
      }
    }
  }

  getCorEspecialidade(especialidade?: string): string {
    const cores: Record<string, string> = {
      cardiologia: '#E53935',
      dermatologia: '#FB8C00',
      pediatria: '#FDD835',
      ortopedia: '#43A047',
      ginecologia: '#1E88E5'
    };
    return especialidade ? cores[especialidade.toLowerCase()] || '#757575' : '#757575';
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      agendada: '#FFC107',
      'em consulta': '#2196F3',
      finalizada: '#4CAF50',
      cancelada: '#F44336'
    };
    return cores[status] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    const descricoes: Record<string, string> = {
      agendada: 'Agendada',
      'em consulta': 'Em Consulta',
      finalizada: 'Finalizada',
      cancelada: 'Cancelada'
    };
    return descricoes[status] || status;
  }

  getIdade(nascimento: string): number {
    const nasc = new Date(nascimento);
    const diff = Date.now() - nasc.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
  }

  formatarTempo(minutos?: number | null): string {
    if (!minutos) return '0 min';
    const total = Math.max(0, Math.round(minutos));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h && m) return `${h}h ${m}min`;
    if (h) return `${h}h`;
    return `${m}min`;
  }

  formatarDataHora(data: string): string {
    return new Date(data).toLocaleString('pt-BR');
  }

  getIniciais(nome: string): string {
    return nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  trackConsulta(index: number, consulta: ConsultaAmbulatorial) {
    return consulta.id;
  }

  contarPacientesAguardando(): number {
    // O array this.consultas já está filtrado para aguardando consulta
    return this.consultas.length;
  }

  isStatusEmConsulta(status: string): boolean {
    return status === 'em consulta';
  }

  continuarConsulta(consulta: ConsultaAmbulatorial) {
    this.router.navigate(['/ambulatorio/consultas', consulta.id, 'continuar']);
  }

  verDetalhes(consulta: ConsultaAmbulatorial) {
    this.router.navigate(['/ambulatorio/atendimento', consulta.id], { queryParams: { visualizar: 1 } });
  }

}
