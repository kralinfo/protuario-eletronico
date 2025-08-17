import express from 'express';
import historicoController from '../controllers/historico.controller.js';

const router = express.Router();

// GET /api/pacientes/:id/historico
router.get('/pacientes/:id/historico', historicoController.getHistoricoAtendimentos);

export default router;
