/**
 * Migration: 004_add_abandono_atendimento
 * Data: 2025-08-04
 * Descrição: Adiciona campos para controle de abandono de atendimento
 * 
 * Permite registrar quando um paciente sai da unidade sem completar
 * o fluxo de atendimento (recepção → triagem → sala médica → ambulatório)
 */

export async function up(knex) {
  await knex.schema.alterTable('atendimentos', function(table) {
    // Campo para indicar se o atendimento foi abandonado
    table.boolean('abandonado').defaultTo(false).comment('Indica se o paciente abandonou o atendimento');
    
    // Data e hora do abandono
    table.timestamp('data_abandono').nullable().comment('Data e hora em que o paciente abandonou');
    
    // Motivo do abandono
    table.string('motivo_abandono', 500).nullable().comment('Motivo pelo qual o paciente abandonou (opcional)');
    
    // Usuário que registrou o abandono
    table.integer('usuario_abandono_id').nullable().comment('ID do usuário que registrou o abandono');
    
    // Etapa em que estava quando abandonou
    table.string('etapa_abandono', 50).nullable().comment('Etapa do atendimento quando abandonou (recepcao, triagem, etc)');
  });
  
  console.log('✅ Campos de abandono de atendimento adicionados à tabela atendimentos');
}

export async function down(knex) {
  await knex.schema.alterTable('atendimentos', function(table) {
    table.dropColumn('abandonado');
    table.dropColumn('data_abandono');
    table.dropColumn('motivo_abandono');
    table.dropColumn('usuario_abandono_id');
    table.dropColumn('etapa_abandono');
  });
  
  console.log('⚠️  Campos de abandono de atendimento removidos da tabela atendimentos');
}
