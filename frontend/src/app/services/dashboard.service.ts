import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getOperacional(): Observable<DadosOperacional> {
    return this.http.get<DadosOperacional>(`${this.apiUrl}/dashboard/operacional`);
  }
}
