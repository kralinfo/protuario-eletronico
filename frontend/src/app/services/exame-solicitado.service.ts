import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ExameSolicitadoService {
  private apiUrl = `${environment.apiUrl}/exames-solicitados`;

  constructor(private http: HttpClient) {}

  criar(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  findByAtendimento(atendimentoId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/atendimento/${atendimentoId}`);
  }

  findByPaciente(pacienteId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  update(id: number, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data);
  }

  registrarResultado(id: number, resultado: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/resultado`, { resultado });
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
