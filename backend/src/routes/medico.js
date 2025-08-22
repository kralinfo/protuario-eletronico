const express = require('express');
const router = express.Router();
const knex = require('../db');

// Listar atendimentos em sala médica
router.get('/atendimentos', async (req, res) => {
  try {
    const atendimentos = await knex('atendimentos')
      .where('status', 'em_sala_medica')
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

module.exports = router;
