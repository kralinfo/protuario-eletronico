
exports.up = async function(knex) {
  const columns = await knex('information_schema.columns')
    .select('column_name')
    .where({ table_name: 'atendimentos', table_schema: 'public' });

  const colNames = columns.map(c => c.column_name);

  await knex.schema.alterTable('atendimentos', function(table) {
    if (!colNames.includes('destino')) table.string('destino');
    if (!colNames.includes('classificacao_risco')) table.string('classificacao_risco');
    if (!colNames.includes('queixa_principal')) table.string('queixa_principal');
    if (!colNames.includes('tempo_espera')) table.integer('tempo_espera');
    if (!colNames.includes('alerta')) table.string('alerta');
    // Não adiciona 'observacoes' pois já existe
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('atendimentos', function(table) {
    table.dropColumn('destino');
    table.dropColumn('observacoes');
    table.dropColumn('classificacao_risco');
    table.dropColumn('queixa_principal');
    table.dropColumn('tempo_espera');
    table.dropColumn('alerta');
  });
};
