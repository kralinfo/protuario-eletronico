import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({ providedIn: 'root' })
export class MedicoService {
  atualizarConsulta(id: string, consulta: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/medico/consulta/${id}`, consulta);
  }
  /**
   * Atualiza o status do atendimento
   */
  atualizarStatus(id: string, status: string): Observable<any> {
    return this.http.patch<any>(`${environment.apiUrl}/atendimentos/${id}/status`, { status });
  }
  /**
   * Lista todos os atendimentos
   */
  getTodosAtendimentos(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/atendimentos/todos`);
  }
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
    return this.getAtendimentosPorStatus(['encaminhado para sala médica']);
  }

  getConsulta(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/medico/consulta/${id}`);
  }

  salvarConsulta(id: string, consulta: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/medico/consulta`, { ...consulta, atendimento_id: id });
  }

    salvarTriagem(id: string, triagem: any): Observable<any> {
      // Chama endpoint de triagem para salvar alterações parciais
      return this.http.put<any>(`${environment.apiUrl}/triagem/${id}/salvar`, triagem);
    }

  getEstatisticasMedico(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/medico/estatisticas`);
  }

  /**
   * Busca todos os atendimentos médicos que já passaram por consulta
   */
  getConsultasMedicas(): Observable<any[]> {
    const statusMedicos = [
      'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica',
      'em atendimento médico', '4 - Em atendimento médico', 'em_atendimento_medico',
      'atendimento_concluido', '8 - Atendimento Concluído',
      'alta_medica', 'alta médica',
      'encaminhado_para_ambulatorio', 'encaminhado para ambulatório',
      'encaminhado_para_exames', 'encaminhado para exames', '7 - Encaminhado para exames',
      'transferido', 'óbito'
    ];
    return this.getAtendimentosPorStatus(statusMedicos);
  }
}
