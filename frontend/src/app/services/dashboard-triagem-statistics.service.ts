/**
 * DashboardTriagemStatisticsService
 * Responsabilidade: Cálculos de estatísticas e alertas para dashboard de triagem
 */

import { Injectable } from '@angular/core';

export interface EstatisticasTriagem {
  pacientes_aguardando: number;
  pacientes_em_triagem: number;
  triagens_concluidas: number;
  tempo_medio_espera: number;
  por_classificacao: Record<string, number>;
}

export interface PacienteTriagem {
  id?: number;
  paciente_id?: number;
  paciente_nome?: string;
  classificacao_risco?: string;
  status?: string;
  created_at?: string;
  data_hora_atendimento?: string;
  tempo_espera?: number;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardTriagemStatisticsService {

  private readonly LIMITES_RISCO: Record<string, number> = {
    vermelho: 0,
    laranja: 10,
    amarelo: 60,
    verde: 120,
    azul: 240
  };

  private readonly STATUS_ALERTAS = new Set<string>([
    'encaminhado para triagem', '1 - Encaminhado para triagem', 'encaminhado_para_triagem',
    'em triagem', '2 - Em triagem', 'em_triagem',
    'encaminhado para sala médica', '3 - Encaminhado para sala médica', 'encaminhado_para_sala_medica'
  ]);

  /**
   * Obtém cor da classificação de risco
   */
  getCorClassificacao(classificacao: string): string {
    switch ((classificacao || '').toLowerCase()) {
      case 'vermelho': return '#ef4444';
      case 'laranja': return '#f97316';
      case 'amarelo': return '#eab308';
      case 'verde': return '#22c55e';
      case 'azul': return '#3b82f6';
      default: return '#d1d5db';
    }
  }

  /**
   * Ordem para classificação (usado em sorting)
   */
  private classificacaoOrder(risco: string): number {
    switch ((risco || '').toLowerCase()) {
      case 'vermelho': return 1;
      case 'laranja': return 2;
      case 'amarelo': return 3;
      case 'verde': return 4;
      case 'azul': return 5;
      default: return 6;
    }
  }

  /**
   * Calcula tempo decorrido desde uma data
   */
  calcularTempoDecorrido(paciente: PacienteTriagem): number {
    const campoData = paciente.created_at || paciente.data_hora_atendimento;
    if (!campoData) return 0;

    const data = new Date(campoData);
    return Math.floor((new Date().getTime() - data.getTime()) / 60000); // minutos
  }

  /**
   * Ordena pacientes por classificação e tempo de espera
   */
  ordenarPorClassificacaoETempo(lista: PacienteTriagem[]): PacienteTriagem[] {
    return [...(lista || [])].sort((a, b) => {
      const ca = this.classificacaoOrder(a.classificacao_risco || '');
      const cb = this.classificacaoOrder(b.classificacao_risco || '');
      if (ca !== cb) return ca - cb;

      const ta = a.tempo_espera || this.calcularTempoDecorrido(a);
      const tb = b.tempo_espera || this.calcularTempoDecorrido(b);
      return tb - ta;
    });
  }

  /**
   * Calcula alertas de tempo baseado em limites de risco
   */
  calcularAlertasTempo(atendimentos: any[]): { criticos: PacienteTriagem[]; atencao: PacienteTriagem[] } {
    const agora = new Date();
    const criticos: PacienteTriagem[] = [];
    const atencao: PacienteTriagem[] = [];

    for (const p of atendimentos || []) {
      const campoData = p.created_at || p.data_hora_atendimento;
      if (!campoData) continue;

      const dataAtendimento = new Date(campoData);
      const diffHoras = (agora.getTime() - dataAtendimento.getTime()) / (1000 * 60 * 60);
      if (diffHoras > 24) continue; // Ignora atendimentos muito antigos

      const risco = typeof p.classificacao_risco === 'string' ? p.classificacao_risco.toLowerCase() : '';
      const limite = this.LIMITES_RISCO[risco];
      const tempoDecorrido = Math.floor((agora.getTime() - dataAtendimento.getTime()) / 60000);

      if (!this.STATUS_ALERTAS.has(p.status)) continue;
      if (!risco || limite === undefined) continue;

      // Risco vermelho não tem limite (alertar imediatamente se > 0)
      if (limite <= 0) {
        if (tempoDecorrido > 0) criticos.push(p);
        continue;
      }

      // Outros riscos
      const percentualLimite = tempoDecorrido / limite;
      if (percentualLimite >= 1) {
        criticos.push(p);
      } else if (percentualLimite >= 0.8) {
        atencao.push(p);
      }
    }

    return {
      criticos: this.ordenarPorClassificacaoETempo(criticos),
      atencao: this.ordenarPorClassificacaoETempo(atencao)
    };
  }

  /**
   * Filtra pacientes por um conjunto de status
   */
  filtrarPorStatus(pacientes: PacienteTriagem[], statusSet: Set<string>): PacienteTriagem[] {
    return (pacientes || []).filter(p => statusSet.has(p.status || ''));
  }

  /**
   * Conta atendimentos por status em um conjunto
   */
  contarPorStatus(pacientes: PacienteTriagem[], statusSet: Set<string>): number {
    return this.filtrarPorStatus(pacientes, statusSet).length;
  }

  /**
   * Agrupa pacientes por classificação de risco
   */
  agruparPorClassificacao(pacientes: PacienteTriagem[]): Record<string, number> {
    const grupos: Record<string, number> = {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    };

    (pacientes || []).forEach(p => {
      const risco = (p.classificacao_risco || '').toLowerCase();
      if (risco in grupos) grupos[risco]++;
    });

    return grupos;
  }

  /**
   * Calcula tempo médio de espera
   */
  calcularTempoMedioEspera(pacientes: PacienteTriagem[]): number {
    if (!pacientes || pacientes.length === 0) return 0;

    const soma = pacientes.reduce((acc, p) => {
      return acc + (p.tempo_espera || this.calcularTempoDecorrido(p));
    }, 0);

    return Math.round(soma / pacientes.length);
  }
}
