#!/usr/bin/env node
/**
 * Script emergencial para criar campos de abandono AGORA
 * Execute este script diretamente no console do Render
 */

const { Client } = require('pg');
require('dotenv').config();

async function createFieldsNow() {
  console.log('🚨 CRIAÇÃO EMERGENCIAL DE CAMPOS - EXECUTANDO AGORA!');
  console.log('===================================================');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('🔌 Conectando ao banco...');
    await client.connect();
    console.log('✅ Conectado!');
    
    console.log('🔧 Criando campos de abandono...');
    
    const sqlCommands = [
      'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS abandonado BOOLEAN DEFAULT false',
      'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_abandono TIMESTAMP',
      'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS motivo_abandono VARCHAR(500)',
      'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS usuario_abandono_id INTEGER',
      'ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS etapa_abandono VARCHAR(50)'
    ];
    
    for (const sql of sqlCommands) {
      try {
        console.log(`⚡ ${sql}`);
        await client.query(sql);
        console.log('✅ Executado com sucesso!');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('ℹ️  Coluna já existe');
        } else {
          console.error('❌ Erro:', error.message);
        }
      }
    }
    
    // Verificar resultado
    console.log('🔍 Verificando resultado...');
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN ('abandonado', 'data_abandono', 'motivo_abandono', 'usuario_abandono_id', 'etapa_abandono')
      ORDER BY column_name
    `);
    
    console.log(`✅ Resultado: ${result.rows.length}/5 campos criados`);
    result.rows.forEach(row => console.log(`  ✓ ${row.column_name}`));
    
    if (result.rows.length === 5) {
      console.log('🎉 SUCESSO! Todos os campos foram criados!');
      console.log('🔄 Reinicie o serviço backend para aplicar as mudanças');
    } else {
      console.log('❌ Alguns campos não foram criados');
    }
    
  } catch (error) {
    console.error('💥 Erro:', error.message);
  } finally {
    await client.end();
  }
}

createFieldsNow();
