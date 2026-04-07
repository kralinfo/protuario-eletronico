/**
 * Validadores para módulo de atendimentos
 * Responsabilidade: Validar dados de entrada
 */

import db from '../config/database.js';

/**
 * Valida ID positivo
 * @param {number} id - ID a validar
 * @throws {Error} Se ID for inválido
 * @returns {number} ID validado
 */
export function validarIDPositivo(id) {
  const idNum = parseInt(id);
  if (isNaN(idNum) || idNum <= 0) {
    throw new Error('ID inválido. Deve ser um número inteiro positivo.');
  }
  return idNum;
}

/**
 * Valida se paciente existe no banco
 * @param {number} pacienteId - ID do paciente
 * @throws {Error} Se paciente não existe
 * @returns {Promise<Object>} Dados do paciente
 */
export async function validarPacienteExiste(pacienteId) {
  const resultado = await db.query(
    'SELECT id, nome FROM pacientes WHERE id = $1',
    [pacienteId]
  );
  
  if (resultado.rowCount === 0) {
    throw new Error('Paciente não encontrado.');
  }
  
  return resultado.rows[0];
}

/**
 * Valida se atendimento existe
 * @param {number} atendimentoId - ID do atendimento
 * @throws {Error} Se atendimento não existe
 * @returns {Promise<Object>} Dados do atendimento
 */
export async function validarAtendimentoExiste(atendimentoId) {
  const resultado = await db.query(
    `SELECT a.*, p.nome as paciente_nome
     FROM atendimentos a
     JOIN pacientes p ON p.id = a.paciente_id
     WHERE a.id = $1`,
    [atendimentoId]
  );
  
  if (resultado.rowCount === 0) {
    throw new Error('Atendimento não encontrado.');
  }
  
  return resultado.rows[0];
}

/**
 * Valida dados de novo atendimento
 * @param {Object} dados - Dados do atendimento
 * @throws {Error} Se dados forem inválidos
 */
export function validarNovoAtendimento(dados) {
  const { pacienteId, motivo } = dados;
  
  if (!pacienteId || !motivo) {
    throw new Error('pacienteId e motivo são obrigatórios.');
  }
  
  const pacienteIdNum = validarIDPositivo(pacienteId);
  
  if (!motivo.toString().trim()) {
    throw new Error('Motivo não pode estar vazio.');
  }
  
  return { pacienteId: pacienteIdNum };
}

/**
 * Valida dados de atualização de status
 * @param {string} status - Novo status
 * @param {string} motivo_interrupcao - Motivo se interrompido
 * @throws {Error} Se dados forem inválidos
 */
export function validarAtualizacaoStatus(status, motivo_interrupcao) {
  if (!status) {
    throw new Error('Status é obrigatório.');
  }
  
  if (status === 'interrompido' && (!motivo_interrupcao || motivo_interrupcao.trim() === '')) {
    throw new Error('Motivo da interrupção é obrigatório quando status for interrompido.');
  }
}

/**
 * Valida dados de abandono
 * @param {Object} dados - Dados do abandono
 * @throws {Error} Se dados forem inválidos
 */
export function validarRegistroAbandono(dados) {
  const { etapa_abandono } = dados;
  
  if (!etapa_abandono) {
    throw new Error('Etapa do abandono é obrigatória (ex: recepcao, triagem, sala_medica, ambulatorio).');
  }
}

/**
 * Valida se atendimento foi abandonado
 * @param {Object} atendimento - Dados do atendimento
 * @throws {Error} Se atendimento foi abandonado
 */
export function validarNaoAbandoando(atendimento) {
  if (atendimento.abandonado) {
    throw new Error('Este atendimento já foi marcado como abandonado.');
  }
}

/**
 * Valida se atendimento não está concluído
 * @param {Object} atendimento - Dados do atendimento
 * @throws {Error} Se atendimento está concluído
 */
export function validarNaoConcluido(atendimento) {
  if (atendimento.status === 'concluido') {
    throw new Error('Não é possível abandonar um atendimento já concluído.');
  }
}

/**
 * Valida atualização completa do atendimento
 * @param {Object} dados - Dados a atualizar
 * @throws {Error} Se dados forem inválidos
 */
export function validarAtualizacaoCompleta(dados) {
  const { motivo } = dados;
  
  if (!motivo || !motivo.trim()) {
    throw new Error('Motivo é obrigatório.');
  }
}

export default {
  validarIDPositivo,
  validarPacienteExiste,
  validarAtendimentoExiste,
  validarNovoAtendimento,
  validarAtualizacaoStatus,
  validarRegistroAbandono,
  validarNaoAbandoando,
  validarNaoConcluido,
  validarAtualizacaoCompleta
};
