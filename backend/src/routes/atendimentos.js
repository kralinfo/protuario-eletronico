import express from 'express';
import controller from '../controllers/atendimentosController.js';

const router = express.Router();

router.post('/', controller.registrar);
router.get('/', controller.listarDoDia); // Novo endpoint para atendimentos do dia
router.get('/reports', controller.reports); // Rota de relatórios ANTES da rota paramétrica
router.get('/todos', controller.listarTodos); // Novo endpoint para todos os atendimentos
router.get('/atendimento/:id', controller.buscarPorId); // Nova rota para buscar atendimento por ID
router.get('/:pacienteId', controller.listarPorPaciente);
router.patch('/:id/status', controller.atualizarStatus);
router.patch('/:id/abandono', controller.registrarAbandono);
router.put('/:id', controller.atualizar); // Nova rota para atualizar atendimento completo
router.delete('/:id', controller.remover);

export default router;
