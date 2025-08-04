#!/usr/bin/env node
const knex = require('knex');
const knexConfig = require('./knexfile.js');
require('dotenv').config();

async function forceAbandonoMigration() {
  const environment = process.env.NODE_ENV || 'production';
  const config = knexConfig[environment];
  const db = knex(config);
  
  try {
    console.log('🔧 MIGRAÇÃO FORÇADA - CAMPOS DE ABANDONO');
    console.log('==========================================');
    
    // Verificar se a coluna já existe
    const columns = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' AND column_name = 'abandonado'
    `);
    
    if (columns.rows.length > 0) {
      console.log('✅ Coluna "abandonado" já existe - nada a fazer');
      return true;
    }
    
    console.log('❌ Coluna "abandonado" não existe - criando...');
    
    // Executar a migração manualmente
    await db.schema.alterTable('atendimentos', function(table) {
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
    
    console.log('✅ Campos de abandono criados com sucesso!');
    
    // Marcar a migration como executada
    await db('knex_migrations').insert({
      name: '20250804004600_add_abandono_atendimento.js',
      batch: await getNextBatch(db),
      migration_time: new Date()
    });
    
    console.log('✅ Migration marcada como executada no banco');
    
    return true;
  } catch (error) {
    console.error('❌ Erro durante migração forçada:', error.message);
    return false;
  } finally {
    await db.destroy();
  }
}

async function getNextBatch(db) {
  const result = await db('knex_migrations').max('batch as maxBatch');
  return (result[0].maxBatch || 0) + 1;
}

forceAbandonoMigration().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
