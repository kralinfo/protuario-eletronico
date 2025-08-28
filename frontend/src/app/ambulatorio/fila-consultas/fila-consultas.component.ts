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
      this.ambulatorioService.getConsultasAmbulatorio().subscribe({
        next: (resp) => {
          this.consultas = this.filtroStatus
            ? resp.filter((c: any) => c.status === this.filtroStatus)
            : resp;

          this.atualizarEstatisticas();
          this.carregando = false;
        },
        error: () => {
          this.carregando = false;
          this.snackBar.open('Erro ao carregar consultas', 'Fechar', { duration: 3000 });
        }
      })
    );

    this.subs.add(
      this.ambulatorioService.getEstatisticasConsultas().subscribe({
        next: (resp) => {
          if (resp.tempo_medio_espera !== undefined) {
            this.estatisticas.tempo_medio_espera = resp.tempo_medio_espera;
          }
          if (resp.total_aguardando !== undefined) {
            this.estatisticas.por_classificacao['vermelho'] = resp.total_aguardando;
          }
        },
        error: () => {
          this.snackBar.open('Erro ao carregar estatísticas', 'Fechar', { duration: 3000 });
        }
      })
    );
  }

  atualizarEstatisticas() {
    this.estatisticas.por_classificacao['vermelho'] = this.consultas.filter(c => c.status === 'agendada').length;
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
    return this.consultas.filter(c => c.status === 'agendada').length;
  }

  isStatusEmConsulta(status: string): boolean {
    return status === 'em consulta';
  }

  continuarConsulta(consulta: ConsultaAmbulatorial) {
    this.router.navigate(['/ambulatorio/consultas', consulta.id, 'continuar']);
  }

  verDetalhes(consulta: ConsultaAmbulatorial) {
    this.router.navigate(['/ambulatorio/consultas', consulta.id, 'detalhes']);
  }

}
