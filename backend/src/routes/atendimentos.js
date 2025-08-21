import express from 'express';
import controller from '../controllers/atendimentosController.js';
import knex from '../db.js';

const router = express.Router();

// Endpoint para listar atendimentos por status (flexível)
router.get('/por-status', async (req, res) => {
	try {
		let { status } = req.query;
		if (!status) {
			return res.status(400).json({ error: 'Status é obrigatório.' });
		}
		// Aceita múltiplos status separados por vírgula
		const statusList = status.split(',').map(s => s.trim());
			const atendimentos = await knex('atendimentos as a')
				.whereIn('a.status', statusList)
				.leftJoin('pacientes as p', 'a.paciente_id', 'p.id')
				.select('a.*', 'p.nome as paciente_nome');
		res.json(atendimentos);
	} catch (err) {
		res.status(500).json({ error: err.message });
	}
});

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

export default router;
