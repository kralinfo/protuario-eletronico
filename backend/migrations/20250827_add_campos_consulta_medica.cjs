exports.up = async function(knex) {
  const colunas = [
    { nome: 'motivo_consulta', tipo: t => t.text('motivo_consulta') },
    { nome: 'exame_fisico', tipo: t => t.text('exame_fisico') },
    { nome: 'hipotese_diagnostica', tipo: t => t.text('hipotese_diagnostica') },
    { nome: 'conduta_prescricao', tipo: t => t.text('conduta_prescricao') },
    { nome: 'status_destino', tipo: t => t.text('status_destino') }
  ];
  for (const col of colunas) {
    const exists = await knex.schema.hasColumn('consultas_medicas', col.nome);
    if (!exists) {
      await knex.schema.alterTable('consultas_medicas', col.tipo);
      console.log(`✅ Coluna ${col.nome} adicionada à tabela consultas_medicas`);
    } else {
      console.log(`ℹ️  Coluna ${col.nome} já existe - pulando`);
    }
  }
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
