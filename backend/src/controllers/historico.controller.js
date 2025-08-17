// Controller para histórico de atendimentos do paciente
import knex from '../db.js';

const getHistoricoAtendimentos = async (req, res) => {
  const pacienteId = req.params.id;
  try {
    const historico = await knex('atendimentos')
      .where('paciente_id', pacienteId)
      .orderBy('data_hora_atendimento', 'desc');
    res.json({ historico });
  } catch (err) {
    console.error('Erro ao buscar histórico de atendimentos:', err);
    res.status(500).json({ error: 'Erro ao buscar histórico de atendimentos.', details: err.message });
  }
};

export default {
  getHistoricoAtendimentos
};
