import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AmbulatorioService {

  atualizarStatusAtendimento(id: number, status: string) {
    // Usa a URL correta baseada no environment
    return this.http.put<any>(`${environment.apiUrl}/ambulatorio/status/${id}`, { status });
  }

  constructor(private http: HttpClient) { }

  getAtendimentosAmbulatorio() {
    return this.http.get<any[]>(`${environment.apiUrl}/ambulatorio/atendimentos`);
  }

  getConsultasAmbulatorio(id?: string) {
  const url = id ? `${environment.apiUrl}/ambulatorio/consulta/${id}` : `${environment.apiUrl}/ambulatorio/consulta`;
  return this.http.get<any[]>(url);
}


  salvarConsultaAmbulatorio(id: String,consulta: any) {
    return this.http.post<any>(`${environment.apiUrl}/ambulatorio/consulta`, { ...consulta, atendimento_id: id });
  }

  // Estatísticas do ambulatório
  getEstatisticasAmbulatorio(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/ambulatorio/estatisticas`);
  }

  // Buscar todos os atendimentos (para alertas e dashboard)
  getTodosAtendimentos(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/ambulatorio/todos`);
  }

  // Exemplo extra: listar profissionais do ambulatório
  getProfissionaisAmbulatorio(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/ambulatorio/profissionais`);
  }

  getEstatisticasConsultas(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/ambulatorio/estatisticas-consultas`);
  }

  // Buscar dados específicos de um atendimento (usa mesmo endpoint do médico)
  getAtendimento(id: number): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/medico/consulta/${id}`);
  }

  // Buscar dados específicos de um atendimento (alias para compatibilidade)
  obterAtendimento(id: number): Observable<any> {
    return this.getAtendimento(id);
  }

  // Salvar dados do atendimento ambulatorial
  salvarAtendimentoAmbulatorio(id: number, dados: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/ambulatorio/atendimento/${id}`, dados);
  }

  // Salvar dados do atendimento (alias para compatibilidade)
  salvarAtendimento(id: number, dados: any): Observable<any> {
    return this.salvarAtendimentoAmbulatorio(id, dados);
  }

  // Atualizar status do atendimento
  atualizarStatus(id: string, status: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/ambulatorio/status/${id}`, { status });
  }

  showModal(modalId: string, data: any) {
    // Implementação para abrir o modal
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.dispatchEvent(new CustomEvent('open', { detail: data }));
    }
  }
}
