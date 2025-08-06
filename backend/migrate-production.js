#!/usr/bin/env node
import knex from 'knex';
import knexConfig from './knexfile.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function runMigrations() {
  console.log('🚀 Iniciando execução das migrations...');
  
  // Determinar ambiente
  const environment = process.env.NODE_ENV || 'development';
  console.log(`📍 Ambiente: ${environment}`);
  
  // Configuração do Knex
  const config = knexConfig[environment];
  
  if (!config) {
    console.error(`❌ Configuração não encontrada para ambiente: ${environment}`);
    process.exit(1);
  }
  
  // Log da conexão (sem mostrar senha)
  if (typeof config.connection === 'string') {
    const safeUrl = config.connection.replace(/:([^:@]*@)/, ':***@');
    console.log(`🔗 Conectando: ${safeUrl}`);
  } else {
    console.log(`🔗 Conectando: ${config.connection.host}:${config.connection.port}/${config.connection.database}`);
  }
  
  const db = knex(config);
  
  try {
    // Verificar conexão
    console.log('🧪 Testando conexão...');
    await db.raw('SELECT NOW()');
    console.log('✅ Conexão estabelecida');
    
    // Verificar migrations pendentes
    console.log('🔍 Verificando migrations pendentes...');
    const [batch, migrations] = await db.migrate.list();
    
    if (migrations.length === 0) {
      console.log('✅ Todas as migrations já foram executadas');
    } else {
      console.log(`📋 ${migrations.length} migration(s) pendente(s):`);
      migrations.forEach(migration => {
        console.log(`  - ${migration}`);
      });
      
      // Executar migrations
      console.log('⚡ Executando migrations...');
      const [batchNo, migrationNames] = await db.migrate.latest();
      
      if (migrationNames.length === 0) {
        console.log('✅ Nenhuma migration nova para executar');
      } else {
        console.log(`✅ ${migrationNames.length} migration(s) executada(s) com sucesso (batch ${batchNo}):`);
        migrationNames.forEach(name => {
          console.log(`  ✓ ${name}`);
        });
      }
    }
    
    console.log('🎉 Migrations concluídas com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante as migrations:', error.message);
    console.error('📋 Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await db.destroy();
    console.log('🔌 Conexão fechada');
  }
}

// Executar
runMigrations();
