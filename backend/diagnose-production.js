#!/usr/bin/env node
import knex from 'knex';
import knexConfig from './knexfile.js';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseProduction() {
  const environment = process.env.NODE_ENV || 'production';
  const config = knexConfig[environment];
  
  console.log('🔍 DIAGNÓSTICO DE PRODUÇÃO');
  console.log('==========================');
  console.log(`Environment: ${environment}`);
  console.log(`Database URL: ${process.env.DATABASE_URL ? 'Configurada' : 'Não configurada'}`);
  
  const db = knex(config);
  
  try {
    // 1. Testar conexão
    console.log('\n1. Testando conexão...');
    await db.raw('SELECT NOW()');
    console.log('✅ Conexão OK');
    
    // 2. Verificar se tabelas existem
    console.log('\n2. Verificando tabelas...');
    const tables = await db.raw(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    console.log('Tabelas encontradas:', tables.rows.map(r => r.table_name));
    
    // 3. Verificar colunas da tabela atendimentos
    console.log('\n3. Verificando colunas da tabela atendimentos...');
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas da tabela atendimentos:');
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    
    // 4. Verificar se a coluna 'abandonado' existe
    const abandonadoExists = columns.rows.some(col => col.column_name === 'abandonado');
    console.log(`\n❓ Coluna 'abandonado' existe: ${abandonadoExists ? '✅ SIM' : '❌ NÃO'}`);
    
    // 5. Verificar migrations executadas
    console.log('\n4. Verificando migrations executadas...');
    try {
      const migrationTable = await db.raw(`
        SELECT * FROM knex_migrations 
        ORDER BY batch, migration_time
      `);
      
      console.log('Migrations executadas:');
      migrationTable.rows.forEach(migration => {
        console.log(`  - ${migration.name} (batch ${migration.batch})`);
      });
      
      // Verificar se a migration do abandono foi executada
      const abandonoMigration = migrationTable.rows.find(m => 
        m.name.includes('abandono_atendimento')
      );
      console.log(`\n❓ Migration do abandono executada: ${abandonoMigration ? '✅ SIM' : '❌ NÃO'}`);
      
    } catch (error) {
      console.log('❌ Erro ao verificar migrations:', error.message);
    }
    
    // 6. Verificar migrations pendentes
    console.log('\n5. Verificando migrations pendentes...');
    try {
      const [batch, migrations] = await db.migrate.list();
      console.log(`Migrations pendentes: ${migrations.length}`);
      if (migrations.length > 0) {
        migrations.forEach(migration => console.log(`  - ${migration}`));
      }
    } catch (error) {
      console.log('❌ Erro ao verificar migrations pendentes:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Erro durante diagnóstico:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.destroy();
  }
}

diagnoseProduction().catch(console.error);
