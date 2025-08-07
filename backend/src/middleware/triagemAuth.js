import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Middleware específico para módulo de triagem
 * Verifica se o usuário tem acesso ao módulo de triagem
 */
const triagemAuth = (req, res, next) => {
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

    // LOG para depuração
    console.log('[TRIAGEM AUTH DEBUG] user.modulos:', user.modulos, '| user.nivel:', user.nivel);

    // Verificar se o usuário tem acesso ao módulo de triagem
    if (!user.modulos || !Array.isArray(user.modulos)) {
      return res.status(403).json({
        status: 'ERROR',
        message: 'Usuário não possui módulos definidos',
        code: 'NO_MODULES'
      });
    }

    if (!user.modulos.includes('triagem')) {
      return res.status(403).json({
        status: 'ERROR',
        message: 'Acesso negado: usuário não tem acesso ao módulo de triagem',
        code: 'MODULE_ACCESS_DENIED',
        modulosDisponiveis: user.modulos
      });
    }

    console.log('[TRIAGEM AUTH] ✅ Acesso autorizado para módulo de triagem');
    next();
  });
};

export default triagemAuth;
