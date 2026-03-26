import db from '../config/database.js';

/**
 * DashboardService
 *
 * Encapsula todas as queries de banco do módulo Dashboard.
 * Todos os métodos aceitam um parâmetro `data` (string 'YYYY-MM-DD').
 * Quando omitido, usa CURRENT_DATE (hoje).
 */
class DashboardService {
  // ─── helpers ─────────────────────────────────────────────────────────────

  /**
   * Retorna a expressão SQL que compara a coluna de data com o filtro.
   * Se `data` for fornecida valida o formato; caso contrário usa CURRENT_DATE.
   */
  _filtroDia(coluna, data) {
    if (data && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      return { expr: `DATE(${coluna}) = $1`, params: [data] };
    }
    return { expr: `DATE(${coluna}) = CURRENT_DATE`, params: [] };
  }

  // ─── overview ────────────────────────────────────────────────────────────

  /**
   * GET /dashboard/overview
   *
   * KPIs retornados:
   *   totalPacientesHoje       — chegadas no dia (data_hora_atendimento)
   *   pacientesEmAtendimento   — em consulta médica/ambulatorial agora (tempo real)
   *   tempoMedioEsperaFila     — espera média na fila de triagem agora (minutos)
   *   tempoMedioEspera         — chegada → início da consulta médica, hoje (minutos)
   *   tempoMedioConsulta       — duração média das consultas finalizadas hoje (minutos)
   *   atendimentosFinalizados  — concluídos no dia
   *
   * Usa vw_dashboard_tempo_atendimento para os cálculos de tempo histórico.
   * Se a view ainda não existir (primeira inicialização), retorna zeros.
   */
  async overview(data) {
    const { expr, params } = this._filtroDia('a.data_hora_atendimento', data);
    // Para a query da view, o parâmetro posicional é o mesmo $1
    const dateClause = params.length ? '$1' : 'CURRENT_DATE';

    const [totaisRes, realtimeRes, temposRes] = await Promise.all([
      // 1. Totais do dia (filtrado por data de chegada)
      db.query(
        `SELECT
           COUNT(*)::int                                                       AS total_hoje,
           COUNT(*) FILTER (WHERE a.status = 'atendimento_concluido')::int     AS finalizados
         FROM atendimentos a
         WHERE ${expr}`,
        params
      ),

      // 2. Estatísticas em tempo real — sem filtro de data
      db.query(
        `SELECT
           COUNT(*) FILTER (WHERE status IN (
             'em atendimento médico',
             'em atendimento ambulatorial'
           ))::int                                                              AS em_atendimento,
           COALESCE(
             ROUND(AVG(
               CASE WHEN status = 'encaminhado para triagem'
                 THEN EXTRACT(EPOCH FROM (NOW() - data_hora_atendimento)) / 60
               END
             )),
             0
           )::int                                                              AS espera_fila
         FROM atendimentos
         WHERE status NOT IN ('atendimento_concluido')`
      ),

      // 3. Tempos médios do dia via view pré-computada
      //    Chegada → início da consulta  (tempoMedioEspera)
      //    Início  → fim da consulta     (tempoMedioConsulta)
      //    Fallback para zeros se a view ainda não existir
      db.query(
        `SELECT
           COALESCE(ROUND(AVG(t.minutos_espera_medico)),    0)::int AS tempo_espera_medico,
           COALESCE(ROUND(AVG(t.minutos_duracao_consulta)), 0)::int AS tempo_consulta
         FROM vw_dashboard_tempo_atendimento t
         WHERE DATE(t.chegada) = ${dateClause}
           AND t.minutos_espera_medico IS NOT NULL`,
        params
      ).catch(() => ({ rows: [{ tempo_espera_medico: 0, tempo_consulta: 0 }] }))
    ]);

    return {
      totalPacientesHoje:      totaisRes.rows[0].total_hoje,
      pacientesEmAtendimento:  realtimeRes.rows[0].em_atendimento,
      tempoMedioEsperaFila:    realtimeRes.rows[0].espera_fila,
      tempoMedioEspera:        temposRes.rows[0].tempo_espera_medico,
      tempoMedioConsulta:      temposRes.rows[0].tempo_consulta,
      atendimentosFinalizados: totaisRes.rows[0].finalizados
    };
  }

  // ─── atendimentos por hora ────────────────────────────────────────────────

  /**
   * GET /dashboard/atendimentos-por-hora
   * Retorna array de 24 posições: [{ hora: "08:00", total: 10 }, ...]
   */
  async atendimentosPorHora(data) {
    const { expr, params } = this._filtroDia('data_hora_atendimento', data);

    const result = await db.query(
      `SELECT EXTRACT(HOUR FROM data_hora_atendimento)::int AS h,
              COUNT(*)::int AS total
       FROM atendimentos
       WHERE ${expr}
       GROUP BY h
       ORDER BY h`,
      params
    );

    const mapa = Object.fromEntries(result.rows.map(r => [r.h, r.total]));

    return Array.from({ length: 24 }, (_, h) => ({
      hora:  `${String(h).padStart(2, '0')}:00`,
      total: mapa[h] ?? 0
    }));
  }

  // ─── classificação de risco ────────────────────────────────────────────────

  /**
   * GET /dashboard/classificacao-risco
   *
   * Contagem por nível Manchester dos atendimentos do dia.
   * Filtro de data baseado em data_inicio_triagem (quando a triagem foi realizada);
   * se o campo ainda não foi preenchido, usa data_hora_atendimento como fallback.
   * Retorna: [{ nivel: "VERMELHO", total: 5 }, ...] — todos os 5 níveis.
   */
  async classificacaoRisco(data) {
    // Usa data_inicio_triagem quando disponível (registro real da triagem)
    const coluna = 'COALESCE(data_inicio_triagem, data_hora_atendimento)';
    const { expr, params } = this._filtroDia(coluna, data);

    const result = await db.query(
      `SELECT classificacao_risco AS nivel,
              COUNT(*)::int       AS total
       FROM atendimentos
       WHERE ${expr}
         AND classificacao_risco IS NOT NULL
       GROUP BY classificacao_risco`,
      params
    );

    const NIVEIS = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'];
    const mapa   = Object.fromEntries(
      result.rows.map(r => [(r.nivel || '').toLowerCase(), r.total])
    );

    return NIVEIS.map(nivel => ({
      nivel: nivel.toUpperCase(),
      total: mapa[nivel] ?? 0
    }));
  }

  // ─── pacientes por etapa ───────────────────────────────────────────────────

  /**
   * GET /dashboard/pacientes-por-etapa
   *
   * Quando data=null: usa vw_dashboard_fluxo_atual (tempo real — todos os pacientes
   *   ativos, sem filtro de data). Adequado para o painel operacional.
   * Quando data fornecida: query direta com filtro por data_hora_atendimento.
   *
   * Retorna: { recepcao, triagem, aguardandoMedico, emAtendimento, observacao }
   */
  async pacientesPorEtapa(data) {
    if (!data) {
      // Tempo real — view pré-computada, sem varredura de data
      const result = await db.query(
        `SELECT
           recepcao,
           triagem,
           aguardando_medico  AS "aguardandoMedico",
           em_atendimento     AS "emAtendimento",
           observacao
         FROM vw_dashboard_fluxo_atual`
      ).catch(() =>
        // Fallback se a view ainda não existir
        db.query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'recepcao')::int                   AS recepcao,
             COUNT(*) FILTER (WHERE status IN (
               'encaminhado para triagem', 'em_triagem'
             ))::int                                                              AS triagem,
             COUNT(*) FILTER (WHERE status IN (
               'triagem_finalizada',
               'encaminhado para sala médica',
               'encaminhado para ambulatório'
             ))::int                                                              AS "aguardandoMedico",
             COUNT(*) FILTER (WHERE status IN (
               'em atendimento médico',
               'em atendimento ambulatorial'
             ))::int                                                              AS "emAtendimento",
             COUNT(*) FILTER (WHERE status IN (
               'encaminhado para exames', 'aguardando exames'
             ))::int                                                              AS observacao
           FROM atendimentos
           WHERE status NOT IN ('atendimento_concluido')`
        )
      );
      return result.rows[0];
    }

    // Histórico — filtro por data de chegada
    const { expr, params } = this._filtroDia('data_hora_atendimento', data);

    const result = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'recepcao')::int                       AS recepcao,
         COUNT(*) FILTER (WHERE status IN (
           'encaminhado para triagem', 'encaminhado_para_triagem',
           'em_triagem', 'em triagem'
         ))::int                                                                  AS triagem,
         COUNT(*) FILTER (WHERE status IN (
           'triagem_finalizada',
           'encaminhado para sala médica',
           'encaminhado para ambulatório'
         ))::int                                                                  AS "aguardandoMedico",
         COUNT(*) FILTER (WHERE status IN (
           'em atendimento médico',
           'em atendimento ambulatorial'
         ))::int                                                                  AS "emAtendimento",
         COUNT(*) FILTER (WHERE status IN (
           'encaminhado para exames', 'aguardando exames'
         ))::int                                                                  AS observacao
       FROM atendimentos
       WHERE ${expr}`,
      params
    );

    return result.rows[0];
  }

  // ─── produtividade médicos ─────────────────────────────────────────────────

  /**
   * GET /dashboard/produtividade-medicos
   *
   * Por médico, no dia:
   *   atendimentos  — total de consultas finalizadas
   *   tempoMedio    — duração média da consulta (data_hora_fim − data_hora_inicio, min)
   *   tempoEspera   — espera média do paciente até início da consulta
   *                   (consultas_medicas.data_hora_inicio − atendimentos.data_hora_atendimento, min)
   *
   * Retorna [] se consultas_medicas estiver vazia ou indisponível.
   */
  async produtividadeMedicos(data) {
    const { expr, params } = this._filtroDia('c.data_hora_inicio', data);

    try {
      const result = await db.query(
        `SELECT
           u.nome                                                       AS nome,
           COUNT(c.id)::int                                             AS atendimentos,
           COALESCE(
             ROUND(AVG(
               CASE
                 WHEN c.data_hora_fim IS NOT NULL AND c.data_hora_inicio IS NOT NULL
                 THEN EXTRACT(EPOCH FROM (c.data_hora_fim - c.data_hora_inicio)) / 60
               END
             )),
             0
           )::int                                                       AS "tempoMedio",
           COALESCE(
             ROUND(AVG(
               EXTRACT(EPOCH FROM (c.data_hora_inicio - a.data_hora_atendimento)) / 60
             )),
             0
           )::int                                                       AS "tempoEspera"
         FROM consultas_medicas c
         JOIN usuarios    u ON u.id = c.medico_id
         JOIN atendimentos a ON a.id = c.atendimento_id
         WHERE ${expr}
         GROUP BY u.id, u.nome
         ORDER BY atendimentos DESC`,
        params
      );

      return result.rows;
    } catch (error) {
      console.warn('[DashboardService] produtividadeMedicos indisponível:', error.message);
      return [];
    }
  }

  // ─── pacientes críticos ────────────────────────────────────────────────────

  /**
   * GET /dashboard/pacientes-criticos
   *
   * Usa vw_dashboard_pacientes_criticos (vermelho/laranja não concluídos).
   * Inclui todos os status ativos — não apenas triagem — pois um paciente
   * vermelho pode estar em qualquer etapa.
   * Fallback para query direta se a view ainda não existir.
   */
  async pacientesCriticos() {
    const result = await db.query(
      `SELECT
         nome,
         classificacao_risco AS classificacao,
         status,
         minutos_espera      AS "tempoEspera"
       FROM vw_dashboard_pacientes_criticos
       LIMIT 10`
    ).catch(() =>
      // Fallback direto se a view ainda não existir
      db.query(
        `SELECT
           p.nome,
           a.classificacao_risco                                              AS classificacao,
           a.status,
           ROUND(
             EXTRACT(EPOCH FROM (NOW() - a.data_hora_atendimento)) / 60
           )::int                                                             AS "tempoEspera"
         FROM atendimentos a
         JOIN pacientes p ON p.id = a.paciente_id
         WHERE a.classificacao_risco IN ('vermelho', 'laranja')
           AND a.status NOT IN ('atendimento_concluido')
         ORDER BY
           CASE a.classificacao_risco WHEN 'vermelho' THEN 1 WHEN 'laranja' THEN 2 END,
           a.data_hora_atendimento ASC
         LIMIT 10`
      )
    );

    return result.rows;
  }
}

export default new DashboardService();
