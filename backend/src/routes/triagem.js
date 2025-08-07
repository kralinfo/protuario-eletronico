import express from 'express';
import TriagemController from '../controllers/triagemController.js';

const router = express.Router();

// === ROTAS DA FILA DE TRIAGEM ===

// Listar pacientes aguardando triagem
router.get('/fila', TriagemController.listarFilaTriagem);

// Obter estatísticas da triagem
router.get('/estatisticas', TriagemController.obterEstatisticas);

// Obter configurações de classificação de risco
router.get('/classificacao-risco', TriagemController.obterClassificacaoRisco);

// === ROTAS DE ATENDIMENTO ===

// Iniciar triagem de um paciente
router.post('/:id/iniciar', TriagemController.iniciarTriagem);

// Obter dados completos do atendimento para triagem
router.get('/:id/dados', TriagemController.obterDadosTriagem);

// Salvar dados da triagem (parcial)
router.put('/:id/salvar', TriagemController.salvarTriagem);

// Finalizar triagem
router.post('/:id/finalizar', TriagemController.finalizarTriagem);

// === ROTAS DE RELATÓRIOS ===

// Listar triagens realizadas
router.get('/realizadas', TriagemController.listarTriagensRealizadas);

export default router;
