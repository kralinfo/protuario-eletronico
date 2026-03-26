import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';

// ─── Tipos ───────────────────────────────────────────────────────────────────

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

  constructor(private http: HttpClient) {}

  getOperacional(filtro?: FiltroDashboard): Observable<DadosOperacional> {
    return this.http.get<DadosOperacional>(`${this.base}/operacional`, {
      params: filtro as Record<string, string> ?? {}
    });
  }

  getAtendimentosPorHora(): Observable<AtendimentoHora[]> {
    return this.http.get<AtendimentoHora[]>(`${this.base}/por-hora`);
  }

  getProdutividadeMedicos(): Observable<MedicoProdutividade[]> {
    return this.http.get<MedicoProdutividade[]>(`${this.base}/medicos`);
  }

  /** Carrega tudo em paralelo — usado pelo componente de página. */
  getTudo(): Observable<DadosDashboard> {
    return forkJoin({
      operacional: this.getOperacional(),
      por_hora:    this.getAtendimentosPorHora(),
      medicos:     this.getProdutividadeMedicos()
    });
  }
}
