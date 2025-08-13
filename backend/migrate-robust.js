#!/usr/bin/env node
/**
 * 🚀 SCRIPT DE MIGRAÇÃO ROBUSTA PARA PRODUÇÃO (ES MODULE)
 * 
 * Versão ES module compatível com package.json type: "module"
 */

import knex from 'knex';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Configurar dotenv para ES modules
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadKnexConfig() {
  const configPath = join(__dirname, 'knexfile.cjs');
  // Importar arquivo CommonJS em ES module
  const { default: knexConfig } = await import(configPath);
  return knexConfig;
}

async function robustMigration() {
  console.log('🚀 MIGRAÇÃO ROBUSTA - INICIANDO PROCESSO (ES MODULE)');
  console.log('=====================================================\n');
  
  const environment = process.env.NODE_ENV || 'production';
  
  try {
    const knexConfig = await loadKnexConfig();
    const config = knexConfig[environment];
    
    console.log(`🌍 Environment: ${environment}`);
    console.log(`🔗 Database: ${environment === 'production' ? 'Produção (via DATABASE_URL)' : 'Local (PostgreSQL)'}\n`);
    
    const db = knex(config);
    
    try {
      // ===== ETAPA 1: TESTE DE CONEXÃO =====
      console.log('1️⃣ TESTANDO CONEXÃO COM BANCO...');
      const timeResult = await db.raw('SELECT NOW() as current_time');
      console.log(`✅ Conectado com sucesso - ${timeResult.rows[0].current_time}\n`);
      
      // ===== ETAPA 2: INICIALIZAR SISTEMA DE MIGRAÇÕES =====
      console.log('2️⃣ INICIALIZANDO SISTEMA DE MIGRAÇÕES...');
      const migrationTableExists = await db.schema.hasTable('knex_migrations');
      
      if (!migrationTableExists) {
        console.log('🔧 Criando tabela knex_migrations...');
        await db.migrate.latest();
        console.log('✅ Sistema de migrations inicializado');
      } else {
        console.log('✅ Sistema de migrations já existe');
      }
      console.log('');
      
      // ===== ETAPA 3: VERIFICAR MIGRAÇÕES PENDENTES =====
      console.log('3️⃣ VERIFICANDO MIGRAÇÕES PENDENTES...');
      const [batchNo, log] = await db.migrate.latest();
      
      if (log.length === 0) {
        console.log('✅ Nenhuma migração pendente - banco está atualizado');
      } else {
        console.log(`✅ ${log.length} migrações aplicadas no batch ${batchNo}:`);
        log.forEach((migration, index) => {
          console.log(`   ${index + 1}. ${migration}`);
        });
      }
      console.log('');
      
      // ===== ETAPA 4: VALIDAR ESTRUTURA DA TABELA =====
      console.log('4️⃣ VALIDANDO ESTRUTURA DA TABELA ATENDIMENTOS...');
      
      const columns = await db.raw(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'atendimentos' 
        ORDER BY ordinal_position
      `);
      
      console.log(`📊 Total de colunas encontradas: ${columns.rows.length}`);
      
      // Lista das colunas críticas que devem existir
      const expectedColumns = [
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
      
      console.log('\n🔍 VERIFICANDO COLUNAS CRÍTICAS DE TRIAGEM:');
      let missingColumns = [];
      let presentColumns = [];
      
      expectedColumns.forEach(expectedCol => {
        const exists = columns.rows.find(row => row.column_name === expectedCol);
        if (exists) {
          presentColumns.push(expectedCol);
          console.log(`✅ ${expectedCol} (${exists.data_type})`);
        } else {
          missingColumns.push(expectedCol);
          console.log(`❌ ${expectedCol} - FALTANDO!`);
        }
      });
      
      // ===== ETAPA 5: RELATÓRIO FINAL =====
      console.log('\n5️⃣ RELATÓRIO FINAL');
      console.log('===================');
      console.log(`✅ Colunas presentes: ${presentColumns.length}/${expectedColumns.length}`);
      console.log(`❌ Colunas faltando: ${missingColumns.length}`);
      
      if (missingColumns.length > 0) {
        console.log('\n🚨 COLUNAS FALTANDO:');
        missingColumns.forEach(col => console.log(`   - ${col}`));
        console.log('\n⚠️  ATENÇÃO: Migrações não foram aplicadas corretamente!');
        return false;
      }
      
      console.log('\n🎉 SUCESSO! Todas as colunas estão presentes.');
      console.log('✅ Banco de dados está sincronizado corretamente.');
      
      return true;
      
    } finally {
      await db.destroy();
    }
    
  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO:', error.message);
    console.error('\n🔧 DEBUG INFO:');
    console.error(`   Environment: ${environment}`);
    console.error(`   Error Stack: ${error.stack}`);
    return false;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  robustMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Erro fatal:', error);
      process.exit(1);
    });
}

export default robustMigration;
