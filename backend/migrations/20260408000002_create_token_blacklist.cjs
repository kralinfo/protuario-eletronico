/**
 * Migration: Criar tabela de token blacklist para invalidacao de tokens JWT.
 *
 * Permite invalidar tokens no logout (LGPD - seguranca de acesso).
 */

exports.up = function(knex) {
  return knex.schema.createTable('token_blacklist', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('jti').notNullable().unique().comment('JWT ID - identificador unico do token');
    table.integer('usuario_id').notNullable().comment('Usuario dono do token');
    table.string('token_hash').notNullable().comment('Hash do token para verificacao');
    table.timestamp('expira_em').notNullable().comment('Data de expiracao original do token');
    table.timestamp('blacklist_em').notNullable().defaultTo(knex.fn.now()).comment('Data de inclusao na blacklist');
    table.string('motivo').nullable().comment('motivo da invalidacao: logout, revogacao, seguranca');

    table.index('usuario_id');
    table.index('jti');
    table.index('expira_em');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('token_blacklist');
};
