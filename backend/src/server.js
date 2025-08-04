// Debug: log DATABASE_URL para garantir leitura correta do .env
console.log('🚨 SERVER.JS INICIADO - VERSÃO COM AUTO-MIGRATE 🚨');
console.log('DATABASE_URL em uso:', process.env.DATABASE_URL);
import App from './app.js';

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Criar e iniciar aplicação
const appInstance = new App();
appInstance.start();
