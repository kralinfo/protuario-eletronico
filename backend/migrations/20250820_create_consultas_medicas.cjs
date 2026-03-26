
module.exports.up = async function(knex) {
  const exists = await knex.schema.hasTable('consultas_medicas');
  if (!exists) {
    await knex.schema.createTable('consultas_medicas', function(table) {
      table.increments('id').primary();
      table.integer('atendimento_id').unsigned().notNullable()
        .references('id').inTable('atendimentos').onDelete('CASCADE');
      table.integer('medico_id').unsigned().notNullable()
        .references('id').inTable('usuarios').onDelete('SET NULL');
      table.timestamp('data_hora_inicio').defaultTo(knex.fn.now());
      table.timestamp('data_hora_fim').nullable();
      table.timestamps(true, true);
    });
    console.log('✅ Tabela consultas_medicas criada');
  } else {
    console.log('ℹ️ Tabela consultas_medicas já existe - pulando');
  }
};

module.exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('consultas_medicas');
};
