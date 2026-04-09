/**
 * Middleware para checar nível de acesso (roles)
 * Uso: auth(['admin'])
 */
const auth = (roles = []) => {
  return (req, res, next) => {
    // Middleware de autenticação
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Token de acesso requerido',
        code: 'NO_TOKEN'
      });
    }
    jwt.verify(token, config.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({
          status: 'ERROR',
          message: 'Token inválido ou expirado',
          code: 'INVALID_TOKEN'
        });
      }
      req.user = user;
      if (roles.length > 0 && !roles.includes(user.nivel)) {
        return res.status(403).json({
          status: 'ERROR',
          message: 'Acesso não autorizado',
          code: 'NO_PERMISSION',
          nivelRecebido: user.nivel
        });
      }
      next();
    });
  };
};

export default auth;
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import config from '../config/env.js';
import TokenBlacklistService from '../services/tokenBlacklistService.js';

/**
 * Middleware de autenticação JWT com verificacao de blacklist (LGPD)
 */
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Token de acesso requerido',
      code: 'NO_TOKEN'
    });
  }

  // Decodificar sem verificar para checar blacklist primeiro
  let decoded;
  try {
    decoded = jwt.decode(token);
    if (!decoded) {
      throw new Error('Token invalido');
    }
  } catch (err) {
    return res.status(403).json({
      status: 'ERROR',
      message: 'Token invalido',
      code: 'INVALID_TOKEN'
    });
  }

  // Verificar se token esta na blacklist (logout/revogacao)
  const jti = decoded.jti;
  if (jti && await TokenBlacklistService.isBlacklisted(jti)) {
    return res.status(403).json({
      status: 'ERROR',
      message: 'Token revogado. Faca login novamente.',
      code: 'TOKEN_REVOKED'
    });
  }

  // Verificar assinatura e expiracao
  jwt.verify(token, config.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('❌ Token invalido:', err.message);
      return res.status(403).json({
        status: 'ERROR',
        message: 'Token invalido ou expirado',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = user;
    next();
  });
};

/**
 * Middleware opcional de autenticação
 */
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    jwt.verify(token, config.JWT_SECRET, (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  
  next();
};

/**
 * Middleware para verificar permissões específicas
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'ERROR',
        message: 'Usuário não autenticado'
      });
    }

    // Aqui você pode implementar verificação de permissões
    // Por enquanto, assumindo que todo usuário autenticado tem todas as permissões
    next();
  };
};

/**
 * Gerar token JWT com JTI unico para rastreabilidade (LGPD)
 */
export const generateToken = (payload) => {
  const jti = randomBytes(16).toString('hex'); // JWT ID unico

  return jwt.sign(
    {
      ...payload,
      jti // Unique identifier para blacklist
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRES_IN
    }
  );
};

/**
 * Verificar token JWT
 */
export const verifyToken = (token) => {
  return jwt.verify(token, config.JWT_SECRET);
};
