const knex = require('knex');
const config = require('./knexfile.cjs');

async function checkMissingColumns() {
  const db = knex(config.development);
  
  try {
    console.log('🔍 Verificando colunas que você disse estar faltando...\n');
    
    // Colunas que você mencionou como faltando
    const suspectedMissingColumns = [
      'prioridade',
      'queixa_principal',
      'historia_atual',
      'alergias',
      'medicamentos_uso'
    ];
    
    const result = await db.raw(`
      SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN ('prioridade', 'queixa_principal', 'historia_atual', 'alergias', 'medicamentos_uso')
      ORDER BY column_name
    `);
    
    console.log('📊 VERIFICAÇÃO DAS COLUNAS "FALTANTES":\n');
    
    suspectedMissingColumns.forEach(columnName => {
      const columnInfo = result.rows.find(row => row.column_name === columnName);
      
      if (columnInfo) {
        console.log(`✅ ${columnName} - EXISTE!`);
        console.log(`   Tipo: ${columnInfo.data_type}`);
        if (columnInfo.character_maximum_length) {
          console.log(`   Tamanho: ${columnInfo.character_maximum_length}`);
        }
        console.log(`   Nullable: ${columnInfo.is_nullable}`);
        console.log(`   Default: ${columnInfo.column_default || 'null'}`);
        console.log('');
      } else {
        console.log(`❌ ${columnName} - REALMENTE NÃO EXISTE\n`);
      }
    });
    
    // Vamos verificar TODAS as colunas da tabela para ter certeza
    console.log('\n📋 TODAS AS COLUNAS DA TABELA ATENDIMENTOS:');
    console.log('================================================\n');
    
    const allColumns = await db.raw(`
      SELECT column_name, data_type, ordinal_position
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      ORDER BY ordinal_position
    `);
    
    allColumns.rows.forEach((col, index) => {
      const isMentioned = suspectedMissingColumns.includes(col.column_name);
      const marker = isMentioned ? '🔍' : '  ';
      console.log(`${marker} ${index + 1}. ${col.column_name} (${col.data_type})`);
    });
    
    console.log(`\n📊 Total de colunas: ${allColumns.rows.length}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await db.destroy();
  }
}

checkMissingColumns();
