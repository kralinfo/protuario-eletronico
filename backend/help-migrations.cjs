#!/usr/bin/env node
/**
 * 📋 GUIA DE COMANDOS PARA MIGRAÇÕES
 */

console.log('🛠️  COMANDOS DISPONÍVEIS PARA MIGRAÇÕES');
console.log('=====================================\n');

console.log('🚀 COMANDOS PRINCIPAIS:');
console.log('   npm run sync        - Sincroniza banco (aplica migrações)');
console.log('   npm run update      - Atualiza banco (aplica migrações)');
console.log('   npm run db:sync     - Sincroniza banco (aplica migrações)');
console.log('');

console.log('🔍 COMANDOS DE DIAGNÓSTICO:');
console.log('   npm run check:local - Verifica colunas no banco local');
console.log('   npm run migrate:dev:status - Status das migrações locais');
console.log('');

console.log('⚙️  COMANDOS AVANÇADOS:');
console.log('   npm run migrate:dev - Aplica migrações no ambiente local');
console.log('   npm run migrate:prod - Aplica migrações na produção');
console.log('   npm run migrate:robust - Executa migração robusta');
console.log('');

console.log('🆕 CRIAR NOVA MIGRAÇÃO:');
console.log('   npx knex migrate:make nome_da_migracao --env development');
console.log('');

console.log('💡 EXEMPLOS DE USO:');
console.log('   # Para sincronizar banco local após mudanças:');
console.log('   npm run sync');
console.log('');
console.log('   # Para verificar se tudo está OK:');
console.log('   npm run check:local');
console.log('');
console.log('   # Para criar nova migração:');
console.log('   npx knex migrate:make add_nova_coluna --env development');
console.log('');

console.log('🌍 AMBIENTES:');
console.log('   Local: Usa configuração development do knexfile.cjs');
console.log('   Produção: Usa configuração production (via NODE_ENV)');
console.log('');

console.log('🎯 COMANDO MAIS SIMPLES PARA O DIA A DIA:');
console.log('   npm run sync  ← Use este para aplicar migrações');
console.log('');
