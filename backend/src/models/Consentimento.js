import database from '../config/database.js';

class Consentimento {
  constructor(data) {
    this.id = data.id;
    this.paciente_id = data.paciente_id;
    this.usuario_id = data.usuario_id;
    this.tipo = data.tipo;
    this.versao_termos = data.versao_termos;
    this.ip_coleta = data.ip_coleta;
    this.user_agent = data.user_agent;
    this.data_consentimento = data.data_consentimento;
    this.ativo = data.ativo;
    this.data_revogacao = data.data_revogacao;
    this.usuario_revogacao_id = data.usuario_revogacao_id;
    this.observacoes = data.observacoes;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Registrar consentimento do paciente (LGPD Art. 7, 8, 11).
   */
  static async registrar(data) {
    try {
      const {
        paciente_id,
        usuario_id,
        tipo = 'cadastro',
        versao_termos = '1.0.0',
        ip_coleta,
        user_agent = null,
        observacoes = null
      } = data;

      if (!paciente_id || !usuario_id || !ip_coleta) {
        throw new Error('paciente_id, usuario_id e ip_coleta sao obrigatorios');
      }

      const result = await database.query(
        `INSERT INTO consentimentos (
          paciente_id, usuario_id, tipo, versao_termos,
          ip_coleta, user_agent, observacoes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [paciente_id, usuario_id, tipo, versao_termos, ip_coleta, user_agent, observacoes]
      );

      return new Consentimento(result.rows[0]);
    } catch (error) {
      throw new Error(`Erro ao registrar consentimento: ${error.message}`);
    }
  }

  /**
   * Revogar consentimento (LGPD Art. 8 - consentimento pode ser revogado).
   */
  static async revogar(id, usuarioId) {
    try {
      const result = await database.query(
        `UPDATE consentimentos
         SET ativo = false,
             data_revogacao = CURRENT_TIMESTAMP,
             usuario_revogacao_id = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND ativo = true
         RETURNING *`,
        [id, usuarioId]
      );

      if (result.rows.length === 0) {
        throw new Error('Consentimento nao encontrado ou ja estava revogado');
      }

      return new Consentimento(result.rows[0]);
    } catch (error) {
      throw new Error(`Erro ao revogar consentimento: ${error.message}`);
    }
  }

  /**
   * Buscar consentimentos ativos de um paciente.
   */
  static async buscarPorPaciente(pacienteId) {
    try {
      const result = await database.query(
        'SELECT * FROM consentimentos WHERE paciente_id = $1 ORDER BY data_consentimento DESC',
        [pacienteId]
      );

      return result.rows.map(row => new Consentimento(row));
    } catch (error) {
      throw new Error(`Erro ao buscar consentimentos: ${error.message}`);
    }
  }

  /**
   * Verificar se paciente tem consentimento ativo para um tipo.
   */
  static async temConsentimentoAtivo(pacienteId, tipo = null) {
    try {
      let query = 'SELECT COUNT(*) as total FROM consentimentos WHERE paciente_id = $1 AND ativo = true';
      const params = [pacienteId];

      if (tipo) {
        query += ' AND tipo = $2';
        params.push(tipo);
      }

      const result = await database.query(query, params);
      return parseInt(result.rows[0].total) > 0;
    } catch (error) {
      throw new Error(`Erro ao verificar consentimento: ${error.message}`);
    }
  }

  /**
   * Listar todos os consentimentos com filtros (admin).
   */
  static async listar(filtros = {}) {
    try {
      const {
        paciente_id,
        usuario_id,
        tipo,
        ativo,
        limit = 50,
        offset = 0
      } = filtros;

      let query = 'SELECT * FROM consentimentos WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (paciente_id) {
        query += ` AND paciente_id = $${paramIndex}`;
        params.push(paciente_id);
        paramIndex++;
      }

      if (usuario_id) {
        query += ` AND usuario_id = $${paramIndex}`;
        params.push(usuario_id);
        paramIndex++;
      }

      if (tipo) {
        query += ` AND tipo = $${paramIndex}`;
        params.push(tipo);
        paramIndex++;
      }

      if (ativo !== undefined) {
        query += ` AND ativo = $${paramIndex}`;
        params.push(ativo);
        paramIndex++;
      }

      query += ` ORDER BY data_consentimento DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      return result.rows.map(row => new Consentimento(row));
    } catch (error) {
      throw new Error(`Erro ao listar consentimentos: ${error.message}`);
    }
  }
}

export default Consentimento;
