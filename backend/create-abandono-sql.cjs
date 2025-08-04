#!/usr/bin/env node
/**
 * Script SQL direto para criar campos de abandono
 * Bypassa completamente o sistema de migrations
 */

const { Client } = require('pg');
require('dotenv').config();

async function createAbandonoFieldsSQL() {
  console.log('🚨 CRIAÇÃO DIRETA VIA SQL - CAMPOS DE ABANDONO');
  console.log('==============================================');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    await client.connect();
    console.log('✅ Conectado ao PostgreSQL');
    
    // Verificar se as colunas já existem
    const checkColumns = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN ('abandonado', 'data_abandono', 'motivo_abandono', 'usuario_abandono_id', 'etapa_abandono')
    `;
    
    const existingColumns = await client.query(checkColumns);
    console.log(`Colunas já existentes: ${existingColumns.rows.length}/5`);
    
    if (existingColumns.rows.length === 5) {
      console.log('✅ Todas as colunas já existem - nada a fazer');
      return true;
    }
    
    // Lista de colunas para criar
    const columnsToCreate = [
      {
        name: 'abandonado',
        sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS abandonado BOOLEAN DEFAULT false'
      },
      {
        name: 'data_abandono',
        sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_abandono TIMESTAMP'
      },
      {
        name: 'motivo_abandono',
        sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS motivo_abandono VARCHAR(500)'
      },
      {
        name: 'usuario_abandono_id',
        sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS usuario_abandono_id INTEGER'
      },
      {
        name: 'etapa_abandono',
        sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS etapa_abandono VARCHAR(50)'
      }
    ];
    
    // Criar colunas uma por uma
    for (const column of columnsToCreate) {
      try {
        console.log(`Criando coluna: ${column.name}...`);
        await client.query(column.sql);
        console.log(`✅ Coluna ${column.name} criada`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`ℹ️  Coluna ${column.name} já existe`);
        } else {
          console.error(`❌ Erro ao criar ${column.name}:`, error.message);
        }
      }
    }
    
    // Verificar resultado final
    const finalCheck = await client.query(checkColumns);
    console.log(`\n✅ Resultado final: ${finalCheck.rows.length}/5 colunas criadas`);
    
    if (finalCheck.rows.length === 5) {
      // Marcar migration como executada
      try {
        const migrationCheck = await client.query(`
          SELECT name FROM knex_migrations 
          WHERE name = '20250804004600_add_abandono_atendimento.js'
        `);
        
        if (migrationCheck.rows.length === 0) {
          const maxBatch = await client.query('SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM knex_migrations');
          const nextBatch = maxBatch.rows[0].next_batch;
          
          await client.query(`
            INSERT INTO knex_migrations (name, batch, migration_time) 
            VALUES ('20250804004600_add_abandono_atendimento.js', $1, NOW())
          `, [nextBatch]);
          
          console.log('✅ Migration marcada como executada no banco');
        }
      } catch (migrationError) {
        console.warn('⚠️  Não foi possível marcar migration como executada:', migrationError.message);
      }
      
      console.log('\n🎉 SUCESSO! Todos os campos de abandono foram criados!');
      return true;
    } else {
      console.error('\n❌ Nem todas as colunas foram criadas com sucesso');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro durante execução:', error.message);
    console.error('Stack:', error.stack);
    return false;
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

createAbandonoFieldsSQL().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('💀 Erro fatal:', error);
  process.exit(1);
});
