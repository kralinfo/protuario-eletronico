import db from '../config/database.js';

class AtestadoEmitido {
  static async create(data) {
    const {
      atendimento_id, paciente_id, medico_id,
      cid, tipo_atestado, dias_afastamento, observacoes,
      data_inicio, data_fim, horario_atestado
    } = data;

    const result = await db.query(
      `INSERT INTO atestados_emitidos (
        atendimento_id, paciente_id, medico_id,
        cid, tipo_atestado, dias_afastamento, observacoes,
        data_inicio, data_fim, horario_atestado
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        atendimento_id, paciente_id, medico_id,
        cid, tipo_atestado, dias_afastamento, observacoes,
        data_inicio, data_fim, horario_atestado
      ]
    );

    return result.rows[0];
  }

  static async findByAtendimento(atendimentoId) {
    const result = await db.query(
      `SELECT a.*, u.nome as medico_nome, u.registro_profissional, u.tipo_registro, u.uf_registro
       FROM atestados_emitidos a
       LEFT JOIN usuarios u ON a.medico_id = u.id
       WHERE a.atendimento_id = $1
       ORDER BY a.data_emissao DESC`,
      [atendimentoId]
    );
    return result.rows;
  }

  static async findByPaciente(pacienteId) {
    const result = await db.query(
      `SELECT a.*, u.nome as medico_nome, u.registro_profissional, u.tipo_registro, u.uf_registro
       FROM atestados_emitidos a
       LEFT JOIN usuarios u ON a.medico_id = u.id
       WHERE a.paciente_id = $1
       ORDER BY a.data_emissao DESC`,
      [pacienteId]
    );
    return result.rows;
  }

  static async delete(id) {
    const result = await db.query(
      'DELETE FROM atestados_emitidos WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  }
}

export default AtestadoEmitido;
