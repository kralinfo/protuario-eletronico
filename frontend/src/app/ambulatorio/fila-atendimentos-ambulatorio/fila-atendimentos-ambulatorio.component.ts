import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { interval, Subscription } from 'rxjs';
import { AmbulatorioService } from '../ambulatorio.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { ClassificacaoDialogComponent } from 'src/app/classificacao-dialog/classificacao-dialog.component';
import { RealtimeService } from 'src/app/services/realtime.service';

interface PacienteAmbulatorio {
  id: number;
  paciente_nome: string;
  paciente_nascimento: string;
  paciente_sexo: string;
  queixa_principal?: string;
  status: string;
  classificacao_risco?: string;
  tempo_espera?: number;
  data_hora_atendimento: string;
  alerta?: string;
}


@Component({
  selector: 'app-fila-atendimentos-ambulatorio',
  templateUrl: './fila-atendimentos-ambulatorio.component.html',
  styleUrls: ['./fila-atendimentos-ambulatorio.component.scss'],
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, FormsModule, MatChipsModule]
})
export class FilaAtendimentosAmbulatorioComponent implements OnInit, OnDestroy {
  pacientes: PacienteAmbulatorio[] = [];
  filtroStatus = '';
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
    private router: Router,
    private dialog: MatDialog,
    private realtimeService: RealtimeService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
  this.carregarDados();

  // Atualização automática
  this.subs.add(
    interval(30000).subscribe(() => this.carregarDados())
  );

  // 🔄 Ouvir por novos pacientes chegando em tempo real
  this.realtimeService.on('patient:arrived', (event: any) => {
    console.log('[FilaAmbulatorio] Paciente chegou em tempo real:', event);
    this.carregarDados();
  });
}

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  carregarDados() {
    this.carregando = true;
    // Buscar atendimentos enriquecidos (inclui dados do paciente) para montar a fila com informações completas
    this.subs.add(
      this.ambulatorioService.getTodosAtendimentos().subscribe({
        next: (resp) => {
          try {
            const agora = new Date();

            // Considerar apenas atendimentos das últimas 24 horas para a fila
            let lista = (resp || []).filter((a: any) => {
              const campoData = a.created_at || a.data_hora_atendimento;
              if (!campoData) return false;
              const dataAtendimento = new Date(campoData);
              const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
              return diffHoras <= 24;
            });

            // Filtrar apenas os status que pertencem à fila do ambulatório
            lista = lista.filter((a: any) => {
              const status = (a.status || '').toString().toLowerCase();
              return status === 'encaminhado_para_ambulatorio' ||
                     status === 'encaminhado para ambulatório' ||
                     status === '5 - encaminhado para ambulatório' ||
                     status === 'em atendimento ambulatorial' ||
                     status === 'em_atendimento_ambulatorial' ||
                     (status.includes('encaminhado') && status.includes('ambulatorio')) ||
                     (status.includes('atendimento') && status.includes('ambulatorial'));
            });

            // Deduplicar por id (mantendo a primeira ocorrência)
            const vistos = new Set<number>();
            lista = lista.filter((item: any) => {
              if (!item || item.id == null) return false;
              if (vistos.has(item.id)) return false;
              vistos.add(item.id);
              return true;
            });

            // Calcular tempo_espera para cada item
            lista.forEach((p: any) => {
              p.tempo_espera = this.calcularTempoDecorrido(p);
              // normalizar campos de paciente (algumas APIs usam 'nome' em vez de 'paciente_nome')
              if (!p.paciente_nome && p.nome) p.paciente_nome = p.nome;
              if (!p.paciente_nascimento && p.nascimento) p.paciente_nascimento = p.nascimento;
            });

            // Aplicar filtro se houver
            if (this.filtroStatus) {
              lista = lista.filter((p: any) => this.matchesFiltroStatus(p.status, this.filtroStatus));
            }

            // Ordenar por classificação e tempo, e atribuir
            this.pacientes = lista.sort((a: any, b: any) => {
              const ordem: Record<string, number> = { vermelho: 1, laranja: 2, amarelo: 3, verde: 4, azul: 5 };
              const ca = ordem[(a.classificacao_risco || '').toLowerCase() as string] || 99;
              const cb = ordem[(b.classificacao_risco || '').toLowerCase() as string] || 99;
              if (ca !== cb) return ca - cb;
              return (b.tempo_espera || 0) - (a.tempo_espera || 0);
            });

            // Atualiza estatísticas locais (por_classificacao e tempo medio)
            this.atualizarEstatisticas();
            this.carregando = false;
            this.cdr.detectChanges();
          } catch (err) {
            this.carregando = false;
            this.snackBar.open('Erro ao processar atendimentos', 'Fechar', { duration: 3000 });
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.carregando = false;
          this.snackBar.open('Erro ao carregar atendimentos', 'Fechar', { duration: 3000 });
          this.cdr.detectChanges();
        }
      })
    );

    // Buscar estatísticas do backend (opcional)
    this.subs.add(
      this.ambulatorioService.getEstatisticasAmbulatorio().subscribe({
        next: (resp) => {
          if (resp.por_classificacao) {
            this.estatisticas.por_classificacao = resp.por_classificacao;
            this.cdr.detectChanges();
          }
        },
        error: () => {
          this.snackBar.open('Erro ao carregar estatísticas', 'Fechar', { duration: 3000 });
          this.cdr.detectChanges();
        }
      })
    );
  }

  // Atualiza contagem de pacientes por classificação de risco
  atualizarEstatisticas() {
    // Zera contadores
    this.estatisticas.por_classificacao = {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    };

    this.pacientes.forEach(p => {
      const cor = p.classificacao_risco?.toLowerCase();
      if (cor && this.estatisticas.por_classificacao.hasOwnProperty(cor)) {
        this.estatisticas.por_classificacao[cor]++;
      }
    });
    // Calcula tempo médio de espera considerando apenas pacientes encaminhados para ambulatório
    const statusVariants = ['encaminhado_para_ambulatorio', 'encaminhado para ambulatorio', '5 - Encaminhado para ambulatório'];
    const agora = new Date();
    const aguardando = this.pacientes.filter(p => {
      const status = (p.status || '').toString().toLowerCase();
      // filtra variantes que representam encaminhado para ambulatório
      const isEncaminhado = statusVariants.some(v => status.includes(v.replace(/_/g, ' ')) || status === v);
      if (!isEncaminhado) return false;
      // opcional: considerar só últimos 24h quando data estiver disponível
      const campoData = (p as any).created_at || p.data_hora_atendimento;
      if (!campoData) return true; // se não tiver data, incluímos
      const data = new Date(campoData);
      const diffHoras = (agora.getTime() - data.getTime()) / (1000 * 60 * 60);
      return diffHoras <= 24;
    });

    // calcula média de tempo_espera (em minutos) se disponível
    const tempos = aguardando.map(p => p.tempo_espera ?? 0).filter(t => t != null && !isNaN(t));
    if (tempos.length === 0) {
      this.estatisticas.tempo_medio_espera = 0;
    } else {
      const soma = tempos.reduce((s, v) => s + v, 0);
      this.estatisticas.tempo_medio_espera = Math.round(soma / tempos.length);
    }
  }

  getCor(risco?: string): string {
    const cores: Record<string, string> = {
      vermelho: '#E53935',
      laranja: '#FB8C00',
      amarelo: '#FDD835',
      verde: '#43A047',
      azul: '#1E88E5'
    };
    return risco ? cores[risco.toLowerCase()] || '#757575' : '#757575';
  }

  getCorStatus(status: string): string {
    const cores: Record<string, string> = {
      'encaminhado para ambulatorio': '#2196F3',
      'em atendimento ambulatorial': '#4CAF50',
      'alta médica': '#9E9E9E',
      'transferido': '#673AB7',
      'óbito': '#000000'
    };
    return cores[status] || '#757575';
  }

  getDescricaoStatus(status: string): string {
    const descricoes: Record<string, string> = {
      'encaminhado para ambulatorio': 'Encaminhado para Ambulatório',
      'em atendimento ambulatorial': 'Em Atendimento',
      'alta médica': 'Alta Médica',
      'transferido': 'Transferido',
      'óbito': 'Óbito'
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
    return nome.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  }

  trackPaciente(index: number, paciente: PacienteAmbulatorio) {
    return paciente.id;
  }

  contarPacientesAguardando(): number {
    const statusVariants = ['encaminhado_para_ambulatorio', 'encaminhado para ambulatorio', '5 - Encaminhado para ambulatório'];
    const agora = new Date();
    return this.pacientes.filter(a => {
      const status = (a.status || '').toString().toLowerCase();
      const isEncaminhado = statusVariants.some(v => status.includes(v.replace(/_/g, ' ')) || status === v);
      if (!isEncaminhado) return false;
      const campoData = (a as any).created_at || a.data_hora_atendimento;
      if (!campoData) return true;
      const data = new Date(campoData);
      const diffHoras = (agora.getTime() - data.getTime()) / (1000 * 60 * 60);
      return diffHoras <= 24;
    }).length;
  }

  isStatusEmAtendimentoAmbulatorial(status: string): boolean {
    return status === 'em atendimento ambulatorial';
  }

  iniciarAtendimento(paciente: PacienteAmbulatorio) {
    this.router.navigate(['/ambulatorio/atendimento', paciente.id]);
  }

  continuarAtendimento(paciente: PacienteAmbulatorio) {
    this.router.navigate(['/ambulatorio/atendimento', paciente.id]);
  }

  verDetalhes(paciente: PacienteAmbulatorio) {
    this.router.navigate(['/ambulatorio/paciente', paciente.id]);
  }

  abrirClassificacaoRisco(paciente: PacienteAmbulatorio) {
    // Chama o modal de classificação de risco
    this.ambulatorioService.showModal('classificacao-risco', { paciente });
  }

  abrirDialogClassificacao() {
    console.log('Abrindo modal de classificação de risco...');
    this.dialog.open(ClassificacaoDialogComponent, {
      panelClass: ['p-0', 'max-w-3xl', 'w-full']
    });
  }

  testarClique() {
    console.log('Botão do ícone assessment foi clicado!');
    this.abrirDialogClassificacao();
  }

  calcularTempoDecorrido(p: any): number {
    const inicio = p.data_hora_atendimento || p.created_at;
    if (!inicio) return 0;
    const dataInicio = new Date(inicio);
    const agora = new Date();
    const diffMs = agora.getTime() - dataInicio.getTime();
    return Math.floor(diffMs / 60000); // minutos
  }

  // Compara status levando em conta variantes (underscores, acentos, maiúsculas)
  matchesFiltroStatus(status: string | undefined, filtro: string): boolean {
    if (!status) return false;
    const normalize = (s: string) => s.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/_/g, ' ').trim();
    return normalize(status).includes(normalize(filtro));
  }
}
