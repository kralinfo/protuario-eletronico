import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TriagemService } from '../services/triagem.service';
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
    
    // Escutar notificações de atualização
    this.triagemEventService.atualizarDashboard$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('Dashboard: Recebida notificação para atualizar');
        this.carregarEstatisticas();
      });
    
    // Atualiza as estatísticas a cada 30 segundos
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.carregarEstatisticas());

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

  irParaFilaTriagem() {
    this.router.navigate(['/triagem']);
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
