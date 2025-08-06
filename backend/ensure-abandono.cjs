#!/usr/bin/env node
/**
 * Script de startup simples que GARANTE a criação dos campos
 * Não falha silenciosamente - interrompe o startup se não conseguir
 */

const { Client } = require('pg');
require('dotenv').config();

async function ensureAbandonoFields() {
  console.log('🔥 STARTUP: GARANTINDO CAMPOS DE ABANDONO');
  console.log('==========================================');
  
  // Usar NODE_ENV de produção se não estiver definido
  const isProduction = process.env.NODE_ENV === 'production' || !process.env.NODE_ENV;
  
  if (!process.env.DATABASE_URL && isProduction) {
    console.error('❌ DATABASE_URL não encontrada em produção!');
    process.exit(1);
  }
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });
  
  try {
    console.log('🔌 Conectando ao banco...');
    await client.connect();
    console.log('✅ Conectado!');
    
    // Verificar colunas existentes
    console.log('🔍 Verificando colunas existentes...');
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN ('abandonado', 'data_abandono', 'motivo_abandono', 'usuario_abandono_id', 'etapa_abandono')
      ORDER BY column_name
    `;
    
    const existing = await client.query(checkQuery);
    const existingColumns = existing.rows.map(r => r.column_name);
    console.log(`📋 Colunas existentes: [${existingColumns.join(', ')}]`);
    
    const allColumns = ['abandonado', 'data_abandono', 'etapa_abandono', 'motivo_abandono', 'usuario_abandono_id'];
    const missingColumns = allColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length === 0) {
      console.log('✅ Todas as colunas de abandono já existem!');
      return true;
    }
    
    console.log(`🔧 Criando ${missingColumns.length} colunas faltantes: [${missingColumns.join(', ')}]`);
    
    // Criar colunas uma por uma com logs detalhados
    const sqlCommands = [
      { col: 'abandonado', sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS abandonado BOOLEAN DEFAULT false' },
      { col: 'data_abandono', sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_abandono TIMESTAMP' },
      { col: 'motivo_abandono', sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS motivo_abandono VARCHAR(500)' },
      { col: 'usuario_abandono_id', sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS usuario_abandono_id INTEGER' },
      { col: 'etapa_abandono', sql: 'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS etapa_abandono VARCHAR(50)' }
    ];
    
    for (const { col, sql } of sqlCommands) {
      if (missingColumns.includes(col)) {
        try {
          console.log(`⚡ Executando: ${sql}`);
          await client.query(sql);
          console.log(`✅ Coluna '${col}' criada com sucesso`);
        } catch (error) {
          console.error(`❌ ERRO ao criar coluna '${col}':`, error.message);
          // NÃO interromper - continuar com as outras
        }
      }
    }
    
    // Verificação final OBRIGATÓRIA
    console.log('🔍 Verificação final...');
    const finalCheck = await client.query(checkQuery);
    const finalColumns = finalCheck.rows.map(r => r.column_name);
    console.log(`📋 Colunas após criação: [${finalColumns.join(', ')}]`);
    
    if (finalColumns.length === 5) {
      console.log('✅ SUCESSO! Todas as 5 colunas estão presentes!');
      
      // Marcar migration como executada
      try {
        const migrationExists = await client.query(`
          SELECT name FROM knex_migrations 
          WHERE name = '20250804004600_add_abandono_atendimento.js'
        `);
        
        if (migrationExists.rows.length === 0) {
          const nextBatch = await client.query('SELECT COALESCE(MAX(batch), 0) + 1 as batch FROM knex_migrations');
          await client.query(`
            INSERT INTO knex_migrations (name, batch, migration_time) 
            VALUES ('20250804004600_add_abandono_atendimento.js', $1, NOW())
          `, [nextBatch.rows[0].batch]);
          console.log('✅ Migration marcada como executada');
        }
      } catch (migError) {
        console.warn('⚠️  Aviso: não foi possível marcar migration:', migError.message);
      }
      
      return true;
    } else {
      console.error(`❌ FALHA! Esperado 5 colunas, encontrado ${finalColumns.length}`);
      console.error('🚨 INTERROMPENDO STARTUP - CAMPOS CRÍTICOS AUSENTES');
      process.exit(1); // FALHAR o startup se não conseguir criar
    }
    
  } catch (error) {
    console.error('💥 ERRO CRÍTICO durante criação dos campos:', error.message);
    console.error('Stack:', error.stack);
    console.error('🚨 INTERROMPENDO STARTUP');
    process.exit(1); // FALHAR o startup se houver erro
  } finally {
    await client.end();
    console.log('🔌 Conexão fechada');
  }
}

console.log('🚀 Iniciando verificação de campos obrigatórios...');
ensureAbandonoFields().then(() => {
  console.log('✅ Verificação concluída - prosseguindo com startup');
}).catch(error => {
  console.error('💀 Falha crítica:', error);
  process.exit(1);
});
