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
   * Busca um atendimento pelo ID (usado para obter o status anterior antes de alterar)
   */
  getAtendimento(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/atendimentos/${id}`);
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
    return this.getAtendimentosPorStatus(['encaminhado_para_sala_medica']);
  }

  getConsulta(id: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/medico/consulta/${id}`);
  }

  salvarConsulta(id: string, consulta: any): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/medico/consulta`, { ...consulta, atendimento_id: id });
  }

  salvarTriagem(id: string, triagem: any): Observable<any> {
    // Verifica se os dados da triagem estão completos antes de enviar
    console.log('Salvando triagem:', triagem);
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
      'encaminhado_para_sala_medica',
      'em_atendimento_medico',
      'atendimento_concluido',
      'alta_medica',
      'encaminhado_para_ambulatorio',
      'encaminhado_para_exames',
      'transferido', 'obito'
    ];
    return this.getAtendimentosPorStatus(statusMedicos);
  }
}
