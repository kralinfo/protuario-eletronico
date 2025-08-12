const knex = require('knex');
const knexConfig = require('./knexfile.cjs');

// Configuração do ambiente (development ou production)
const environment = process.env.NODE_ENV || 'development';
const db = knex(knexConfig[environment]);

async function syncColumns() {
  try {
    console.log('🔍 Verificando diferenças entre bancos local e produção...');
    
    // Verificar se a tabela existe
    const tableExists = await db.schema.hasTable('atendimentos');
    if (!tableExists) {
      console.log('❌ Tabela "atendimentos" não existe.');
      return;
    }

    // Obter colunas existentes
    const columns = await db('information_schema.columns')
      .select('column_name', 'data_type', 'is_nullable')
      .where('table_name', 'atendimentos')
      .orderBy('ordinal_position');

    console.log('📋 Colunas existentes na tabela atendimentos:');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    // Colunas que devem existir (baseadas no seu banco local)
    const expectedColumns = [
      { name: 'classificacao_risco', type: 'varchar', nullable: true },
      { name: 'prioridade', type: 'integer', nullable: true },
      { name: 'status_destino', type: 'varchar', nullable: true },
      { name: 'queixa_principal', type: 'text', nullable: true },
      { name: 'historia_atual', type: 'text', nullable: true },
      { name: 'pressao_arterial', type: 'varchar', nullable: true },
      { name: 'temperatura', type: 'decimal', nullable: true },
      { name: 'frequencia_cardiaca', type: 'integer', nullable: true },
      { name: 'frequencia_respiratoria', type: 'integer', nullable: true },
      { name: 'saturacao_oxigenio', type: 'integer', nullable: true },
      { name: 'peso', type: 'decimal', nullable: true },
      { name: 'altura', type: 'decimal', nullable: true },
      { name: 'alergias', type: 'text', nullable: true },
      { name: 'medicamentos_uso', type: 'text', nullable: true },
      { name: 'observacoes_triagem', type: 'text', nullable: true },
      { name: 'triagem_realizada_por', type: 'integer', nullable: true },
      { name: 'data_inicio_triagem', type: 'timestamp', nullable: true },
      { name: 'data_fim_triagem', type: 'timestamp', nullable: true }
    ];

    // Encontrar colunas que precisam ser adicionadas
    const existingColumnNames = columns.map(col => col.column_name);
    const missingColumns = expectedColumns.filter(col => !existingColumnNames.includes(col.name));

    if (missingColumns.length === 0) {
      console.log('✅ Todas as colunas já existem na tabela.');
      return;
    }

    console.log(`🔧 Adicionando ${missingColumns.length} colunas faltantes...`);

    // Adicionar colunas faltantes
    await db.schema.alterTable('atendimentos', table => {
      missingColumns.forEach(col => {
        console.log(`  ➕ Adicionando coluna: ${col.name} (${col.type})`);
        
        switch (col.type) {
          case 'varchar':
            table.string(col.name).nullable();
            break;
          case 'text':
            table.text(col.name).nullable();
            break;
          case 'integer':
            table.integer(col.name).nullable();
            break;
          case 'decimal':
            table.decimal(col.name, 10, 2).nullable();
            break;
          case 'timestamp':
            table.timestamp(col.name).nullable();
            break;
          default:
            table.string(col.name).nullable();
        }
      });
    });

    console.log('✅ Colunas adicionadas com sucesso!');
    
    // Verificar novamente
    const updatedColumns = await db('information_schema.columns')
      .select('column_name')
      .where('table_name', 'atendimentos')
      .orderBy('ordinal_position');

    console.log('📋 Total de colunas após atualização:', updatedColumns.length);

  } catch (error) {
    console.error('❌ Erro ao sincronizar colunas:', error);
  } finally {
    await db.destroy();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  syncColumns();
}

module.exports = syncColumns;
