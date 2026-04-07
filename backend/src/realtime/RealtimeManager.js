/**
 * RealtimeManager
 * Gerenciador central de WebSocket para comunicação em tempo real
 * 
 * Responsabilidades:
 * - Inicializar Socket.io com configuração segura
 * - Gerenciar conexões por módulo
 * - Implementar padrão Singleton
 * - Isolar lógica de realtime do resto da aplicação
 */

import { Server as SocketIOServer } from 'socket.io';
import { AuthWebsocket } from '../middleware/authWebsocket.js';
import { EventEmitter } from 'events';

class RealtimeManager extends EventEmitter {
  constructor() {
    super();
    this.io = null;
    this.modules = new Map();
    this.connections = new Map(); // socketId -> { userId, module, room }
    this.maxListeners = 20;
  }

  /**
   * Inicializa o Socket.io no servidor HTTP
   * @param {http.Server} server - Servidor HTTP
   * @param {Object} corsOptions - Opções CORS
   */
  initialize(server, corsOptions = {}) {
    if (this.io) {
      console.warn('⚠️  RealtimeManager já foi inicializado');
      return this.io;
    }

    this.io = new SocketIOServer(server, {
      cors: {
        origin: corsOptions.origin || [
          'http://localhost:4200',
          'http://localhost:3000',
          'https://prontuario-eletronico-five.vercel.app',
          /^https:\/\/prontuario-eletronico.*\.vercel\.app$/,
          /^https:\/\/protuario-eletronico.*\.vercel\.app$/
        ],
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Authorization', 'Content-Type']
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      pingInterval: 25000,
      pingTimeout: 20000,
      maxHttpBufferSize: 1e6 // 1MB
    });

    // Middleware de autenticação para WebSocket
    this.io.use(AuthWebsocket.authenticateSocket);

    // Evento de conexão
    this.io.on('connection', (socket) => this._handleConnection(socket));

    console.log('✅ RealtimeManager inicializado com sucesso');
    return this.io;
  }

  /**
   * Manipula nova conexão WebSocket
   * @private
   */
  _handleConnection(socket) {
    const userId = socket.handshake.auth.userId;
    const token = socket.handshake.auth.token;

    console.log(`🔗 Novo cliente conectado: ${socket.id} (User: ${userId})`);

    // Armazenar conexão
    this.connections.set(socket.id, {
      userId,
      modules: new Set(),
      connectedAt: new Date(),
      lastActivity: new Date()
    });

    // Eventos de gerenciamento
    socket.on('join:module', (data) => this._handleJoinModule(socket, data));
    socket.on('leave:module', (data) => this._handleLeaveModule(socket, data));
    socket.on('disconnect', () => this._handleDisconnect(socket));
    socket.on('ping', () => socket.emit('pong'));

    // Ativar listeners de módulos
    this._activateModuleListeners(socket);

    socket.emit('connected', { socketId: socket.id });
  }

  /**
   * Manipula entrada em módulo
   * @private
   */
  _handleJoinModule(socket, { module }) {
    if (!module) return;

    const connection = this.connections.get(socket.id);
    if (!connection) return;

    connection.modules.add(module);

    // Entrar em room específica do módulo
    socket.join(`module:${module}`);

    console.log(`📌 Cliente ${socket.id} entrou no módulo: ${module}`);
    
    // Notificar que o usuário entrou no módulo
    this.io.to(`module:${module}`).emit('user:joined', {
      userId: connection.userId,
      module,
      timestamp: new Date()
    });
  }

  /**
   * Manipula saída de módulo
   * @private
   */
  _handleLeaveModule(socket, { module }) {
    if (!module) return;

    const connection = this.connections.get(socket.id);
    if (!connection) return;

    connection.modules.delete(module);
    socket.leave(`module:${module}`);

    console.log(`📌 Cliente ${socket.id} saiu do módulo: ${module}`);
    
    this.io.to(`module:${module}`).emit('user:left', {
      userId: connection.userId,
      module,
      timestamp: new Date()
    });
  }

  /**
   * Manipula desconexão
   * @private
   */
  _handleDisconnect(socket) {
    const connection = this.connections.get(socket.id);
    
    if (connection) {
      console.log(`🔓 Cliente desconectado: ${socket.id} (User: ${connection.userId})`);
      
      // Notificar desconexão em todos os módulos
      for (const module of connection.modules) {
        this.io.to(`module:${module}`).emit('user:left', {
          userId: connection.userId,
          module,
          timestamp: new Date()
        });
      }
    }

    this.connections.delete(socket.id);
  }

  /**
   * Ativa listeners de módulos para um socket
   * @private
   */
  _activateModuleListeners(socket) {
    // Listeners de eventos serão adicionados conforme módulos são registrados
    for (const [moduleName, handlers] of this.modules) {
      if (handlers.setupSocketListeners) {
        handlers.setupSocketListeners(socket);
      }
    }
  }

  /**
   * Registra um módulo com seus handlers de eventos
   * @param {string} moduleName - Nome do módulo
   * @param {Object} handlers - Handlers de eventos do módulo
   */
  registerModule(moduleName, handlers) {
    if (this.modules.has(moduleName)) {
      console.warn(`⚠️  Módulo '${moduleName}' já foi registrado`);
      return;
    }

    this.modules.set(moduleName, handlers);
    console.log(`✅ Módulo registrado: ${moduleName}`);
  }

  /**
   * Emite evento para um módulo específico (broadcast)
   * @param {string} module - Nome do módulo
   * @param {string} event - Nome do evento
   * @param {Object} data - Dados do evento
   */
  emitToModule(module, event, data) {
    if (!this.io) {
      console.error('❌ Socket.io não foi inicializado');
      return;
    }

    // [REALTIME DEBUG] LOG 6: EMISSÕES WEBSOCKET PARA MÓDULOS
    if (event.includes('patient') && data.patientId) {
      const debugTimestamp6 = new Date().toISOString();
      console.log(`[REALTIME DEBUG] WebSocket.emitToModule() | evento=${event} | módulo=${module} | patientId=${data.patientId} | timestamp=${debugTimestamp6}`);
    }

    this.io.to(`module:${module}`).emit(event, {
      ...data,
      timestamp: new Date(),
      module
    });

    console.log(`📡 Evento '${event}' enviado para módulo '${module}'`);
  }

  /**
   * Emite evento para um usuário específico
   * @param {string} userId - ID do usuário
   * @param {string} event - Nome do evento
   * @param {Object} data - Dados do evento
   */
  emitToUser(userId, event, data) {
    if (!this.io) {
      console.error('❌ Socket.io não foi inicializado');
      return;
    }

    // Encontrar todos os sockets do usuário
    const sockets = Array.from(this.connections.entries())
      .filter(([_, conn]) => conn.userId === userId)
      .map(([socketId, _]) => socketId);

    sockets.forEach(socketId => {
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date()
      });
    });

    console.log(`📡 Evento '${event}' enviado para usuário '${userId}'`);
  }

  /**
   * Emite evento para todos os clientes conectados
   * @param {string} event - Nome do evento
   * @param {Object} data - Dados do evento
   */
  emitToAll(event, data) {
    if (!this.io) {
      console.error('❌ Socket.io não foi inicializado');
      return;
    }

    this.io.emit(event, {
      ...data,
      timestamp: new Date()
    });

    console.log(`📡 Evento '${event}' enviado para todos os clientes`);
  }

  /**
   * Obtém informações de conexão
   * @param {string} socketId - ID do socket
   * @returns {Object} Informações de conexão
   */
  getConnection(socketId) {
    return this.connections.get(socketId);
  }

  /**
   * Obtém total de conexões ativas
   * @returns {number}
   */
  getConnectionsCount() {
    return this.connections.size;
  }

  /**
   * Obtém status do RealtimeManager
   * @returns {Object}
   */
  getStatus() {
    return {
      initialized: this.io !== null,
      connections: this.connections.size,
      modules: Array.from(this.modules.keys()),
      io: this.io ? { status: 'active' } : { status: 'inactive' }
    };
  }
}

// Singleton
const realtimeManager = new RealtimeManager();

export default realtimeManager;
