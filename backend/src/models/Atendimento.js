import db from '../config/database.js';


class Atendimento {
  static async criar({ pacienteId, motivo, observacoes, acompanhante, procedencia, status = 'encaminhado para triagem', motivo_interrupcao = 'N/A' }) {
    const result = await db.query(
      `INSERT INTO atendimentos (paciente_id, motivo, status, motivo_interrupcao, observacoes, acompanhante, procedencia, data_hora_atendimento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) RETURNING *`,
      [pacienteId, motivo, status, motivo_interrupcao, observacoes || null, acompanhante || null, procedencia || null]
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
    const validStatuses = [
      'recepcao',
      'encaminhado para triagem',
      'em_triagem',
      'encaminhado para sala médica',
      'em atendimento médico',
      'encaminhado para ambulatório',
      'em atendimento ambulatorial',
      'encaminhado para exames'
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(`Status inválido: ${status}`);
    }

    const result = await db.query(
      `UPDATE atendimentos SET status = $1, motivo_interrupcao = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [status, motivo_interrupcao, id]
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
       WHERE a.status = 'encaminhado para triagem'
         AND DATE(a.data_hora_atendimento) = CURRENT_DATE
       ORDER BY 
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
       WHERE id = $1 AND status = 'encaminhado para triagem'
       RETURNING *`,
      [id, usuarioId]
    );
    return result.rows[0];
  }

  static async salvarTriagem(id, dadosTriagem) {
    const {
      pressao_arterial, temperatura, frequencia_cardiaca, frequencia_respiratoria,
      saturacao_oxigenio, peso, altura, classificacao_risco, prioridade,
      queixa_principal, historia_atual, alergias, medicamentos_uso, observacoes_triagem
    } = dadosTriagem;

    const result = await db.query(
      `UPDATE atendimentos 
       SET pressao_arterial = $2, temperatura = $3, frequencia_cardiaca = $4,
           frequencia_respiratoria = $5, saturacao_oxigenio = $6, peso = $7, altura = $8,
           classificacao_risco = $9, prioridade = $10, queixa_principal = $11,
           historia_atual = $12, alergias = $13, medicamentos_uso = $14,
           observacoes_triagem = $15, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'em_triagem'
       RETURNING *`,
      [
        id, pressao_arterial, temperatura, frequencia_cardiaca, frequencia_respiratoria,
        saturacao_oxigenio, peso, altura, classificacao_risco, prioridade,
        queixa_principal, historia_atual, alergias, medicamentos_uso, observacoes_triagem
      ]
    );
    return result.rows[0];
  }

  static async finalizarTriagem(id) {
    const result = await db.query(
      `UPDATE atendimentos 
       SET status = 'triagem_finalizada',
           data_fim_triagem = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'em_triagem'
       RETURNING *`,
      [id]
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
    const { motivo, observacoes, status, procedencia, acompanhante } = atendimentoData;
    
    const result = await db.query(
      `UPDATE atendimentos 
       SET motivo = $1, observacoes = $2, status = $3, procedencia = $4, 
           acompanhante = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 RETURNING *`,
      [motivo, observacoes || null, status || 'encaminhado para triagem', 
       procedencia || null, acompanhante || null, id]
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
