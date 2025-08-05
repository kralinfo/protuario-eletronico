#!/usr/bin/env node
/**
 * Script de inicialização robusta para produção
 * Garante que todas as migrations críticas sejam executadas
 */

const knex = require('knex');
const knexConfig = require('./knexfile.cjs');
require('dotenv').config();

async function robustStartup() {
  const environment = process.env.NODE_ENV || 'production';
  const config = knexConfig[environment];
  const db = knex(config);
  
  console.log('🚀 INICIALIZAÇÃO ROBUSTA - PRODUÇÃO');
  console.log('===================================');
  console.log(`Environment: ${environment}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Configurada' : 'Não configurada'}`);
  
  try {
    // 1. Testar conexão
    console.log('\n🔍 1. Testando conexão com banco...');
    await db.raw('SELECT NOW() as now');
    console.log('✅ Conexão estabelecida');
    
    // 2. Verificar se tabela de migrations existe
    console.log('\n📋 2. Verificando tabela de migrations...');
    const migrationTableExists = await db.schema.hasTable('knex_migrations');
    
    if (!migrationTableExists) {
      console.log('❌ Tabela knex_migrations não existe - criando...');
      await db.migrate.latest();
      console.log('✅ Sistema de migrations inicializado');
    } else {
      console.log('✅ Tabela knex_migrations existe');
    }
    
    // 3. Verificar campos críticos
    console.log('\n🔧 3. Verificando campos críticos...');
    
    // Verificar campo 'abandonado' na tabela atendimentos
    const abandonadoExists = await checkColumnExists(db, 'atendimentos', 'abandonado');
    
    if (!abandonadoExists) {
      console.log('❌ Coluna "abandonado" não existe - criando...');
      await createAbandonoFields(db);
      console.log('✅ Campos de abandono criados');
    } else {
      console.log('✅ Coluna "abandonado" existe');
    }
    
    // 4. Executar migrations pendentes
    console.log('\n⚡ 4. Executando migrations pendentes...');
    const [batch, migrations] = await db.migrate.list();
    
    if (migrations.length > 0) {
      console.log(`🔄 ${migrations.length} migration(s) pendente(s) - executando...`);
      const [batchNo, migrationNames] = await db.migrate.latest();
      
      if (migrationNames.length > 0) {
        console.log(`✅ ${migrationNames.length} migration(s) executada(s) (batch ${batchNo})`);
        migrationNames.forEach(name => console.log(`  ✓ ${name}`));
      }
    } else {
      console.log('✅ Nenhuma migration pendente');
    }
    
    console.log('\n🎉 INICIALIZAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('=====================================');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ERRO DURANTE INICIALIZAÇÃO:', error.message);
    console.error('Stack:', error.stack);
    
    // Em caso de erro, tentar migração forçada
    console.log('\n🔧 Tentando recuperação com migração forçada...');
    try {
      await createAbandonoFields(db);
      console.log('✅ Recuperação bem-sucedida');
      return true;
    } catch (recoveryError) {
      console.error('❌ Falha na recuperação:', recoveryError.message);
      return false;
    }
  } finally {
    await db.destroy();
  }
}

async function checkColumnExists(db, table, column) {
  try {
    const result = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ? AND column_name = ?
    `, [table, column]);
    
    return result.rows.length > 0;
  } catch (error) {
    console.warn(`Erro ao verificar coluna ${column}:`, error.message);
    return false;
  }
}

async function createAbandonoFields(db) {
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
  
  // Marcar migration como executada se não estiver
  const migrationExists = await db('knex_migrations')
    .where('name', '20250804004600_add_abandono_atendimento.js')
    .first();
    
  if (!migrationExists) {
    const nextBatch = await getNextBatch(db);
    await db('knex_migrations').insert({
      name: '20250804004600_add_abandono_atendimento.js',
      batch: nextBatch,
      migration_time: new Date()
    });
    console.log('✅ Migration marcada como executada');
  }
}

async function getNextBatch(db) {
  const result = await db('knex_migrations').max('batch as maxBatch');
  return (result[0].maxBatch || 0) + 1;
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  robustStartup().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

module.exports = { robustStartup };
