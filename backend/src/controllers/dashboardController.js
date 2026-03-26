import db from '../config/database.js';

/**
 * Dashboard Operacional — agrega métricas em tempo real do fluxo hospitalar.
 * Todos os contadores são referentes ao DIA ATUAL (CURRENT_DATE),
 * exceto "em triagem" e "em atendimento" que são contagem ao vivo de status ativo.
 */
const operacional = async (req, res) => {
  try {
    // 1. Total de atendimentos abertos hoje
    const totalHojeQuery = await db.query(
      `SELECT COUNT(*) AS total
       FROM atendimentos
       WHERE DATE(data_hora_atendimento) = CURRENT_DATE`
    );
    const total_hoje = parseInt(totalHojeQuery.rows[0].total) || 0;

    // 2. Aguardando triagem (status ao vivo)
    const aguardandoTriagemQuery = await db.query(
      `SELECT COUNT(*) AS total
       FROM atendimentos
       WHERE status = 'encaminhado para triagem'`
    );
    const aguardando_triagem = parseInt(aguardandoTriagemQuery.rows[0].total) || 0;

    // 3. Em triagem agora (status ao vivo)
    const emTriagemQuery = await db.query(
      `SELECT COUNT(*) AS total
       FROM atendimentos
       WHERE status = 'em_triagem'`
    );
    const em_triagem = parseInt(emTriagemQuery.rows[0].total) || 0;

    // 4. Pós-triagem — aguardando atendimento médico/ambulatorial
    const posTriagemQuery = await db.query(
      `SELECT COUNT(*) AS total
       FROM atendimentos
       WHERE status IN (
         'triagem_finalizada',
         'encaminhado para sala médica',
         'encaminhado para ambulatório',
         'encaminhado para exames',
         'aguardando exames'
       )
       AND DATE(data_hora_atendimento) = CURRENT_DATE`
    );
    const pos_triagem = parseInt(posTriagemQuery.rows[0].total) || 0;

    // 5. Em atendimento médico ou ambulatorial (status ao vivo)
    const emAtendimentoQuery = await db.query(
      `SELECT COUNT(*) AS total
       FROM atendimentos
       WHERE status IN (
         'em atendimento médico',
         'em atendimento ambulatorial'
       )`
    );
    const em_atendimento = parseInt(emAtendimentoQuery.rows[0].total) || 0;

    // 6. Atendimentos concluídos hoje
    const concluidosQuery = await db.query(
      `SELECT COUNT(*) AS total
       FROM atendimentos
       WHERE status = 'atendimento_concluido'
       AND DATE(data_hora_atendimento) = CURRENT_DATE`
    );
    const concluidos = parseInt(concluidosQuery.rows[0].total) || 0;

    // 7. Abandonos hoje
    const abandonosQuery = await db.query(
      `SELECT COUNT(*) AS total
       FROM atendimentos
       WHERE (
         status ILIKE '%abandon%'
         OR motivo_interrupcao ILIKE '%abandon%'
       )
       AND DATE(data_hora_atendimento) = CURRENT_DATE`
    );
    const abandonos = parseInt(abandonosQuery.rows[0].total) || 0;

    // 8. Tempo médio de espera para triagem (em minutos) — pacientes aguardando agora
    const tempoMedioQuery = await db.query(
      `SELECT ROUND(AVG(EXTRACT(EPOCH FROM (NOW() - data_hora_atendimento)) / 60))::int AS tempo_medio
       FROM atendimentos
       WHERE status = 'encaminhado para triagem'`
    );
    const tempo_medio_espera = parseInt(tempoMedioQuery.rows[0].tempo_medio) || 0;

    // 9. Por classificação de risco (pacientes com triagem hoje ou ativos)
    const classificacaoQuery = await db.query(
      `SELECT classificacao_risco, COUNT(*) AS total
       FROM atendimentos
       WHERE DATE(data_hora_atendimento) = CURRENT_DATE
         AND classificacao_risco IS NOT NULL
       GROUP BY classificacao_risco`
    );

    const por_classificacao = {
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    };
    classificacaoQuery.rows.forEach(row => {
      const key = (row.classificacao_risco || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(por_classificacao, key)) {
        por_classificacao[key] = parseInt(row.total) || 0;
      }
    });

    // 10. Fila de alertas críticos (vermelho/laranja aguardando > limite)
    const alertasQuery = await db.query(
      `SELECT a.id, p.nome AS paciente_nome, a.status, a.classificacao_risco,
              ROUND(EXTRACT(EPOCH FROM (NOW() - a.data_hora_atendimento)) / 60)::int AS minutos_espera
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.status IN ('encaminhado para triagem', 'em_triagem', 'encaminhado para sala médica')
         AND a.classificacao_risco IN ('vermelho', 'laranja')
       ORDER BY
         CASE a.classificacao_risco WHEN 'vermelho' THEN 1 WHEN 'laranja' THEN 2 ELSE 3 END,
         a.data_hora_atendimento ASC
       LIMIT 10`
    );

    res.json({
      total_hoje,
      aguardando_triagem,
      em_triagem,
      pos_triagem,
      em_atendimento,
      concluidos,
      abandonos,
      tempo_medio_espera,
      por_classificacao,
      alertas_criticos: alertasQuery.rows
    });
  } catch (error) {
    console.error('[Dashboard] Erro ao calcular operacional:', error);
    res.status(500).json({ message: 'Erro interno ao carregar dados do dashboard.' });
  }
};

/**
 * GET /api/dashboard/por-hora
 * Agrupamento dos atendimentos de hoje por hora do dia (0-23).
 */
const atendimentosPorHora = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT EXTRACT(HOUR FROM data_hora_atendimento)::int AS hora,
              COUNT(*) AS total
       FROM atendimentos
       WHERE DATE(data_hora_atendimento) = CURRENT_DATE
       GROUP BY hora
       ORDER BY hora`
    );

    // Preencher todas as 24 horas com 0 para os que não têm registro
    const mapa = Object.fromEntries(result.rows.map(r => [r.hora, parseInt(r.total)]));
    const dados = Array.from({ length: 24 }, (_, h) => ({
      hora: h,
      total: mapa[h] || 0
    }));

    res.json(dados);
  } catch (error) {
    console.error('[Dashboard] Erro em atendimentosPorHora:', error);
    res.status(500).json({ message: 'Erro interno.' });
  }
};

/**
 * GET /api/dashboard/medicos
 * Produtividade por médico hoje (via tabela consultas_medicas).
 * Retorna array vazio se a tabela não existir ou não houver consultas.
 */
const produtividadeMedicos = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT
         u.nome               AS medico_nome,
         COUNT(c.id)::int     AS total_atendimentos,
         COALESCE(
           ROUND(AVG(
             EXTRACT(EPOCH FROM (c.data_hora_fim - c.data_hora_inicio)) / 60
           ))::int,
           0
         )                    AS tempo_medio_minutos
       FROM consultas_medicas c
       JOIN usuarios u ON u.id = c.medico_id
       WHERE DATE(c.data_hora_inicio) = CURRENT_DATE
       GROUP BY u.id, u.nome
       ORDER BY total_atendimentos DESC`
    );
    res.json(result.rows);
  } catch (error) {
    // Tabela pode não existir ou colunas podem diferir — retorna vazio de forma segura
    console.warn('[Dashboard] produtividadeMedicos indisponível:', error.message);
    res.json([]);
  }
};

export default { operacional, atendimentosPorHora, produtividadeMedicos };
