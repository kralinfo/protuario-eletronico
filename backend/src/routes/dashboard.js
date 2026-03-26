import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import dashboardController from '../controllers/dashboardController.js';

const router = Router();

/**
 * GET /api/dashboard/operacional
 * Métricas em tempo real do fluxo hospitalar (hoje).
 */
router.get('/operacional', authenticateToken, dashboardController.operacional);

export default router;
