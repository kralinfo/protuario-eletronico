#!/bin/bash

# Script para aplicar migração de triagem via Docker
# Execute: ./migrar-triagem.sh

echo "🏥 === MIGRAÇÃO DE TRIAGEM VIA DOCKER ==="
echo ""

echo "🔍 Verificando containers Docker..."
docker-compose ps

echo ""
echo "🚀 Aplicando migração de triagem..."

# SQL da migração completa
docker-compose exec db psql -U postgres -d prontuario -c "
BEGIN;

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
DO \$\$ 
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
END \$\$;

COMMIT;

SELECT 'Migração aplicada com sucesso!' as resultado;
"

echo ""
echo "🔍 Verificando resultado..."

# Verificar se as colunas foram criadas
docker-compose exec db psql -U postgres -d prontuario -c "
SELECT 
  column_name, 
  data_type, 
  is_nullable 
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
"

echo ""
echo "✅ Migração concluída!"
