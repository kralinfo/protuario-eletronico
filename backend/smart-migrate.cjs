#!/usr/bin/env node
const knex = require('knex');
const knexConfig = require('./knexfile.cjs');
require('dotenv').config();

async function smartMigrate() {
  const environment = process.env.NODE_ENV || 'development';
  const config = knexConfig[environment];
  const db = knex(config);
  
  try {
    // Verificar se há migrations pendentes
    const [batch, migrations] = await db.migrate.list();
    
    if (migrations.length === 0) {
      console.log('✅ Nenhuma migration pendente - pulando execução');
      return true;
    }
    
    console.log(`⚡ ${migrations.length} migration(s) pendente(s) - executando...`);
    const [batchNo, migrationNames] = await db.migrate.latest();
    
    if (migrationNames.length > 0) {
      console.log(`✅ ${migrationNames.length} migration(s) executada(s) (batch ${batchNo})`);
      migrationNames.forEach(name => console.log(`  ✓ ${name}`));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro nas migrations:', error.message);
    return false;
  } finally {
    await db.destroy();
  }
}

smartMigrate().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
