import express from 'express';
import controller from '../controllers/atendimentosController.js';

const router = express.Router();

router.post('/', controller.registrar);
router.get('/', controller.listarDoDia); // Novo endpoint para atendimentos do dia
router.get('/reports', controller.reports); // Rota de relatórios ANTES da rota paramétrica
router.get('/todos', controller.listarTodos); // Novo endpoint para todos os atendimentos
router.get('/:pacienteId', controller.listarPorPaciente);
router.patch('/:id/status', controller.atualizarStatus);
router.patch('/:id/abandono', controller.registrarAbandono);
router.delete('/:id', controller.remover);

export default router;
