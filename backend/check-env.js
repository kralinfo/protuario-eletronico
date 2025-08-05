import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🔍 Verificação de Variáveis de Ambiente');
console.log('=' .repeat(50));

console.log('📍 NODE_ENV:', process.env.NODE_ENV);
console.log('📍 RENDER:', process.env.RENDER);
console.log('📍 PORT:', process.env.PORT);

// Verificar DATABASE_URL
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl) {
  console.log('✅ DATABASE_URL encontrada');
  const safeUrl = databaseUrl.replace(/:([^:@]*@)/, ':***@');
  console.log('📍 DATABASE_URL (segura):', safeUrl);
  
  // Verificar se tem porta
  if (databaseUrl.includes(':5432')) {
    console.log('✅ Porta 5432 encontrada na URL');
  } else {
    console.log('❌ Porta 5432 NÃO encontrada na URL');
  }
  
  // Tentar parsear
  try {
    const url = new URL(databaseUrl);
    console.log('✅ URL válida');
    console.log('📍 Protocol:', url.protocol);
    console.log('📍 Host:', url.hostname);
    console.log('📍 Port:', url.port || 'NÃO ESPECIFICADA');
    console.log('📍 Database:', url.pathname);
    console.log('📍 Username:', url.username);
  } catch (error) {
    console.log('❌ Erro ao parsear URL:', error.message);
  }
} else {
  console.log('❌ DATABASE_URL NÃO encontrada');
}
