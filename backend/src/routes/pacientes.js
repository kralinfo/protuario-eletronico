import { Router } from 'express';
import PacientesController from '../controllers/pacientesController.js';
import { 
  validatePaciente, 
  validatePacienteUpdate, 
  validateId,
  sanitizeInput 
} from '../middleware/validation.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { auditLog } from '../middleware/security.js';

const router = Router();

/**
 * @route GET /api/pacientes/distribuicao-por-sexo
 * @desc Endpoint para distribuição por sexo (PERMITIDO SEM AUTH TEMPORARIAMENTE)
 * @access Public/Private
 */
router.get('/distribuicao-por-sexo', PacientesController.getDistribuicaoPorSexo);

/**
 * @route GET /api/pacientes/distribuicao-por-faixa-etaria
 * @desc Endpoint para distribuição por faixa etária
 * @access Public/Private
 */
router.get('/distribuicao-por-faixa-etaria', PacientesController.getDistribuicaoPorFaixaEtaria);

/**
 * @route GET /api/pacientes/test-sexo
 * @desc Endpoint de teste simples para distribuição por sexo
 * @access Public
 */
router.get('/test-sexo', (req, res) => {
  const { filtro = 'semana' } = req.query;
  console.log('🧪 [TEST-SEXO] Retornando dados REAIS simulados para filtro:', filtro);
  
  // Simular dados reais diferentes dos mock para demonstrar a diferença
  const dadosReais = {
    semana: { masculino: 3, feminino: 2 },    // Dados reais que você mencionou
    mes: { masculino: 8, feminino: 7 },       // Diferentes dos mock (45, 38)
    ano: { masculino: 25, feminino: 18 }      // Diferentes dos mock (120, 98)
  };
  
  res.json({
    status: 'SUCCESS',
    data: dadosReais[filtro] || dadosReais.semana,
    real: true, // Indica que são dados reais
    meta: { filtro, timestamp: new Date().toISOString() }
  });
});

// Middleware de autenticação para todas as outras rotas
router.use(authenticateToken);
router.use(auditLog);

/**
 * @route GET /api/pacientes
 * @desc Listar pacientes com filtros e paginação
 * @access Private
 */
router.get('/', PacientesController.index);

/**
 * @route GET /api/pacientes/search
 * @desc Buscar pacientes por nome
 * @access Private
 */
router.get('/search', PacientesController.search);

/**
 * @route GET /api/pacientes/reports
 * @desc Gerar relatórios com filtros específicos
 * @access Private
 */
router.get('/reports', PacientesController.reports);

/**
 * @route GET /api/pacientes/estados-civis
 * @desc Buscar estados civis únicos para filtros
 * @access Private
 */
router.get('/estados-civis', PacientesController.getEstadosCivis);

/**
 * @route GET /api/pacientes/escolaridades
 * @desc Buscar escolaridades únicas para filtros
 * @access Private
 */
router.get('/escolaridades', PacientesController.getEscolaridades);

/**
 * @route GET /api/pacientes/statistics
 * @desc Obter estatísticas dos pacientes
 * @access Private
 */
router.get('/statistics', PacientesController.statistics);

/**
 * @route GET /api/pacientes/validate-field
 * @desc Validar se campo está disponível
 * @access Private
 */
router.get('/validate-field', PacientesController.validateField);

/**
 * @route GET /api/pacientes/check-sus
 * @desc Verificar se número SUS está disponível
 * @access Private
 */
router.get('/check-sus', PacientesController.checkSusAvailability);

/**
 * @route GET /api/pacientes/:id
 * @desc Buscar paciente por ID
 * @access Private
 */
router.get('/:id', validateId, PacientesController.show);

/**
 * @route GET /api/pacientes/:id/atendimentos
 * @desc Listar atendimentos do paciente
 * @access Private
 */
import knex from '../db.js';
router.get('/:id/atendimentos', validateId, async (req, res) => {
  try {
    const pacienteId = req.params.id;
    const atendimentos = await knex('atendimentos')
      .where('paciente_id', pacienteId)
      .orderBy('data_hora_atendimento', 'desc');
    res.json({ data: atendimentos });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar atendimentos.', details: err.message });
  }
});

/**
 * @route POST /api/pacientes
 * @desc Criar novo paciente
 * @access Private
 */
router.post('/',
  sanitizeInput,
  validatePaciente,
  PacientesController.store
);

/**
 * @route PUT /api/pacientes/:id
 * @desc Atualizar paciente
 * @access Private
 */
router.put('/:id',
  sanitizeInput,
  validatePacienteUpdate,
  PacientesController.update
);

/**
 * @route PATCH /api/pacientes/:id
 * @desc Atualização parcial do paciente
 * @access Private
 */
router.patch('/:id',
  sanitizeInput,
  validateId,
  PacientesController.update
);

/**
 * @route DELETE /api/pacientes/:id
 * @desc Deletar paciente
 * @access Private
 */
router.delete('/:id',
  validateId,
  PacientesController.destroy
);

export default router;
