/**
 * Migration: Criar tabela de consentimentos LGPD.
 *
 * Armazena o registro de consentimento do paciente para processamento
 * de dados pessoais, conforme exigido pela LGPD (Art. 7, 8 e 11).
 */

exports.up = function(knex) {
  return knex.schema.createTable('consentimentos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.integer('paciente_id').notNullable().references('id').inTable('pacientes').onDelete('CASCADE');
    table.integer('usuario_id').notNullable().comment('Usuario que registrou o consentimento');
    table.string('tipo').notNullable().comment('Tipo de consentimento: cadastro, triagem, atendimento');
    table.string('versao_termos').notNullable().defaultTo('1.0.0').comment('Versao dos termos aceitos');
    table.string('ip_coleta').notNullable().comment('IP no momento do consentimento');
    table.string('user_agent').nullable().comment('User-Agent do navegador');
    table.timestamp('data_consentimento').notNullable().defaultTo(knex.fn.now()).comment('Data/hora do consentimento');
    table.boolean('ativo').notNullable().defaultTo(true).comment('Permite revogacao');
    table.timestamp('data_revogacao').nullable().comment('Data/hora da revogacao, se houver');
    table.integer('usuario_revogacao_id').nullable().comment('Usuario que revogou, se houver');
    table.text('observacoes').nullable().comment('Observacoes adicionais');
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

    // Indices para consultas frequentes
    table.index('paciente_id');
    table.index('usuario_id');
    table.index('tipo');
    table.index('ativo');
    table.index('data_consentimento');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('consentimentos');
};
