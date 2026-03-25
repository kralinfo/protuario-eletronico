import { Pool } from 'pg';
import config from './env.js';

class Database {
  constructor() {
    // Detectar se está rodando no Render ou produção
    const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER || (config.DATABASE_URL && config.DATABASE_URL.includes('render.com'));
    
    // Log da URL para debug (sem mostrar senha)
    if (config.DATABASE_URL) {
      const safeUrl = config.DATABASE_URL.replace(/:([^:@]*@)/, ':***@');
      console.log('🔗 DATABASE_URL configurada:', safeUrl);
    } else {
      console.error('❌ DATABASE_URL não encontrada!');
    }

    // Configuração SSL mais robusta
    let sslConfig = false;
    if (isProduction) {
      sslConfig = {
        rejectUnauthorized: false,
        require: true
      };
      console.log('🔐 SSL habilitado para produção');
    }

    // Configuração do pool otimizada para Render
    const poolConfig = {
      connectionString: config.DATABASE_URL,
      ssl: sslConfig,
      max: isProduction ? 10 : 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: isProduction ? 15000 : 2000, // Timeout maior para Render
      statement_timeout: 30000,
      query_timeout: 30000,
      // Configurações específicas para ambientes em nuvem
      keepAlive: true,
      keepAliveInitialDelayMillis: 0,
    };

    console.log('🔧 Configuração do pool:', {
      ssl: !!poolConfig.ssl,
      max: poolConfig.max,
      connectionTimeout: poolConfig.connectionTimeoutMillis,
      isProduction
    });

    this.pool = new Pool(poolConfig);

    // Event listeners para monitoramento
    this.pool.on('connect', (client) => {
      console.log('🔗 Nova conexão estabelecida com o banco de dados');
    });

    this.pool.on('error', (err, client) => {
      console.error('❌ Erro inesperado na conexão do banco:', err);
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      console.log(`🔍 Query executada em ${duration}ms: ${text.substring(0, 50)}...`);
      return res;
    } catch (error) {
      console.error('❌ Erro na query:', error);
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  async transaction(callback) {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async testConnection() {
    console.log('🧪 Testando conexão com banco de dados...');
    let client;
    
    try {
      // Verificar se DATABASE_URL existe
      if (!config.DATABASE_URL) {
        throw new Error('DATABASE_URL não encontrada nas variáveis de ambiente');
      }

      // Log seguro da URL
      const safeUrl = config.DATABASE_URL.replace(/:([^:@]*@)/, ':***@');
      console.log('📍 Tentando conectar em:', safeUrl);

      // Tentar conectar com timeout
      const connectionPromise = this.getClient();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout na conexão após 15 segundos')), 15000)
      );
      
      client = await Promise.race([connectionPromise, timeoutPromise]);
      console.log('✅ Cliente obtido do pool');
      
      // Testar query simples
      const result = await client.query('SELECT NOW() as current_time, version() as db_version');
      console.log('✅ Conexão com banco de dados testada com sucesso');
      console.log('🕐 Hora do servidor:', result.rows[0].current_time);
      console.log('🗄️ Versão PostgreSQL:', result.rows[0].db_version.substring(0, 50) + '...');
      
      return true;
    } catch (error) {
      console.error('❌ Falha ao testar conexão:', error.message);
      console.error('📋 Stack trace:', error.stack);
      
      // Debug específico para diferentes tipos de erro
      if (error.message.includes('ENOTFOUND')) {
        console.error('🔍 Erro DNS - Verificando:');
        console.error('  - DATABASE_URL:', !!config.DATABASE_URL);
        console.error('  - NODE_ENV:', config.NODE_ENV);
        console.error('  - RENDER:', !!process.env.RENDER);
        
        // Tentar parsear a URL para debug
        try {
          const url = new URL(config.DATABASE_URL);
          console.error('  - Host:', url.hostname);
          console.error('  - Port:', url.port || 'NÃO ESPECIFICADA');
          console.error('  - Database:', url.pathname);
        } catch (urlError) {
          console.error('  - Erro ao parsear URL:', urlError.message);
        }
      }
      
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  async close() {
    await this.pool.end();
    console.log('🔌 Pool de conexões fechado');
  }
}

// Singleton instance
const database = new Database();

export default database;
