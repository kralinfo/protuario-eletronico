import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PacienteTriagem {
  id: number;
  paciente_nome: string;
  paciente_nascimento: string;
  paciente_sexo: string;
  data_hora_atendimento: string;
  status: string;
  classificacao_risco?: string;
  queixa_principal?: string;
  tempo_espera: number;
  tempo_espera_formatado?: string;
  alerta?: string;
}

export interface DadosTriagem {
  // Sinais vitais
  pressao_arterial?: string;
  temperatura?: number;
  frequencia_cardiaca?: number;
  frequencia_respiratoria?: number;
  saturacao_oxigenio?: number;
  peso?: number;
  altura?: number;

  // Classificação
  classificacao_risco?: string;
  prioridade?: number;
  status_destino?: string;

  // Dados clínicos
  queixa_principal?: string;
  historia_atual?: string;
  alergias?: string;
  medicamentos_uso?: string;
  observacoes_triagem?: string;
}

export interface AtendimentoCompleto extends DadosTriagem {
  id: number;
  paciente_id: number;
  paciente_nome: string;
  paciente_nascimento: string;
  paciente_sexo: string;
  paciente_cpf: string;
  status: string;
  created_at: string;
  data_hora_atendimento: string;
  triagem_realizada_por?: number;
  triagem_realizada_por_nome?: string;
  data_inicio_triagem?: string;
  data_fim_triagem?: string;
}

export interface Estatisticas {
  pacientes_aguardando: number;
  pacientes_em_triagem: number;
  triagens_concluidas: number;
  tempo_medio_espera: number;
  por_classificacao: Record<string, number>;
}

export interface ClassificacaoRisco {
  [key: string]: {
    prioridade: number;
    tempo_max: number;
    descricao: string;
  };
}

export interface StatusDestino {
  [key: string]: string;
}

@Injectable({
  providedIn: 'root'
})
export class TriagemService {
  private baseUrl = `${environment.apiUrl}/triagem`;

  constructor(private http: HttpClient) {}

  // === FILA DE TRIAGEM ===

  listarFilaTriagem(): Observable<PacienteTriagem[]> {
    return this.http.get<PacienteTriagem[]>(`${this.baseUrl}/fila`);
  }

  listarTodosAtendimentosDia(): Observable<PacienteTriagem[]> {
    return this.http.get<PacienteTriagem[]>(`${this.baseUrl}/todos-atendimentos-dia`);
  }

  obterEstatisticas(): Observable<Estatisticas> {
    return this.http.get<Estatisticas>(`${this.baseUrl}/estatisticas`);
  }

  // === ATENDIMENTO ===

  iniciarTriagem(atendimentoId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/${atendimentoId}/iniciar`, {});
  }

  obterDadosTriagem(atendimentoId: number): Observable<AtendimentoCompleto> {
    return this.http.get<AtendimentoCompleto>(`${this.baseUrl}/${atendimentoId}/dados`);
  }

  salvarTriagem(atendimentoId: number, dados: DadosTriagem): Observable<any> {
    return this.http.put(`${this.baseUrl}/${atendimentoId}/salvar`, dados);
  }

  finalizarTriagem(atendimentoId: number, statusDestino?: string): Observable<any> {
    const body = statusDestino ? { status_destino: statusDestino } : {};
    return this.http.post(`${this.baseUrl}/${atendimentoId}/finalizar`, body);
  }

  // === CONFIGURAÇÕES ===

  obterClassificacaoRisco(): Observable<ClassificacaoRisco> {
    return this.http.get<ClassificacaoRisco>(`${this.baseUrl}/classificacao-risco`);
  }

  obterStatusDestino(): Observable<StatusDestino> {
    return this.http.get<StatusDestino>(`${this.baseUrl}/status-destino`);
  }

  // === RELATÓRIOS ===

  listarTriagensRealizadas(filtros?: {
    usuario_id?: number;
    data_inicio?: string;
    data_fim?: string;
  }): Observable<any[]> {
    const params = new URLSearchParams();

    if (filtros?.usuario_id) {
      params.append('usuario_id', filtros.usuario_id.toString());
    }
    if (filtros?.data_inicio) {
      params.append('data_inicio', filtros.data_inicio);
    }
    if (filtros?.data_fim) {
      params.append('data_fim', filtros.data_fim);
    }

    const queryString = params.toString();
    const url = queryString ? `${this.baseUrl}/realizadas?${queryString}` : `${this.baseUrl}/realizadas`;

    return this.http.get<any[]>(url);
  }

  // Obter estatísticas para dashboard
  obterEstatisticasTriagem(): Observable<any> {
    return this.http.get(`${this.baseUrl}/estatisticas`);
  }
}
