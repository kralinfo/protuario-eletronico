import db from '../config/database.js';


class Atendimento {
  static async criar({ pacienteId, motivo, observacoes, acompanhante, procedencia, status = 'recepcao', motivo_interrupcao = 'N/A' }) {
    const result = await db.query(
      `INSERT INTO atendimentos (paciente_id, motivo, status, motivo_interrupcao, observacoes, acompanhante, procedencia, data_atendimento)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW()) RETURNING *`,
      [pacienteId, motivo, status, motivo_interrupcao, observacoes || null, acompanhante || null, procedencia || null]
    );
    return result.rows[0];
  }

  static async listarPorPaciente(pacienteId) {
    const result = await db.query(
      `SELECT * FROM atendimentos WHERE paciente_id = $1 ORDER BY data_atendimento DESC`,
      [pacienteId]
    );
    return result.rows;
  }

  static async atualizarStatus(id, status, motivo_interrupcao = 'N/A') {
    const result = await db.query(
      `UPDATE atendimentos SET status = $1, motivo_interrupcao = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`,
      [status, motivo_interrupcao, id]
    );
    return result.rows[0];
  }
}

export default Atendimento;
