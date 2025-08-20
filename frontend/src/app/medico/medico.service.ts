import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MedicoService {
  constructor(private http: HttpClient) {}

  getAtendimentosSalaMedica(): Observable<any[]> {
    return this.http.get<any[]>('/api/medico/atendimentos');
  }

  getConsulta(id: string): Observable<any> {
    return this.http.get<any>(`/api/medico/consulta/${id}`);
  }

  salvarConsulta(id: string, consulta: any): Observable<any> {
    return this.http.post<any>('/api/medico/consulta', { ...consulta, atendimento_id: id });
  }

  getEstatisticasMedico(): Observable<any> {
    return this.http.get<any>('/api/medico/estatisticas');
  }
}
