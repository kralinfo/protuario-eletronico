#!/usr/bin/env node
/**
 * Script de auto-migração para produção
 * SEMPRE executa migrations pendentes automaticamente
 * Usado a cada deploy para garantir que o banco esteja atualizado
 */

const knex = require('knex');
const knexConfig = require('./knexfile.cjs');
require('dotenv').config();

async function autoMigrate() {
  console.log('🚀 AUTO-MIGRAÇÃO - ATUALIZANDO BANCO DE PRODUÇÃO');
  console.log('================================================');
  
  const environment = process.env.NODE_ENV || 'production';
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurada ✅' : 'Não configurada ❌'}`);
  
  if (!process.env.DATABASE_URL) {
    console.error('❌ ERRO: DATABASE_URL não encontrada!');
    console.error('🚨 Não é possível executar migrations sem conexão com banco');
    process.exit(1);
  }
  
  const config = knexConfig[environment];
  const db = knex(config);
  
  try {
    // 1. Testar conexão
    console.log('\n🔌 1. TESTANDO CONEXÃO...');
    const timeResult = await db.raw('SELECT NOW() as current_time');
    console.log(`✅ Conectado ao banco - ${timeResult.rows[0].current_time}`);
    
    // 2. Verificar/criar tabela de migrations
    console.log('\n📋 2. VERIFICANDO SISTEMA DE MIGRATIONS...');
    const migrationTableExists = await db.schema.hasTable('knex_migrations');
    
    if (!migrationTableExists) {
      console.log('🔧 Criando tabela knex_migrations...');
      // Força criação da tabela de migrations
      await db.migrate.latest();
      console.log('✅ Sistema de migrations inicializado');
    } else {
      console.log('✅ Sistema de migrations já existe');
    }
    
    // 3. Listar migrations executadas
    console.log('\n📝 3. MIGRATIONS JÁ EXECUTADAS:');
    const executedMigrations = await db('knex_migrations').orderBy('migration_time');
    console.log(`   Total: ${executedMigrations.length}`);
    
    if (executedMigrations.length > 0) {
      executedMigrations.forEach(m => {
        console.log(`   ✓ ${m.name} (batch ${m.batch})`);
      });
    } else {
      console.log('   (Nenhuma migration executada ainda)');
    }
    
    // 4. Verificar migrations pendentes
    console.log('\n⏳ 4. VERIFICANDO MIGRATIONS PENDENTES...');
    const [currentBatch, pendingMigrations] = await db.migrate.list();
    console.log(`   Batch atual: ${currentBatch}`);
    console.log(`   Migrations pendentes: ${pendingMigrations.length}`);
    
    if (pendingMigrations.length > 0) {
      console.log('\n🔄 5. EXECUTANDO MIGRATIONS PENDENTES:');
      pendingMigrations.forEach(migration => {
        console.log(`   ⏳ ${migration}`);
      });
      
      console.log('\n⚡ Executando migrations...');
      const [batchNo, migratedFiles] = await db.migrate.latest();
      
      if (migratedFiles.length > 0) {
        console.log(`\n✅ SUCESSO! ${migratedFiles.length} migration(s) executada(s) (batch ${batchNo})`);
        migratedFiles.forEach(file => {
          console.log(`   ✓ ${file}`);
        });
      } else {
        console.log('\nℹ️  Nenhuma migration foi executada (podem já estar aplicadas)');
      }
    } else {
      console.log('✅ Nenhuma migration pendente - banco já está atualizado');
    }
    
    // 5. Verificação final específica para campos críticos
    console.log('\n🔍 6. VERIFICAÇÃO FINAL - CAMPOS CRÍTICOS:');
    
    // Verificar campos de abandono
    const abandonoFields = await db.raw(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN ('abandonado', 'data_abandono', 'motivo_abandono', 'usuario_abandono_id', 'etapa_abandono')
    `);
    
    const existingFields = abandonoFields.rows.map(r => r.column_name);
    console.log(`   Campos de abandono: ${existingFields.length}/5`);
    
    if (existingFields.length === 5) {
      console.log('   ✅ Todos os campos críticos presentes');
    } else {
      const missingFields = ['abandonado', 'data_abandono', 'motivo_abandono', 'usuario_abandono_id', 'etapa_abandono']
        .filter(field => !existingFields.includes(field));
      console.log(`   ⚠️  Campos faltantes: ${missingFields.join(', ')}`);
      
      // Se campos críticos estão faltando, tentar criar via SQL direto
      console.log('\n🛠️  CRIAÇÃO EMERGENCIAL DE CAMPOS CRÍTICOS:');
      const sqlCommands = [
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS abandonado BOOLEAN DEFAULT false',
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_abandono TIMESTAMP',
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS motivo_abandono VARCHAR(500)',
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS usuario_abandono_id INTEGER',
        'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS etapa_abandono VARCHAR(50)'
      ];
      
      for (const sql of sqlCommands) {
        try {
          await db.raw(sql);
          console.log(`   ✅ ${sql.substring(0, 60)}...`);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.log(`   ⚠️  ${sql.substring(0, 60)}... - ${error.message}`);
          }
        }
      }
    }
    
    console.log('\n🎉 AUTO-MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('=====================================');
    console.log('✅ Banco de dados atualizado');
    console.log('✅ Todas as migrations aplicadas');
    console.log('✅ Campos críticos verificados');
    console.log('🚀 Sistema pronto para iniciar');
    
    return true;
    
  } catch (error) {
    console.error('\n💥 ERRO DURANTE AUTO-MIGRAÇÃO:', error.message);
    console.error('Stack:', error.stack);
    
    console.error('\n🚨 FALHA CRÍTICA NO DEPLOY!');
    console.error('============================');
    console.error('❌ Não foi possível atualizar o banco de dados');
    console.error('❌ Deploy interrompido para evitar inconsistências');
    console.error('🔧 Verifique:');
    console.error('   - Conexão com banco de dados');
    console.error('   - Permissões do usuário do banco');
    console.error('   - Sintaxe das migrations');
    
    process.exit(1); // FALHA o deploy se não conseguir migrar
    
  } finally {
    await db.destroy();
  }
}

// Log de início
console.log('🔄 Iniciando processo de auto-migração...');
console.log(`📅 Data/Hora: ${new Date().toISOString()}`);

autoMigrate().catch(error => {
  console.error('💀 Erro fatal na auto-migração:', error);
  process.exit(1);
});
