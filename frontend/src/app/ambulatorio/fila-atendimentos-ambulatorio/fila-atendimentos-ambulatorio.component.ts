import { Component, OnDestroy, OnInit } from '@angular/core';
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
    private dialog: MatDialog
  ) {}

  ngOnInit() {
  this.carregarDados();

  // Atualização automática
  this.subs.add(
    interval(30000).subscribe(() => this.carregarDados())
  );
}

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  carregarDados() {
    this.carregando = true;

    // Buscar atendimentos
    this.subs.add(
      this.ambulatorioService.getAtendimentosAmbulatorio().subscribe({
        next: (resp) => {
          // Normaliza resposta e remove duplicatas por id para evitar renderizar o mesmo atendimento duas vezes
          let lista: any[] = this.filtroStatus
            ? resp.filter((p: any) => p.status === this.filtroStatus)
            : resp;

          // Deduplicar por id (mantendo a primeira ocorrência)
          const vistos = new Set<number>();
          lista = lista.filter(item => {
            if (!item || item.id == null) return false;
            if (vistos.has(item.id)) return false;
            vistos.add(item.id);
            return true;
          });

          this.pacientes = lista;

          this.atualizarEstatisticas();
          this.carregando = false;
        },
        error: () => {
          this.carregando = false;
          this.snackBar.open('Erro ao carregar atendimentos', 'Fechar', { duration: 3000 });
        }
      })
    );

    // Buscar estatísticas do backend (opcional)
    this.subs.add(
      this.ambulatorioService.getEstatisticasAmbulatorio().subscribe({
        next: (resp) => {
          if (resp.por_classificacao) {
            this.estatisticas.por_classificacao = resp.por_classificacao;
          }
        },
        error: () => {
          this.snackBar.open('Erro ao carregar estatísticas', 'Fechar', { duration: 3000 });
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
    return this.pacientes.filter(p => p.status === 'encaminhado para ambulatorio').length;
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
}
