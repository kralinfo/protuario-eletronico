import db from '../config/database.js';

/**
 * DashboardService
 *
 * Encapsula todas as queries de banco do módulo Dashboard.
 * Todos os métodos aceitam um parâmetro `periodo` ('dia' | 'semana' | 'mes' | 'ano')
 * e/ou `data` (string 'YYYY-MM-DD' para dia específico).
 */
class DashboardService {
  // ─── helpers ─────────────────────────────────────────────────────────────

  /**
   * Retorna expressão SQL + params para filtrar por período.
   * periodo: 'dia' (default) | 'semana' | 'mes' | 'ano'
   * data: 'YYYY-MM-DD' (ignora período, usa data exata)
   */
  _filtroPeriodo(coluna, periodo, data, dataInicio, dataFim) {
    // Intervalo personalizado tem maior prioridade
    const reData = /^\d{4}-\d{2}-\d{2}$/;
    if (dataInicio && dataFim && reData.test(dataInicio) && reData.test(dataFim)) {
      return { expr: `DATE(${coluna}) BETWEEN $1 AND $2`, params: [dataInicio, dataFim] };
    }
    // Data específica
    if (data && reData.test(data)) {
      return { expr: `DATE(${coluna}) = $1`, params: [data] };
    }
    switch (periodo) {
      case 'semana':
        return {
          expr: `DATE(${coluna}) >= DATE_TRUNC('week', CURRENT_DATE) AND DATE(${coluna}) <= CURRENT_DATE`,
          params: []
        };
      case 'mes':
        return {
          expr: `DATE(${coluna}) >= DATE_TRUNC('month', CURRENT_DATE) AND DATE(${coluna}) <= CURRENT_DATE`,
          params: []
        };
      case 'ano':
        return {
          expr: `DATE(${coluna}) >= DATE_TRUNC('year', CURRENT_DATE) AND DATE(${coluna}) <= CURRENT_DATE`,
          params: []
        };
      default: // 'dia'
        return { expr: `DATE(${coluna}) = CURRENT_DATE`, params: [] };
    }
  }

  // Mantido para compatibilidade interna
  _filtroDia(coluna, data) {
    return this._filtroPeriodo(coluna, 'dia', data);
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
  async overview(periodo, data, dataInicio, dataFim) {
    const { expr, params } = this._filtroPeriodo('a.data_hora_atendimento', periodo, data, dataInicio, dataFim);
    // Para a query da view, usa a mesma expressão
    const viewExpr = expr.replace(/\ba\./g, 't.');

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
               CASE WHEN status IN ('encaminhado para triagem', 'encaminhado_para_triagem')
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
         WHERE ${viewExpr}
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
  async atendimentosPorHora(periodo, data, dataInicio, dataFim) {
    const { expr, params } = this._filtroPeriodo('data_hora_atendimento', periodo, data, dataInicio, dataFim);

    // Para período > dia ou intervalo customizado multi-dia, agrupa por data; caso contrário, por hora
    const isRange = dataInicio && dataFim && dataInicio !== dataFim;
    if ((periodo && periodo !== 'dia' && !data) || isRange) {
      const result = await db.query(
        `SELECT DATE(data_hora_atendimento) AS d,
                COUNT(*)::int AS total
         FROM atendimentos
         WHERE ${expr}
         GROUP BY d
         ORDER BY d`,
        params
      );
      return result.rows.map(r => ({
        hora:  r.d instanceof Date
          ? r.d.toISOString().slice(0, 10)
          : String(r.d).slice(0, 10),
        total: r.total
      }));
    }

    // Dia: agrupa por hora (0-23)
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
  async classificacaoRisco(periodo, data, dataInicio, dataFim) {
    // Usa data_inicio_triagem quando disponível (registro real da triagem)
    const coluna = 'COALESCE(data_inicio_triagem, data_hora_atendimento)';
    const { expr, params } = this._filtroPeriodo(coluna, periodo, data, dataInicio, dataFim);

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
   * Retorna contagem real por cada etapa do fluxo hospitalar.
   * Separa "aguardando triagem" de "em triagem" para o dashboard.
   *
   * Retorna: { recepcao, aguardandoTriagem, emTriagem, aguardandoMedico, emAtendimento, observacao }
   */
  async pacientesPorEtapa(periodo, data, dataInicio, dataFim) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'recepcao')::int AS recepcao,

        COUNT(*) FILTER (WHERE status IN (
          'encaminhado para triagem', 'encaminhado_para_triagem'
        ))::int AS "aguardandoTriagem",

        COUNT(*) FILTER (WHERE status IN (
          'em_triagem', 'em triagem'
        ))::int AS "emTriagem",

        COUNT(*) FILTER (WHERE status IN (
          'triagem_finalizada',
          'encaminhado para sala médica', 'encaminhado_para_sala_medica',
          'encaminhado para ambulatório', 'encaminhado_para_ambulatorio'
        ))::int AS "aguardandoMedico",

        COUNT(*) FILTER (WHERE status IN (
          'em atendimento médico', 'em_atendimento_medico',
          'em atendimento ambulatorial', 'em_atendimento_ambulatorial'
        ))::int AS "emAtendimento",

        COUNT(*) FILTER (WHERE status IN (
          'encaminhado para exames', 'encaminhado_para_exames',
          'aguardando exames', 'aguardando_exames',
          'em observacao', 'em_observacao'
        ))::int AS observacao
      FROM atendimentos
    `;

    const isRange = dataInicio && dataFim;
    if (!data && !isRange && (!periodo || periodo === 'dia')) {
      // Tempo real — todos os atendimentos ativos
      const result = await db.query(
        query + ` WHERE status NOT IN ('atendimento_concluido')`
      );
      return result.rows[0];
    }

    // Histórico — filtro por período
    const { expr, params } = this._filtroPeriodo('data_hora_atendimento', periodo, data, dataInicio, dataFim);

    const result = await db.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'recepcao')::int AS recepcao,

         COUNT(*) FILTER (WHERE status IN (
           'encaminhado para triagem', 'encaminhado_para_triagem'
         ))::int AS "aguardandoTriagem",

         COUNT(*) FILTER (WHERE status IN (
           'em_triagem', 'em triagem'
         ))::int AS "emTriagem",

         COUNT(*) FILTER (WHERE status IN (
           'triagem_finalizada',
           'encaminhado para sala médica', 'encaminhado_para_sala_medica',
           'encaminhado para ambulatório', 'encaminhado_para_ambulatorio'
         ))::int AS "aguardandoMedico",

         COUNT(*) FILTER (WHERE status IN (
           'em atendimento médico', 'em_atendimento_medico',
           'em atendimento ambulatorial', 'em_atendimento_ambulatorial'
         ))::int AS "emAtendimento",

         COUNT(*) FILTER (WHERE status IN (
           'encaminhado para exames', 'encaminhado_para_exames',
           'aguardando exames', 'aguardando_exames',
           'em observacao', 'em_observacao'
         ))::int AS observacao
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
  async produtividadeMedicos(periodo, data, dataInicio, dataFim) {
    const { expr, params } = this._filtroPeriodo('c.data_hora_inicio', periodo, data, dataInicio, dataFim);

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
   * Pacientes vermelho/laranja ainda não concluídos.
   * Fallback para query direta se a view ainda não existir.
   */
  async pacientesCriticos() {
    const result = await db.query(
      `SELECT
         a.id,
         p.nome,
         a.classificacao_risco AS classificacao,
         a.status,
         ROUND(
           EXTRACT(EPOCH FROM (NOW() - a.data_hora_atendimento)) / 60
         )::int AS "tempoEspera"
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.classificacao_risco IN ('vermelho', 'laranja')
         AND a.status NOT IN ('atendimento_concluido')
       ORDER BY
         CASE a.classificacao_risco WHEN 'vermelho' THEN 1 WHEN 'laranja' THEN 2 END,
         a.data_hora_atendimento ASC
       LIMIT 10`
    );

    return result.rows;
  }

  // ─── abandonos ─────────────────────────────────────────────────────────────

  /**
   * Conta atendimentos abandonados no dia.
   */
  async contarAbandonos(periodo, data, dataInicio, dataFim) {
    const { expr, params } = this._filtroPeriodo('COALESCE(data_abandono, data_hora_atendimento)', periodo, data, dataInicio, dataFim);
    const result = await db.query(
      `SELECT COUNT(*)::int AS total
       FROM atendimentos
       WHERE abandonado = true
         AND ${expr}`,
      params
    );
    return result.rows[0].total;
  }
}

export default new DashboardService();
