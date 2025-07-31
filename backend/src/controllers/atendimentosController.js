// Relatório avançado de atendimentos
const reports = async (req, res) => {
  const { dataInicial, dataFinal } = req.query;
  let query = `SELECT a.id, a.created_at as data, a.paciente_id as paciente, a.data_hora_atendimento as hora, a.procedencia as procedimento, a.motivo as motivo, a.observacoes as observacao, a.status, a.motivo_interrupcao, p.nascimento as paciente_nascimento, p.sexo as paciente_sexo, p.municipio as paciente_municipio
    FROM atendimentos a
    JOIN pacientes p ON p.id = a.paciente_id
    WHERE 1=1`;
  const params = [];
  let idx = 1;
  if (dataInicial) {
    query += ` AND a.created_at >= $${idx}`;
    params.push(new Date(dataInicial + 'T00:00:00'));
    idx++;
  }
  if (dataFinal) {
    query += ` AND a.created_at <= $${idx}`;
    params.push(new Date(dataFinal + 'T23:59:59'));
    idx++;
  }
  // profissional removido do filtro e do retorno
  query += ` ORDER BY a.created_at DESC`;
  const result = await db.query(query, params);
  const atendimentos = result.rows || [];

  // Estatísticas
  const total = atendimentos.length;
  const masculino = atendimentos.filter(a => a.paciente_sexo === 'M').length;
  const feminino = atendimentos.filter(a => a.paciente_sexo === 'F').length;
  const municipios = new Set(atendimentos.map(a => a.paciente_municipio)).size;

  // Filtros retornados
  const filters = {
    dataInicio: dataInicial || '',
    dataFim: dataFinal || '',
    orderBy: 'created_at',
    order: 'DESC'
  };

  res.json({
    status: 'SUCCESS',
    data: atendimentos,
    statistics: {
      total,
      masculino,
      feminino,
      municipios
    },
    filters
  });
};
import Atendimento from '../models/Atendimento.js';
import db from '../config/database.js';

const registrar = async (req, res) => {
  const { pacienteId, motivo, observacoes, acompanhante, procedencia, status, motivo_interrupcao } = req.body;
  if (!pacienteId || !motivo) {
    return res.status(400).json({ error: 'pacienteId e motivo são obrigatórios.' });
  }
  // Valida se paciente existe
  const paciente = await db.query('SELECT id FROM pacientes WHERE id = $1', [pacienteId]);
  if (paciente.rowCount === 0) {
    return res.status(404).json({ error: 'Paciente não encontrado.' });
  }
  // Cria atendimento
  const atendimento = await Atendimento.criar({ pacienteId, motivo, observacoes, acompanhante, procedencia, status, motivo_interrupcao });
  return res.status(201).json(atendimento);
};

const atualizarStatus = async (req, res) => {
  const { id } = req.params;
  const { status, motivo_interrupcao } = req.body;
  if (!status) {
    return res.status(400).json({ error: 'Status é obrigatório.' });
  }
  // Se status for interrompido, motivo_interrupcao deve ser informado
  if (status === 'interrompido' && (!motivo_interrupcao || motivo_interrupcao.trim() === '')) {
    return res.status(400).json({ error: 'Motivo da interrupção é obrigatório quando status for interrompido.' });
  }
  const atendimento = await Atendimento.atualizarStatus(id, status, status === 'interrompido' ? motivo_interrupcao : 'N/A');
  if (!atendimento) {
    return res.status(404).json({ error: 'Atendimento não encontrado.' });
  }
  return res.json(atendimento);
};

const listarPorPaciente = async (req, res) => {
  const pacienteId = req.params.pacienteId;
  const atendimentos = await Atendimento.listarPorPaciente(pacienteId);
  res.json(atendimentos);
};

const listarDoDia = async (req, res) => {
  // Se vier pacienteId e data, filtra por ambos
  const { pacienteId, data } = req.query;
  if (pacienteId && data) {
    // data no formato yyyy-mm-dd
    const inicio = new Date(data + 'T00:00:00');
    const fim = new Date(data + 'T23:59:59');
    const result = await db.query(
      `SELECT a.*, p.nome as paciente_nome, p.nascimento as paciente_nascimento
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.paciente_id = $1 AND a.data_hora_atendimento BETWEEN $2 AND $3
       ORDER BY a.data_hora_atendimento DESC`,
      [pacienteId, inicio, fim]
    );
    return res.json(result.rows);
  }
  // Busca atendimentos do dia atual (sem filtro)
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  const result = await db.query(
    `SELECT a.*, p.nome as paciente_nome, p.nascimento as paciente_nascimento
     FROM atendimentos a
     JOIN pacientes p ON p.id = a.paciente_id
     WHERE a.data_hora_atendimento BETWEEN $1 AND $2
     ORDER BY a.data_hora_atendimento DESC`,
    [inicio, fim]
  );
  res.json(result.rows);
};

const remover = async (req, res) => {
  const { id } = req.params;
  const result = await db.query('DELETE FROM atendimentos WHERE id = $1 RETURNING *', [id]);
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Atendimento não encontrado.' });
  }
  return res.json({ success: true });
};

export default { registrar, listarPorPaciente, listarDoDia, atualizarStatus, remover, reports };
