import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConsentimentoService {

  private apiUrl = `${environment.apiUrl}/consentimentos`;

  constructor(private http: HttpClient) { }

  /**
   * Registrar consentimento do paciente
   */
  registrar(data: {
    paciente_id: number;
    tipo?: string;
    versao_termos?: string;
    observacoes?: string;
  }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  /**
   * Revogar consentimento
   */
  revogar(consentimentoId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${consentimentoId}`);
  }

  /**
   * Buscar consentimentos do paciente
   */
  buscarPorPaciente(pacienteId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/paciente/${pacienteId}`);
  }

  /**
   * Verificar se paciente tem consentimento ativo
   */
  verificarConsentimento(pacienteId: number, tipo?: string): Observable<any> {
    const tipoParam = tipo ? `/${tipo}` : '';
    return this.http.get(`${this.apiUrl}/paciente/${pacienteId}/verificar${tipoParam}`);
  }

  /**
   * Listar todos os consentimentos (admin)
   */
  listar(filtros?: any): Observable<any> {
    let params = new URLSearchParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== undefined && filtros[key] !== null) {
          params.append(key, String(filtros[key]));
        }
      });
    }
    return this.http.get(`${this.apiUrl}?${params.toString()}`);
  }
}
