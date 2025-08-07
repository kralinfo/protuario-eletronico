#!/usr/bin/env node

/**
 * Script para testar se o ambiente está configurado corretamente
 * Execute: node testar-setup.js
 */

import pkg from 'pg';
import { exec } from 'child_process';
import { promisify } from 'util';

const { Pool } = pkg;
const execAsync = promisify(exec);

console.log('🧪 === TESTE DE SETUP ===\n');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'prontuario',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function testarConexao() {
  try {
    console.log('🔌 Testando conexão com banco...');
    await pool.query('SELECT 1');
    console.log('✅ Conexão com banco OK\n');
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão:', error.message);
    console.log('⚠️  Verifique se o PostgreSQL está rodando\n');
    return false;
  }
}

async function testarTabelaAtendimentos() {
  try {
    console.log('📋 Testando tabela atendimentos...');
    await pool.query('SELECT * FROM atendimentos LIMIT 1');
    console.log('✅ Tabela atendimentos existe\n');
    return true;
  } catch (error) {
    console.error('❌ Erro na tabela atendimentos:', error.message);
    console.log('⚠️  Execute: npm run update-db\n');
    return false;
  }
}

async function testarColunasTriagem() {
  try {
    console.log('🩺 Testando colunas de triagem...');
    const query = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'atendimentos' 
      AND column_name IN (
        'classificacao_risco', 'prioridade', 'pressao_arterial'
      )
    `;
    const result = await pool.query(query);
    
    if (result.rows.length >= 3) {
      console.log('✅ Colunas de triagem existem\n');
      return true;
    } else {
      console.log('❌ Colunas de triagem não encontradas');
      console.log('⚠️  Execute: npm run update-db\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar colunas:', error.message);
    return false;
  }
}

async function testarMigrações() {
  try {
    console.log('🔄 Testando sistema de migrações...');
    const { stdout } = await execAsync('npm run check-migrations');
    
    if (stdout.includes('up to date') || stdout.includes('Completed')) {
      console.log('✅ Sistema de migrações OK\n');
      return true;
    } else {
      console.log('⚠️  Migrações pendentes encontradas');
      console.log('Execute: npm run update-db\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro no sistema de migrações:', error.message);
    return false;
  }
}

async function main() {
  let testes = 0;
  let sucessos = 0;

  // Teste 1: Conexão
  testes++;
  if (await testarConexao()) sucessos++;

  // Teste 2: Tabela atendimentos
  testes++;
  if (await testarTabelaAtendimentos()) sucessos++;

  // Teste 3: Colunas de triagem
  testes++;
  if (await testarColunasTriagem()) sucessos++;

  // Teste 4: Sistema de migrações
  testes++;
  if (await testarMigrações()) sucessos++;

  console.log('📊 === RESULTADO DOS TESTES ===');
  console.log(`Sucessos: ${sucessos}/${testes}`);
  
  if (sucessos === testes) {
    console.log('🎉 Todos os testes passaram!');
    console.log('🚀 Ambiente configurado corretamente!');
  } else {
    console.log('⚠️  Alguns testes falharam.');
    console.log('💡 Execute: npm run update-db');
  }

  await pool.end();
}

main().catch(error => {
  console.error('❌ Erro fatal nos testes:', error.message);
  pool.end();
});
