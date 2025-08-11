#!/usr/bin/env node
/**
 * 🚀 FORÇAR MIGRAÇÕES NA PRODUÇÃO
 * 
 * Script direto que força execução de migrações usando Knex CLI
 */

import { execSync } from 'child_process';
import { config } from 'dotenv';

// Configurar variáveis de ambiente
config();

function forceMigrations() {
  console.log('🚀 FORÇANDO MIGRAÇÕES NA PRODUÇÃO');
  console.log('==================================\n');
  
  const environment = process.env.NODE_ENV || 'production';
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 DATABASE_URL: ${process.env.DATABASE_URL ? 'Configurada ✅' : 'Não configurada ❌'}\n`);
  
  try {
    console.log('1️⃣ Executando migrações via Knex CLI...');
    
    // Comando direto do Knex para produção
    const command = `npx knex migrate:latest --env production --knexfile knexfile.cjs`;
    
    console.log(`📋 Executando: ${command}`);
    
    const result = execSync(command, {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    console.log('✅ Migrações executadas com sucesso!');
    console.log('📋 Output:');
    console.log(result);
    
    console.log('\n2️⃣ Verificando resultado...');
    
    // Verificar se as migrações foram aplicadas
    const statusCommand = `npx knex migrate:status --env production --knexfile knexfile.cjs`;
    const statusResult = execSync(statusCommand, {
      stdio: 'pipe',
      encoding: 'utf8',
      cwd: process.cwd()
    });
    
    console.log('📊 Status das migrações:');
    console.log(statusResult);
    
    console.log('\n🎉 PROCESSO CONCLUÍDO!');
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error.message);
    
    if (error.stdout) {
      console.log('📋 Output:', error.stdout);
    }
    
    if (error.stderr) {
      console.error('📋 Erro:', error.stderr);
    }
    
    return false;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const success = forceMigrations();
  process.exit(success ? 0 : 1);
}

export default forceMigrations;
