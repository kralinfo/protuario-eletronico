/**
 * Repositório para módulo de atendimentos
 * Responsabilidade: Interagir com banco de dados
 */

import db from '../config/database.js';
import Atendimento from '../models/Atendimento.js';

/**
 * Verifica se coluna de abandono existe
 * @returns {Promise<boolean>}
 */
export async function verificarColunaAbandono() {
  const resultado = await db.query(
    `SELECT column_name FROM information_schema.columns 
     WHERE table_name='atendimentos' AND column_name='abandonado'`
  );
  return resultado.rowCount > 0;
}

/**
 * Busca relatório de atendimentos com filtros
 * @param {Object} filtros - {dataInicial, dataFinal}
 * @returns {Promise<Array>} Lista de atendimentos
 */
export async function buscarRelatorio(filtros) {
  const { dataInicial, dataFinal } = filtros;
  const hasAbandonado = await verificarColunaAbandono();
  
  const abandonoSelect = hasAbandonado 
    ? 'a.abandonado, a.data_abandono,'
    : "false as abandonado, NULL as data_abandono,";

  let query = `
    SELECT a.id, a.created_at as data_criacao, p.nome as paciente_nome,
           a.data_hora_atendimento, a.procedencia as procedimento, a.motivo,
           a.observacoes as observacao, a.status, a.motivo_interrupcao,
           ${abandonoSelect}
           p.nascimento, p.sexo, p.municipio, p.mae, p.estado_civil,
           p.profissao, p.escolaridade, p.raca, p.endereco, p.bairro,
           p.uf, p.cep, p.telefone, p.sus
    FROM atendimentos a
    JOIN pacientes p ON p.id = a.paciente_id
    WHERE 1=1
  `;
  
  const params = [];
  let idx = 1;

  if (dataInicial) {
    query += ` AND a.data_hora_atendimento >= $${idx}`;
    params.push(new Date(dataInicial + 'T00:00:00'));
    idx++;
  }

  if (dataFinal) {
    query += ` AND a.data_hora_atendimento <= $${idx}`;
    params.push(new Date(dataFinal + 'T23:59:59'));
    idx++;
  }

  query += ` ORDER BY a.created_at DESC`;
  
  const resultado = await db.query(query, params);
  return resultado.rows || [];
}

/**
 * Busca atendimentos do dia com filtros
 * @param {Object} filtros - {pacienteId, data, status}
 * @returns {Promise<Array>}
 */
export async function buscarAtendimentosDoDia(filtros) {
  const { pacienteId, data, status } = filtros;
  const whereClauses = [];
  const params = [];
  let idx = 1;

  if (pacienteId) {
    whereClauses.push(`a.paciente_id = $${idx++}`);
    params.push(parseInt(pacienteId));
  }

  if (data) {
    whereClauses.push(`a.data_hora_atendimento::date = $${idx++}`);
    params.push(new Date(data).toISOString().split('T')[0]);
  }

  if (status) {
    whereClauses.push(`a.status = $${idx++}`);
    params.push(status);
  }

  const whereClause = whereClauses.length > 0 
    ? 'WHERE ' + whereClauses.join(' AND ') 
    : '';

  const query = `
    SELECT a.*, p.nome as paciente_nome, p.telefone as paciente_telefone
    FROM atendimentos a
    JOIN pacientes p ON p.id = a.paciente_id
    ${whereClause}
    ORDER BY a.data_hora_atendimento DESC
  `;

  const resultado = await db.query(query, params);
  return resultado.rows;
}

/**
 * Busca atendimento por ID
 * @param {number} id - ID do atendimento
 * @returns {Promise<Object>}
 */
export async function buscarAtendimentoPorId(id) {
  const resultado = await db.query(
    `SELECT a.*, p.nome as paciente_nome
     FROM atendimentos a
     JOIN pacientes p ON p.id = a.paciente_id
     WHERE a.id = $1`,
    [id]
  );
  
  return resultado.rowCount > 0 ? resultado.rows[0] : null;
}

/**
 * Busca atendimentos por paciente
 * @param {number} pacienteId - ID do paciente
 * @returns {Promise<Array>}
 */
export async function buscarAtendimentosPorPaciente(pacienteId) {
  return await Atendimento.listarPorPaciente(pacienteId);
}

/**
 * Cria novo atendimento
 * @param {Object} dados - Dados do atendimento
 * @returns {Promise<Object>}
 */
export async function criarAtendimento(dados) {
  return await Atendimento.criar({
    pacienteId: dados.pacienteId,
    motivo: dados.motivo,
    observacoes: dados.observacoes || null,
    acompanhante: dados.acompanhante || null,
    procedencia: dados.procedencia || null,
    status: dados.status || 'encaminhado para triagem',
    motivo_interrupcao: dados.motivo_interrupcao || null
  });
}

/**
 * Atualiza status do atendimento
 * @param {number} id - ID do atendimento
 * @param {string} status - Novo status
 * @param {string} motivo - Motivo (se necessário)
 * @returns {Promise<Object>}
 */
export async function atualizarStatusAtendimento(id, status, motivo) {
  return await Atendimento.atualizarStatus(id, status, motivo || 'N/A');
}

/**
 * Registra abandono do atendimento
 * @param {number} id - ID do atendimento
 * @param {Object} dados - {motivo_abandono, etapa_abandono, usuario_id}
 * @returns {Promise<Object>}
 */
export async function registrarAbandonoAtendimento(id, dados) {
  const query = `
    UPDATE atendimentos 
    SET 
      abandonado = true,
      data_abandono = CURRENT_TIMESTAMP,
      motivo_abandono = $1,
      etapa_abandono = $2,
      usuario_abandono_id = $3,
      status = 'abandonado',
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
  `;

  const resultado = await db.query(query, [
    dados.motivo_abandono || 'Não informado',
    dados.etapa_abandono,
    dados.usuario_id || null,
    id
  ]);

  return resultado.rowCount > 0 ? resultado.rows[0] : null;
}

/**
 * Busca status de abandono do atendimento
 * @param {number} id - ID do atendimento
 * @returns {Promise<boolean>}
 */
export async function buscarStatusAbandono(id) {
  const query = `
    SELECT
      (CASE WHEN (SELECT count(*) FROM information_schema.columns 
       WHERE table_name='atendimentos' AND column_name='abandonado') > 0
        THEN abandonado ELSE false END) as abandonado,
      status
    FROM atendimentos 
    WHERE id = $1
  `;

  const resultado = await db.query(query, [id]);
  return resultado.rowCount > 0 ? resultado.rows[0] : null;
}

/**
 * Atualiza dados médico do atendimento
 * @param {number} id - ID do atendimento
 * @param {Object} dados - Dados médicos
 * @returns {Promise<Object>}
 */
export async function atualizarDadosMedico(id, dados) {
  const query = `
    UPDATE atendimentos SET 
      motivo = $2,
      exame_fisico = $3,
      hipotese_diagnostica = $4,
      conduta_prescricao = $5,
      status_destino = $6,
      observacoes = $7,
      status = $8,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;

  const resultado = await db.query(query, [
    id,
    dados.motivo_consulta || null,
    dados.exame_fisico || null,
    dados.hipotese_diagnostica || null,
    dados.conduta_prescricao || null,
    dados.status_destino || null,
    dados.observacoes || null,
    dados.status || 'em atendimento médico'
  ]);

  return resultado.rowCount > 0 ? resultado.rows[0] : null;
}

/**
 * Atualiza atendimento completo
 * @param {number} id - ID do atendimento
 * @param {Object} dados - Dados a atualizar
 * @returns {Promise<Object>}
 */
export async function atualizarAtendimento(id, dados) {
  return await Atendimento.update(id, {
    motivo: dados.motivo?.trim() || null,
    observacoes: dados.observacoes?.trim() || null,
    status: dados.status || 'encaminhado para triagem',
    procedencia: dados.procedencia?.trim() || null,
    acompanhante: dados.acompanhante?.trim() || null,
    queixa_principal: dados.queixa_principal?.trim() || null,
    historia_atual: dados.historia_atual?.trim() || null
  });
}

/**
 * Salva alterações de triagem
 * @param {number} id - ID do atendimento
 * @param {Object} dados - Dados de triagem
 * @returns {Promise<Object>}
 */
export async function salvarAlteracoesTriagem(id, dados) {
  return await Atendimento.salvarTriagem(id, dados);
}

/**
 * Lista todos os atendimentos
 * @returns {Promise<Array>}
 */
export async function listarTodosAtendimentos() {
  return await Atendimento.listarTodos();
}

export default {
  verificarColunaAbandono,
  buscarRelatorio,
  buscarAtendimentosDoDia,
  buscarAtendimentoPorId,
  buscarAtendimentosPorPaciente,
  criarAtendimento,
  atualizarStatusAtendimento,
  registrarAbandonoAtendimento,
  buscarStatusAbandono,
  atualizarDadosMedico,
  atualizarAtendimento,
  salvarAlteracoesTriagem,
  listarTodosAtendimentos
};
