const knex = require('knex');

async function checkProductionColumns() {
  // URL de conexão da produção
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
    console.log('🔍 Verificando as colunas "faltantes" na PRODUÇÃO...\n');
    
    // Testar conexão
    const timeResult = await db.raw('SELECT NOW() as current_time');
    console.log(`✅ Conectado à produção - ${timeResult.rows[0].current_time}\n`);
    
    // Colunas que você mencionou como faltando
    const columnsToCheck = [
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
    
    const result = await db.raw(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN (${columnsToCheck.map(() => '?').join(',')})
      ORDER BY column_name
    `, columnsToCheck);
    
    console.log('📊 STATUS DAS COLUNAS NA PRODUÇÃO:\n');
    
    columnsToCheck.forEach(columnName => {
      const columnInfo = result.rows.find(row => row.column_name === columnName);
      
      if (columnInfo) {
        console.log(`✅ ${columnName} - EXISTE NA PRODUÇÃO!`);
        console.log(`   Tipo: ${columnInfo.data_type}`);
        if (columnInfo.character_maximum_length) {
          console.log(`   Tamanho: ${columnInfo.character_maximum_length}`);
        }
        console.log(`   Nullable: ${columnInfo.is_nullable}`);
        console.log('');
      } else {
        console.log(`❌ ${columnName} - FALTA NA PRODUÇÃO!\n`);
      }
    });
    
    // Verificar migrações na produção
    console.log('🔍 MIGRAÇÕES APLICADAS NA PRODUÇÃO:\n');
    const migrationTableExists = await db.schema.hasTable('knex_migrations');
    
    if (migrationTableExists) {
      const migrations = await db('knex_migrations').select('name').orderBy('id');
      console.log('Migrações encontradas:');
      migrations.forEach((migration, index) => {
        console.log(`${index + 1}. ${migration.name}`);
      });
    } else {
      console.log('❌ Tabela knex_migrations NÃO EXISTE na produção!');
      console.log('🚨 PROBLEMA: Sistema de migrações não foi inicializado!');
    }
    
  } catch (error) {
    console.error('❌ Erro ao verificar produção:', error.message);
    console.log('\n💡 POSSÍVEIS SOLUÇÕES:');
    console.log('1. Verificar se DATABASE_URL está correta');
    console.log('2. Verificar conectividade com servidor de produção');
    console.log('3. Aguardar deploy completar no Render');
  } finally {
    await db.destroy();
  }
}

checkProductionColumns();
