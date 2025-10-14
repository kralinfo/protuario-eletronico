import { Router } from 'express';
import authRoutes from './auth.js';
import pacientesRoutes from './pacientes.js';
import usuariosRoutes from './usuarios.js';
import medicoRoutes from './medico.js';
import ambulatorioRoutes from './ambulatorio.js';
import { authenticateToken } from '../middleware/auth.js';
import PacientesController from '../controllers/pacientesController.js';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'SUCCESS',
    message: 'API funcionando',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * Endpoint de teste para distribuição por sexo (SEM AUTENTICAÇÃO)
 */
router.get('/test-distribuicao', (req, res) => {
  console.log('🧪 [TEST] Endpoint de teste chamado - distribuição por sexo');
  try {
    const { filtro = 'semana' } = req.query;
    
    // Dados mock para teste rápido
    const dadosMock = {
      semana: { masculino: 15, feminino: 12 },
      mes: { masculino: 45, feminino: 38 },
      ano: { masculino: 180, feminino: 165 }
    };
    
    const dados = dadosMock[filtro] || dadosMock.semana;
    
    res.json({
      status: 'SUCCESS',
      data: dados,
      filtro,
      message: 'Dados de teste retornados com sucesso'
    });
  } catch (error) {
    console.error('❌ [TEST] Erro:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erro no endpoint de teste',
      error: error.message
    });
  }
});

/**
 * API Info endpoint
 */
router.get('/info', (req, res) => {
  res.json({
    status: 'SUCCESS',
    api: {
      name: 'Prontuário Eletrônico API',
      version: '2.0.0',
      description: 'API para gerenciamento de prontuários eletrônicos',
      environment: process.env.NODE_ENV || 'development'
    },
    endpoints: {
      auth: '/api/auth/*',
      pacientes: '/api/pacientes/*',
      health: '/api/health',
      info: '/api/info'
    },
    features: [
      'Autenticação JWT',
      'Validação de dados',
      'Paginação',
      'Filtros avançados',
      'Auditoria de segurança',
      'Rate limiting'
    ]
  });
});

/**
 * Endpoint de teste para distribuição por sexo (SEM AUTENTICAÇÃO)
 */
router.get('/pacientes/test-distribuicao', (req, res) => {
  console.log('🧪 [TEST] Endpoint de teste chamado - distribuição por sexo');
  PacientesController.getDistribuicaoPorSexo(req, res);
});

/**
 * Rotas de autenticação - COMPATIBILIDADE COM PRODUÇÃO
 * Mantém as rotas originais: /api/login, /api/forgot-password
 */
router.use('/', authRoutes); // Rotas diretas em /api/


/**
 * Rotas de pacientes - COMPATIBILIDADE COM PRODUÇÃO
 * Mantém as rotas originais: /api/pacientes
 */
router.use('/pacientes', pacientesRoutes);

/**
 * Rotas de usuários - /api/usuarios
 */
router.use('/usuarios', usuariosRoutes);

/**
 * Rota protegida de teste
 */
router.get('/protected', authenticateToken, (req, res) => {
  res.json({
    status: 'SUCCESS',
    message: 'Rota protegida acessada com sucesso',
    user: req.user
  });
});

router.use('/medico', medicoRoutes);
router.use('/ambulatorio', ambulatorioRoutes);
export default router;
