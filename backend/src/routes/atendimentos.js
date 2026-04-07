import express from 'express';
import knex from '../db.js';
import { 
  registrar,
  listarDoDia,
  reports,
  listarTodos,
  buscarPorId,
  atualizarStatus,
  registrarAbandono,
  atualizar,
  remover,
  salvarDadosMedico,
  salvarAlteracoesTriagem,
  atendimentosPorSemana, 
  atendimentosPorMes, 
  atendimentosPorAno,
  tempoMedioPorSemana,
  tempoMedioPorMes,
  classificacaoRiscoPorSemana,
  classificacaoRiscoPorMes,
  classificacaoRiscoPorAno,
  detalhesAtendimentos
} from '../controllers/atendimentosController.js';

const router = express.Router();

// Endpoint para listar atendimentos por status (flexível)
router.get('/por-status', async (req, res) => {
	try {
		let { status } = req.query;
		if (!status) {
			return res.status(400).json({ error: 'Status é obrigatório.' });
		}
				// Aceita múltiplos status separados por vírgula e busca variantes com hífen
				const statusList = status.split(',').map(s => s.trim());
				// Gera variantes com hífen e sem hífen
				const allVariants = [];
				for (const s of statusList) {
					allVariants.push(s);
					// Se não tem hífen, gera variante com hífen
					if (!s.includes('_')) {
						allVariants.push(s.replace(/ /g, '_').replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u').replace(/ç/g, 'c'));
					}
					// Se tem hífen, gera variante sem hífen
					if (s.includes('_')) {
						allVariants.push(s.replace(/_/g, ' '));
					}
				}
				// Remove duplicados
				const uniqueVariants = [...new Set(allVariants)];
				const atendimentos = await knex('atendimentos as a')
					.whereIn('a.status', uniqueVariants)
					.leftJoin('pacientes as p', 'a.paciente_id', 'p.id')
					.select('a.*', 'p.nome as paciente_nome');
				res.json(atendimentos);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

// Endpoint para detalhes de atendimentos (deve ficar bem no início)
router.get('/drill-down/detalhes', detalhesAtendimentos);

// Novos endpoints para listar atendimentos por semana, mês e por ano (ANTES das rotas paramétricas)
router.get('/por-semana', atendimentosPorSemana);
router.get('/por-mes', atendimentosPorMes);
router.get('/por-ano', atendimentosPorAno);

// Endpoints para tempo médio de espera
router.get('/tempo-medio/semana', tempoMedioPorSemana);
router.get('/tempo-medio/mes', tempoMedioPorMes);

// Endpoints para classificação de risco
router.get('/classificacao-risco/semana', classificacaoRiscoPorSemana);
router.get('/classificacao-risco/mes', classificacaoRiscoPorMes);
router.get('/classificacao-risco/ano', classificacaoRiscoPorAno);

// Endpoint de debug para listar todas as classificações existentes
router.get('/debug/classificacoes', async (req, res) => {
  try {
    const result = await knex('atendimentos')
      .select('classificacao_risco')
      .distinct()
      .whereNotNull('classificacao_risco');
    res.json(result.map(r => r.classificacao_risco));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para detalhes de atendimentos por período
router.get('/detalhes-periodo', detalhesAtendimentos);

router.post('/', registrar);
router.get('/', listarDoDia); // Novo endpoint para atendimentos do dia
router.get('/reports', reports); // Rota de relatórios ANTES da rota paramétrica
router.get('/todos', listarTodos); // Novo endpoint para todos os atendimentos
router.get('/:id', buscarPorId); // Rota RESTful para buscar atendimento por ID
router.patch('/:id/status', atualizarStatus);
router.patch('/:id/abandono', registrarAbandono);
router.put('/:id', atualizar); // Nova rota para atualizar atendimento completo
router.delete('/:id', remover);

// Novo endpoint para salvar apenas dados do atendimento médico
router.put('/:id/salvar-medico', salvarDadosMedico);

// Novo endpoint para salvar apenas alterações da triagem
router.put('/:id/salvar-triagem', salvarAlteracoesTriagem);

export default router;
