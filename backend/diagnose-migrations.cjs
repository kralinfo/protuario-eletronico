#!/usr/bin/env node
/**
 * Script de diagnóstico focado nas migrations do Knex
 * Identifica por que as migrations não estão executando em produção
 */

const knex = require('knex');
const knexConfig = require('./knexfile.cjs');
require('dotenv').config();

async function diagnoseMigrations() {
  console.log('🔍 DIAGNÓSTICO DO SISTEMA DE MIGRATIONS');
  console.log('======================================');
  
  const environment = process.env.NODE_ENV || 'production';
  console.log(`Environment: ${environment}`);
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurada' : 'Não configurada'}`);
  
  const config = knexConfig[environment];
  console.log('Configuração Knex:', JSON.stringify({
    client: config.client,
    connection: typeof config.connection === 'string' ? 'URL_STRING' : config.connection,
    migrations: config.migrations
  }, null, 2));
  
  const db = knex(config);
  
  try {
    // 1. Testar conexão básica
    console.log('\n1️⃣ TESTE DE CONEXÃO');
    console.log('===================');
    const now = await db.raw('SELECT NOW() as time');
    console.log('✅ Conexão OK -', now.rows[0].time);
    
    // 2. Verificar se tabela knex_migrations existe
    console.log('\n2️⃣ TABELA DE MIGRATIONS');
    console.log('=======================');
    const migrationTableExists = await db.schema.hasTable('knex_migrations');
    console.log(`Tabela knex_migrations existe: ${migrationTableExists ? '✅ SIM' : '❌ NÃO'}`);
    
    if (!migrationTableExists) {
      console.log('🔧 Criando tabela de migrations...');
      await db.migrate.latest();
      console.log('✅ Tabela criada');
    }
    
    // 3. Listar migrations executadas
    console.log('\n3️⃣ MIGRATIONS EXECUTADAS');
    console.log('========================');
    const executedMigrations = await db('knex_migrations').orderBy('migration_time');
    console.log(`Total executadas: ${executedMigrations.length}`);
    executedMigrations.forEach(m => {
      console.log(`  ✓ ${m.name} (batch ${m.batch}) - ${m.migration_time}`);
    });
    
    // 4. Verificar migrations pendentes
    console.log('\n4️⃣ MIGRATIONS PENDENTES');
    console.log('=======================');
    try {
      const [currentBatch, pendingMigrations] = await db.migrate.list();
      console.log(`Batch atual: ${currentBatch}`);
      console.log(`Migrations pendentes: ${pendingMigrations.length}`);
      
      if (pendingMigrations.length > 0) {
        console.log('❌ PROBLEMA: Há migrations pendentes!');
        pendingMigrations.forEach(migration => {
          console.log(`  ⏳ ${migration}`);
        });
        
        // 5. Tentar executar migrations pendentes
        console.log('\n5️⃣ EXECUTANDO MIGRATIONS PENDENTES');
        console.log('==================================');
        console.log('🔧 Executando migrations...');
        
        const [batchNo, migratedFiles] = await db.migrate.latest();
        
        if (migratedFiles.length > 0) {
          console.log(`✅ ${migratedFiles.length} migrations executadas (batch ${batchNo})`);
          migratedFiles.forEach(file => {
            console.log(`  ✓ ${file}`);
          });
        } else {
          console.log('ℹ️  Nenhuma migration foi executada (podem já estar aplicadas)');
        }
        
      } else {
        console.log('✅ Nenhuma migration pendente');
      }
      
    } catch (migrationError) {
      console.error('❌ Erro ao verificar/executar migrations:', migrationError.message);
      console.error('Stack:', migrationError.stack);
    }
    
    // 6. Verificar colunas finais da tabela atendimentos
    console.log('\n6️⃣ VERIFICAÇÃO FINAL');
    console.log('====================');
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    const columnNames = columns.rows.map(c => c.column_name);
    const abandonoFields = ['abandonado', 'data_abandono', 'motivo_abandono', 'usuario_abandono_id', 'etapa_abandono'];
    const existingAbandonoFields = abandonoFields.filter(field => columnNames.includes(field));
    
    console.log(`Colunas de abandono: ${existingAbandonoFields.length}/${abandonoFields.length}`);
    console.log('Existentes:', existingAbandonoFields);
    console.log('Faltantes:', abandonoFields.filter(field => !columnNames.includes(field)));
    
    if (existingAbandonoFields.length === 5) {
      console.log('✅ SUCESSO: Todos os campos de abandono estão presentes!');
      return true;
    } else {
      console.log('❌ PROBLEMA: Campos de abandono estão faltando');
      return false;
    }
    
  } catch (error) {
    console.error('💥 ERRO DURANTE DIAGNÓSTICO:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await db.destroy();
  }
}

diagnoseMigrations().then(success => {
  console.log(`\n🎯 RESULTADO: ${success ? 'SUCESSO' : 'FALHA'}`);
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💀 Erro fatal:', error);
  process.exit(1);
});
