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

  getConsultasAmbulatorio(id: String) {
    return this.http.get<any[]>(`/api/ambulatorio/consulta/${id}`);
  }

  salvarConsultaAmbulatorio(id: String,consulta: any) {
    return this.http.post<any>('/api/ambulatorio/consulta', { ...consulta, atendimento_id: id });
  }

  // Estatísticas do ambulatório
  getEstatisticasAmbulatorio(): Observable<any> {
    return this.http.get<any>('/api/ambulatorio/estatisticas');
  }

  // Exemplo extra: listar profissionais do ambulatório
  getProfissionaisAmbulatorio(): Observable<any[]> {
    return this.http.get<any[]>('/api/ambulatorio/profissionais');
  }

}
