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
      return { expr: `DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') BETWEEN $1 AND $2`, params: [dataInicio, dataFim] };
    }
    // Data específica
    if (data && reData.test(data)) {
      return { expr: `DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') = $1`, params: [data] };
    }
    switch (periodo) {
      case 'semana':
        return {
          expr: `DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') >= DATE_TRUNC('week', CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') AND DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') <= DATE(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife')`,
          params: []
        };
      case 'mes':
        return {
          expr: `DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') >= DATE_TRUNC('month', CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') AND DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') <= DATE(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife')`,
          params: []
        };
      case 'ano':
        return {
          expr: `DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') >= DATE_TRUNC('year', CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') AND DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') <= DATE(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife')`,
          params: []
        };
      default: // 'dia'
        return { expr: `DATE(${coluna} AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') = DATE(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife')`, params: [] };
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
    // Para a query da view: a coluna equivalente a data_hora_atendimento é "chegada"
    const viewExpr = expr
      .replace(/DATE\(a\.data_hora_atendimento\)/g, 'DATE(t.chegada)')
      .replace(/a\.data_hora_atendimento/g, 't.chegada')
      .replace(/\ba\./g, 't.');

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

      // 2. Estatísticas em tempo real (SÓ SE FOR HOJE)
      ( (periodo === 'dia' && !data && !dataInicio) || (data === new Date().toISOString().slice(0, 10)) )
        ? db.query(
            `SELECT
               COUNT(*) FILTER (WHERE status IN (
                 'em atendimento médico',
                 'em atendimento ambulatorial',
                 'em_atendimento_medico',
                 'em_atendimento_ambulatorial'
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
             WHERE status NOT IN ('atendimento_concluido')
               AND DATE(data_hora_atendimento AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') = CURRENT_DATE AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife'`
          )
        : Promise.resolve({ rows: [{ em_atendimento: 0, espera_fila: 0 }] }),

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
        `SELECT DATE(data_hora_atendimento AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife') AS d,
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
      `SELECT EXTRACT(HOUR FROM data_hora_atendimento AT TIME ZONE 'UTC' AT TIME ZONE 'America/Recife')::int AS h,
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

  /**
   * GET /dashboard/pacientes-por-eta-detalhe
   * Retorna lista de atendimentos para uma etapa específica seguindo os filtros
   */
  async pacientesPorEtapaDetalhe(etapa, periodo, data, dataInicio, dataFim) {
    let mapping = {
      'Aguard. Triagem': "a.status IN ('encaminhado para triagem', 'encaminhado_para_triagem')",
      'Em Triagem':      "a.status IN ('em atendimento de triagem', 'em_atendimento_triagem')",
      'Pós-Triagem':     "a.status IN ('encaminhado para médico', 'encaminhado_para_medico', 'encaminhado para ambulatorio', 'encaminhado_para_ambulatorio')",
      'Em Atendimento':  "a.status IN ('em atendimento médico', 'em_atendimento_medico', 'em atendimento ambulatorial', 'em_atendimento_ambulatorial')",
      'Concluídos':      "a.status = 'atendimento_concluido'",
      'Qualquer':        "TRUE"
    };

    const statusExpr = mapping[etapa] || 'TRUE';
    const { expr, params } = this._filtroPeriodo('a.data_hora_atendimento', periodo, data, dataInicio, dataFim);

    const result = await db.query(
      `SELECT
         a.id,
         p.nome AS paciente_nome,
         p.nome AS "pacienteNome",
         a.data_hora_atendimento AS chegada,
         a.data_hora_atendimento AS "dataHoraInicio",
         a.status,
         a.classificacao_risco,
         a.classificacao_risco AS classificacao,
         u.nome AS medico_nome
       FROM atendimentos a
       JOIN pacientes p ON a.paciente_id = p.id
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE ${statusExpr} AND ${expr}
       ORDER BY a.data_hora_atendimento DESC`,
      params
    );

    return result.rows;
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

  async pacientesPorRiscoDetalhe(nivel, periodo, data, dataInicio, dataFim) {
    const { expr, params } = this._filtroPeriodo(
      'COALESCE(a.data_inicio_triagem, a.data_hora_atendimento)', periodo, data, dataInicio, dataFim
    );

    const nivelExpr = nivel === 'Qualquer'
      ? 'a.classificacao_risco IS NOT NULL'
      : `LOWER(a.classificacao_risco) = LOWER($${params.length + 1})`;

    const queryParams = nivel === 'Qualquer' ? params : [...params, nivel];

    const result = await db.query(
      `SELECT
         a.id,
         p.nome AS "pacienteNome",
         a.data_hora_atendimento AS chegada,
         a.data_hora_atendimento AS "dataHoraInicio",
         a.status,
         a.classificacao_risco,
         a.classificacao_risco AS classificacao,
         u.nome AS medico_nome
       FROM atendimentos a
       JOIN pacientes p ON a.paciente_id = p.id
       LEFT JOIN usuarios u ON a.usuario_id = u.id
       WHERE ${nivelExpr} AND ${expr}
       ORDER BY a.data_hora_atendimento DESC`,
      queryParams
    );

    return result.rows;
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
    const isRange = dataInicio && dataFim;
    const isToday = !data && !isRange && (!periodo || periodo === 'dia');

    const queryBase = `
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
      FROM atendimentos a
    `;

    if (isToday) {
      // Tempo real do dia atual — atendimentos de HOJE ainda não concluídos
      const result = await db.query(
        queryBase + ` WHERE status NOT IN ('atendimento_concluido')
                        AND DATE(data_hora_atendimento) = CURRENT_DATE`
      );
      return result.rows[0];
    }

    // Histórico — filtro por período
    const { expr, params } = this._filtroPeriodo('a.data_hora_atendimento', periodo, data, dataInicio, dataFim);

    const result = await db.query(queryBase + ` WHERE ${expr}`, params);
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
           )::int                                                       AS "tempoEspera",
           u.id                                                         AS "medicoId"
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
   * Pacientes vermelho/laranja no período selecionado.
   */
  async pacientesCriticos(periodo, data, dataInicio, dataFim) {
    const { expr, params } = this._filtroPeriodo('a.data_hora_atendimento', periodo, data, dataInicio, dataFim);
    
    // Se for 'dia' (realtime), mantemos o filtro de não concluídos. 
    // Se for histórico, mostramos quem FOI crítico naquele período.
    const isRealtime = (periodo === 'dia' && !data && !dataInicio);
    const statusFilter = isRealtime 
      ? "AND a.status NOT IN ('atendimento_concluido')" 
      : "";

    const result = await db.query(
      `SELECT
         a.id,
         p.nome,
         a.classificacao_risco AS classificacao,
         a.status,
         ROUND(
           EXTRACT(EPOCH FROM (
             CASE WHEN a.status = 'atendimento_concluido' THEN a.updated_at ELSE NOW() END 
             - a.data_hora_atendimento
           )) / 60
         )::int AS "tempoEspera"
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.classificacao_risco IN ('vermelho', 'laranja')
         ${statusFilter}
         AND ${expr}
       ORDER BY
         CASE a.classificacao_risco WHEN 'vermelho' THEN 1 WHEN 'laranja' THEN 2 END,
         a.data_hora_atendimento ASC
       LIMIT 10`,
      params
    );

    return result.rows;
  }

  /**
   * GET /dashboard/atendimentos-por-medico
   */
  async atendimentosPorMedico(medicoId, periodo, data, dataInicio, dataFim) {
    const { expr, params } = this._filtroPeriodo('c.data_hora_inicio', periodo, data, dataInicio, dataFim);
    
    // Converte todos os parâmetros de data para o placeholder correto ($2, $3, etc)
    // Já que o $1 é o medicoId.
    let sqlExpr = expr;
    if (params.length > 0) {
      // Substitui placeholders para não conflitar com $1 (medicoId)
      // Se houver $1 em expr, vira $2. Se $2, vira $3.
      sqlExpr = expr.replace(/\$(\d+)/g, (match, number) => {
        return '$' + (parseInt(number) + 1);
      });
    }

    const queryParams = [medicoId, ...params];

    const result = await db.query(
      `SELECT
         c.id         AS "consultaId",
         a.id         AS "atendimentoId",
         p.nome       AS "pacienteNome",
         a.status,
         c.data_hora_inicio AS "dataHoraInicio",
         c.data_hora_fim    AS "dataHoraFim",
         a.classificacao_risco AS "classificacao"
       FROM consultas_medicas c
       JOIN atendimentos a ON a.id = c.atendimento_id
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE c.medico_id = $1
         AND ${sqlExpr}
       ORDER BY c.data_hora_inicio DESC`,
      queryParams
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
