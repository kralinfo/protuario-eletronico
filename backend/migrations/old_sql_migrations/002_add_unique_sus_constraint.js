/**
 * Migration: 002_add_unique_sus_constraint
 * Data: 2025-08-03
 * Descrição: Adiciona constraint UNIQUE na coluna sus da tabela pacientes
 */

export async function up(knex) {
  // Verifica se há duplicatas antes de aplicar a constraint
  const duplicates = await knex.raw(`
    SELECT sus, COUNT(*) as total
    FROM pacientes 
    WHERE sus IS NOT NULL AND sus != ''
    GROUP BY sus 
    HAVING COUNT(*) > 1
  `);

  if (duplicates.rows.length > 0) {
    console.log('⚠️  ATENÇÃO: Encontradas duplicatas de SUS. Execute primeiro a limpeza manual.');
    console.log('Duplicatas encontradas:', duplicates.rows);
    throw new Error('Migração cancelada devido a duplicatas de SUS. Resolva as duplicatas manualmente antes de prosseguir.');
  }

  // Adiciona a constraint UNIQUE na coluna sus
  await knex.schema.alterTable('pacientes', function(table) {
    table.unique('sus', 'unique_sus');
  });

  // Cria um índice parcial para melhorar a performance
  await knex.schema.raw(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_pacientes_sus_unique 
    ON pacientes (sus) 
    WHERE sus IS NOT NULL AND sus != ''
  `);

  console.log('✅ Constraint UNIQUE adicionada na coluna sus com sucesso!');
}

export async function down(knex) {
  // Remove o índice parcial
  await knex.schema.raw('DROP INDEX IF EXISTS idx_pacientes_sus_unique');
  
  // Remove a constraint UNIQUE
  await knex.schema.alterTable('pacientes', function(table) {
    table.dropUnique('sus', 'unique_sus');
  });

  console.log('✅ Constraint UNIQUE removida da coluna sus!');
}
