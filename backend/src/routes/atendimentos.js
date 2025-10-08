import express from 'express';
import controller from '../controllers/atendimentosController.js';
import knex from '../db.js';
import { atendimentosPorSemana, atendimentosPorAno } from '../controllers/atendimentosController.js';

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

// Novos endpoints para listar atendimentos por semana e por ano (ANTES das rotas paramétricas)
router.get('/por-semana', atendimentosPorSemana);
router.get('/por-ano', atendimentosPorAno);

router.post('/', controller.registrar);
router.get('/', controller.listarDoDia); // Novo endpoint para atendimentos do dia
router.get('/reports', controller.reports); // Rota de relatórios ANTES da rota paramétrica
router.get('/todos', controller.listarTodos); // Novo endpoint para todos os atendimentos
router.get('/:id', controller.buscarPorId); // Rota RESTful para buscar atendimento por ID
router.get('/:pacienteId', controller.listarPorPaciente);
router.patch('/:id/status', controller.atualizarStatus);
router.patch('/:id/abandono', controller.registrarAbandono);
router.put('/:id', controller.atualizar); // Nova rota para atualizar atendimento completo
router.delete('/:id', controller.remover);

// Novo endpoint para salvar apenas dados do atendimento médico
router.put('/:id/salvar-medico', controller.salvarDadosMedico);

// Novo endpoint para salvar apenas alterações da triagem
router.put('/:id/salvar-triagem', controller.salvarAlteracoesTriagem);

export default router;
