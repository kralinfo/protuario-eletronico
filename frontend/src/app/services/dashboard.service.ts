import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, BehaviorSubject, switchMap, shareReplay } from 'rxjs';
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
  aguardando?: number;
}

/** Retorno de /api/dashboard/overview */
export interface DadosOverview {
  totalPacientesHoje:      number;
  pacientesEmAtendimento:  number;
  tempoMedioEsperaFila:    number;
  tempoMedioEspera:        number;
  tempoMedioConsulta:      number;
  atendimentosFinalizados: number;
}

/** Retorno de /api/dashboard/pacientes-por-etapa */
export interface DadosPorEtapa {
  recepcao:        number;
  triagem:         number;
  aguardandoMedico: number;
  emAtendimento:   number;
  observacao:      number;
}

/** Retorno de /api/dashboard/classificacao-risco */
export interface DadosClassificacaoRisco {
  nivel: string;  // ex: "VERMELHO"
  total: number;
}

/** Retorno de /api/dashboard/operacional (endpoint legado) */
export interface DadosOperacional {
  total_hoje:         number;
  aguardando_triagem: number;
  em_triagem:         number;
  pos_triagem:        number;
  em_atendimento:     number;
  concluidos:         number;
  abandonos:          number;
  tempo_medio_espera: number;
  por_classificacao:  PorClassificacao;
  alertas_criticos:   AlertaCritico[];
}

/** Retorno de /api/dashboard/atendimentos-por-hora */
export interface AtendimentoHora {
  hora?: string;  // ex: "08:00" ou "Semana 1"
  ano?:  number;  // ex: 2024 (para drill-down multi-ano personalizado)
  mes?:  number;  // 1-12 (para drill-down anual)
  semana?: number; // 1-5 (para drill-down mensal)
  dia?: number;    // 1-31 (para drill-down semanal)
  data?: string;   // ISO string da data completa (para drill-down de semana)
  total: number;
}

/** Retorno de /api/dashboard/produtividade-medicos */
export interface MedicoProdutividade {
  nome:        string;
  atendimentos: number;
  tempoMedio:  number;
  tempoEspera: number;
  medicoId:    number;
}

/** Interface para os atendimentos detalhados de um médico */
export interface AtendimentoMedicoDetalhe {
  consultaId: number;
  atendimentoId: number;
  pacienteNome: string;
  status: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  classificacao: string;
}

/** Item da tabela paginada de atendimentos do dashboard */
export interface AtendimentoDashboard {
  id: number;
  pacienteNome: string;
  status: string;
  classificacaoRisco: string;
  dataHoraAtendimento: string;
  dataHoraFim: string;
  medicoNome: string | null;
}

/** Resposta paginada de atendimentos */
export interface RespostaAtendimentosPaginados {
  dados: AtendimentoDashboard[];
  total: number;
}

/** Agregado completo do dashboard */
export interface DadosDashboard {
  operacional: DadosOperacional;
  por_hora:    AtendimentoHora[];
  medicos:     MedicoProdutividade[];
}

export type PeriodoDashboard = 'dia' | 'semana' | 'mes' | 'ano';

/** Filtro opcional passado nos endpoints */
export interface FiltroDashboard {
  periodo?: PeriodoDashboard | 'personalizado'; // padrão: 'dia'
  data?: string;              // YYYY-MM-DD — sobrescreve periodo
  dataInicio?: string;        // YYYY-MM-DD — limite inferior do intervalo personalizado
  dataFim?: string;           // YYYY-MM-DD — limite superior do intervalo personalizado
  originalDataInicio?: string; // Limite original do range personalizado (preservado durante drill-down)
  originalDataFim?: string;    // Limite original do range personalizado (preservado durante drill-down)
  originalPeriodo?: string;    // Período de origem antes do drill-down (ex: 'semana')
  medicoId?: number;
  classificacao?: string;      // Filtro por classificação de risco (VERMELHO, AMARELO, etc.)
  hora?: string;               // Filtro por hora específica (HH:00)
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly base = `${environment.apiUrl}/dashboard`;

  /**
   * Emissor central de atualizações — Preparado para WebSocket.
   */
  private readonly refresh$ = new BehaviorSubject<FiltroDashboard | undefined>(undefined);

  constructor(private http: HttpClient) {}

  /** Força uma atualização imediata em todos os componentes que escutam o stream. */
  refreshDashboard(filtro?: FiltroDashboard): void {
    this.refresh$.next(filtro);
  }

  /**
   * Stream contínuo do Dashboard.
   * Emite dados na inicialização e sempre que refreshDashboard() for chamado.
   * shareReplay(1) evita múltiplas requisições quando há vários inscritos.
   */
  getDashboardStream(): Observable<DadosDashboard> {
    return this.refresh$.pipe(
      switchMap((filtro) => this.getTudo(filtro)),
      shareReplay(1)
    );
  }

  getOperacional(filtro?: FiltroDashboard): Observable<DadosOperacional> {
    return this.http.get<DadosOperacional>(
      `${this.base}/operacional`,
      { params: this._toParams(filtro) }
    );
  }

  getAtendimentosPorHora(filtro?: FiltroDashboard): Observable<AtendimentoHora[]> {
    return this.http.get<AtendimentoHora[]>(
      `${this.base}/atendimentos-por-hora`,
      { params: this._toParams(filtro) }
    );
  }

  getProdutividadeMedicos(filtro?: FiltroDashboard): Observable<MedicoProdutividade[]> {
    return this.http.get<MedicoProdutividade[]>(
      `${this.base}/produtividade-medicos`,
      { params: this._toParams(filtro) }
    );
  }

  getAtendimentosPaginados(page: number, limit: number, filtro?: FiltroDashboard): Observable<RespostaAtendimentosPaginados> {
    let p = this._toParams(filtro).set('page', String(page)).set('limit', String(limit));
    return this.http.get<RespostaAtendimentosPaginados>(`${this.base}/atendimentos`, { params: p });
  }

  getAtendimentosPorMedico(medicoId: number, filtro?: FiltroDashboard): Observable<AtendimentoMedicoDetalhe[]> {
    return this.http.get<AtendimentoMedicoDetalhe[]>(
      `${this.base}/atendimento-por-medico/${medicoId}`,
      { params: this._toParams(filtro) }
    );
  }

  getAtendimentosPorEtapa(etapa: string, filtro?: FiltroDashboard): Observable<AtendimentoMedicoDetalhe[]> {
    return this.http.get<AtendimentoMedicoDetalhe[]>(
      `${this.base}/pacientes-por-etapa-detalhe/${etapa}`,
      { params: this._toParams(filtro) }
    );
  }

  getAtendimentosPorRisco(nivel: string, filtro?: FiltroDashboard): Observable<AtendimentoMedicoDetalhe[]> {
    return this.http.get<AtendimentoMedicoDetalhe[]>(
      `${this.base}/pacientes-por-risco-detalhe/${nivel}`,
      { params: this._toParams(filtro) }
    );
  }

  /** Carrega tudo em paralelo — usado pelo stream e pelo carregamento manual. */
  getTudo(filtro?: FiltroDashboard): Observable<DadosDashboard> {
    return forkJoin({
      operacional: this.getOperacional(filtro),
      por_hora:    this.getAtendimentosPorHora(filtro),
      medicos:     this.getProdutividadeMedicos(filtro)
    });
  }

  /** Converte FiltroDashboard em HttpParams tipados (nenhum `any`). */
  private _toParams(filtro?: FiltroDashboard): HttpParams {
    let p = new HttpParams();
    if (filtro?.periodo)       p = p.set('periodo',       filtro.periodo);
    if (filtro?.data)          p = p.set('data',          filtro.data);
    if (filtro?.dataInicio)    p = p.set('dataInicio',    filtro.dataInicio);
    if (filtro?.dataFim)       p = p.set('dataFim',       filtro.dataFim);
    if (filtro?.medicoId)      p = p.set('medicoId',      String(filtro.medicoId));
    if (filtro?.classificacao) p = p.set('classificacao', filtro.classificacao);
    if (filtro?.hora)          p = p.set('hora',          filtro.hora);
    return p;
  }
}

