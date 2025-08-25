import express from 'express';
import knex from '../db.js';
const router = express.Router();
router.get('/estatisticas', async (req, res) => {
  try {
    // Atendimentos do dia
    const atendimentosDia = await knex('atendimentos')
      .whereRaw('DATE(data_hora_atendimento) = CURRENT_DATE')
      .select('id', 'status', 'classificacao_risco');

    // Contagem por classificação
    const classificacoes = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'];
    const por_classificacao = {};
    classificacoes.forEach(cl => {
      por_classificacao[cl] = atendimentosDia.filter(a => a.classificacao_risco === cl).length;
    });

    // Outras estatísticas
    const pacientes_aguardando = atendimentosDia.filter(a => a.status === 'aguardando').length;
    const pacientes_em_atendimento = atendimentosDia.filter(a => a.status === 'em_atendimento').length;
    const consultas_concluidas = atendimentosDia.filter(a => a.status === 'concluida').length;

    res.json({
      estatisticas: {
        pacientes_aguardando,
        pacientes_em_atendimento,
        consultas_concluidas,
        por_classificacao
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar atendimentos em sala médica
router.get('/atendimentos', async (req, res) => {
  try {
    const statusSalaMedica = [
      'em_sala_medica',
      'encaminhado_para_sala_medica',
      'encaminhado para sala médica',
      '3 - Encaminhado para sala médica'
    ];
    const atendimentos = await knex('atendimentos')
      .whereIn('status', statusSalaMedica)
      .select('*');
    res.json(atendimentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detalhes de uma consulta médica
router.get('/consulta/:id', async (req, res) => {
  try {
    const consulta = await knex('consultas_medicas')
      .where('id', req.params.id)
      .first();
    res.json(consulta);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar nova consulta médica
router.post('/consulta', async (req, res) => {
  try {
    const novaConsulta = await knex('consultas_medicas').insert(req.body).returning('*');
    res.json(novaConsulta[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar consulta médica
router.put('/consulta/:id', async (req, res) => {
  try {
    await knex('consultas_medicas')
      .where('id', req.params.id)
      .update(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
