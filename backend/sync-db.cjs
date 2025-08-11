#!/usr/bin/env node
/**
 * 🚀 SINCRONIZAÇÃO SIMPLES DE BANCO
 * 
 * Use este comando para sincronizar qualquer banco com as migrações mais recentes
 * Funciona tanto local quanto produção
 */

const { execSync } = require('child_process');
const path = require('path');

function showBanner() {
  console.log('🚀 SINCRONIZAÇÃO DE BANCO DE DADOS');
  console.log('==================================');
  console.log('📋 Este comando irá:');
  console.log('   ✅ Conectar com o banco configurado');
  console.log('   ✅ Aplicar todas as migrações pendentes');
  console.log('   ✅ Verificar integridade das colunas');
  console.log('   ✅ Gerar relatório de status');
  console.log('');
}

function getEnvironment() {
  const env = process.env.NODE_ENV || 'development';
  console.log(`🌍 Ambiente detectado: ${env.toUpperCase()}`);
  
  if (env === 'production') {
    console.log('🔗 Conectando com PRODUÇÃO');
  } else {
    console.log('🔗 Conectando com banco LOCAL');
  }
  console.log('');
}

function runMigration() {
  try {
    console.log('⚡ Executando sincronização...\n');
    
    // Executar o script de migração robusta
    const scriptPath = path.join(__dirname, 'migrate-robust.cjs');
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log('✅ Banco atualizado com todas as migrações');
    console.log('✅ Sistema pronto para uso');
    
  } catch (error) {
    console.error('\n' + '='.repeat(50));
    console.error('❌ ERRO NA SINCRONIZAÇÃO');
    console.error('📋 Detalhes do erro:');
    console.error(error.message);
    console.error('\n💡 POSSÍVEIS SOLUÇÕES:');
    console.error('   1. Verificar conexão com banco de dados');
    console.error('   2. Verificar variáveis de ambiente (DATABASE_URL)');
    console.error('   3. Verificar se o banco está rodando');
    process.exit(1);
  }
}

function main() {
  showBanner();
  getEnvironment();
  runMigration();
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = { main };
