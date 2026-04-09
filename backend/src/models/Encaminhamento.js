import db from '../config/database.js';

class Encaminhamento {
  static async create(data) {
    const {
      atendimento_id, paciente_id, profissional_solicitante_id,
      tipo_encaminhamento, estabelecimento_destino, motivo_encaminhamento,
      resumo_clinico, cid_relacionado, prioridade = 'normal',
      status = 'pendente', data_agendada
    } = data;

    const result = await db.query(
      `INSERT INTO encaminhamentos (
        atendimento_id, paciente_id, profissional_solicitante_id,
        tipo_encaminhamento, estabelecimento_destino, motivo_encaminhamento,
        resumo_clinico, cid_relacionado, prioridade, status, data_agendada
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        atendimento_id, paciente_id, profissional_solicitante_id,
        tipo_encaminhamento, estabelecimento_destino, motivo_encaminhamento,
        resumo_clinico, cid_relacionado, prioridade, status, data_agendada
      ]
    );

    return result.rows[0];
  }

  static async findByAtendimento(atendimentoId) {
    const result = await db.query(
      `SELECT e.*, u.nome as profissional_nome, u.registro_profissional, u.tipo_registro
       FROM encaminhamentos e
       LEFT JOIN usuarios u ON e.profissional_solicitante_id = u.id
       WHERE e.atendimento_id = $1
       ORDER BY e.data_encaminhamento DESC`,
      [atendimentoId]
    );
    return result.rows;
  }

  static async findByPaciente(pacienteId) {
    const result = await db.query(
      `SELECT e.*, u.nome as profissional_nome, u.registro_profissional, u.tipo_registro
       FROM encaminhamentos e
       LEFT JOIN usuarios u ON e.profissional_solicitante_id = u.id
       WHERE e.paciente_id = $1
       ORDER BY e.data_encaminhamento DESC`,
      [pacienteId]
    );
    return result.rows;
  }

  static async update(id, data) {
    const allowedFields = ['status', 'data_agendada', 'observacoes'];
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
      `UPDATE encaminhamentos
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async delete(id) {
    const result = await db.query(
      'DELETE FROM encaminhamentos WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

export default Encaminhamento;
