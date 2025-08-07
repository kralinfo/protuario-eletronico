#!/usr/bin/env node

/**
 * Script de setup para novos desenvolvedores
 * Execute: node setup-dev.js
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 === SETUP PARA DESENVOLVEDOR ===\n');

async function executarComando(comando, descricao) {
  try {
    console.log(`📋 ${descricao}...`);
    const { stdout, stderr } = await execAsync(comando);
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) console.error(stderr);
    
    console.log(`✅ ${descricao} concluído!\n`);
  } catch (error) {
    console.error(`❌ Erro em: ${descricao}`);
    console.error(error.message);
    console.log('');
  }
}

async function setup() {
  try {
    console.log('🏥 Configurando ambiente de desenvolvimento do Prontuário Eletrônico\n');
    
    // 1. Verificar Node.js
    await executarComando('node --version', 'Verificando versão do Node.js');
    
    // 2. Instalar dependências
    await executarComando('npm install', 'Instalando dependências');
    
    // 3. Verificar status das migrações
    console.log('🔍 Verificando status do banco de dados...');
    try {
      const { stdout } = await execAsync('npm run check-migrations');
      console.log(stdout);
      
      if (stdout.includes('Pending')) {
        console.log('📝 Migrações pendentes encontradas. Aplicando...');
        await executarComando('npm run update-db', 'Aplicando migrações');
      } else {
        console.log('✅ Banco de dados já está atualizado!');
      }
    } catch (error) {
      console.log('⚠️  Não foi possível verificar migrações. Tentando aplicar...');
      await executarComando('npm run update-db', 'Aplicando migrações');
    }
    
    // 4. Testar conexão
    console.log('🔌 Testando conexão com banco...');
    try {
      await executarComando('node -e "import pkg from \'pg\'; const { Pool } = pkg; const pool = new Pool({ host: \'localhost\', port: 5432, database: \'prontuario\', user: \'postgres\', password: \'postgres\' }); pool.query(\'SELECT 1\').then(() => { console.log(\'✅ Conexão OK\'); pool.end(); }).catch(e => { console.log(\'❌ Erro:\', e.message); pool.end(); });"', 'Testando conexão');
    } catch (error) {
      console.log('❌ Erro na conexão. Verifique se o PostgreSQL está rodando.');
    }
    
    console.log('🎉 Setup concluído!');
    console.log('\n📋 Próximos passos:');
    console.log('1. npm run dev - Para iniciar em modo desenvolvimento');
    console.log('2. npm start - Para iniciar em modo produção');
    console.log('\n📖 Leia o arquivo COMO_ATUALIZAR_BANCO.md para mais informações');
    
  } catch (error) {
    console.error('❌ Erro no setup:', error.message);
  }
}

setup();
