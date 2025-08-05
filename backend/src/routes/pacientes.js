import { Router } from 'express';
import PacientesController from '../controllers/pacientesController.js';
import { 
  validatePaciente, 
  validatePacienteUpdate, 
  validateId,
  sanitizeInput 
} from '../middleware/validation.js';
import { authenticateToken } from '../middleware/auth.js';
import { auditLog } from '../middleware/security.js';

const router = Router();

// Middleware de autenticação para todas as rotas
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
 * @route GET /api/pacientes/statistics
 * @desc Obter estatísticas dos pacientes
 * @access Private
 */
router.get('/statistics', PacientesController.statistics);

/**
 * @route GET /api/pacientes/validate-field
 * @desc Validar campo específico
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
