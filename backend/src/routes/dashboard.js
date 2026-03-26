import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import DashboardController from '../controllers/dashboardController.js';

const router = Router();

// ── Novos endpoints (contrato camelCase) ──────────────────────────────────
router.get('/overview',              authenticateToken, DashboardController.overview);
router.get('/atendimentos-por-hora', authenticateToken, DashboardController.atendimentosPorHora);
router.get('/classificacao-risco',   authenticateToken, DashboardController.classificacaoRisco);
router.get('/pacientes-por-etapa',   authenticateToken, DashboardController.pacientesPorEtapa);
router.get('/produtividade-medicos', authenticateToken, DashboardController.produtividadeMedicos);
router.get('/pacientes-criticos',    authenticateToken, DashboardController.pacientesCriticos);

// ── Legado: mantidos para compatibilidade com o frontend existente ─────────
router.get('/operacional', authenticateToken, DashboardController.operacional);
router.get('/por-hora',    authenticateToken, DashboardController.porHora);
router.get('/medicos',     authenticateToken, DashboardController.medicosLegado);

export default router;
