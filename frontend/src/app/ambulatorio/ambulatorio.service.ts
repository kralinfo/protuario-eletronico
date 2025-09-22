import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AmbulatorioService {

  constructor(private http: HttpClient) { }

  getAtendimentosAmbulatorio() {
    return this.http.get<any[]>('/api/ambulatorio/atendimentos');
  }

  getConsultasAmbulatorio(id?: string) {
  const url = id ? `/api/ambulatorio/consulta/${id}` : `/api/ambulatorio/consulta`;
  return this.http.get<any[]>(url);
}


  salvarConsultaAmbulatorio(id: String,consulta: any) {
    return this.http.post<any>('/api/ambulatorio/consulta', { ...consulta, atendimento_id: id });
  }

  // Estatísticas do ambulatório
  getEstatisticasAmbulatorio(): Observable<any> {
    return this.http.get<any>('/api/ambulatorio/estatisticas');
  }

  // Buscar todos os atendimentos (para alertas e dashboard)
  getTodosAtendimentos(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:3001/api/ambulatorio/todos');
  }

  // Exemplo extra: listar profissionais do ambulatório
  getProfissionaisAmbulatorio(): Observable<any[]> {
    return this.http.get<any[]>('/api/ambulatorio/profissionais');
  }

  getEstatisticasConsultas(): Observable<any> {
    return this.http.get<any>('/api/ambulatorio/estatisticas-consultas');
  }

  // Buscar dados específicos de um atendimento
  getAtendimento(id: number): Observable<any> {
    return this.http.get<any>(`http://localhost:3001/api/ambulatorio/atendimento/${id}`);
  }

  // Salvar dados do atendimento ambulatorial
  salvarAtendimentoAmbulatorio(id: number, dados: any): Observable<any> {
    return this.http.put<any>(`http://localhost:3001/api/ambulatorio/atendimento/${id}`, dados);
  }

  // Atualizar status do atendimento
  atualizarStatus(id: string, status: string): Observable<any> {
    return this.http.put<any>(`http://localhost:3001/api/ambulatorio/status/${id}`, { status });
  }

  showModal(modalId: string, data: any) {
    // Implementação para abrir o modal
    const modalElement = document.getElementById(modalId);
    if (modalElement) {
      modalElement.dispatchEvent(new CustomEvent('open', { detail: data }));
    }
  }
}
