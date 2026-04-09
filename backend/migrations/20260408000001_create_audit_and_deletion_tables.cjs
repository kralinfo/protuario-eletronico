/**
 * Migration: Criar tabelas de auditoria LGPD e solicitacoes de exclusao.
 *
 * - logs_auditoria: Registro imutavel de todas as operacoes com dados pessoais
 * - solicitacoes_exclusao: Workflow de solicitacao de exclusao de dados (Art. 18)
 */

exports.up = function(knex) {
  return knex.schema
    // Tabela de logs de auditoria (imutavel - apenas INSERT)
    .createTable('logs_auditoria', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('usuario_id').nullable().comment('Usuario que realizou a acao');
      table.string('acao').notNullable().comment('CREATE, READ, UPDATE, DELETE, LOGIN, EXPORT, DELETE_REQUEST');
      table.string('entidade').notNullable().comment('paciente, atendimento, triagem, usuario, consentimento');
      table.integer('entidade_id').nullable().comment('ID da entidade afetada');
      table.string('campo_alterado').nullable().comment('Campo especifico alterado');
      table.json('valor_anterior').nullable().comment('Valor antes da alteracao');
      table.json('valor_novo').nullable().comment('Valor apos a alteracao');
      table.string('ip').nullable().comment('IP da requisicao');
      table.text('user_agent').nullable().comment('User-Agent do navegador');
      table.text('observacoes').nullable().comment('Detalhes adicionais');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

      // Indices para consultas frequentes
      table.index('usuario_id');
      table.index('acao');
      table.index('entidade');
      table.index('entidade_id');
      table.index('created_at');
    })

    // Tabela de solicitacoes de exclusao de dados
    .createTable('solicitacoes_exclusao', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.integer('paciente_id').notNullable().references('id').inTable('pacientes').onDelete('CASCADE');
      table.integer('usuario_solicitante_id').notNullable().comment('Usuario que solicitou');
      table.text('motivo').nullable().comment('Motivo da solicitacao');
      table.string('status').notNullable().defaultTo('pendente').comment('pendente, aprovada, executada, recusada');
      table.integer('usuario_responsavel_id').nullable().comment('Admin que processou');
      table.timestamp('data_solicitacao').notNullable().defaultTo(knex.fn.now());
      table.timestamp('data_resolucao').nullable().comment('Quando foi processada');
      table.text('observacoes_resolucao').nullable().comment('Detalhes da resolucao');
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());

      table.index('paciente_id');
      table.index('status');
      table.index('data_solicitacao');
    });
};

exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('logs_auditoria')
    .dropTableIfExists('solicitacoes_exclusao');
};
