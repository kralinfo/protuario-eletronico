import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, BehaviorSubject, switchMap, tap, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Tipos ───────────────────────────────────────────────────────────────────
// (... existing interfaces ...)

export interface AlertaCritico {
  id: number;
  paciente_nome: string;
  status: string;
  classificacao_risco: string;
  minutos_espera: number;
}

export interface PorClassificacao {
  vermelho: number;
  laranja: number;
  amarelo: number;
  verde: number;
  azul: number;
}

export interface DadosOperacional {
  total_hoje: number;
  aguardando_triagem: number;
  em_triagem: number;
  pos_triagem: number;
  em_atendimento: number;
  concluidos: number;
  abandonos: number;
  tempo_medio_espera: number;
  por_classificacao: PorClassificacao;
  alertas_criticos: AlertaCritico[];
}

export interface AtendimentoHora {
  hora: number;
  total: number;
}

export interface MedicoProdutividade {
  medico_nome: string;
  total_atendimentos: number;
  tempo_medio_minutos: number;
}

export interface DadosDashboard {
  operacional: DadosOperacional;
  por_hora: AtendimentoHora[];
  medicos: MedicoProdutividade[];
}

// ─── Filtros (preparado para expansão futura) ─────────────────────────────────
export interface FiltroDashboard {
  data?: string;        // YYYY-MM-DD — padrão: hoje
  medicoId?: number;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly base = `${environment.apiUrl}/dashboard`;

  // ── Controle de Atualização em Tempo Real (Preparado para WebSocket no futuro)
  private refresh$ = new BehaviorSubject<void>(undefined);

  // Cache do último estado para quem se inscrever agora não ver tela branca
  private dashboardData$?: Observable<DadosDashboard>;

  constructor(private http: HttpClient) {}

  /**
   * Força uma atualização imediata de todos os componentes que escutam
   * o stream principal do dashboard.
   */
  refreshDashboard(): void {
    this.refresh$.next();
  }

  /**
   * Stream contínuo do Dashboard.
   * Emite dados sempre que refreshDashboard() for chamado.
   */
  getDashboardStream(filtro?: FiltroDashboard): Observable<DadosDashboard> {
    return this.refresh$.pipe(
      switchMap(() => this.getTudo(filtro)),
      shareReplay(1) // Garante que múltiplos inscritos recebam o mesmo dado
    );
  }

  getOperacional(filtro?: FiltroDashboard): Observable<DadosOperacional> {
    return this.http.get<DadosOperacional>(`${this.base}/operacional`, {
      params: filtro as any ?? {}
    });
  }

  getAtendimentosPorHora(filtro?: FiltroDashboard): Observable<AtendimentoHora[]> {
    return this.http.get<AtendimentoHora[]>(`${this.base}/atendimentos-por-hora`, {
      params: filtro as any ?? {}
    });
  }

  getProdutividadeMedicos(filtro?: FiltroDashboard): Observable<MedicoProdutividade[]> {
    return this.http.get<MedicoProdutividade[]>(`${this.base}/produtividade-medicos`, {
      params: filtro as any ?? {}
    });
  }

  /** Carrega tudo em paralelo — usado p/ stream ou carregamento manual. */
  getTudo(filtro?: FiltroDashboard): Observable<DadosDashboard> {
    return forkJoin({
      operacional: this.getOperacional(filtro),
      por_hora:    this.getAtendimentosPorHora(filtro),
      medicos:     this.getProdutividadeMedicos(filtro)
    });
  }
}
