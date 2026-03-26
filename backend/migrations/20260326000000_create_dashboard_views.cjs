/**
 * Migration: create_dashboard_views
 * Data: 2026-03-26
 *
 * Cria views e índices para otimizar as queries do módulo Dashboard.
 *
 * Views:
 *   vw_dashboard_tempo_atendimento  — tempos de espera e duração por atendimento
 *   vw_dashboard_fluxo_atual        — contagem em tempo real por etapa do fluxo
 *   vw_dashboard_pacientes_criticos — pacientes vermelho/laranja ainda ativos
 *
 * Índices:
 *   idx_atend_data_hora             — atendimentos.data_hora_atendimento
 *   idx_atend_status                — atendimentos.status
 *   idx_atend_classif_risco         — atendimentos.classificacao_risco (pode já existir)
 *   idx_consultas_atendimento_id    — consultas_medicas.atendimento_id
 *   idx_consultas_medico_data       — consultas_medicas(medico_id, data_hora_inicio)
 */

// ── helpers ─────────────────────────────────────────────────────────────────

async function criarIndice(knex, tabela, nome, colunas) {
  try {
    await knex.schema.table(tabela, t => t.index(colunas, nome));
    console.log(`✅ Índice ${nome} criado`);
  } catch (e) {
    if (e.message && e.message.includes('already exists')) {
      console.log(`ℹ️  Índice ${nome} já existe — pulando`);
    } else {
      console.warn(`⚠️  Índice ${nome}: ${e.message}`);
    }
  }
}

// ── up ────────────────────────────────────────────────────────────────────────

exports.up = async function (knex) {
  // ── 1. Índices de performance ──────────────────────────────────────────────

  await criarIndice(knex, 'atendimentos', 'idx_atend_data_hora',     ['data_hora_atendimento']);
  await criarIndice(knex, 'atendimentos', 'idx_atend_status',         ['status']);
  await criarIndice(knex, 'atendimentos', 'idx_atend_classif_risco',  ['classificacao_risco']);

  // Verifica se tabela consultas_medicas existe antes de criar índices
  const temConsultas = await knex.schema.hasTable('consultas_medicas');
  if (temConsultas) {
    await criarIndice(knex, 'consultas_medicas', 'idx_consultas_atendimento_id', ['atendimento_id']);
    await criarIndice(knex, 'consultas_medicas', 'idx_consultas_medico_data',    ['medico_id', 'data_hora_inicio']);
  } else {
    console.log('ℹ️  Tabela consultas_medicas não encontrada — índices pulados');
  }

  // ── 2. vw_dashboard_tempo_atendimento ─────────────────────────────────────
  //
  // Pré-computa os tempos relevantes para cada atendimento:
  //   minutos_espera_triagem    — chegada → início da triagem
  //   minutos_duracao_triagem   — duração da triagem
  //   minutos_espera_medico     — chegada → início da consulta médica
  //   minutos_duracao_consulta  — duração da consulta médica
  //
  // Usa LEFT JOIN em consultas_medicas para preservar atendimentos sem consulta.
  // ─────────────────────────────────────────────────────────────────────────

  await knex.raw(`
    CREATE OR REPLACE VIEW vw_dashboard_tempo_atendimento AS
    SELECT
      a.id                        AS atendimento_id,
      a.paciente_id,
      a.data_hora_atendimento     AS chegada,
      a.data_inicio_triagem,
      a.data_fim_triagem,
      c.id                        AS consulta_id,
      c.medico_id,
      c.data_hora_inicio          AS inicio_consulta,
      c.data_hora_fim             AS fim_consulta,

      -- Espera até início da triagem (minutos)
      CASE
        WHEN a.data_inicio_triagem IS NOT NULL
        THEN ROUND(
          EXTRACT(EPOCH FROM (a.data_inicio_triagem - a.data_hora_atendimento)) / 60
        )::int
      END AS minutos_espera_triagem,

      -- Duração da triagem (minutos)
      CASE
        WHEN a.data_inicio_triagem IS NOT NULL AND a.data_fim_triagem IS NOT NULL
        THEN ROUND(
          EXTRACT(EPOCH FROM (a.data_fim_triagem - a.data_inicio_triagem)) / 60
        )::int
      END AS minutos_duracao_triagem,

      -- Espera total até início da consulta médica: chegada → data_hora_inicio (minutos)
      CASE
        WHEN c.data_hora_inicio IS NOT NULL
        THEN ROUND(
          EXTRACT(EPOCH FROM (c.data_hora_inicio - a.data_hora_atendimento)) / 60
        )::int
      END AS minutos_espera_medico,

      -- Duração da consulta médica: data_hora_inicio → data_hora_fim (minutos)
      CASE
        WHEN c.data_hora_inicio IS NOT NULL AND c.data_hora_fim IS NOT NULL
        THEN ROUND(
          EXTRACT(EPOCH FROM (c.data_hora_fim - c.data_hora_inicio)) / 60
        )::int
      END AS minutos_duracao_consulta

    FROM atendimentos a
    LEFT JOIN consultas_medicas c ON c.atendimento_id = a.id
  `);
  console.log('✅ View vw_dashboard_tempo_atendimento criada');

  // ── 3. vw_dashboard_fluxo_atual ───────────────────────────────────────────
  //
  // Snapshot em tempo real dos pacientes ativos por etapa do fluxo hospitalar.
  // Não usa filtro de data — inclui todos os pacientes não concluídos,
  // independentemente de quando chegaram.
  // ─────────────────────────────────────────────────────────────────────────

  await knex.raw(`
    CREATE OR REPLACE VIEW vw_dashboard_fluxo_atual AS
    SELECT
      COUNT(*) FILTER (WHERE status = 'recepcao')::int AS recepcao,

      COUNT(*) FILTER (WHERE status IN (
        'encaminhado para triagem',
        'encaminhado_para_triagem',
        'em_triagem',
        'em triagem'
      ))::int AS triagem,

      COUNT(*) FILTER (WHERE status IN (
        'triagem_finalizada',
        'encaminhado para sala médica',
        'encaminhado_para_sala_medica',
        'encaminhado para ambulatório',
        'encaminhado_para_ambulatorio'
      ))::int AS aguardando_medico,

      COUNT(*) FILTER (WHERE status IN (
        'em atendimento médico',
        'em_atendimento_medico',
        'em atendimento ambulatorial',
        'em_atendimento_ambulatorial'
      ))::int AS em_atendimento,

      COUNT(*) FILTER (WHERE status IN (
        'encaminhado para exames',
        'encaminhado_para_exames',
        'aguardando exames',
        'aguardando_exames',
        'em observacao',
        'em_observacao'
      ))::int AS observacao

    FROM atendimentos
    WHERE status NOT IN ('atendimento_concluido')
  `);
  console.log('✅ View vw_dashboard_fluxo_atual criada');

  // ── 4. vw_dashboard_pacientes_criticos ────────────────────────────────────
  //
  // Pacientes com classificação vermelho ou laranja ainda não concluídos,
  // ordenados por urgência e tempo de espera.
  // ─────────────────────────────────────────────────────────────────────────

  await knex.raw(`
    CREATE OR REPLACE VIEW vw_dashboard_pacientes_criticos AS
    SELECT
      a.id,
      p.nome,
      a.classificacao_risco,
      a.status,
      a.data_hora_atendimento,
      ROUND(
        EXTRACT(EPOCH FROM (NOW() - a.data_hora_atendimento)) / 60
      )::int AS minutos_espera
    FROM atendimentos a
    JOIN pacientes p ON p.id = a.paciente_id
    WHERE a.classificacao_risco IN ('vermelho', 'laranja')
      AND a.status NOT IN ('atendimento_concluido')
    ORDER BY
      CASE a.classificacao_risco
        WHEN 'vermelho' THEN 1
        WHEN 'laranja'  THEN 2
        ELSE 3
      END,
      a.data_hora_atendimento ASC
  `);
  console.log('✅ View vw_dashboard_pacientes_criticos criada');
};

// ── down ─────────────────────────────────────────────────────────────────────

exports.down = async function (knex) {
  await knex.raw('DROP VIEW IF EXISTS vw_dashboard_pacientes_criticos');
  await knex.raw('DROP VIEW IF EXISTS vw_dashboard_fluxo_atual');
  await knex.raw('DROP VIEW IF EXISTS vw_dashboard_tempo_atendimento');

  // Remove índices criados por esta migration
  await knex.raw('DROP INDEX IF EXISTS idx_atend_data_hora');
  await knex.raw('DROP INDEX IF EXISTS idx_atend_status');
  await knex.raw('DROP INDEX IF EXISTS idx_atend_classif_risco');
  await knex.raw('DROP INDEX IF EXISTS idx_consultas_atendimento_id');
  await knex.raw('DROP INDEX IF EXISTS idx_consultas_medico_data');

  console.log('⚠️  Views e índices do dashboard removidos');
};
