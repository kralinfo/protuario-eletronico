#!/usr/bin/env node

/**
 * Script de utilitários para migrations
 * Uso: npm run migrate [comando]
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const commands = {
  latest: 'npx knex migrate:latest',
  rollback: 'npx knex migrate:rollback',
  status: 'npx knex migrate:status',
  make: 'npx knex migrate:make',
  help: ''
};

async function runCommand(cmd) {
  try {
    console.log(`🚀 Executando: ${cmd}`);
    const { stdout, stderr } = await execAsync(cmd);
    
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    console.log('✅ Comando executado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao executar comando:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
🗃️  Sistema de Migrations - Prontuário Eletrônico

📋 Comandos disponíveis:

  npm run migrate latest     - Executa todas as migrations pendentes
  npm run migrate rollback   - Desfaz a última migration
  npm run migrate status     - Mostra status das migrations
  npm run migrate make <nome> - Cria uma nova migration
  npm run migrate help       - Mostra esta ajuda

📖 Exemplos:

  npm run migrate latest                    # Aplicar todas as migrations
  npm run migrate make add_new_column       # Criar nova migration
  npm run migrate rollback                  # Reverter última migration
  npm run migrate status                    # Ver quais migrations foram aplicadas

🔧 Estrutura de arquivos:

  knexfile.js              - Configuração do banco
  migrations/              - Pasta com as migrations
  ├── 001_create_initial_tables.js
  └── 002_add_unique_sus_constraint.js

💡 Dicas:

  - Sempre teste as migrations em desenvolvimento primeiro
  - Use rollback para reverter mudanças se necessário
  - Mantenha as migrations pequenas e focadas
  - Documente bem as mudanças em cada migration
`);
}

const [,, command, ...args] = process.argv;

switch (command) {
  case 'latest':
    await runCommand(commands.latest);
    break;
    
  case 'rollback':
    await runCommand(commands.rollback);
    break;
    
  case 'status':
    await runCommand(commands.status);
    break;
    
  case 'make':
    if (!args[0]) {
      console.error('❌ Nome da migration é obrigatório');
      console.log('Uso: npm run migrate make <nome_da_migration>');
      process.exit(1);
    }
    await runCommand(`${commands.make} ${args[0]}`);
    break;
    
  case 'help':
  default:
    showHelp();
    break;
}
