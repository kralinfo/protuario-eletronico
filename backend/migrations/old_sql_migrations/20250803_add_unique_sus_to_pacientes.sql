-- MIGRATION: Adiciona constraint UNIQUE na coluna sus da tabela pacientes
-- Isso garante que não haverá números de SUS duplicados no banco de dados

-- Primeiro, vamos verificar se há duplicatas existentes sem removê-las
-- (apenas mostra um relatório das duplicatas encontradas)
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT sus, COUNT(*) as total
        FROM pacientes 
        WHERE sus IS NOT NULL AND sus != ''
        GROUP BY sus 
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'ATENÇÃO: Encontradas % duplicatas de SUS. Verifique os dados antes de prosseguir.', duplicate_count;
        
        -- Lista as duplicatas para análise
        FOR rec IN 
            SELECT sus, array_agg(id ORDER BY id) as ids, COUNT(*) as total
            FROM pacientes 
            WHERE sus IS NOT NULL AND sus != ''
            GROUP BY sus 
            HAVING COUNT(*) > 1
        LOOP
            RAISE NOTICE 'SUS duplicado: % - IDs: % (total: %)', rec.sus, rec.ids, rec.total;
        END LOOP;
        
        RAISE EXCEPTION 'Migração cancelada devido a duplicatas. Resolva as duplicatas manualmente antes de prosseguir.';
    ELSE
        RAISE NOTICE 'Nenhuma duplicata de SUS encontrada. Prosseguindo com a migração.';
    END IF;
END $$;

-- Adiciona a constraint UNIQUE na coluna sus
-- Permite múltiplos valores NULL/vazios, mas não permite duplicatas de valores preenchidos
ALTER TABLE pacientes 
ADD CONSTRAINT unique_sus 
UNIQUE (sus) 
DEFERRABLE INITIALLY DEFERRED;

-- Cria um índice parcial para melhorar a performance
-- (apenas para valores não nulos e não vazios)
CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_sus_unique 
ON pacientes (sus) 
WHERE sus IS NOT NULL AND sus != '';
