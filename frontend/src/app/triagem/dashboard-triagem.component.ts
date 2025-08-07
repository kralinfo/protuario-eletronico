import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TriagemService } from '../services/triagem.service';
import { AuthService } from '../auth/auth.service';
import { Subject, interval, takeUntil } from 'rxjs';

interface EstatisticasTriagem {
  pacientesAguardando: number;
  pacientesEmTriagem: number;
  triagensConcluidas: number;
  tempoMedioEspera: number;
  classificacaoRisco: {
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
    pacientesAguardando: 0,
    pacientesEmTriagem: 0,
    triagensConcluidas: 0,
    tempoMedioEspera: 0,
    classificacaoRisco: {
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

  classificacoes = [
    { cor: 'vermelho', label: 'Emergência', valor: 0, icon: 'emergency', bgColor: 'bg-red-500', textColor: 'text-red-500' },
    { cor: 'laranja', label: 'Muito Urgente', valor: 0, icon: 'priority_high', bgColor: 'bg-orange-500', textColor: 'text-orange-500' },
    { cor: 'amarelo', label: 'Urgente', valor: 0, icon: 'warning', bgColor: 'bg-yellow-500', textColor: 'text-yellow-600' },
    { cor: 'verde', label: 'Pouco Urgente', valor: 0, icon: 'schedule', bgColor: 'bg-green-500', textColor: 'text-green-500' },
    { cor: 'azul', label: 'Não Urgente', valor: 0, icon: 'info', bgColor: 'bg-blue-500', textColor: 'text-blue-500' }
  ];

  constructor(
    private triagemService: TriagemService,
    private authService: AuthService,
    private router: Router
  ) {
    this.usuarioLogado = this.authService.user;
  }

  ngOnInit() {
    this.carregarEstatisticas();
    
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
    this.triagemService.obterEstatisticasTriagem().subscribe({
      next: (stats: any) => {
        this.estatisticas = stats;
        this.atualizarClassificacoes();
      },
      error: (error: any) => {
        console.error('Erro ao carregar estatísticas:', error);
      }
    });
  }

  atualizarClassificacoes() {
    this.classificacoes.forEach(cls => {
      cls.valor = this.estatisticas.classificacaoRisco[cls.cor as keyof typeof this.estatisticas.classificacaoRisco] || 0;
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
