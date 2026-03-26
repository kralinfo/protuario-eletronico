/**
 * Migration: 003_add_assinatura_digital_to_atendimentos
 * Data: 2025-08-04
 * Descrição: Adiciona campos para assinatura digital nos atendimentos
 * 
 * Permite que os profissionais de saúde assinem digitalmente os
 * atendimentos, garantindo autenticidade e rastreabilidade.
 */

exports.up = async function(knex) {
  // Adiciona coluna apenas se não existir
  const columns = await knex('information_schema.columns')
    .select('column_name')
    .where('table_name', 'atendimentos');
  const colNames = columns.map(c => c.column_name);

  await knex.schema.alterTable('atendimentos', function(table) {
    if (!colNames.includes('assinatura_digital')) {
      table.text('assinatura_digital').nullable().comment('Hash da assinatura digital do profissional');
    }
    if (!colNames.includes('data_assinatura')) {
      table.timestamp('data_assinatura').nullable().comment('Data e hora da assinatura digital');
    }
    if (!colNames.includes('assinado')) {
      table.boolean('assinado').defaultTo(false).comment('Indica se o atendimento foi assinado digitalmente');
    }
  });
  console.log('✅ Campos de assinatura digital adicionados à tabela atendimentos (se não existiam)');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('atendimentos', function(table) {
    table.dropColumn('assinatura_digital');
    table.dropColumn('data_assinatura');
    table.dropColumn('assinado');
  });
  
  console.log('⚠️  Campos de assinatura digital removidos da tabela atendimentos');
};
