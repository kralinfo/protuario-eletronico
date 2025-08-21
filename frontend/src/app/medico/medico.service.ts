import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MedicoService {
  constructor(private http: HttpClient) {}

  /**
   * Busca atendimentos por status (flexível)
   * @param statusList Array de status desejados
   */
  getAtendimentosPorStatus(statusList: string[]): Observable<any[]> {
    const statusParam = statusList.join(',');
    return this.http.get<any[]>(`${environment.apiUrl}/atendimentos/por-status?status=${encodeURIComponent(statusParam)}`);
  }

  /**
   * Mantém compatibilidade: busca apenas atendimentos em sala médica
   */
  getAtendimentosSalaMedica(): Observable<any[]> {
    return this.getAtendimentosPorStatus(['em_sala_medica']);
  }

  getConsulta(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/medico/consulta/${id}`);
  }

  salvarConsulta(id: string, consulta: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/medico/consulta`, { ...consulta, atendimento_id: id });
  }

  getEstatisticasMedico(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/medico/estatisticas`);
  }
}
