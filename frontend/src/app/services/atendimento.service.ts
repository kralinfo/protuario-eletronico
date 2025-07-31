import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AtendimentoService {
  constructor(private http: HttpClient) {}

  registrarAtendimento(dto: { pacienteId: number; motivo: string; observacoes?: string }) {
    return this.http.post('http://localhost:3001/api/atendimentos', dto);
  }

  listarAtendimentosDoDia() {
    return this.http.get<any[]>('http://localhost:3001/api/atendimentos?dia=hoje');
  }

  removerAtendimento(id: number) {
    return this.http.delete(`http://localhost:3001/api/atendimentos/${id}`);
  }

  listarTodosAtendimentos() {
    return this.http.get<any[]>('http://localhost:3001/api/atendimentos/todos_atendimentos');
  }
}
