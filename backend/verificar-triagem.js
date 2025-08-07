#!/usr/bin/env node

/**
 * Script para verificar se as colunas de triagem foram aplicadas corretamente
 * Execute: node verificar-triagem.js
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'prontuario',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function verificarColunasFriagem() {
  try {
    console.log('🔍 Verificando colunas de triagem...\n');
    
    const query = `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN (
        'pressao_arterial', 'temperatura', 'frequencia_cardiaca', 
        'frequencia_respiratoria', 'saturacao_oxigenio', 'peso', 'altura',
        'classificacao_risco', 'prioridade', 'queixa_principal', 
        'historia_atual', 'alergias', 'medicamentos_uso', 
        'observacoes_triagem', 'triagem_realizada_por', 
        'data_inicio_triagem', 'data_fim_triagem'
      )
      ORDER BY column_name;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ Nenhuma coluna de triagem encontrada!');
      console.log('Execute as migrações primeiro.');
      return;
    }
    
    console.log('✅ Colunas de triagem encontradas:');
    console.table(result.rows);
    
    console.log(`\n📊 Total: ${result.rows.length} colunas criadas`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar colunas:', error.message);
  } finally {
    await pool.end();
  }
}

verificarColunasFriagem();
