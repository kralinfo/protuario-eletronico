import database from '../config/database.js';
import { encryptFields, decryptFields, SENSITIVE_FIELDS } from '../config/encryption.js';

const PACIENTE_SENSITIVE_FIELDS = SENSITIVE_FIELDS.paciente;

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

      if (result.rows.length === 0) return null;

      // Descriptografar campos sensiveis (LGPD Art. 46)
      const dadosDescriptografados = decryptFields(result.rows[0], PACIENTE_SENSITIVE_FIELDS);
      return new Paciente(dadosDescriptografados);
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
        cep, telefone, sus
      } = pacienteData;

      // Criptografar campos sensiveis antes de salvar (LGPD Art. 46)
      const dadosCriptografados = encryptFields({
        nome, mae, nascimento, sexo, estado_civil, profissao,
        escolaridade, raca, endereco, bairro, municipio, uf,
        cep, telefone, sus
      }, PACIENTE_SENSITIVE_FIELDS);

      const result = await database.query(
        `INSERT INTO pacientes (
          nome, mae, nascimento, sexo, estado_civil, profissao,
          escolaridade, raca, endereco, bairro, municipio, uf,
          cep, telefone, sus, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP
        ) RETURNING *`,
        [
          dadosCriptografados.nome, dadosCriptografados.mae, dadosCriptografados.nascimento,
          dadosCriptografados.sexo, dadosCriptografados.estado_civil, dadosCriptografados.profissao,
          dadosCriptografados.escolaridade, dadosCriptografados.raca, dadosCriptografados.endereco,
          dadosCriptografados.bairro, dadosCriptografados.municipio, dadosCriptografados.uf,
          dadosCriptografados.cep, dadosCriptografados.telefone, dadosCriptografados.sus
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
        'cep', 'telefone', 'sus'
      ];

      // Criptografar campos sensiveis antes de salvar (LGPD Art. 46)
      const dadosParaAtualizar = {};
      allowedFields.forEach(field => {
        if (pacienteData[field] !== undefined) {
          dadosParaAtualizar[field] = pacienteData[field];
        }
      });
      const dadosCriptografados = encryptFields(dadosParaAtualizar, PACIENTE_SENSITIVE_FIELDS);

      // Construir query dinâmica com dados já criptografados
      allowedFields.forEach(field => {
        if (dadosCriptografados[field] !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(dadosCriptografados[field]);
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

      if (result.rows.length === 0) return null;

      // Descriptografar campos sensiveis no retorno
      const dadosDescriptografados = decryptFields(result.rows[0], PACIENTE_SENSITIVE_FIELDS);
      return new Paciente(dadosDescriptografados);
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

      // Descriptografar campos sensiveis em cada registro (LGPD Art. 46)
      return result.rows.map(row => {
        const dadosDescriptografados = decryptFields(row, PACIENTE_SENSITIVE_FIELDS);
        return new Paciente(dadosDescriptografados);
      });
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

      // Descriptografar campos sensiveis (LGPD Art. 46)
      return result.rows.map(row => {
        const dadosDescriptografados = decryptFields(row, PACIENTE_SENSITIVE_FIELDS);
        return new Paciente(dadosDescriptografados);
      });
    } catch (error) {
      throw new Error(`Erro ao buscar paciente por nome: ${error.message}`);
    }
  }

  /**
   * Verificar se SUS já está em uso
   */
  static async findBySus(sus, excludeId = null) {
    try {
      // Não verifica se SUS estiver vazio ou null
      if (!sus || sus.trim() === '') {
        return [];
      }

      let query = 'SELECT * FROM pacientes WHERE sus = $1';
      const params = [sus.trim()];

      // Se fornecido excludeId, exclui esse paciente da busca (útil para updates)
      if (excludeId) {
        query += ' AND id != $2';
        params.push(excludeId);
      }

      const result = await database.query(query, params);
      // Descriptografar campos sensiveis (LGPD Art. 46)
      return result.rows.map(row => {
        const dadosDescriptografados = decryptFields(row, PACIENTE_SENSITIVE_FIELDS);
        return new Paciente(dadosDescriptografados);
      });
    } catch (error) {
      throw new Error(`Erro ao verificar SUS: ${error.message}`);
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
      idade: this.getIdade(),
      created_at: this.created_at,
      updated_at: this.updated_at
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

      // Filtro por estado civil (considerando variações)
      if (estadoCivil) {
        let estadoCivilCondition = '';
        switch(estadoCivil.toLowerCase()) {
          case 'solteiro':
            estadoCivilCondition = `(estado_civil ILIKE 'solteiro%' OR estado_civil ILIKE 'solteira%')`;
            break;
          case 'casado':
            estadoCivilCondition = `(estado_civil ILIKE 'casado%' OR estado_civil ILIKE 'casada%')`;
            break;
          case 'divorciado':
            estadoCivilCondition = `(estado_civil ILIKE 'divorciado%' OR estado_civil ILIKE 'divorciada%')`;
            break;
          case 'viuvo':
            estadoCivilCondition = `(estado_civil ILIKE 'viúvo%' OR estado_civil ILIKE 'viúva%' OR estado_civil ILIKE 'viuvo%' OR estado_civil ILIKE 'viuva%')`;
            break;
          case 'uniao_estavel':
            estadoCivilCondition = `(estado_civil ILIKE '%união%estável%' OR estado_civil ILIKE '%uniao%estavel%')`;
            break;
          default:
            estadoCivilCondition = `estado_civil ILIKE $${paramIndex}`;
            params.push(`%${estadoCivil}%`);
            paramIndex++;
        }
        
        if (estadoCivilCondition && !estadoCivilCondition.includes('$')) {
          query += ` AND ${estadoCivilCondition}`;
        } else if (estadoCivilCondition.includes('$')) {
          query += ` AND ${estadoCivilCondition}`;
        }
      }

      // Filtro por escolaridade (considerando variações)
      if (escolaridade) {
        let escolaridadeCondition = '';
        switch(escolaridade.toLowerCase()) {
          case 'analfabeto':
            escolaridadeCondition = `(escolaridade ILIKE '%analfabeto%' OR escolaridade ILIKE '%analfabeta%')`;
            break;
          case 'fundamental_incompleto':
            escolaridadeCondition = `(escolaridade ILIKE '%fundamental%incompleto%' OR escolaridade ILIKE '%fundamental%incompl%' OR escolaridade ILIKE '%elementar%incompleto%')`;
            break;
          case 'fundamental_completo':
            escolaridadeCondition = `(escolaridade ILIKE '%fundamental%completo%' OR escolaridade ILIKE '%fundamental%compl%' OR escolaridade ILIKE '%elementar%completo%')`;
            break;
          case 'medio_incompleto':
            escolaridadeCondition = `(escolaridade ILIKE '%médio%incompleto%' OR escolaridade ILIKE '%medio%incompleto%' OR escolaridade ILIKE '%médio%incompl%' OR escolaridade ILIKE '%medio%incompl%')`;
            break;
          case 'medio_completo':
            escolaridadeCondition = `(escolaridade ILIKE '%médio%completo%' OR escolaridade ILIKE '%medio%completo%' OR escolaridade ILIKE '%médio%compl%' OR escolaridade ILIKE '%medio%compl%' OR escolaridade ILIKE 'medio' OR escolaridade ILIKE 'médio')`;
            break;
          case 'superior_incompleto':
            escolaridadeCondition = `(escolaridade ILIKE '%superior%incompleto%' OR escolaridade ILIKE '%superior%incompl%' OR escolaridade ILIKE '%universitário%incompleto%' OR escolaridade ILIKE '%universitario%incompleto%')`;
            break;
          case 'superior_completo':
            escolaridadeCondition = `(escolaridade ILIKE '%superior%completo%' OR escolaridade ILIKE '%superior%compl%' OR escolaridade ILIKE '%universitário%completo%' OR escolaridade ILIKE '%universitario%completo%' OR escolaridade ILIKE 'superior')`;
            break;
          case 'pos_graduacao':
            escolaridadeCondition = `(escolaridade ILIKE '%pós%graduação%' OR escolaridade ILIKE '%pos%graduacao%' OR escolaridade ILIKE '%mestrado%' OR escolaridade ILIKE '%doutorado%' OR escolaridade ILIKE '%especialização%' OR escolaridade ILIKE '%especializacao%')`;
            break;
          default:
            escolaridadeCondition = `escolaridade ILIKE $${paramIndex}`;
            params.push(`%${escolaridade}%`);
            paramIndex++;
        }
        
        if (escolaridadeCondition && !escolaridadeCondition.includes('$')) {
          query += ` AND ${escolaridadeCondition}`;
        } else if (escolaridadeCondition.includes('$')) {
          query += ` AND ${escolaridadeCondition}`;
        }
      }

      // Ordenação
      const allowedOrderBy = ['nome', 'created_at', 'nascimento', 'municipio', 'uf', 'sexo'];
      const validOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'nome';
      const validOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'ASC';

      query += ` ORDER BY ${validOrderBy} ${validOrder}`;

      console.log('🔍 [SQL] Query de relatórios:', query);
      console.log('🔍 [SQL] Parâmetros:', params);

      const result = await database.query(query, params);

      // Descriptografar campos sensiveis (LGPD Art. 46)
      return result.rows.map(row => {
        const dadosDescriptografados = decryptFields(row, PACIENTE_SENSITIVE_FIELDS);
        return new Paciente(dadosDescriptografados);
      });
    } catch (error) {
      console.error('❌ [PACIENTE] Erro ao buscar pacientes para relatórios:', error);
      throw new Error(`Erro ao buscar pacientes para relatórios: ${error.message}`);
    }
  }

  // Buscar estados civis únicos no banco
  static async getDistinctEstadosCivis() {
    try {
      const query = `
        SELECT DISTINCT estado_civil 
        FROM pacientes 
        WHERE estado_civil IS NOT NULL 
        AND estado_civil != '' 
        ORDER BY estado_civil
      `;
      
      const result = await database.query(query);
      return result.rows.map(row => row.estado_civil);
    } catch (error) {
      console.error('❌ [PACIENTE] Erro ao buscar estados civis:', error);
      throw new Error(`Erro ao buscar estados civis: ${error.message}`);
    }
  }

  // Buscar escolaridades únicas no banco
  static async getDistinctEscolaridades() {
    try {
      const query = `
        SELECT DISTINCT escolaridade 
        FROM pacientes 
        WHERE escolaridade IS NOT NULL 
        AND escolaridade != '' 
        ORDER BY escolaridade
      `;
      
      const result = await database.query(query);
      return result.rows.map(row => row.escolaridade);
    } catch (error) {
      console.error('❌ [PACIENTE] Erro ao buscar escolaridades:', error);
      throw new Error(`Erro ao buscar escolaridades: ${error.message}`);
    }
  }
}

export default Paciente;
