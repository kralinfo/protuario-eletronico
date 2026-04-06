import config from '../config/env.js';

/**
 * Middleware de proteção do banco de dados
 */
export const protectDatabase = async (req, res, next) => {
  try {
    // Lista de endpoints perigosos que podem afetar a integridade dos dados
    const dangerousEndpoints = [
      '/api/create-tables',
      '/api/reset-database',
      '/api/drop-tables',
      '/api/truncate-tables'
    ];
    
    // Verificar se é um endpoint perigoso
    const isDangerousEndpoint = dangerousEndpoints.some(endpoint => 
      req.path.includes(endpoint)
    );
    
    if (isDangerousEndpoint) {
      // Verificar se existem dados no banco
      const { default: database } = await import('../config/database.js');
      
      const userCount = await database.query('SELECT COUNT(*) as count FROM usuarios');
      const patientCount = await database.query('SELECT COUNT(*) as count FROM pacientes');
      
      const hasData = parseInt(userCount.rows[0].count) > 0 || parseInt(patientCount.rows[0].count) > 0;
      
      if (hasData) {
        console.log('🛡️ [SECURITY] Operação perigosa bloqueada - banco contém dados');
        return res.status(403).json({
          status: 'BLOCKED',
          message: 'Operação bloqueada para proteger dados existentes',
          protection: 'Sistema de proteção de integridade ativo',
          suggestion: 'Use endpoints de backup antes de operações destrutivas'
        });
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ [SECURITY] Erro no middleware de proteção:', error);
    next();
  }
};

/**
 * Middleware de proteção contra SQL injection
 */
export const protectSQLQueries = (req, res, next) => {
  const dangerousPatterns = [
    /DROP\s+TABLE/i,
    /TRUNCATE\s+TABLE/i,
    /DELETE\s+FROM\s+\w+\s*$/i, // DELETE sem WHERE
    /UPDATE\s+\w+\s+SET\s+.*\s*$/i, // UPDATE sem WHERE
    /UNION\s+SELECT/i,
    /INSERT\s+INTO\s+\w+\s+VALUES\s*\(/i
  ];
  
  const checkForDangerousSQL = (obj) => {
    if (typeof obj === 'string') {
      return dangerousPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForDangerousSQL(value));
    }
    
    return false;
  };
  
  // Verificar TODAS as fontes de entrada: body, query, params, headers e cookies
  const allInputSources = {
    ...req.body,
    ...req.query,
    ...req.params,
    ...req.headers,
    ...req.cookies
  };
  
  const hasInputData = Object.keys(allInputSources).length > 0;
  
  if (hasInputData && checkForDangerousSQL(allInputSources)) {
    console.log('🚨 [SECURITY] Tentativa de SQL injection detectada:', req.ip);
    return res.status(400).json({
      status: 'BLOCKED',
      message: 'Padrão SQL perigoso detectado',
      code: 'SQL_INJECTION_ATTEMPT'
    });
  }
  
  next();
};

/**
 * Middleware de auditoria
 */
export const auditLog = (req, res, next) => {
  const startTime = Date.now();
  
  // Log da requisição
  console.log(`📊 [AUDIT] ${new Date().toISOString()} - ${req.method} ${req.path} - IP: ${req.ip}`);
  
  // Interceptar resposta para log
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - startTime;
    console.log(`📊 [AUDIT] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    
    // Log de operações sensíveis
    if (req.path.includes('/api/pacientes') && req.method !== 'GET') {
      console.log(`🔍 [AUDIT] Operação em pacientes: ${req.method} - User: ${req.user?.id || 'anonymous'}`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

/**
 * Middleware de rate limiting por IP E por usuário autenticado
 */
const rateLimitStore = new Map();

export const rateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100, maxRequestsPerUser = 300) => {
  return (req, res, next) => {
    const ip = req.ip;
    const userId = req.user?.id ? `user:${req.user.id}` : null;
    const now = Date.now();
    
    // Limpar entradas antigas
    for (const [key, data] of rateLimitStore.entries()) {
      if (now - data.resetTime > windowMs) {
        rateLimitStore.delete(key);
      }
    }
    
    // 🔒 Primeiro verificar rate limit por IP (para todos)
    const ipData = rateLimitStore.get(ip) || { count: 0, resetTime: now };
    
    if (now - ipData.resetTime > windowMs) {
      ipData.count = 0;
      ipData.resetTime = now;
    }
    
    ipData.count++;
    rateLimitStore.set(ip, ipData);
    
    if (ipData.count > maxRequests) {
      console.log(`🚫 [SECURITY] Rate limit excedido para IP: ${ip}`);
      return res.status(429).json({
        status: 'ERROR',
        message: 'Muitas requisições. Tente novamente mais tarde.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: windowMs / 1000
      });
    }

    // 🔒 Se usuário está autenticado, verificar rate limit POR USUÁRIO também
    if (userId) {
      const userData = rateLimitStore.get(userId) || { count: 0, resetTime: now };
      
      if (now - userData.resetTime > windowMs) {
        userData.count = 0;
        userData.resetTime = now;
      }
      
      userData.count++;
      rateLimitStore.set(userId, userData);
      
      if (userData.count > maxRequestsPerUser) {
        console.log(`🚫 [SECURITY] Rate limit excedido para Usuário: ${userId} (IP: ${ip})`);
        return res.status(429).json({
          status: 'ERROR',
          message: 'Muitas requisições para este usuário. Tente novamente mais tarde.',
          code: 'USER_RATE_LIMIT_EXCEEDED',
          retryAfter: windowMs / 1000
        });
      }

      // Headers para usuário autenticado
      res.set({
        'X-User-RateLimit-Limit': maxRequestsPerUser,
        'X-User-RateLimit-Remaining': maxRequestsPerUser - userData.count,
        'X-User-RateLimit-Reset': new Date(userData.resetTime + windowMs).toISOString()
      });
    }
    
    // Headers informativos padrão para IP
    res.set({
      'X-RateLimit-Limit': maxRequests,
      'X-RateLimit-Remaining': maxRequests - ipData.count,
      'X-RateLimit-Reset': new Date(ipData.resetTime + windowMs).toISOString()
    });
    
    next();
  };
};

/**
 * Middleware de segurança de headers
 */
export const securityHeaders = (req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy': "default-src 'self'",
    'X-Powered-By': 'Prontuário Eletrônico'
  });
  
  next();
};
