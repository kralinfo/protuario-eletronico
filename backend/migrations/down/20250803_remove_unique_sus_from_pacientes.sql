-- ROLLBACK: Remove constraint UNIQUE da coluna sus da tabela pacientes

-- Remove o índice parcial
DROP INDEX IF EXISTS idx_pacientes_sus_unique;

-- Remove a constraint UNIQUE
ALTER TABLE pacientes DROP CONSTRAINT IF EXISTS unique_sus;
