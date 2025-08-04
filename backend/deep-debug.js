#!/usr/bin/env node
/**
 * Script de depuração avançada para identificar problemas de migração
 */

const knex = require('knex');
const knexConfig = require('./knexfile.js');
require('dotenv').config();
const { readdir, readFile } = require('fs').promises;
const path = require('path');

async function deepDebug() {
  console.log('🔍 DEPURAÇÃO AVANÇADA DE MIGRAÇÃO');
  console.log('================================');
  
  const environment = process.env.NODE_ENV || 'production';
  console.log(`Environment: ${environment}`);
  console.log(`DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);
  console.log(`DATABASE_URL length: ${process.env.DATABASE_URL?.length || 0}`);
  
  const config = knexConfig[environment];
  console.log('Knex config:', JSON.stringify(config, null, 2));
  
  let db;
  
  try {
    // 1. Teste de conexão básica
    console.log('\n🔗 1. TESTE DE CONEXÃO');
    console.log('=====================');
    
    db = knex(config);
    const testQuery = await db.raw('SELECT NOW() as current_time, version() as postgres_version');
    console.log('✅ Conexão OK');
    console.log('Hora atual:', testQuery.rows[0].current_time);
    console.log('Versão PostgreSQL:', testQuery.rows[0].postgres_version);
    
    // 2. Verificar permissões do usuário
    console.log('\n👤 2. VERIFICAÇÃO DE PERMISSÕES');
    console.log('==============================');
    
    const userInfo = await db.raw(`
      SELECT 
        current_user as usuario_atual,
        session_user as usuario_sessao,
        current_database() as banco_atual
    `);
    console.log('Usuário atual:', userInfo.rows[0]);
    
    // Verificar permissões de ALTER TABLE
    const permissions = await db.raw(`
      SELECT 
        table_name,
        privilege_type
      FROM information_schema.table_privileges 
      WHERE grantee = current_user 
      AND table_name = 'atendimentos'
    `);
    console.log('Permissões na tabela atendimentos:', permissions.rows);
    
    // 3. Verificar estrutura da tabela atendimentos
    console.log('\n📋 3. ESTRUTURA DA TABELA ATENDIMENTOS');
    console.log('=====================================');
    
    const tableInfo = await db.raw(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas existentes:');
    tableInfo.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    const hasAbandono = tableInfo.rows.some(col => col.column_name === 'abandonado');
    console.log(`\n❓ Campo 'abandonado' existe: ${hasAbandono ? '✅ SIM' : '❌ NÃO'}`);
    
    // 4. Verificar tabela de migrations
    console.log('\n📝 4. SISTEMA DE MIGRATIONS');
    console.log('===========================');
    
    const migrationTableExists = await db.schema.hasTable('knex_migrations');
    console.log(`Tabela knex_migrations existe: ${migrationTableExists ? '✅ SIM' : '❌ NÃO'}`);
    
    if (migrationTableExists) {
      const migrations = await db('knex_migrations').orderBy('batch', 'asc').orderBy('migration_time', 'asc');
      console.log('Migrations executadas:');
      migrations.forEach(m => {
        console.log(`  - ${m.name} (batch ${m.batch}, ${m.migration_time})`);
      });
      
      const abandonoMigration = migrations.find(m => m.name.includes('abandono'));
      console.log(`\n❓ Migration do abandono registrada: ${abandonoMigration ? '✅ SIM' : '❌ NÃO'}`);
      if (abandonoMigration) {
        console.log('Detalhes:', abandonoMigration);
      }
    }
    
    // 5. Verificar arquivos de migration
    console.log('\n📁 5. ARQUIVOS DE MIGRATION');
    console.log('===========================');
    
    const migrationFiles = await readdir('./migrations');
    console.log('Arquivos encontrados:');
    migrationFiles.forEach(file => {
      console.log(`  - ${file}`);
    });
    
    const abandonoFile = migrationFiles.find(f => f.includes('abandono'));
    if (abandonoFile) {
      console.log(`\n📄 Conteúdo do arquivo ${abandonoFile}:`);
      const content = await readFile(path.join('./migrations', abandonoFile), 'utf8');
      console.log(content.substring(0, 500) + '...');
    }
    
    // 6. Testar migração manual
    console.log('\n🔧 6. TESTE DE MIGRAÇÃO MANUAL');
    console.log('==============================');
    
    if (!hasAbandono) {
      console.log('Tentando criar campos manualmente...');
      
      try {
        await db.schema.alterTable('atendimentos', function(table) {
          table.boolean('abandonado').defaultTo(false);
        });
        console.log('✅ Campo "abandonado" criado com sucesso!');
        
        // Verificar se foi criado
        const newCheck = await db.raw(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'atendimentos' AND column_name = 'abandonado'
        `);
        console.log(`Verificação: Campo existe agora: ${newCheck.rows.length > 0 ? '✅ SIM' : '❌ NÃO'}`);
        
      } catch (alterError) {
        console.error('❌ Erro ao criar campo:', alterError.message);
        console.error('Detalhes do erro:', alterError);
        
        // Verificar se é erro de permissão
        if (alterError.message.includes('permission denied') || alterError.message.includes('must be owner')) {
          console.error('🚫 PROBLEMA DE PERMISSÃO: O usuário não tem permissão para alterar a tabela');
        }
        
        // Verificar se é erro de sintaxe
        if (alterError.message.includes('syntax error')) {
          console.error('📝 PROBLEMA DE SINTAXE: Erro na query SQL gerada');
        }
      }
    }
    
    // 7. Verificar se migrations pendentes
    console.log('\n⏳ 7. MIGRATIONS PENDENTES');
    console.log('==========================');
    
    try {
      const [batch, pendingMigrations] = await db.migrate.list();
      console.log(`Migrations pendentes: ${pendingMigrations.length}`);
      if (pendingMigrations.length > 0) {
        pendingMigrations.forEach(migration => {
          console.log(`  - ${migration}`);
        });
      }
    } catch (listError) {
      console.error('❌ Erro ao listar migrations:', listError.message);
    }
    
  } catch (error) {
    console.error('\n💥 ERRO DURANTE DEPURAÇÃO:', error.message);
    console.error('Stack completo:', error.stack);
    
    // Análise específica do erro
    if (error.message.includes('SSL')) {
      console.error('\n🔒 PROBLEMA SSL: Verifique configurações de SSL no knexfile.js');
    }
    
    if (error.message.includes('authentication failed')) {
      console.error('\n🔑 PROBLEMA DE AUTENTICAÇÃO: Verifique credenciais do banco');
    }
    
    if (error.message.includes('connection')) {
      console.error('\n🌐 PROBLEMA DE CONEXÃO: Verifique URL do banco e conectividade');
    }
    
  } finally {
    if (db) {
      await db.destroy();
      console.log('\n🔌 Conexão fechada');
    }
  }
}

deepDebug().catch(error => {
  console.error('💀 Erro fatal na depuração:', error);
  process.exit(1);
});
