#!/usr/bin/env node
/**
 * 🔍 VERIFICAÇÃO DETALHADA DO BANCO DE PRODUÇÃO
 * 
 * Este script conecta diretamente na produção e compara com o local
 */

const knex = require('knex');
const knexConfig = require('./knexfile.cjs');

async function compareProduction() {
  console.log('🔍 COMPARAÇÃO: LOCAL vs PRODUÇÃO');
  console.log('=================================\n');
  
  // Configuração para produção
  const DATABASE_URL = 'postgresql://mydb_l01f_user:9SMTVGi0Sb1QgSesdVxAmGZuCXnMEtKJ@dpg-d1jjelemcj7s739u1vjg-a.oregon-postgres.render.com/mydb_l01f';
  
  const productionConfig = {
    client: 'postgresql',
    connection: {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  };
  
  const localConfig = knexConfig.development;
  
  const prodDb = knex(productionConfig);
  const localDb = knex(localConfig);
  
  try {
    // ===== TESTE DE CONEXÃO =====
    console.log('1️⃣ TESTANDO CONEXÕES...');
    
    try {
      const prodTime = await prodDb.raw('SELECT NOW() as current_time');
      console.log(`✅ PRODUÇÃO conectada - ${prodTime.rows[0].current_time}`);
    } catch (error) {
      console.log(`❌ PRODUÇÃO falhou - ${error.message}`);
      return;
    }
    
    try {
      const localTime = await localDb.raw('SELECT NOW() as current_time');
      console.log(`✅ LOCAL conectado - ${localTime.rows[0].current_time}`);
    } catch (error) {
      console.log(`❌ LOCAL falhou - ${error.message}`);
      return;
    }
    
    console.log('');
    
    // ===== COMPARAR COLUNAS =====
    console.log('2️⃣ COMPARANDO COLUNAS DA TABELA ATENDIMENTOS...\n');
    
    // Buscar colunas da produção
    const prodColumns = await prodDb.raw(`
      SELECT column_name, data_type, ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    // Buscar colunas do local
    const localColumns = await localDb.raw(`
      SELECT column_name, data_type, ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    console.log(`📊 PRODUÇÃO: ${prodColumns.rows.length} colunas`);
    console.log(`📊 LOCAL: ${localColumns.rows.length} colunas\n`);
    
    // Mostrar colunas da produção
    console.log('🏭 COLUNAS NA PRODUÇÃO:');
    if (prodColumns.rows.length === 0) {
      console.log('❌ Tabela "atendimentos" não existe na produção!\n');
    } else {
      prodColumns.rows.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.column_name} (${col.data_type})`);
      });
      console.log('');
    }
    
    // Encontrar colunas que existem no local mas não na produção
    const missingInProduction = localColumns.rows.filter(localCol => {
      return !prodColumns.rows.find(prodCol => prodCol.column_name === localCol.column_name);
    });
    
    // Encontrar colunas que existem na produção mas não no local
    const extraInProduction = prodColumns.rows.filter(prodCol => {
      return !localColumns.rows.find(localCol => localCol.column_name === prodCol.column_name);
    });
    
    console.log('3️⃣ ANÁLISE DE DIFERENÇAS...\n');
    
    if (missingInProduction.length > 0) {
      console.log(`❌ FALTANDO NA PRODUÇÃO (${missingInProduction.length} colunas):`);
      missingInProduction.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.column_name} (${col.data_type})`);
      });
      console.log('');
    }
    
    if (extraInProduction.length > 0) {
      console.log(`⚠️  EXTRA NA PRODUÇÃO (${extraInProduction.length} colunas):`);
      extraInProduction.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col.column_name} (${col.data_type})`);
      });
      console.log('');
    }
    
    if (missingInProduction.length === 0 && extraInProduction.length === 0) {
      console.log('✅ BANCOS SINCRONIZADOS - Nenhuma diferença encontrada\n');
    }
    
    // ===== VERIFICAR MIGRAÇÕES =====
    console.log('4️⃣ VERIFICANDO SISTEMA DE MIGRAÇÕES...\n');
    
    // Produção
    const prodMigrationTableExists = await prodDb.schema.hasTable('knex_migrations');
    console.log(`🏭 PRODUÇÃO - Tabela knex_migrations: ${prodMigrationTableExists ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);
    
    if (prodMigrationTableExists) {
      const prodMigrations = await prodDb('knex_migrations').select('name').orderBy('id');
      console.log(`   Migrações aplicadas na produção: ${prodMigrations.length}`);
      prodMigrations.forEach((migration, index) => {
        console.log(`   ${index + 1}. ${migration.name}`);
      });
    } else {
      console.log('   🚨 PROBLEMA: Sistema de migrações não inicializado na produção!');
    }
    
    console.log('');
    
    // Local
    const localMigrationTableExists = await localDb.schema.hasTable('knex_migrations');
    console.log(`🏠 LOCAL - Tabela knex_migrations: ${localMigrationTableExists ? '✅ EXISTE' : '❌ NÃO EXISTE'}`);
    
    if (localMigrationTableExists) {
      const localMigrations = await localDb('knex_migrations').select('name').orderBy('id');
      console.log(`   Migrações aplicadas no local: ${localMigrations.length}`);
      localMigrations.forEach((migration, index) => {
        console.log(`   ${index + 1}. ${migration.name}`);
      });
    }
    
    // ===== RESUMO FINAL =====
    console.log('\n' + '='.repeat(60));
    console.log('📋 RESUMO FINAL');
    console.log('===============');
    
    if (missingInProduction.length > 0) {
      console.log(`❌ PROBLEMA CONFIRMADO: ${missingInProduction.length} colunas faltando na produção`);
      console.log('💡 SOLUÇÃO: Executar migrações na produção via deploy');
      console.log('📝 COMANDO: git add . && git commit && git push origin main');
    } else {
      console.log('✅ Bancos estão sincronizados');
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    console.log('\n💡 POSSÍVEIS CAUSAS:');
    console.log('   - Conexão de rede instável');
    console.log('   - Credenciais incorretas');
    console.log('   - Firewall bloqueando conexão');
  } finally {
    await prodDb.destroy();
    await localDb.destroy();
  }
}

compareProduction();
