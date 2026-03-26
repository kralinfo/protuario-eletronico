import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import dashboardController from '../controllers/dashboardController.js';

const router = Router();

/** Métricas em tempo real do fluxo hospitalar */
router.get('/operacional', authenticateToken, dashboardController.operacional);

/** Atendimentos agrupados por hora do dia (hoje) */
router.get('/por-hora', authenticateToken, dashboardController.atendimentosPorHora);

/** Produtividade por médico (hoje) */
router.get('/medicos', authenticateToken, dashboardController.produtividadeMedicos);

export default router;
