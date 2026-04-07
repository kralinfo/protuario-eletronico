import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import FilaRealtimeModule from '../realtime/modules/FilaRealtimeModule.js';

const router = Router();

/**
 * GET /api/fila/estado
 * Retorna o estado atual da fila: chamadas ativas e histórico recente.
 * Usado pelo painel de TV ao carregar a página para restaurar o estado
 * sem depender do localStorage do browser.
 */
router.get('/estado', authenticateToken, (req, res) => {
  try {
    const estado = FilaRealtimeModule.getEstado();
    res.json({ status: 'SUCCESS', data: estado });
  } catch (error) {
    console.error('Erro ao buscar estado da fila:', error);
    res.status(500).json({ status: 'ERROR', message: 'Erro interno ao buscar estado da fila' });
  }
});

export default router;
