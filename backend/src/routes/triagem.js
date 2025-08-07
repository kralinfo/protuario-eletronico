import express from 'express';
import TriagemController from '../controllers/triagemController.js';
import triagemAuth from '../middleware/triagemAuth.js';

const router = express.Router();

// === ROTAS DA FILA DE TRIAGEM ===

// Listar pacientes aguardando triagem
router.get('/fila', triagemAuth, TriagemController.listarFilaTriagem);

// Obter estatísticas da triagem
router.get('/estatisticas', triagemAuth, TriagemController.obterEstatisticas);

// Obter configurações de classificação de risco
router.get('/classificacao-risco', triagemAuth, TriagemController.obterClassificacaoRisco);

// === ROTAS DE ATENDIMENTO ===

// Iniciar triagem de um paciente
router.post('/:id/iniciar', triagemAuth, TriagemController.iniciarTriagem);

// Obter dados completos do atendimento para triagem
router.get('/:id/dados', triagemAuth, TriagemController.obterDadosTriagem);

// Salvar dados da triagem (parcial)
router.put('/:id/salvar', triagemAuth, TriagemController.salvarTriagem);

// Finalizar triagem
router.post('/:id/finalizar', triagemAuth, TriagemController.finalizarTriagem);

// === ROTAS DE RELATÓRIOS ===

// Listar triagens realizadas
router.get('/realizadas', triagemAuth, TriagemController.listarTriagensRealizadas);

export default router;
