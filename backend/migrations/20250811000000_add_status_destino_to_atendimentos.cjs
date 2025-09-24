/**
 * Migration: add_status_destino_to_atendimentos
 * Data: 2025-08-11
 * Descrição: Adiciona coluna status_destino à tabela atendimentos
 * 
 * Esta migração oficializa a coluna status_destino que estava sendo
 * criada por script separado (add-status-destino-field.cjs)
 */

module.exports.up = async function(knex) {
  // Verificar se a coluna já existe
  const hasColumn = await knex.schema.hasColumn('atendimentos', 'status_destino');
  
  if (!hasColumn) {
    await knex.schema.alterTable('atendimentos', function(table) {
      table.string('status_destino', 50).nullable()
        .comment('Status de destino após a triagem (ex: encaminhado para sala médica)');
    });
    
    // Definir valor padrão para registros existentes
    await knex('atendimentos')
      .whereNull('status_destino')
      .whereIn('status', ['encaminhado para sala médica', 'encaminhado para ambulatório', 'encaminhado para exames'])
      .update({ status_destino: 'encaminhado para sala médica' });
    
    console.log('✅ Coluna status_destino adicionada à tabela atendimentos');
  } else {
    console.log('ℹ️  Coluna status_destino já existe - pulando');
  }
};

module.exports.down = async function(knex) {
  const hasColumn = await knex.schema.hasColumn('atendimentos', 'status_destino');
  
  if (hasColumn) {
    await knex.schema.alterTable('atendimentos', function(table) {
      table.dropColumn('status_destino');
    });
    console.log('⚠️  Coluna status_destino removida da tabela atendimentos');
  }
};
