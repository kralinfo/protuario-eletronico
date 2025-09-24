#!/usr/bin/env node
/**
 * 🚀 APLICAR MIGRAÇÕES DIRETAMENTE NA PRODUÇÃO
 * 
 * Script que aplica as migrações diretamente via SQL, sem depender do Knex CLI
 */

import pg from 'pg';
import { config } from 'dotenv';

config();

const { Client } = pg;

const MIGRATIONS_SQL = `
-- ========================================
-- MIGRAÇÃO: Adicionar campos de triagem
-- ========================================

-- Verificar se já existe tabela knex_migrations
CREATE TABLE IF NOT EXISTS knex_migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    batch INT NOT NULL,
    migration_time TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar colunas de triagem se não existirem
DO $$
BEGIN
    -- Sinais vitais
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='pressao_arterial') THEN
        ALTER TABLE atendimentos ADD COLUMN pressao_arterial VARCHAR(20);
        COMMENT ON COLUMN atendimentos.pressao_arterial IS 'Pressão arterial - formato: 120/80';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='temperatura') THEN
        ALTER TABLE atendimentos ADD COLUMN temperatura DECIMAL(4,1);
        COMMENT ON COLUMN atendimentos.temperatura IS 'Temperatura corporal em graus Celsius';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='frequencia_cardiaca') THEN
        ALTER TABLE atendimentos ADD COLUMN frequencia_cardiaca INTEGER;
        COMMENT ON COLUMN atendimentos.frequencia_cardiaca IS 'Frequência cardíaca em BPM';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='frequencia_respiratoria') THEN
        ALTER TABLE atendimentos ADD COLUMN frequencia_respiratoria INTEGER;
        COMMENT ON COLUMN atendimentos.frequencia_respiratoria IS 'Frequência respiratória em RPM';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='saturacao_oxigenio') THEN
        ALTER TABLE atendimentos ADD COLUMN saturacao_oxigenio INTEGER;
        COMMENT ON COLUMN atendimentos.saturacao_oxigenio IS 'Saturação de oxigênio em %';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='peso') THEN
        ALTER TABLE atendimentos ADD COLUMN peso DECIMAL(5,2);
        COMMENT ON COLUMN atendimentos.peso IS 'Peso em kg';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='altura') THEN
        ALTER TABLE atendimentos ADD COLUMN altura INTEGER;
        COMMENT ON COLUMN atendimentos.altura IS 'Altura em cm';
    END IF;

    -- Classificação de risco
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='classificacao_risco') THEN
        ALTER TABLE atendimentos ADD COLUMN classificacao_risco VARCHAR(20);
        COMMENT ON COLUMN atendimentos.classificacao_risco IS 'Cor do protocolo: vermelho, laranja, amarelo, verde, azul';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='prioridade') THEN
        ALTER TABLE atendimentos ADD COLUMN prioridade INTEGER;
        COMMENT ON COLUMN atendimentos.prioridade IS 'Prioridade numérica: 1=emergência, 5=não urgente';
    END IF;

    -- Dados clínicos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='queixa_principal') THEN
        ALTER TABLE atendimentos ADD COLUMN queixa_principal TEXT;
        COMMENT ON COLUMN atendimentos.queixa_principal IS 'Queixa principal do paciente';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='historia_atual') THEN
        ALTER TABLE atendimentos ADD COLUMN historia_atual TEXT;
        COMMENT ON COLUMN atendimentos.historia_atual IS 'História da doença atual';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='alergias') THEN
        ALTER TABLE atendimentos ADD COLUMN alergias TEXT;
        COMMENT ON COLUMN atendimentos.alergias IS 'Alergias conhecidas';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='medicamentos_uso') THEN
        ALTER TABLE atendimentos ADD COLUMN medicamentos_uso TEXT;
        COMMENT ON COLUMN atendimentos.medicamentos_uso IS 'Medicamentos em uso';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='observacoes_triagem') THEN
        ALTER TABLE atendimentos ADD COLUMN observacoes_triagem TEXT;
        COMMENT ON COLUMN atendimentos.observacoes_triagem IS 'Observações gerais da triagem';
    END IF;

    -- Controle de triagem
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='triagem_realizada_por') THEN
        ALTER TABLE atendimentos ADD COLUMN triagem_realizada_por INTEGER;
        COMMENT ON COLUMN atendimentos.triagem_realizada_por IS 'ID do profissional que realizou a triagem';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='data_inicio_triagem') THEN
        ALTER TABLE atendimentos ADD COLUMN data_inicio_triagem TIMESTAMPTZ;
        COMMENT ON COLUMN atendimentos.data_inicio_triagem IS 'Data/hora de início da triagem';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='data_fim_triagem') THEN
        ALTER TABLE atendimentos ADD COLUMN data_fim_triagem TIMESTAMPTZ;
        COMMENT ON COLUMN atendimentos.data_fim_triagem IS 'Data/hora de conclusão da triagem';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='status_destino') THEN
        ALTER TABLE atendimentos ADD COLUMN status_destino VARCHAR(50);
        COMMENT ON COLUMN atendimentos.status_destino IS 'Status de destino após a triagem';
    END IF;

    RAISE NOTICE '✅ Migrações de triagem aplicadas com sucesso!';
END
$$;

-- Registrar migração na tabela de controle
INSERT INTO knex_migrations (name, batch) 
SELECT '20250811_direct_triagem_migration', COALESCE(MAX(batch), 0) + 1 
FROM knex_migrations 
WHERE NOT EXISTS (
    SELECT 1 FROM knex_migrations 
    WHERE name = '20250811_direct_triagem_migration'
);

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_atendimentos_classificacao_risco ON atendimentos(classificacao_risco);
CREATE INDEX IF NOT EXISTS idx_atendimentos_prioridade ON atendimentos(prioridade);
CREATE INDEX IF NOT EXISTS idx_atendimentos_triagem_realizada_por ON atendimentos(triagem_realizada_por);
`;

async function applyDirectMigrations() {
  console.log('🚀 APLICANDO MIGRAÇÕES DIRETAMENTE NA PRODUÇÃO');
  console.log('==============================================\n');
  
  const DATABASE_URL = process.env.DATABASE_URL;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não configurada!');
    return false;
  }
  
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log('🔌 Conectando com produção...');
    await client.connect();
    
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log(`✅ Conectado - ${timeResult.rows[0].current_time}\n`);
    
    console.log('⚡ Aplicando migrações...');
    await client.query(MIGRATIONS_SQL);
    
    console.log('📊 Verificando colunas criadas...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN (
        'prioridade', 'queixa_principal', 'historia_atual', 'alergias', 
        'medicamentos_uso', 'observacoes_triagem', 'triagem_realizada_por', 
        'data_inicio_triagem', 'data_fim_triagem', 'status_destino'
      )
      ORDER BY column_name
    `);
    
    console.log(`\n📋 Colunas encontradas: ${columnsResult.rows.length}/10`);
    columnsResult.rows.forEach(row => {
      console.log(`✅ ${row.column_name} (${row.data_type})`);
    });
    
    if (columnsResult.rows.length === 10) {
      console.log('\n🎉 SUCESSO! Todas as colunas foram criadas!');
      return true;
    } else {
      console.log('\n⚠️  Algumas colunas podem não ter sido criadas');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    return false;
  } finally {
    await client.end();
  }
}

export default applyDirectMigrations;

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  applyDirectMigrations()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}
