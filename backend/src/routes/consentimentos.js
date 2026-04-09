import { Router } from 'express';
import consentimentoController from '../controllers/consentimentoController.js';
import auditMiddleware from '../middleware/auditMiddleware.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Todas as rotas de consentimento requerem autenticacao
router.use(authMiddleware);

// Registrar consentimento
router.post('/',
  auditMiddleware('CREATE', 'consentimento'),
  consentimentoController.registrar
);

// Revogar consentimento
router.delete('/:id',
  auditMiddleware('DELETE', 'consentimento'),
  consentimentoController.revogar
);

// Buscar consentimentos do paciente
router.get('/paciente/:pacienteId', consentimentoController.buscarPorPaciente);

// Verificar se paciente tem consentimento ativo
router.get('/paciente/:pacienteId/verificar/:tipo?', consentimentoController.verificar);

// Listar todos (admin)
router.get('/', consentimentoController.listar);

export default router;
