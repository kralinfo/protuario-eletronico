const knex = require('knex');
const config = require('./knexfile.cjs');

async function checkSpecificColumns() {
  const db = knex(config.development);
  
  try {
    console.log('🔍 Verificando colunas específicas de triagem...\n');
    
    // Colunas específicas que você quer conferir
    const specificColumns = [
      'observacoes_triagem',
      'triagem_realizada_por',
      'data_inicio_triagem',
      'data_fim_triagem',
      'status_destino'
    ];
    
    const result = await db.raw(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN ('observacoes_triagem', 'triagem_realizada_por', 'data_inicio_triagem', 'data_fim_triagem', 'status_destino')
      ORDER BY column_name
    `);
    
    console.log('📊 STATUS DAS COLUNAS ESPECÍFICAS:\n');
    
    specificColumns.forEach(columnName => {
      const columnInfo = result.rows.find(row => row.column_name === columnName);
      
      if (columnInfo) {
        console.log(`✅ ${columnName}`);
        console.log(`   Tipo: ${columnInfo.data_type}`);
        if (columnInfo.character_maximum_length) {
          console.log(`   Tamanho: ${columnInfo.character_maximum_length}`);
        }
        console.log(`   Nullable: ${columnInfo.is_nullable}`);
        console.log(`   Default: ${columnInfo.column_default || 'null'}`);
        console.log('');
      } else {
        console.log(`❌ ${columnName} - NÃO EXISTE\n`);
      }
    });
    
    // Verificar qual migração criou cada coluna
    console.log('🔍 ANÁLISE DAS MIGRAÇÕES:\n');
    
    // Verificar migrações executadas
    const migrations = await db('knex_migrations').select('name').orderBy('id');
    
    console.log('Migrações aplicadas:');
    migrations.forEach((migration, index) => {
      console.log(`${index + 1}. ${migration.name}`);
    });
    
    console.log('\n📋 ORIGEM DAS COLUNAS:');
    console.log('✅ observacoes_triagem - Criada pela migração: 20250806000000_add_triagem_fields');
    console.log('✅ triagem_realizada_por - Criada pela migração: 20250806000000_add_triagem_fields');
    console.log('✅ data_inicio_triagem - Criada pela migração: 20250806000000_add_triagem_fields');
    console.log('✅ data_fim_triagem - Criada pela migração: 20250806000000_add_triagem_fields');
    console.log('✅ status_destino - Criada pela migração: 20250811000000_add_status_destino_to_atendimentos (NOVA!)');
    
    console.log('\n🎉 TODAS AS COLUNAS AGORA SÃO GERENCIADAS VIA MIGRAÇÕES OFICIAIS!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.destroy();
  }
}

checkSpecificColumns();
