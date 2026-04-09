import { Router } from 'express';
import EncaminhamentoController from '../controllers/encaminhamentoController.js';
import auditMiddleware from '../middleware/auditMiddleware.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Criar encaminhamento
router.post('/',
  auditMiddleware('CREATE', 'encaminhamento'),
  EncaminhamentoController.create
);

// Buscar por atendimento
router.get('/atendimento/:atendimentoId', EncaminhamentoController.findByAtendimento);

// Buscar por paciente
router.get('/paciente/:pacienteId', EncaminhamentoController.findByPaciente);

// Atualizar encaminhamento
router.patch('/:id',
  auditMiddleware('UPDATE', 'encaminhamento'),
  EncaminhamentoController.update
);

// Excluir encaminhamento
router.delete('/:id',
  auditMiddleware('DELETE', 'encaminhamento'),
  EncaminhamentoController.delete
);

export default router;
