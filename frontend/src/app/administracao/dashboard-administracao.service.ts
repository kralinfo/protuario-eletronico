import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DashboardAdministracaoService {
  constructor(private http: HttpClient) {}

  getAtendimentosPorSemana(): Observable<{ dias: string[], counts: number[] }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/por-semana');
    console.log('🔍 [SERVICE] Base URL do browser:', window.location.origin);
    
    return this.http.get<{ dias: string[], counts: number[] }>('http://localhost:3001/api/atendimentos/por-semana').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Dados REAIS recebidos por semana:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar dados por semana:', error);
        console.error('❌ [SERVICE] Status:', error.status);
        console.error('❌ [SERVICE] Message:', error.message);
        console.error('❌ [SERVICE] URL completa tentada:', 'http://localhost:3001/api/atendimentos/por-semana');
        
        // Retorna dados mock em caso de erro
        const mockData = { 
          dias: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'], 
          counts: [12, 19, 8, 15, 22, 5, 3] 
        };
        console.log('🔄 [SERVICE] Retornando dados MOCK por semana:', mockData);
        return of(mockData);
      })
    );
  }

  getAtendimentosPorAno(): Observable<{ meses: string[], counts: number[] }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/por-ano');
    console.log('🔍 [SERVICE] Base URL do browser:', window.location.origin);
    
    return this.http.get<{ meses: string[], counts: number[] }>('http://localhost:3001/api/atendimentos/por-ano').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Dados REAIS recebidos por ano:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar dados por ano:', error);
        console.error('❌ [SERVICE] Status:', error.status);
        console.error('❌ [SERVICE] Message:', error.message);
        console.error('❌ [SERVICE] URL completa tentada:', 'http://localhost:3001/api/atendimentos/por-ano');
        
        // Retorna dados mock em caso de erro
        const mockData = { 
          meses: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'], 
          counts: [340, 489, 523, 601, 420, 380, 450, 390, 520, 460, 510, 430] 
        };
        console.log('🔄 [SERVICE] Retornando dados MOCK por ano:', mockData);
        return of(mockData);
      })
    );
  }
}
