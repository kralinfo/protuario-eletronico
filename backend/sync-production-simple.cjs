const knex = require('knex');
const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando sincronização do banco de PRODUÇÃO...');

// Carregar variáveis do arquivo .env.production
const envPath = path.join(__dirname, '.env.production');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=');
      process.env[key] = value;
    }
  });
  
  console.log('✅ Variáveis de ambiente carregadas do .env.production');
} else {
  console.log('⚠️ Arquivo .env.production não encontrado');
}

// Configuração específica para produção
const productionConfig = {
  client: 'postgresql',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  }
};

const db = knex(productionConfig);

async function syncProductionColumns() {
  try {
    console.log('🔍 Conectando ao banco de produção...');
    console.log('🔧 URL do banco:', process.env.DATABASE_URL ? 'Configurada ✅' : 'NÃO CONFIGURADA ❌');
    
    // Teste de conexão
    await db.raw('SELECT 1');
    console.log('✅ Conexão com banco de produção estabelecida!');
    
    // Verificar se a tabela existe
    const tableExists = await db.schema.hasTable('atendimentos');
    if (!tableExists) {
      console.log('❌ Tabela "atendimentos" não existe no banco de produção.');
      return;
    }

    console.log('✅ Tabela "atendimentos" encontrada no banco de produção.');

    // Obter colunas existentes
    const columns = await db('information_schema.columns')
      .select('column_name', 'data_type', 'is_nullable')
      .where('table_name', 'atendimentos')
      .orderBy('ordinal_position');

    console.log('📋 Colunas existentes na tabela atendimentos (PRODUÇÃO):');
    columns.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });
    console.log(`\n📊 Total de colunas existentes: ${columns.length}`);

    // Colunas que devem existir (baseadas no seu banco local)
    const expectedColumns = [
      { name: 'classificacao_risco', type: 'varchar', nullable: true, description: 'Classificação de risco da triagem' },
      { name: 'prioridade', type: 'integer', nullable: true, description: 'Prioridade numérica da triagem' },
      { name: 'status_destino', type: 'varchar', nullable: true, description: 'Status de destino após triagem' },
      { name: 'queixa_principal', type: 'text', nullable: true, description: 'Queixa principal do paciente' },
      { name: 'historia_atual', type: 'text', nullable: true, description: 'História atual da doença' },
      { name: 'pressao_arterial', type: 'varchar', nullable: true, description: 'Pressão arterial do paciente' },
      { name: 'temperatura', type: 'decimal', nullable: true, description: 'Temperatura corporal' },
      { name: 'frequencia_cardiaca', type: 'integer', nullable: true, description: 'Frequência cardíaca' },
      { name: 'frequencia_respiratoria', type: 'integer', nullable: true, description: 'Frequência respiratória' },
      { name: 'saturacao_oxigenio', type: 'integer', nullable: true, description: 'Saturação de oxigênio' },
      { name: 'peso', type: 'decimal', nullable: true, description: 'Peso do paciente' },
      { name: 'altura', type: 'decimal', nullable: true, description: 'Altura do paciente' },
      { name: 'alergias', type: 'text', nullable: true, description: 'Alergias conhecidas' },
      { name: 'medicamentos_uso', type: 'text', nullable: true, description: 'Medicamentos em uso' },
      { name: 'observacoes_triagem', type: 'text', nullable: true, description: 'Observações da triagem' },
      { name: 'triagem_realizada_por', type: 'integer', nullable: true, description: 'ID do usuário que realizou a triagem' },
      { name: 'data_inicio_triagem', type: 'timestamp', nullable: true, description: 'Data e hora de início da triagem' },
      { name: 'data_fim_triagem', type: 'timestamp', nullable: true, description: 'Data e hora de fim da triagem' }
    ];

    // Encontrar colunas que precisam ser adicionadas
    const existingColumnNames = columns.map(col => col.column_name);
    const missingColumns = expectedColumns.filter(col => !existingColumnNames.includes(col.name));

    if (missingColumns.length === 0) {
      console.log('✅ Todas as colunas necessárias já existem na tabela de PRODUÇÃO.');
      console.log('🎉 Banco de produção sincronizado com sucesso!');
      return;
    }

    console.log(`\n🔧 Encontradas ${missingColumns.length} colunas faltantes na PRODUÇÃO:`);
    missingColumns.forEach(col => {
      console.log(`  ➕ ${col.name} (${col.type}) - ${col.description}`);
    });

    console.log('\n⚠️  ATENÇÃO: Vou adicionar as colunas faltantes no banco de PRODUÇÃO!');
    console.log('⏳ Aguarde...\n');

    // Adicionar colunas faltantes uma por uma (mais seguro)
    for (const col of missingColumns) {
      try {
        console.log(`🔨 Adicionando coluna: ${col.name} (${col.type})`);
        
        await db.schema.alterTable('atendimentos', table => {
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
        
        console.log(`✅ Coluna ${col.name} adicionada com sucesso!`);
        
      } catch (columnError) {
        console.error(`❌ Erro ao adicionar coluna ${col.name}:`, columnError.message);
        throw columnError; // Para interromper se houver erro
      }
    }

    // Verificar novamente após as alterações
    console.log('\n🔍 Verificando estrutura final da tabela...');
    const updatedColumns = await db('information_schema.columns')
      .select('column_name')
      .where('table_name', 'atendimentos')
      .orderBy('ordinal_position');

    console.log(`📊 Total de colunas após sincronização: ${updatedColumns.length}`);
    console.log('🎉 SUCESSO! Banco de produção sincronizado com todas as colunas necessárias!');
    
    // Log das novas colunas adicionadas
    console.log('\n📝 Resumo das alterações:');
    missingColumns.forEach(col => {
      console.log(`  ✅ ${col.name} - ${col.description}`);
    });

  } catch (error) {
    console.error('❌ ERRO na sincronização do banco de produção:', error);
    console.error('💡 Detalhes do erro:', error.message);
    
    if (error.code) {
      console.error('📋 Código do erro:', error.code);
    }
    
    throw error;
  } finally {
    console.log('\n🔌 Fechando conexão com o banco...');
    await db.destroy();
  }
}

// Executar imediatamente
syncProductionColumns().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

module.exports = syncProductionColumns;
