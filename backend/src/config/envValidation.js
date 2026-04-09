/**
 * Validação de variáveis de ambiente essenciais para LGPD.
 * O servidor não deve iniciar sem estas configurações.
 */

export function validateRequiredEnvVars() {
  const required = [
    { key: 'DATABASE_URL', description: 'URL de conexão com o banco de dados' },
    { key: 'JWT_SECRET', description: 'Chave secreta para assinatura de tokens JWT' }
  ];

  const optional = [
    { key: 'EMAIL_USER', description: 'Usuário de email para envio de notificações' },
    { key: 'EMAIL_PASS', description: 'Senha de app do Gmail para envio de emails' },
    { key: 'EMAIL_FROM', description: 'Remetente padrão dos emails' }
  ];

  const missing = [];
  const present = [];

  required.forEach(({ key, description }) => {
    if (!process.env[key]) {
      missing.push({ key, description, critical: true });
    } else {
      present.push({ key, status: 'OK' });
    }
  });

  // Validar JWT_SECRET mínimo
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    missing.push({
      key: 'JWT_SECRET',
      description: 'JWT_SECRET deve ter pelo menos 32 caracteres para segurança adequada',
      critical: true
    });
  }

  // Validar que DATABASE_URL não seja placeholder
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('your_')) {
    missing.push({
      key: 'DATABASE_URL',
      description: 'DATABASE_URL parece ser um placeholder. Configure com o valor real.',
      critical: true
    });
  }

  if (missing.length > 0) {
    console.error('\n❌ VARIAVEIS DE AMBIENTE OBRIGATORIAS NAO CONFIGURADAS:\n');
    missing.forEach(({ key, description }) => {
      console.error(`  - ${key}: ${description}`);
    });
    console.error('\n📋 Configure estas variaveis no painel do Render (Settings -> Environment Variables)');
    console.error('   ou crie um arquivo .env para desenvolvimento local.\n');
    return false;
  }

  if (present.length > 0) {
    console.log('✅ Validacao de variaveis de ambiente: OK');
    present.forEach(({ key }) => {
      console.log(`  ✅ ${key}`);
    });
  }

  return true;
}

export default validateRequiredEnvVars;
