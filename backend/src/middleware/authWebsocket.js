/**
 * AuthWebsocket
 * Middleware de autenticação para WebSocket
 * Valida token JWT antes de permitir conexao (LGPD - seguranca)
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import TokenBlacklistService from '../services/tokenBlacklistService.js';

class AuthWebsocket {
  static async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token ||
                   socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Token nao fornecido'));
      }

      // Decodificar para checar blacklist
      const decoded = jwt.decode(token);
      if (!decoded) {
        return next(new Error('Token invalido'));
      }

      // Verificar blacklist (LGPD - tokens revogados)
      const jti = decoded.jti;
      if (jti && await TokenBlacklistService.isBlacklisted(jti)) {
        return next(new Error('Token revogado. Faca login novamente.'));
      }

      // Verificar assinatura e expiracao
      const verified = jwt.verify(token, config.JWT_SECRET);

      socket.handshake.auth.userId = verified.id || verified.sub;
      socket.handshake.auth.userEmail = verified.email;
      // Usar nivel real do token, nao hardcoded (LGPD - controle de acesso)
      socket.handshake.auth.userRole = verified.nivel || 'visualizador';
      socket.handshake.auth.userModulos = verified.modulos || [];
      socket.handshake.auth.token = token;

      console.log(`✅ WebSocket autenticado: ${verified.id} (nivel: ${verified.nivel})`);
      next();
    } catch (error) {
      console.error('❌ Erro na autenticacao WebSocket:', error.message);
      next(new Error('Autenticacao falhou'));
    }
  }

  /**
   * Middleware para validar modulo autorizado
   * @param {Array<string>} allowedModules - Módulos permitidos
   */
  static validateModuleAccess(allowedModules = []) {
    return (socket, next) => {
      const module = socket.handshake.query.module;

      if (!module || !allowedModules.includes(module)) {
        return next(new Error(`Acesso negado ao modulo: ${module}`));
      }

      next();
    };
  }
}

export { AuthWebsocket };
