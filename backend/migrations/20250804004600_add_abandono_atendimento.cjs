/**
 * Migration: 004_add_abandono_atendimento
 * Data: 2025-08-04
 * Descrição: Adiciona campos para controle de abandono de atendimento
 * 
 * Permite registrar quando um paciente sai da unidade sem completar
 * o fluxo de atendimento (recepção → triagem → sala médica → ambulatório)
 */

exports.up = async function(knex) {
  // Adiciona coluna apenas se não existir
  const columns = await knex('information_schema.columns')
    .select('column_name')
    .where('table_name', 'atendimentos');
  const colNames = columns.map(c => c.column_name);

  await knex.schema.alterTable('atendimentos', function(table) {
    if (!colNames.includes('abandonado')) {
      table.boolean('abandonado').defaultTo(false).comment('Indica se o paciente abandonou o atendimento');
    }
    if (!colNames.includes('data_abandono')) {
      table.timestamp('data_abandono').nullable().comment('Data e hora em que o paciente abandonou');
    }
    if (!colNames.includes('motivo_abandono')) {
      table.string('motivo_abandono', 500).nullable().comment('Motivo pelo qual o paciente abandonou (opcional)');
    }
    if (!colNames.includes('usuario_abandono_id')) {
      table.integer('usuario_abandono_id').nullable().comment('ID do usuário que registrou o abandono');
    }
    if (!colNames.includes('etapa_abandono')) {
      table.string('etapa_abandono', 50).nullable().comment('Etapa do atendimento quando abandonou (recepcao, triagem, etc)');
    }
  });
  console.log('✅ Campos de abandono de atendimento adicionados à tabela atendimentos (se não existiam)');
};

exports.down = async function(knex) {
  await knex.schema.alterTable('atendimentos', function(table) {
    table.dropColumn('abandonado');
    table.dropColumn('data_abandono');
    table.dropColumn('motivo_abandono');
    table.dropColumn('usuario_abandono_id');
    table.dropColumn('etapa_abandono');
  });
  
  console.log('⚠️  Campos de abandono de atendimento removidos da tabela atendimentos');
};
