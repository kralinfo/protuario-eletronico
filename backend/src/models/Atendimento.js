import db from '../config/database.js';
import { normalizeStatus, VALID_STATUSES } from '../utils/normalizeStatus.js';


class Atendimento {
  static async findByAtendimentoId(id) {
    const result = await db.query(
      'SELECT * FROM atendimentos WHERE id = $1',
      [id]
    );
    return result.rows[0];
  }

  static async criar({ pacienteId, motivo, observacoes, acompanhante, procedencia, status = 'encaminhado_para_triagem', motivo_interrupcao = 'N/A' }) {
    const statusNorm = normalizeStatus(status);
    const result = await db.query(
      `INSERT INTO atendimentos (paciente_id, motivo, status, motivo_interrupcao, observacoes, acompanhante, procedencia, data_hora_atendimento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
      [pacienteId, motivo, statusNorm, motivo_interrupcao, observacoes || null, acompanhante || null, procedencia || null]
    );
    return result.rows[0];
  }

  static async listarPorPaciente(pacienteId) {
    const result = await db.query(
      `SELECT * FROM atendimentos WHERE paciente_id = $1 ORDER BY created_at DESC`,
      [pacienteId]
    );
    return result.rows;
  }

  static async listarTodos() {
    const result = await db.query(
      `SELECT a.*, p.nome as paciente_nome
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       ORDER BY a.data_hora_atendimento DESC`
    );
    return result.rows;
  }

  static async atualizarStatus(id, status, motivo_interrupcao = 'N/A') {
    const statusNorm = normalizeStatus(status);
    if (!VALID_STATUSES.includes(statusNorm)) {
      throw new Error(`Status inválido: ${status} (normalizado: ${statusNorm})`);
    }

    const result = await db.query(
      `UPDATE atendimentos SET status = $1, motivo_interrupcao = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [statusNorm, motivo_interrupcao, id]
    );
    return result.rows[0];
  }

  // === MÉTODOS ESPECÍFICOS PARA TRIAGEM ===

  static async listarFilaTriagem() {
    const result = await db.query(
      `SELECT a.id, a.created_at, a.data_hora_atendimento, a.status, a.prioridade,
              a.classificacao_risco, a.queixa_principal,
              p.nome as paciente_nome, p.nascimento as paciente_nascimento,
              p.sexo as paciente_sexo
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       WHERE a.status = 'encaminhado_para_triagem'
         AND DATE(a.data_hora_atendimento) = CURRENT_DATE
       ORDER BY 
         a.prioridade ASC NULLS LAST,
         a.created_at ASC`
    );
    return result.rows;
  }

  static async listarTodosAtendimentosDia() {
    const result = await db.query(
          `SELECT a.id, a.created_at, a.data_hora_atendimento, a.status, a.prioridade,
                  a.classificacao_risco, a.queixa_principal,
                  p.nome as paciente_nome, p.nascimento as paciente_nascimento,
                  p.sexo as paciente_sexo
           FROM atendimentos a
           JOIN pacientes p ON p.id = a.paciente_id
           WHERE (
             -- Itens dos últimos 24h que já passaram pela triagem (classificacao_risco preenchida)
             a.classificacao_risco IS NOT NULL
             AND a.data_hora_atendimento >= NOW() - INTERVAL '24 hours'
           )
           OR (
             -- Itens disponíveis para triagem (mantém lógica anterior para o card de disponíveis)
             a.status IN (
               'encaminhado_para_triagem',
               'em_triagem'
             )
             AND a.data_hora_atendimento >= NOW() - INTERVAL '24 hours'
           )
           ORDER BY 
             CASE 
               WHEN a.status = 'encaminhado_para_triagem' THEN 1
               WHEN a.status = 'em_triagem' THEN 2
               ELSE 3
             END,
             a.prioridade ASC NULLS LAST,
             a.created_at ASC`
        );
        return result.rows;
      }

  static async iniciarTriagem(id, usuarioId) {
    const result = await db.query(
      `UPDATE atendimentos 
       SET status = 'em_triagem', 
           triagem_realizada_por = $2,
           data_inicio_triagem = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'encaminhado_para_triagem'
       RETURNING *`,
      [id, usuarioId]
    );
    return result.rows[0];
  }

  static async salvarTriagem(id, dadosTriagem) {
    // Helper para converter string vazia ou undefined em null
    const parseNum = v => (v === '' || v === undefined ? null : v);
    const {
      pressao_arterial,
      temperatura,
      frequencia_cardiaca,
      saturacao_oxigenio,
      classificacao_risco,
      queixa_principal,
      historia_atual,
      observacoes_triagem
    } = dadosTriagem;

    // Montar query dinamicamente para não sobrescrever classificacao_risco se não vier
    let queryFields = [];
    let queryValues = [id];
    let valueIndex = 2;

    if (pressao_arterial !== undefined) {
      queryFields.push(`pressao_arterial = $${valueIndex++}`);
      queryValues.push(pressao_arterial);
    }
    if (temperatura !== undefined) {
      queryFields.push(`temperatura = $${valueIndex++}`);
      queryValues.push(parseNum(temperatura));
    }
    if (frequencia_cardiaca !== undefined) {
      queryFields.push(`frequencia_cardiaca = $${valueIndex++}`);
      queryValues.push(parseNum(frequencia_cardiaca));
    }
    if (saturacao_oxigenio !== undefined) {
      queryFields.push(`saturacao_oxigenio = $${valueIndex++}`);
      queryValues.push(parseNum(saturacao_oxigenio));
    }
    if (classificacao_risco !== undefined) {
      queryFields.push(`classificacao_risco = $${valueIndex++}`);
      queryValues.push(classificacao_risco);
    }
    if (queixa_principal !== undefined) {
      queryFields.push(`queixa_principal = $${valueIndex++}`);
      queryValues.push(queixa_principal);
    }
    if (historia_atual !== undefined) {
      queryFields.push(`historia_atual = $${valueIndex++}`);
      queryValues.push(historia_atual);
    }
    if (observacoes_triagem !== undefined) {
      queryFields.push(`observacoes_triagem = $${valueIndex++}`);
      queryValues.push(observacoes_triagem);
    }

    if (queryFields.length === 0) {
      // Se não há campos para atualizar, apenas retorna o atendimento atual
      const result = await db.query('SELECT * FROM atendimentos WHERE id = $1', [id]);
      return result.rows[0];
    }

    queryFields.push(`updated_at = CURRENT_TIMESTAMP`);

    const result = await db.query(
      `UPDATE atendimentos SET ${queryFields.join(', ')} WHERE id = $1 RETURNING *`,
      queryValues
    );
    return result.rows[0];
  }

  static async finalizarTriagem(id, statusDestino = 'encaminhado_para_sala_medica') {
    const statusNorm = normalizeStatus(statusDestino);
    const result = await db.query(
      `UPDATE atendimentos 
       SET status = $2,
           data_fim_triagem = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [id, statusNorm]
    );
    return result.rows[0];
  }

  static async obterDadosTriagem(id) {
    const result = await db.query(
      `SELECT a.*, p.nome as paciente_nome, p.nascimento as paciente_nascimento,
              p.sexo as paciente_sexo, p.sus as paciente_sus,
              u.nome as triagem_realizada_por_nome
       FROM atendimentos a
       JOIN pacientes p ON p.id = a.paciente_id
       LEFT JOIN usuarios u ON u.id = a.triagem_realizada_por
       WHERE a.id = $1`,
      [id]
    );
    return result.rows[0];
  }

  static async update(id, atendimentoData) {
    const { motivo, observacoes, status, procedencia, acompanhante, queixa_principal, historia_atual } = atendimentoData;
    const result = await db.query(
      `UPDATE atendimentos 
       SET motivo = $1, observacoes = $2, status = $3, procedencia = $4, 
           acompanhante = $5, queixa_principal = $6, historia_atual = $7, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8 RETURNING *`,
      [
        motivo,
        observacoes || null,
        normalizeStatus(status || 'encaminhado_para_triagem'),
        procedencia || null,
        acompanhante || null,
        queixa_principal || null,
        historia_atual || null,
        id
      ]
    );
    return result.rows[0];
  }

  static async listarTriagensRealizadas(usuarioId = null, dataInicio = null, dataFim = null) {
    let query = `
      SELECT a.id, a.created_at, a.data_inicio_triagem, a.data_fim_triagem,
             a.classificacao_risco, a.prioridade, a.status,
             p.nome as paciente_nome,
             u.nome as triagem_realizada_por_nome
      FROM atendimentos a
      JOIN pacientes p ON p.id = a.paciente_id
      LEFT JOIN usuarios u ON u.id = a.triagem_realizada_por
      WHERE a.data_inicio_triagem IS NOT NULL
    `;
    
    const params = [];
    let paramIndex = 1;

    if (usuarioId) {
      query += ` AND a.triagem_realizada_por = $${paramIndex}`;
      params.push(usuarioId);
      paramIndex++;
    }

    if (dataInicio) {
      query += ` AND DATE(a.data_inicio_triagem) >= $${paramIndex}`;
      params.push(dataInicio);
      paramIndex++;
    }

    if (dataFim) {
      query += ` AND DATE(a.data_inicio_triagem) <= $${paramIndex}`;
      params.push(dataFim);
      paramIndex++;
    }

    query += ` ORDER BY a.data_inicio_triagem DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }
}

export default Atendimento;
