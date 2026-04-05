/**
 * AuthWebsocket
 * Middleware de autenticação para WebSocket
 * Valida token JWT antes de permitir conexão
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

class AuthWebsocket {
  static authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || 
                   socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Token não fornecido'));
      }

      // Verificar token
      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      socket.handshake.auth.userId = decoded.id || decoded.sub;
      socket.handshake.auth.userEmail = decoded.email;
      socket.handshake.auth.userRole = decoded.role || 'user';
      socket.handshake.auth.token = token;

      console.log(`✅ WebSocket autenticado para usuário: ${decoded.id}`);
      next();
    } catch (error) {
      console.error('❌ Erro na autenticação WebSocket:', error.message);
      next(new Error('Autenticação falhou'));
    }
  }

  /**
   * Middleware para validar módulo autorizado
   * @param {Array<string>} allowedModules - Módulos permitidos
   */
  static validateModuleAccess(allowedModules = []) {
    return (socket, next) => {
      const module = socket.handshake.query.module;

      if (!module || !allowedModules.includes(module)) {
        return next(new Error(`Acesso negado ao módulo: ${module}`));
      }

      next();
    };
  }
}

export { AuthWebsocket };
