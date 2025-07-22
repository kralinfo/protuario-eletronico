import express from 'express';
import controller from '../controllers/atendimentosController.js';

const router = express.Router();


router.post('/', controller.registrar);
router.get('/', controller.listarDoDia); // Novo endpoint para atendimentos do dia
router.get('/:pacienteId', controller.listarPorPaciente);
router.patch('/:id/status', controller.atualizarStatus);

export default router;
