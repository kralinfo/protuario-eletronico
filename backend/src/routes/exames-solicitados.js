import { Router } from 'express';
import ExameSolicitadoController from '../controllers/exameSolicitadoController.js';
import auditMiddleware from '../middleware/auditMiddleware.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Criar solicitacao de exame
router.post('/',
  auditMiddleware('CREATE', 'exame_solicitado'),
  ExameSolicitadoController.create
);

// Buscar por atendimento
router.get('/atendimento/:atendimentoId', ExameSolicitadoController.findByAtendimento);

// Buscar por paciente
router.get('/paciente/:pacienteId', ExameSolicitadoController.findByPaciente);

// Atualizar exame
router.patch('/:id',
  auditMiddleware('UPDATE', 'exame_solicitado'),
  ExameSolicitadoController.update
);

// Registrar resultado
router.post('/:id/resultado',
  auditMiddleware('UPDATE', 'exame_solicitado'),
  ExameSolicitadoController.registrarResultado
);

// Excluir exame
router.delete('/:id',
  auditMiddleware('DELETE', 'exame_solicitado'),
  ExameSolicitadoController.delete
);

export default router;
