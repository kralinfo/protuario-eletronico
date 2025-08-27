exports.up = async function(knex) {
  await knex.schema.table('consultas_medicas', function(table) {
    table.text('motivo_consulta');
    table.text('exame_fisico');
    table.text('hipotese_diagnostica');
    table.text('conduta_prescricao');
    table.text('status_destino');
  });
};

exports.down = async function(knex) {
  await knex.schema.table('consultas_medicas', function(table) {
    table.dropColumn('motivo_consulta');
    table.dropColumn('exame_fisico');
    table.dropColumn('hipotese_diagnostica');
    table.dropColumn('conduta_prescricao');
    table.dropColumn('status_destino');
  });
};
