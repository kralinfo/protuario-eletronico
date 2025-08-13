const knex = require('knex');

// Script para verificar produção - USE APENAS LOCALMENTE PARA DEBUG
// NÃO COMMITAR COM CREDENCIAIS REAIS

async function checkProduction() {
  // URL de conexão da produção (substituir pela real quando necessário)
  const DATABASE_URL = process.env.PROD_DATABASE_URL || 'postgresql://mydb_l01f_user:9SMTVGi0Sb1QgSesdVxAmGZuCXnMEtKJ@dpg-d1jjelemcj7s739u1vjg-a.oregon-postgres.render.com/mydb_l01f';
  
  const config = {
    client: 'postgresql',
    connection: {
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    }
  };
  
  const db = knex(config);
  
  try {
    console.log('🔍 Verificando colunas da tabela atendimentos na PRODUÇÃO...\n');
    
    // Testar conexão
    const timeResult = await db.raw('SELECT NOW() as current_time');
    console.log(`✅ Conectado à produção - ${timeResult.rows[0].current_time}\n`);
    
    const result = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    console.log('Colunas encontradas na produção:');
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
      'data_fim_triagem',
      'status_destino'
    ];
    
    console.log('\n🔍 Status das colunas de triagem na PRODUÇÃO:');
    triagemColumns.forEach(col => {
      const exists = result.rows.find(row => row.column_name === col);
      console.log(`${exists ? '✅' : '❌'} ${col}`);
    });
    
    // Verificar tabela de migrações
    console.log('\n📋 Verificando tabela de migrações na PRODUÇÃO...');
    const migrationTableExists = await db.schema.hasTable('knex_migrations');
    console.log(`Tabela knex_migrations existe: ${migrationTableExists ? '✅ SIM' : '❌ NÃO'}`);
    
    if (migrationTableExists) {
      const migrations = await db('knex_migrations').select('name').orderBy('id');
      console.log('\nMigrações executadas na PRODUÇÃO:');
      migrations.forEach((migration, index) => {
        console.log(`${index + 1}. ${migration.name}`);
      });
    } else {
      console.log('\n⚠️  Sistema de migrations não está configurado na produção!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao conectar com produção:', error.message);
  } finally {
    await db.destroy();
  }
}

checkProduction();
