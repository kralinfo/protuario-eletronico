exports.up = function(knex) {
  return knex.schema.createTable('consultas_medicas', function(table) {
    table.increments('id').primary();
    table.integer('atendimento_id').unsigned().notNullable().references('id').inTable('atendimentos');
    table.integer('medico_id').unsigned().notNullable();
    table.timestamp('data_hora_inicio').notNullable();
    table.timestamp('data_hora_fim');
    table.text('anamnese');
    table.text('exame_fisico');
    table.text('diagnostico');
    table.text('conduta');
    table.text('observacoes');
    table.timestamps(true, true);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('consultas_medicas');
};
