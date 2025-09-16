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

  // Exemplo extra: listar profissionais do ambulatório
  getProfissionaisAmbulatorio(): Observable<any[]> {
    return this.http.get<any[]>('/api/ambulatorio/profissionais');
  }

  getEstatisticasConsultas(): Observable<any> {
  return this.http.get<any>('/api/ambulatorio/estatisticas-consultas');
}

}
