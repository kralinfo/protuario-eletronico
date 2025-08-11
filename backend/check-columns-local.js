const knex = require('knex');
const config = require('./knexfile.cjs');

async function checkColumns() {
  const db = knex(config.development);
  
  try {
    console.log('🔍 Verificando colunas da tabela atendimentos no banco local...\n');
    
    const result = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas encontradas:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.column_name} (${row.data_type})`);
    });
    
    // Verificar especificamente as colunas de triagem
    const triagemColumns = [
      'pressao_arterial',
      'temperatura', 
      'frequencia_cardiaca',
      'frequencia_respiratoria',
      'saturacao_oxigenio',
      'peso',
      'altura',
      'classificacao_risco',
      'prioridade',
      'queixa_principal',
      'historia_atual',
      'alergias',
      'medicamentos_uso',
      'observacoes_triagem',
      'triagem_realizada_por',
      'data_inicio_triagem',
      'data_fim_triagem'
    ];
    
    console.log('\n🔍 Status das colunas de triagem:');
    triagemColumns.forEach(col => {
      const exists = result.rows.find(row => row.column_name === col);
      console.log(`${exists ? '✅' : '❌'} ${col}`);
    });
    
    // Verificar tabela de migrações
    console.log('\n📋 Verificando tabela de migrações...');
    const migrationTableExists = await db.schema.hasTable('knex_migrations');
    console.log(`Tabela knex_migrations existe: ${migrationTableExists ? '✅ SIM' : '❌ NÃO'}`);
    
    if (migrationTableExists) {
      const migrations = await db('knex_migrations').select('name').orderBy('id');
      console.log('\nMigrações executadas:');
      migrations.forEach((migration, index) => {
        console.log(`${index + 1}. ${migration.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.destroy();
  }
}

checkColumns();
