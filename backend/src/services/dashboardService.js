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
   * Retorna os 4 KPIs principais: totalPacientesHoje, pacientesEmAtendimento,
   * tempoMedioEspera, atendimentosFinalizados.
   */
  async overview(data) {
    const { expr, params } = this._filtroDia('a.data_hora_atendimento', data);

    const [totalRes, emAtendRes, tempoRes, finalizadosRes] = await Promise.all([
      // Total de pacientes no dia
      db.query(
        `SELECT COUNT(*)::int AS total
         FROM atendimentos a
         WHERE ${expr}`,
        params
      ),

      // Pacientes em atendimento (médico ou ambulatorial) — ao vivo
      db.query(
        `SELECT COUNT(*)::int AS total
         FROM atendimentos a
         WHERE a.status IN (
           'em atendimento médico',
           'em atendimento ambulatorial',
           'em_atendimento_medico',
           'em_atendimento_ambulatorial'
         )`
      ),

      // Tempo médio de espera para triagem (pacientes aguardando agora)
      db.query(
        `SELECT COALESCE(
           ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - a.data_hora_atendimento)) / 60))::int,
           0
         ) AS tempo_medio
         FROM atendimentos a
         WHERE a.status IN ('encaminhado para triagem', 'encaminhado_para_triagem')`
      ),

      // Atendimentos finalizados no dia
      db.query(
        `SELECT COUNT(*)::int AS total
         FROM atendimentos a
         WHERE a.status = 'atendimento_concluido'
           AND ${expr}`,
        params
      )
    ]);

    return {
      totalPacientesHoje:      totalRes.rows[0].total,
      pacientesEmAtendimento:  emAtendRes.rows[0].total,
      tempoMedioEspera:        tempoRes.rows[0].tempo_medio,
      atendimentosFinalizados: finalizadosRes.rows[0].total
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
   * Retorna: [{ nivel: "VERMELHO", total: 5 }, ...]
   * Inclui todos os 5 níveis, mesmo que zerados.
   */
  async classificacaoRisco(data) {
    const { expr, params } = this._filtroDia('data_hora_atendimento', data);

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
    const mapa = Object.fromEntries(
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
   * Retorna contagens por fase do fluxo: recepcao, triagem,
   * aguardandoMedico, emAtendimento, observacao.
   */
  async pacientesPorEtapa(data) {
    const { expr, params } = this._filtroDia('data_hora_atendimento', data);

    const result = await db.query(
      `SELECT
         -- Recepção: recém-registrado, antes de ir para triagem
         COUNT(*) FILTER (WHERE status IN (
           'recepcao',
           'aguardando_recepcao',
           'aguardando recepcao'
         ))::int AS recepcao,

         -- Triagem: aguardando ou em andamento
         COUNT(*) FILTER (WHERE status IN (
           'encaminhado para triagem',
           'encaminhado_para_triagem',
           'em_triagem',
           'em triagem'
         ))::int AS triagem,

         -- Aguardando médico: triagem concluída, esperando consulta
         COUNT(*) FILTER (WHERE status IN (
           'triagem_finalizada',
           'encaminhado para sala médica',
           'encaminhado_para_sala_medica',
           'encaminhado para ambulatório',
           'encaminhado_para_ambulatorio'
         ))::int AS "aguardandoMedico",

         -- Em atendimento médico ou ambulatorial
         COUNT(*) FILTER (WHERE status IN (
           'em atendimento médico',
           'em_atendimento_medico',
           'em atendimento ambulatorial',
           'em_atendimento_ambulatorial'
         ))::int AS "emAtendimento",

         -- Observação / exames
         COUNT(*) FILTER (WHERE status IN (
           'encaminhado para exames',
           'encaminhado_para_exames',
           'aguardando exames',
           'aguardando_exames',
           'em observacao',
           'em_observacao'
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
   * Retorna: [{ nome, atendimentos, tempoMedio }]
   * Depende da tabela consultas_medicas. Retorna [] com segurança se indisponível.
   */
  async produtividadeMedicos(data) {
    const { expr, params } = this._filtroDia('c.data_hora_inicio', data);

    const result = await db.query(
      `SELECT
         u.nome                                             AS nome,
         COUNT(c.id)::int                                  AS atendimentos,
         COALESCE(
           ROUND(AVG(
             EXTRACT(EPOCH FROM (c.data_hora_fim - c.data_hora_inicio)) / 60
           ))::int,
           0
         )                                                 AS "tempoMedio"
       FROM consultas_medicas c
       JOIN usuarios u ON u.id = c.medico_id
       WHERE ${expr}
       GROUP BY u.id, u.nome
       ORDER BY atendimentos DESC`,
      params
    );

    return result.rows;
  }

  // ─── pacientes críticos ────────────────────────────────────────────────────

  /**
   * GET /dashboard/pacientes-criticos
   * Retorna pacientes vermelho/laranja que ainda estão aguardando ou em triagem.
   * Campos: nome, classificacao, tempoEspera (minutos).
   */
  async pacientesCriticos() {
    const result = await db.query(
      `SELECT
         p.nome                                                    AS nome,
         a.classificacao_risco                                     AS classificacao,
         ROUND(EXTRACT(EPOCH FROM (NOW() - a.data_hora_atendimento)) / 60)::int AS "tempoEspera",
         a.status
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.classificacao_risco IN ('vermelho', 'laranja')
         AND a.status IN (
           'encaminhado para triagem', 'encaminhado_para_triagem',
           'em_triagem', 'em triagem',
           'encaminhado para sala médica', 'encaminhado_para_sala_medica'
         )
       ORDER BY
         CASE a.classificacao_risco
           WHEN 'vermelho' THEN 1
           WHEN 'laranja'  THEN 2
           ELSE 3
         END,
         a.data_hora_atendimento ASC`
    );

    return result.rows;
  }
}

export default new DashboardService();
