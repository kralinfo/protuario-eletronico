#!/usr/bin/env node

/**
 * Script robusto para aplicar migrações de triagem
 * Execute: node aplicar-migracoes.js
 */

import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'prontuario',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function verificarTabelaMigracoes() {
  try {
    const query = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knex_migrations'
      );
    `;
    const result = await pool.query(query);
    return result.rows[0].exists;
  } catch (error) {
    console.log('⚠️  Erro ao verificar tabela de migrações:', error.message);
    return false;
  }
}

async function criarTabelaMigracoes() {
  try {
    const query = `
      CREATE TABLE IF NOT EXISTS knex_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        batch INTEGER NOT NULL,
        migration_time TIMESTAMPTZ DEFAULT NOW()
      );
    `;
    await pool.query(query);
    console.log('✅ Tabela de migrações criada');
  } catch (error) {
    console.log('❌ Erro ao criar tabela de migrações:', error.message);
  }
}

async function verificarColunaTriagem() {
  try {
    const query = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name = 'classificacao_risco';
    `;
    const result = await pool.query(query);
    return result.rows.length > 0;
  } catch (error) {
    console.log('⚠️  Erro ao verificar colunas:', error.message);
    return false;
  }
}

async function aplicarMigracaoTriagem() {
  try {
    console.log('🚀 Aplicando migração de triagem...\n');

    const migracaoSQL = `
      -- === SINAIS VITAIS ===
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS pressao_arterial VARCHAR(20);
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS temperatura DECIMAL(4,1);
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS frequencia_cardiaca INTEGER;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS frequencia_respiratoria INTEGER;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS saturacao_oxigenio INTEGER;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS peso DECIMAL(5,2);
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS altura INTEGER;
      
      -- === CLASSIFICAÇÃO DE RISCO ===
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS classificacao_risco VARCHAR(20);
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS prioridade INTEGER;
      
      -- === DADOS CLÍNICOS ===
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS queixa_principal TEXT;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS historia_atual TEXT;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS alergias TEXT;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS medicamentos_uso TEXT;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS observacoes_triagem TEXT;
      
      -- === CONTROLE DE TRIAGEM ===
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS triagem_realizada_por INTEGER;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_inicio_triagem TIMESTAMPTZ;
      ALTER TABLE atendimentos ADD COLUMN IF NOT EXISTS data_fim_triagem TIMESTAMPTZ;
      
      -- === ÍNDICES ===
      CREATE INDEX IF NOT EXISTS idx_classificacao_risco ON atendimentos(classificacao_risco);
      CREATE INDEX IF NOT EXISTS idx_prioridade ON atendimentos(prioridade);
      CREATE INDEX IF NOT EXISTS idx_triagem_realizada_por ON atendimentos(triagem_realizada_por);
      
      -- === FOREIGN KEY ===
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'fk_triagem_usuario' 
          AND table_name = 'atendimentos'
        ) THEN
          ALTER TABLE atendimentos 
          ADD CONSTRAINT fk_triagem_usuario 
          FOREIGN KEY (triagem_realizada_por) REFERENCES usuarios(id);
        END IF;
      END $$;
      
      -- === COMENTÁRIOS ===
      COMMENT ON COLUMN atendimentos.pressao_arterial IS 'Pressão arterial - formato: 120/80';
      COMMENT ON COLUMN atendimentos.temperatura IS 'Temperatura corporal em graus Celsius';
      COMMENT ON COLUMN atendimentos.frequencia_cardiaca IS 'Frequência cardíaca em BPM';
      COMMENT ON COLUMN atendimentos.frequencia_respiratoria IS 'Frequência respiratória em RPM';
      COMMENT ON COLUMN atendimentos.saturacao_oxigenio IS 'Saturação de oxigênio em %';
      COMMENT ON COLUMN atendimentos.peso IS 'Peso em kg';
      COMMENT ON COLUMN atendimentos.altura IS 'Altura em cm';
      COMMENT ON COLUMN atendimentos.classificacao_risco IS 'Cor do protocolo: vermelho, laranja, amarelo, verde, azul';
      COMMENT ON COLUMN atendimentos.prioridade IS 'Prioridade numérica: 1=emergência, 5=não urgente';
      COMMENT ON COLUMN atendimentos.queixa_principal IS 'Queixa principal do paciente';
      COMMENT ON COLUMN atendimentos.historia_atual IS 'História da doença atual';
      COMMENT ON COLUMN atendimentos.alergias IS 'Alergias conhecidas';
      COMMENT ON COLUMN atendimentos.medicamentos_uso IS 'Medicamentos em uso';
      COMMENT ON COLUMN atendimentos.observacoes_triagem IS 'Observações gerais da triagem';
      COMMENT ON COLUMN atendimentos.triagem_realizada_por IS 'ID do profissional que realizou a triagem';
      COMMENT ON COLUMN atendimentos.data_inicio_triagem IS 'Data/hora de início da triagem';
      COMMENT ON COLUMN atendimentos.data_fim_triagem IS 'Data/hora de conclusão da triagem';
    `;

    await pool.query(migracaoSQL);
    console.log('✅ Migração de triagem aplicada com sucesso!');

    // Registrar migração
    const migrationName = '20250806000000_add_triagem_fields';
    const insertMigration = `
      INSERT INTO knex_migrations (name, batch) 
      SELECT $1, COALESCE(MAX(batch), 0) + 1 
      FROM knex_migrations
      WHERE NOT EXISTS (
        SELECT 1 FROM knex_migrations WHERE name = $1
      );
    `;
    await pool.query(insertMigration, [migrationName]);
    console.log('✅ Migração registrada no histórico');

  } catch (error) {
    console.error('❌ Erro ao aplicar migração:', error.message);
    throw error;
  }
}

async function verificarResultado() {
  try {
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
    
    console.log('\n📊 Resultado da migração:');
    console.table(result.rows);
    console.log(`\n✅ Total de colunas criadas: ${result.rows.length}/17`);
    
    if (result.rows.length === 17) {
      console.log('\n🎉 Migração concluída com sucesso!');
      console.log('Todas as colunas de triagem foram criadas.');
    } else {
      console.log('\n⚠️  Algumas colunas podem não ter sido criadas.');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar resultado:', error.message);
  }
}

async function main() {
  try {
    console.log('🏥 === MIGRAÇÃO DE TRIAGEM ===\n');
    
    // 1. Verificar conexão
    console.log('🔍 Testando conexão com banco...');
    await pool.query('SELECT 1');
    console.log('✅ Conexão estabelecida\n');
    
    // 2. Verificar/criar tabela de migrações
    console.log('🔍 Verificando tabela de migrações...');
    const temTabelaMigracoes = await verificarTabelaMigracoes();
    if (!temTabelaMigracoes) {
      await criarTabelaMigracoes();
    } else {
      console.log('✅ Tabela de migrações existe');
    }
    
    // 3. Verificar se já foi aplicada
    console.log('\n🔍 Verificando se migração já foi aplicada...');
    const jaTemColunas = await verificarColunaTriagem();
    
    if (jaTemColunas) {
      console.log('ℹ️  Colunas de triagem já existem.');
      await verificarResultado();
    } else {
      console.log('📝 Aplicando migração...\n');
      await aplicarMigracaoTriagem();
      await verificarResultado();
    }
    
  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('\n🔌 Conexão fechada.');
  }
}

main();
