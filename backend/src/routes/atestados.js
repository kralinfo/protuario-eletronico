import { Router } from 'express';
import AtestadoEmitidoController from '../controllers/atestadoEmitidoController.js';
import auditMiddleware from '../middleware/auditMiddleware.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Emitir atestado
router.post('/',
  auditMiddleware('CREATE', 'atestado'),
  AtestadoEmitidoController.create
);

// Buscar por atendimento
router.get('/atendimento/:atendimentoId', AtestadoEmitidoController.findByAtendimento);

// Buscar por paciente
router.get('/paciente/:pacienteId', AtestadoEmitidoController.findByPaciente);

// Excluir atestado
router.delete('/:id',
  auditMiddleware('DELETE', 'atestado'),
  AtestadoEmitidoController.delete
);

export default router;
