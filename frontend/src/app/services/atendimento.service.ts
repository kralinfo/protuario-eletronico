import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class AtendimentoService {
  buscarRelatorioAtendimentos(filtros: any) {
    const params = new URLSearchParams();
    if (filtros.dataInicial) params.append('dataInicial', filtros.dataInicial);
    if (filtros.dataFinal) params.append('dataFinal', filtros.dataFinal);
    // Adicione outros filtros conforme necessário
    return this.http.get<any[]>(`http://localhost:3001/api/atendimentos/reports?${params.toString()}`);
  }
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
}
