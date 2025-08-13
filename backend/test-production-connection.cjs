const knex = require('knex');
const fs = require('fs');
const path = require('path');

console.log('🚀 Teste de conexão com banco de PRODUÇÃO...');

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
}

// Configuração para produção (usando config igual ao knexfile.cjs)
const productionConfig = {
  client: 'postgresql',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  },
  pool: {
    min: 1,
    max: 3
  },
  acquireConnectionTimeout: 60000,
  timeout: 60000
};

console.log('🔧 Configuração:', {
  client: productionConfig.client,
  hasConnectionString: !!process.env.DATABASE_URL,
  ssl: productionConfig.connection.ssl
});

const db = knex(productionConfig);

async function testConnection() {
  try {
    console.log('🔍 Testando conexão...');
    
    // Teste simples de conexão
    const result = await db.raw('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Conectado com sucesso!');
    console.log('⏰ Hora do servidor:', result.rows[0].current_time);
    console.log('🐘 Versão PostgreSQL:', result.rows[0].pg_version.split(' ')[0]);
    
    // Verificar se tabela atendimentos existe
    const tableExists = await db.schema.hasTable('atendimentos');
    console.log('📋 Tabela "atendimentos" existe:', tableExists ? '✅' : '❌');
    
    if (tableExists) {
      // Contar registros
      const count = await db('atendimentos').count('* as total');
      console.log('📊 Total de registros na tabela atendimentos:', count[0].total);
      
      // Verificar algumas colunas específicas
      const columns = await db('information_schema.columns')
        .select('column_name')
        .where('table_name', 'atendimentos')
        .orderBy('ordinal_position');
      
      console.log(`📝 Total de colunas na tabela: ${columns.length}`);
      
      // Verificar se algumas colunas de triagem existem
      const triagemColumns = ['classificacao_risco', 'prioridade', 'status_destino', 'queixa_principal'];
      const existingColumns = columns.map(c => c.column_name);
      
      console.log('\n🔍 Verificando colunas de triagem:');
      triagemColumns.forEach(col => {
        const exists = existingColumns.includes(col);
        console.log(`  - ${col}: ${exists ? '✅' : '❌'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.error('📋 Código do erro:', error.code);
    throw error;
  } finally {
    console.log('🔌 Fechando conexão...');
    await db.destroy();
  }
}

// Executar com timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout: conexão demorou mais de 30 segundos')), 30000);
});

Promise.race([testConnection(), timeoutPromise])
  .then(() => {
    console.log('🎉 Teste concluído com sucesso!');
  })
  .catch(error => {
    console.error('❌ Erro no teste:', error.message);
    process.exit(1);
  });
