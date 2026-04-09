import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http';

// Configurações
import { config } from './config/env.js';
import { validateRequiredEnvVars } from './config/envValidation.js';
import corsOptions from './config/cors.js';
import database from './config/database.js';

// Middleware
import { 
  protectDatabase, 
  protectSQLQueries, 
  auditLog, 
  rateLimit, 
  securityHeaders 
} from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Realtime
import realtimeManager from './realtime/RealtimeManager.js';
import TriagemRealtimeModule from './realtime/modules/TriagemRealtimeModule.js';
import AmbulatoriRealtimeModule from './realtime/modules/AmbulatoriRealtimeModule.js';
import FilaRealtimeModule from './realtime/modules/FilaRealtimeModule.js';

// Rotas
import apiRoutes from './routes/index.js';
import atendimentosRouter from './routes/atendimentos.js';
import triagemRouter from './routes/triagem.js';
import historicoRouter from './routes/historico.routes.js';
import dashboardRouter from './routes/dashboard.js';
import filaRouter from './routes/fila.js';

class App {
  constructor() {
    this.app = express();
    this.app.disable('etag'); // Desabilita ETag para evitar 304
    this.port = config.PORT; // Usar porta do .env para compatibilidade com produção
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Segurança
    this.app.use(helmet({
      contentSecurityPolicy: false, // Desabilitar CSP para permitir o frontend
      crossOriginEmbedderPolicy: false
    }));
    
    // Compressão
    this.app.use(compression());
    
    // CORS
    this.app.use(cors(corsOptions));
    this.app.options('*', cors(corsOptions));
    
  // Rate limiting global
  this.app.use(rateLimit(15 * 60 * 1000, 300)); // 300 req por 15 min
    
    // Headers de segurança
    this.app.use(securityHeaders);
    
    // Parse JSON
    this.app.use(express.json({ 
      limit: config.MAX_FILE_SIZE,
      strict: true 
    }));
    
    // Parse URL encoded
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.MAX_FILE_SIZE 
    }));
    
    // Middleware de proteção de banco
    this.app.use(protectDatabase);
    this.app.use(protectSQLQueries);
    
    // Auditoria básica
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
      next();
    });
  }

  setupRoutes() {
    // Rota raiz
    this.app.get('/', (req, res) => {
      res.json({
        status: 'SUCCESS',
        message: 'Prontuário Eletrônico API v2.0',
        version: '2.0.0',
        environment: config.NODE_ENV,
        timestamp: new Date().toISOString(),
        endpoints: {
          api: '/api',
          health: '/api/health',
          docs: '/api/info'
        }
      });
    });

    // Rotas da API
    this.app.use('/api', apiRoutes);
    this.app.use('/api/atendimentos', atendimentosRouter);
    this.app.use('/api/triagem', triagemRouter);
    this.app.use('/api', historicoRouter);
    this.app.use('/api/dashboard', dashboardRouter);
    this.app.use('/api/fila', filaRouter);
  }

  setupErrorHandling() {
    // 404 Handler
    this.app.use(notFoundHandler);
    
    // Error Handler
    this.app.use(errorHandler);
  }

  async start() {
    try {
      // Validar variaveis de ambiente obrigatorias (LGPD - seguranca)
      if (!validateRequiredEnvVars()) {
        process.exit(1);
      }

      // Testar conexão com banco com retries e backoff
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const maxAttempts = process.env.DB_CONNECT_RETRIES ? Number(process.env.DB_CONNECT_RETRIES) : 8;
      let attempt = 0;
      let dbConnected = false;

      while (attempt < maxAttempts && !dbConnected) {
        attempt += 1;
        console.log(`⏳ Tentativa ${attempt}/${maxAttempts} de conectar ao banco...`);
        try {
          dbConnected = await database.testConnection();
        } catch (e) {
          dbConnected = false;
        }

        if (!dbConnected) {
          const delayMs = Math.min(15000, attempt * 1000);
          console.log(`🔁 Falha ao conectar (tentativa ${attempt}). Aguardando ${delayMs}ms antes da próxima tentativa...`);
          await wait(delayMs);
        }
      }

      if (!dbConnected) {
        throw new Error('Falha na conexão com banco de dados');
      }

      // Iniciar servidor
      const server = http.createServer(this.app);

      // Inicializar RealtimeManager com servidor HTTP
      realtimeManager.initialize(server, corsOptions);

      // Inicializar módulos de realtime
      TriagemRealtimeModule.initialize();
      AmbulatoriRealtimeModule.initialize();
      FilaRealtimeModule.initialize();

      const httpServer = server.listen(this.port, () => {
        console.log('🚀 ================================');
        console.log('🚀 Prontuário Eletrônico API v2.0');
        console.log('🚀 ================================');
        console.log(`🚀 Servidor rodando na porta ${this.port}`);
        console.log(`🚀 Ambiente: ${config.NODE_ENV}`);
        console.log(`🚀 URL: http://localhost:${this.port}`);
        console.log(`🚀 Health: http://localhost:${this.port}/api/health`);
        console.log(`🚀 Docs: http://localhost:${config.PORT}/api/info`);
        console.log(`🚀 WebSocket: ws://localhost:${this.port}`);
        console.log('🚀 ================================');
      });

      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('📋 SIGTERM recebido, fechando servidor...');
        httpServer.close(async () => {
          console.log('🔌 Servidor HTTP fechado');
          await database.close();
          process.exit(0);
        });
      });

      process.on('SIGINT', () => {
        console.log('📋 SIGINT recebido, fechando servidor...');
        httpServer.close(async () => {
          console.log('🔌 Servidor HTTP fechado');
          await database.close();
          process.exit(0);
        });
      });

      return httpServer;
    } catch (error) {
      console.error('❌ Erro ao iniciar aplicação:', error);
      process.exit(1);
    }
  }

  getApp() {
    return this.app;
  }
}

export default App;
