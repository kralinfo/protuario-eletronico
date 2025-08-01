
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AtendimentoService {
  constructor(private http: HttpClient) {}

  registrarAtendimento(dto: { pacienteId: number; motivo: string; observacoes?: string }) {
    return this.http.post(`${environment.apiUrl}/atendimentos`, dto);
  }

  listarAtendimentosDoDia() {
    return this.http.get<any[]>(`${environment.apiUrl}/atendimentos?dia=hoje`);
  }

  removerAtendimento(id: number) {
    return this.http.delete(`${environment.apiUrl}/atendimentos/${id}`);
  }

  listarTodosAtendimentos() {
    return this.http.get<any[]>(`${environment.apiUrl}/atendimentos/todos_atendimentos`);
  }
}
