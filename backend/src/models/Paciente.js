import database from '../config/database.js';

class Paciente {
  constructor(data) {
    this.id = data.id;
    this.nome = data.nome;
    this.mae = data.mae;
    this.nascimento = data.nascimento;
    this.sexo = data.sexo;
    this.estado_civil = data.estado_civil;
    this.profissao = data.profissao;
    this.escolaridade = data.escolaridade;
    this.raca = data.raca;
    this.endereco = data.endereco;
    this.bairro = data.bairro;
    this.municipio = data.municipio;
    this.uf = data.uf;
    this.cep = data.cep;
    this.acompanhante = data.acompanhante;
    this.procedencia = data.procedencia;
    this.telefone = data.telefone;
    this.sus = data.sus;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  /**
   * Buscar paciente por ID
   */
  static async findById(id) {
    try {
      const result = await database.query(
        'SELECT * FROM pacientes WHERE id = $1',
        [id]
      );
      
      return result.rows.length > 0 ? new Paciente(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Erro ao buscar paciente por ID: ${error.message}`);
    }
  }

  /**
   * Criar novo paciente
   */
  static async create(pacienteData) {
    try {
      const {
        nome, mae, nascimento, sexo, estado_civil, profissao,
        escolaridade, raca, endereco, bairro, municipio, uf,
        cep, acompanhante, procedencia, telefone, sus
      } = pacienteData;

      const result = await database.query(
        `INSERT INTO pacientes (
          nome, mae, nascimento, sexo, estado_civil, profissao,
          escolaridade, raca, endereco, bairro, municipio, uf,
          cep, acompanhante, procedencia, telefone, sus, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
        ) RETURNING *`,
        [
          nome, mae, nascimento, sexo, estado_civil, profissao,
          escolaridade, raca, endereco, bairro, municipio, uf,
          cep, acompanhante, procedencia, telefone, sus
        ]
      );
      
      return new Paciente(result.rows[0]);
    } catch (error) {
      throw new Error(`Erro ao criar paciente: ${error.message}`);
    }
  }

  /**
   * Atualizar paciente
   */
  static async update(id, pacienteData) {
    try {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      // Campos permitidos para atualização
      const allowedFields = [
        'nome', 'mae', 'nascimento', 'sexo', 'estado_civil', 'profissao',
        'escolaridade', 'raca', 'endereco', 'bairro', 'municipio', 'uf',
        'cep', 'acompanhante', 'procedencia', 'telefone', 'sus'
      ];

      // Construir query dinâmica
      allowedFields.forEach(field => {
        if (pacienteData[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(pacienteData[field]);
          paramIndex++;
        }
      });

      if (updates.length === 0) {
        throw new Error('Nenhum campo para atualizar');
      }

      values.push(id);
      
      const result = await database.query(
        `UPDATE pacientes 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $${paramIndex} 
         RETURNING *`,
        values
      );
      
      return result.rows.length > 0 ? new Paciente(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Erro ao atualizar paciente: ${error.message}`);
    }
  }

  /**
   * Deletar paciente
   */
  static async delete(id) {
    try {
      const result = await database.query(
        'DELETE FROM pacientes WHERE id = $1 RETURNING *',
        [id]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      throw new Error(`Erro ao deletar paciente: ${error.message}`);
    }
  }

  /**
   * Listar pacientes com filtros
   */
  static async findAll(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        orderBy = 'created_at',
        order = 'DESC',
        search = '',
        sexo = '',
        procedencia = '',
        dataInicio = '',
        dataFim = ''
      } = options;

      let query = `
        SELECT *, EXTRACT(YEAR FROM AGE(nascimento)) as idade 
        FROM pacientes 
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      // Filtro de busca
      if (search) {
        query += ` AND (nome ILIKE $${paramIndex} OR mae ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      // Filtro por sexo
      if (sexo) {
        query += ` AND sexo = $${paramIndex}`;
        params.push(sexo);
        paramIndex++;
      }

      // Filtro por procedência
      if (procedencia) {
        query += ` AND procedencia = $${paramIndex}`;
        params.push(procedencia);
        paramIndex++;
      }

      // Filtro por data
      if (dataInicio) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(dataInicio);
        paramIndex++;
      }

      if (dataFim) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(dataFim + ' 23:59:59');
        paramIndex++;
      }

      // Ordenação
      const allowedOrderBy = ['nome', 'created_at', 'nascimento', 'idade'];
      const validOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'created_at';
      const validOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

      query += ` ORDER BY ${validOrderBy} ${validOrder}`;

      // Paginação
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await database.query(query, params);
      
      return result.rows.map(row => new Paciente(row));
    } catch (error) {
      throw new Error(`Erro ao listar pacientes: ${error.message}`);
    }
  }

  /**
   * Contar pacientes com filtros
   */
  static async count(filters = {}) {
    try {
      const { search = '', sexo = '', procedencia = '', dataInicio = '', dataFim = '' } = filters;

      let query = 'SELECT COUNT(*) as total FROM pacientes WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      // Aplicar os mesmos filtros do findAll
      if (search) {
        query += ` AND (nome ILIKE $${paramIndex} OR mae ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (sexo) {
        query += ` AND sexo = $${paramIndex}`;
        params.push(sexo);
        paramIndex++;
      }

      if (procedencia) {
        query += ` AND procedencia = $${paramIndex}`;
        params.push(procedencia);
        paramIndex++;
      }

      if (dataInicio) {
        query += ` AND created_at >= $${paramIndex}`;
        params.push(dataInicio);
        paramIndex++;
      }

      if (dataFim) {
        query += ` AND created_at <= $${paramIndex}`;
        params.push(dataFim + ' 23:59:59');
        paramIndex++;
      }

      const result = await database.query(query, params);
      return parseInt(result.rows[0].total);
    } catch (error) {
      throw new Error(`Erro ao contar pacientes: ${error.message}`);
    }
  }

  /**
   * Buscar por nome (busca parcial)
   */
  static async findByName(nome) {
    try {
      const result = await database.query(
        'SELECT * FROM pacientes WHERE nome ILIKE $1 ORDER BY nome',
        [`%${nome}%`]
      );
      
      return result.rows.map(row => new Paciente(row));
    } catch (error) {
      throw new Error(`Erro ao buscar paciente por nome: ${error.message}`);
    }
  }

  /**
   * Estatísticas dos pacientes
   */
  static async getStatistics(filters = {}) {
    try {
      const { dataInicio = '', dataFim = '' } = filters;

      let whereClause = 'WHERE 1=1';
      const params = [];
      let paramIndex = 1;

      if (dataInicio) {
        whereClause += ` AND created_at >= $${paramIndex}`;
        params.push(dataInicio);
        paramIndex++;
      }

      if (dataFim) {
        whereClause += ` AND created_at <= $${paramIndex}`;
        params.push(dataFim + ' 23:59:59');
        paramIndex++;
      }

      const queries = {
        total: `SELECT COUNT(*) as count FROM pacientes ${whereClause}`,
        porSexo: `
          SELECT sexo, COUNT(*) as quantidade 
          FROM pacientes ${whereClause} 
          GROUP BY sexo
        `,
        porProcedencia: `
          SELECT procedencia, COUNT(*) as quantidade 
          FROM pacientes ${whereClause} 
          GROUP BY procedencia
        `,
        porFaixaEtaria: `
          SELECT 
            CASE 
              WHEN EXTRACT(YEAR FROM AGE(nascimento)) < 18 THEN 'Menor de 18'
              WHEN EXTRACT(YEAR FROM AGE(nascimento)) BETWEEN 18 AND 30 THEN '18-30'
              WHEN EXTRACT(YEAR FROM AGE(nascimento)) BETWEEN 31 AND 50 THEN '31-50'
              WHEN EXTRACT(YEAR FROM AGE(nascimento)) BETWEEN 51 AND 70 THEN '51-70'
              ELSE 'Maior de 70'
            END as faixa_etaria,
            COUNT(*) as quantidade
          FROM pacientes ${whereClause}
          GROUP BY faixa_etaria
          ORDER BY faixa_etaria
        `
      };

      const results = {};
      
      for (const [key, query] of Object.entries(queries)) {
        const result = await database.query(query, params);
        results[key] = result.rows;
      }

      return results;
    } catch (error) {
      throw new Error(`Erro ao obter estatísticas: ${error.message}`);
    }
  }

  /**
   * Calcular idade
   */
  getIdade() {
    if (!this.nascimento) return null;
    
    const hoje = new Date();
    const nascimento = new Date(this.nascimento);
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    
    const mesAtual = hoje.getMonth();
    const mesNascimento = nascimento.getMonth();
    
    if (mesAtual < mesNascimento || (mesAtual === mesNascimento && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    
    return idade;
  }

  /**
   * Verificar se tabela existe
   */
  static async tableExists() {
    try {
      const result = await database.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'pacientes'
        )`
      );
      
      return result.rows[0].exists;
    } catch (error) {
      return false;
    }
  }

  /**
   * Retornar dados com idade calculada
   */
  toJSON() {
    // COMPATIBILIDADE COM PRODUÇÃO - Formato original esperado pelo frontend
    return {
      id: this.id,
      nome: this.nome,
      mae: this.mae,
      nascimento: this.nascimento,
      sexo: this.sexo,
      estadoCivil: this.estado_civil, // Converter para camelCase
      profissao: this.profissao,
      escolaridade: this.escolaridade,
      telefone: this.telefone,
      sus: this.sus,
      raca: this.raca,
      endereco: this.endereco,
      bairro: this.bairro,
      municipio: this.municipio,
      uf: this.uf,
      cep: this.cep,
      acompanhante: this.acompanhante,
      procedencia: this.procedencia,
      idade: this.getIdade()
    };
  }

  /**
   * Buscar pacientes para relatórios com filtros específicos
   */
  static async findAllForReports(options = {}) {
    try {
      const {
        orderBy = 'nome',
        order = 'ASC',
        dataInicio = '',
        dataFim = '',
        sexo = '',
        municipio = '',
        uf = '',
        estadoCivil = '',
        escolaridade = ''
      } = options;

      let query = `
        SELECT *, EXTRACT(YEAR FROM AGE(nascimento)) as idade 
        FROM pacientes 
        WHERE 1=1
      `;
      
      const params = [];
      let paramIndex = 1;

      // Filtro por data de cadastro
      if (dataInicio) {
        query += ` AND DATE(created_at) >= $${paramIndex}`;
        params.push(dataInicio);
        paramIndex++;
      }

      if (dataFim) {
        query += ` AND DATE(created_at) <= $${paramIndex}`;
        params.push(dataFim);
        paramIndex++;
      }

      // Filtro por sexo
      if (sexo) {
        query += ` AND sexo = $${paramIndex}`;
        params.push(sexo);
        paramIndex++;
      }

      // Filtro por município (busca parcial)
      if (municipio) {
        query += ` AND municipio ILIKE $${paramIndex}`;
        params.push(`%${municipio}%`);
        paramIndex++;
      }

      // Filtro por UF
      if (uf) {
        query += ` AND uf = $${paramIndex}`;
        params.push(uf);
        paramIndex++;
      }

      // Filtro por estado civil
      if (estadoCivil) {
        query += ` AND estado_civil = $${paramIndex}`;
        params.push(estadoCivil);
        paramIndex++;
      }

      // Filtro por escolaridade
      if (escolaridade) {
        query += ` AND escolaridade = $${paramIndex}`;
        params.push(escolaridade);
        paramIndex++;
      }

      // Ordenação
      const allowedOrderBy = ['nome', 'created_at', 'nascimento', 'municipio', 'uf', 'sexo'];
      const validOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'nome';
      const validOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

      query += ` ORDER BY ${validOrderBy} ${validOrder}`;

      console.log('🔍 [SQL] Query de relatórios:', query);
      console.log('🔍 [SQL] Parâmetros:', params);

      const result = await database.query(query, params);
      
      return result.rows.map(row => new Paciente(row));
    } catch (error) {
      console.error('❌ [PACIENTE] Erro ao buscar pacientes para relatórios:', error);
      throw new Error(`Erro ao buscar pacientes para relatórios: ${error.message}`);
    }
  }
}

export default Paciente;
