import db from '../config/database.js';

class ExameSolicitado {
  static async create(data) {
    const {
      atendimento_id, paciente_id, profissional_solicitante_id,
      tipo_exame, nome_exame, observacoes, questao_clinica,
      prioridade = 'normal', status = 'solicitado'
    } = data;

    const result = await db.query(
      `INSERT INTO exames_solicitados (
        atendimento_id, paciente_id, profissional_solicitante_id,
        tipo_exame, nome_exame, observacoes, questao_clinica,
        prioridade, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        atendimento_id, paciente_id, profissional_solicitante_id,
        tipo_exame, nome_exame, observacoes, questao_clinica,
        prioridade, status
      ]
    );

    return result.rows[0];
  }

  static async findByAtendimento(atendimentoId) {
    const result = await db.query(
      `SELECT e.*, u.nome as profissional_nome, u.registro_profissional, u.tipo_registro
       FROM exames_solicitados e
       LEFT JOIN usuarios u ON e.profissional_solicitante_id = u.id
       WHERE e.atendimento_id = $1
       ORDER BY e.data_solicitacao DESC`,
      [atendimentoId]
    );
    return result.rows;
  }

  static async findByPaciente(pacienteId) {
    const result = await db.query(
      `SELECT e.*, u.nome as profissional_nome, u.registro_profissional, u.tipo_registro
       FROM exames_solicitados e
       LEFT JOIN usuarios u ON e.profissional_solicitante_id = u.id
       WHERE e.paciente_id = $1
       ORDER BY e.data_solicitacao DESC`,
      [pacienteId]
    );
    return result.rows;
  }

  static async registrarResultado(id, resultado) {
    const result = await db.query(
      `UPDATE exames_solicitados
       SET resultado = $1, status = 'resultado_recebido', data_resultado = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [resultado, id]
    );
    return result.rows[0];
  }

  static async update(id, data) {
    const allowedFields = ['status', 'observacoes', 'resultado'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    });

    if (updates.length === 0) return null;

    values.push(id);
    const result = await db.query(
      `UPDATE exames_solicitados
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async delete(id) {
    const result = await db.query(
      'DELETE FROM exames_solicitados WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

export default ExameSolicitado;
