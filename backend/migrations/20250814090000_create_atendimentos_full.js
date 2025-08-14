/**
 * Migration: 20250814090000_create_atendimentos_full
 * Data: 2025-08-14
 * Descrição: Cria a tabela atendimentos completa, igual à produção
 */

export async function up(knex) {
  await knex.schema.createTable('atendimentos', function(table) {
    table.increments('id').primary();
    table.integer('paciente_id');
    table.integer('usuario_id');
    table.timestamp('data_hora_atendimento');
    table.timestamp('created_at');
    table.timestamp('updated_at');
    table.boolean('abandonado');
    table.boolean('assinado');
    table.timestamp('data_assinatura');
    table.timestamp('data_abandono');
    table.integer('usuario_abandono_id');
    table.integer('prioridade');
    table.decimal('temperatura');
    table.integer('frequencia_cardiaca');
    table.integer('frequencia_respiratoria');
    table.integer('saturacao_oxigenio');
    table.decimal('peso');
    table.decimal('altura');
    table.integer('triagem_realizada_por');
    table.timestamp('data_inicio_triagem');
    table.timestamp('data_fim_triagem');
    table.text('assinatura_digital');
    table.string('motivo');
    table.text('descricao');
    table.string('status');
    table.text('observacoes');
    table.string('motivo_interrupcao');
    table.string('acompanhante');
    table.string('procedencia');
    table.text('historia_atual');
    table.string('pressao_arterial');
    table.text('alergias');
    table.string('motivo_abandono');
    table.text('medicamentos_uso');
    table.string('etapa_abandono');
    table.string('classificacao_risco');
    table.text('observacoes_triagem');
    table.string('status_destino');
    table.text('queixa_principal');
  });
}

export async function down(knex) {
  await knex.schema.dropTableIfExists('atendimentos');
}
