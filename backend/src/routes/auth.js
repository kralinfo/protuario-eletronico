import { Router } from 'express';
import AuthController from '../controllers/authController.js';
import { validateLogin, sanitizeInput } from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { rateLimit } from '../middleware/security.js';

const router = Router();

/**
 * @route GET /api/public/user-modules
 * @desc Retorna os módulos disponíveis para um usuário pelo email (público)
 * @access Public
 */
router.get('/public/user-modules', AuthController.getUserModules);

// Rate limiting mais restritivo para auth
const authRateLimit = rateLimit(15 * 60 * 1000, 200); // 200 tentativas por 15 minutos (ajuste para testes)

/**
 * @route POST /api/login
 * @desc Login do usuário - COMPATIBILIDADE COM PRODUÇÃO
 * @access Public
 */
router.post('/login', 
  authRateLimit,
  sanitizeInput,
  validateLogin,
  AuthController.login
);

/**
 * @route POST /api/forgot-password
 * @desc Recuperação de senha - COMPATIBILIDADE COM PRODUÇÃO
 * @access Public
 */
router.post('/forgot-password',
  authRateLimit,
  sanitizeInput,
  AuthController.forgotPassword
);

/**
 * @route POST /api/register
 * @desc Registro de novo usuário
 * @access Public (pode ser restrito conforme necessário)
 */
router.post('/register',
  authRateLimit,
  sanitizeInput,
  AuthController.register
);

/**
 * @route POST /api/auth/logout
 * @desc Logout do usuário
 * @access Private
 */
router.post('/logout',
  authenticateToken,
  AuthController.logout
);

/**
 * @route GET /api/auth/me
 * @desc Obter dados do usuário atual
 * @access Private
 */
router.get('/me',
  authenticateToken,
  AuthController.me
);

/**
 * @route POST /api/auth/change-password
 * @desc Alterar senha do usuário
 * @access Private
 */
router.post('/change-password',
  authenticateToken,
  sanitizeInput,
  AuthController.changePassword
);

/**
 * @route GET /api/auth/verify
 * @desc Verificar validade do token
 * @access Private
 */
router.get('/verify',
  authenticateToken,
  AuthController.verifyToken
);

/**
 * @route POST /api/validate-reset-token
 * @desc Valida o token de redefinição de senha
 * @access Public
 */
router.post('/validate-reset-token',
  authRateLimit,
  sanitizeInput,
  AuthController.validateResetToken
);

/**
 * @route POST /api/reset-password
 * @desc Redefinir senha usando token de recuperação
 * @access Public
 */
router.post('/reset-password',
  authRateLimit,
  sanitizeInput,
  AuthController.resetPassword
);

export default router;
