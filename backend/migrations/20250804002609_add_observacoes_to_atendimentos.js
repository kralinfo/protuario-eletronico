/**
 * Migration: 003_add_observacoes_to_atendimentos
 * Data: 2025-08-04
 * Descrição: Adiciona campo de observações na tabela de atendimentos
 * 
 * Permite que os profissionais de saúde adicionem observações 
 * detalhadas sobre cada atendimento realizado.
 */

export async function up(knex) {
  await knex.schema.alterTable('atendimentos', function(table) {
    table.text('observacoes').nullable().comment('Observações detalhadas do atendimento');
  });
  
  console.log('✅ Campo observacoes adicionado à tabela atendimentos');
}

export async function down(knex) {
  await knex.schema.alterTable('atendimentos', function(table) {
    table.dropColumn('observacoes');
  });
  
  console.log('⚠️  Campo observacoes removido da tabela atendimentos');
}
