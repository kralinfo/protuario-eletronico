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

  getAtendimentosPorMes(): Observable<{ dias: string[], counts: number[] }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/por-mes');
    console.log('🔍 [SERVICE] Base URL do browser:', window.location.origin);

    return this.http.get<{ dias: string[], counts: number[] }>('http://localhost:3001/api/atendimentos/por-mes').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Dados REAIS recebidos por mês:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar dados por mês:', error);
        console.error('❌ [SERVICE] Status:', error.status);
        console.error('❌ [SERVICE] Message:', error.message);
        console.error('❌ [SERVICE] URL completa tentada:', 'http://localhost:3001/api/atendimentos/por-mes');

        // Retorna dados mock em caso de erro
        const mockData = {
          dias: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
          counts: [2, 5, 1, 3, 7, 4, 2, 6, 1]
        };
        console.log('🔄 [SERVICE] Retornando dados MOCK por mês:', mockData);
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

  // Métodos para tempo médio de espera
  getTempoMedioPorSemana(): Observable<{ tempoMedioMinutos: number }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/tempo-medio/semana');

    return this.http.get<{ tempoMedioMinutos: number }>('http://localhost:3001/api/atendimentos/tempo-medio/semana').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Tempo médio REAL recebido por semana:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar tempo médio por semana:', error);

        // Retorna dados mock em caso de erro
        const mockData = { tempoMedioMinutos: 32 };
        console.log('🔄 [SERVICE] Retornando tempo médio MOCK por semana:', mockData);
        return of(mockData);
      })
    );
  }

  getTempoMedioPorMes(): Observable<{ tempoMedioMinutos: number }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/tempo-medio/mes');

    return this.http.get<{ tempoMedioMinutos: number }>('http://localhost:3001/api/atendimentos/tempo-medio/mes').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Tempo médio REAL recebido por mês:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar tempo médio por mês:', error);

        // Retorna dados mock em caso de erro
        const mockData = { tempoMedioMinutos: 38 };
        console.log('🔄 [SERVICE] Retornando tempo médio MOCK por mês:', mockData);
        return of(mockData);
      })
    );
  }

  getTempoMedioPorAno(): Observable<{ tempoMedioMinutos: number }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/tempo-medio/ano');

    return this.http.get<{ tempoMedioMinutos: number }>('http://localhost:3001/api/atendimentos/tempo-medio/ano').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Tempo médio REAL recebido por ano:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar tempo médio por ano:', error);

        // Retorna dados mock em caso de erro
        const mockData = { tempoMedioMinutos: 45 };
        console.log('🔄 [SERVICE] Retornando tempo médio MOCK por ano:', mockData);
        return of(mockData);
      })
    );
  }

  // Métodos para classificação de risco
  getClassificacaoRiscoPorSemana(): Observable<{ classificacoes: any[] }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/classificacao-risco/semana');

    return this.http.get<{ classificacoes: any[] }>('http://localhost:3001/api/atendimentos/classificacao-risco/semana').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Classificação de risco REAL recebida por semana:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar classificação de risco por semana:', error);

        // Retorna dados mock em caso de erro
        const mockData = {
          classificacoes: [
            { label: 'Vermelha', value: 40, color: '#e53935' },
            { label: 'Amarela', value: 30, color: '#fbc02d' },
            { label: 'Verde', value: 20, color: '#43a047' },
            { label: 'Azul', value: 10, color: '#1e88e5' }
          ]
        };
        console.log('🔄 [SERVICE] Retornando classificação de risco MOCK por semana:', mockData);
        return of(mockData);
      })
    );
  }

  getClassificacaoRiscoPorMes(): Observable<{ classificacoes: any[] }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/classificacao-risco/mes');

    return this.http.get<{ classificacoes: any[] }>('http://localhost:3001/api/atendimentos/classificacao-risco/mes').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Classificação de risco REAL recebida por mês:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar classificação de risco por mês:', error);

        // Retorna dados mock em caso de erro
        const mockData = {
          classificacoes: [
            { label: 'Vermelha', value: 45, color: '#e53935' },
            { label: 'Amarela', value: 35, color: '#fbc02d' },
            { label: 'Verde', value: 15, color: '#43a047' },
            { label: 'Azul', value: 5, color: '#1e88e5' }
          ]
        };
        console.log('🔄 [SERVICE] Retornando classificação de risco MOCK por mês:', mockData);
        return of(mockData);
      })
    );
  }

  getClassificacaoRiscoPorAno(): Observable<{ classificacoes: any[] }> {
    console.log('🔍 [SERVICE] Fazendo requisição GET para http://localhost:3001/api/atendimentos/classificacao-risco/ano');

    return this.http.get<{ classificacoes: any[] }>('http://localhost:3001/api/atendimentos/classificacao-risco/ano').pipe(
      tap(data => {
        console.log('✅ [SERVICE] Classificação de risco REAL recebida por ano:', data);
      }),
      catchError(error => {
        console.error('❌ [SERVICE] ERRO ao buscar classificação de risco por ano:', error);

        // Retorna dados mock em caso de erro
        const mockData = {
          classificacoes: [
            { label: 'Vermelha', value: 50, color: '#e53935' },
            { label: 'Amarela', value: 25, color: '#fbc02d' },
            { label: 'Verde', value: 15, color: '#43a047' },
            { label: 'Azul', value: 10, color: '#1e88e5' }
          ]
        };
        console.log('🔄 [SERVICE] Retornando classificação de risco MOCK por ano:', mockData);
        return of(mockData);
      })
    );
  }
}
