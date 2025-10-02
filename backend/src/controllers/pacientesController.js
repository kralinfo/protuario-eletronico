import Paciente from '../models/Paciente.js';
import { AppError } from '../middleware/errorHandler.js';

class PacientesController {
  /**
   * Listar pacientes com filtros e paginação
   */
  static async index(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        sexo = '',
        dataInicio = '',
        dataFim = '',
        orderBy = 'created_at',
        order = 'DESC'
      } = req.query;

      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;

      const filters = {
        limit: limitNum,
        offset,
        search,
        sexo,
        dataInicio,
        dataFim,
        orderBy,
        order
      };

      // Buscar pacientes e contar total
      const [pacientes, total] = await Promise.all([
        Paciente.findAll(filters),
        Paciente.count({ search, sexo, dataInicio, dataFim })
      ]);

      // COMPATIBILIDADE COM PRODUÇÃO - Retorna formato original
      // Se não há filtros específicos (busca simples), retorna apenas o array
      const isSimpleQuery = !search && !sexo && !dataInicio && !dataFim && 
                           pageNum === 1 && limitNum === 20 && orderBy === 'created_at';

      if (isSimpleQuery) {
        // Formato original para compatibilidade
        return res.json(pacientes.map(p => p.toJSON()));
      }

      // Formato novo para buscas avançadas
      const totalPages = Math.ceil(total / limitNum);

      res.json({
        status: 'SUCCESS',
        data: pacientes.map(p => p.toJSON()),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalItems: total,
          itemsPerPage: limitNum,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        },
        filters: {
          search,
          sexo,
          dataInicio,
          dataFim,
          orderBy,
          order
        }
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro ao listar:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erro ao listar pacientes',
        code: 'LIST_ERROR'
      });
    }
  }

  /**
   * Buscar paciente por ID
   */
  static async show(req, res) {
    try {
      const { id } = req.params;

      const paciente = await Paciente.findById(id);
      
      if (!paciente) {
        throw new AppError('Paciente não encontrado', 404, 'PATIENT_NOT_FOUND');
      }

      res.json({
        status: 'SUCCESS',
        data: paciente.toJSON()
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro ao buscar por ID:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'ERROR',
          message: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        status: 'ERROR',
        message: 'Erro ao buscar paciente',
        code: 'FIND_ERROR'
      });
    }
  }

  /**
   * Criar novo paciente
   */
  static async store(req, res) {
    try {
      const pacienteData = req.body;

      // Validações básicas
      if (!pacienteData.nome) {
        throw new AppError('Nome é obrigatório', 400, 'MISSING_NAME');
      }

      // Validar SUS único (se fornecido)
      if (pacienteData.sus && pacienteData.sus.trim() !== '') {
        const existingSus = await Paciente.findBySus(pacienteData.sus);
        if (existingSus.length > 0) {
          throw new AppError('Número do SUS já está cadastrado para outro paciente', 409, 'DUPLICATE_SUS');
        }
      }

      // Criar paciente
      const novoPaciente = await Paciente.create(pacienteData);

      console.log(`✅ [PACIENTES] Paciente criado: ${novoPaciente.nome} (ID: ${novoPaciente.id})`);

      res.status(201).json({
        status: 'SUCCESS',
        message: 'Paciente criado com sucesso',
        data: novoPaciente.toJSON()
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro ao criar:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'ERROR',
          message: error.message,
          code: error.code
        });
      }

      // Verificar se é erro de duplicação de SUS no banco
      if (error.message.includes('unique_sus') || 
          (error.code === '23505' && error.constraint === 'unique_sus')) {
        return res.status(409).json({
          status: 'ERROR',
          message: 'Número do SUS já está cadastrado',
          code: 'DUPLICATE_SUS'
        });
      }

      // Verificar se é erro de duplicação geral
      if (error.message.includes('duplicate') || error.code === '23505') {
        return res.status(409).json({
          status: 'ERROR',
          message: 'Já existe um paciente com esses dados',
          code: 'DUPLICATE_PATIENT'
        });
      }

      res.status(500).json({
        status: 'ERROR',
        message: 'Erro ao criar paciente',
        code: 'CREATE_ERROR'
      });
    }
  }

  /**
   * Atualizar paciente
   */
  static async update(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Verificar se paciente existe
      const pacienteExistente = await Paciente.findById(id);
      if (!pacienteExistente) {
        throw new AppError('Paciente não encontrado', 404, 'PATIENT_NOT_FOUND');
      }

      // Validar SUS único (se fornecido e diferente do atual)
      if (updateData.sus && updateData.sus.trim() !== '') {
        const existingSus = await Paciente.findBySus(updateData.sus, id);
        if (existingSus.length > 0) {
          throw new AppError('Número do SUS já está cadastrado para outro paciente', 409, 'DUPLICATE_SUS');
        }
      }

      // Atualizar paciente
      const pacienteAtualizado = await Paciente.update(id, updateData);

      if (!pacienteAtualizado) {
        throw new AppError('Erro ao atualizar paciente', 500, 'UPDATE_FAILED');
      }

      console.log(`✅ [PACIENTES] Paciente atualizado: ${pacienteAtualizado.nome} (ID: ${id})`);

      res.json({
        status: 'SUCCESS',
        message: 'Paciente atualizado com sucesso',
        data: pacienteAtualizado.toJSON()
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro ao atualizar:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'ERROR',
          message: error.message,
          code: error.code
        });
      }

      // Verificar se é erro de duplicação de SUS no banco
      if (error.message.includes('unique_sus') || 
          (error.code === '23505' && error.constraint === 'unique_sus')) {
        return res.status(409).json({
          status: 'ERROR',
          message: 'Número do SUS já está cadastrado',
          code: 'DUPLICATE_SUS'
        });
      }

      res.status(500).json({
        status: 'ERROR',
        message: 'Erro ao atualizar paciente',
        code: 'UPDATE_ERROR'
      });
    }
  }

  /**
   * Deletar paciente
   */
  static async destroy(req, res) {
    try {
      const { id } = req.params;

      // Verificar se paciente existe
      const paciente = await Paciente.findById(id);
      if (!paciente) {
        throw new AppError('Paciente não encontrado', 404, 'PATIENT_NOT_FOUND');
      }

      // Deletar paciente
      const deletado = await Paciente.delete(id);

      if (!deletado) {
        throw new AppError('Erro ao deletar paciente', 500, 'DELETE_FAILED');
      }

      console.log(`✅ [PACIENTES] Paciente deletado: ${paciente.nome} (ID: ${id})`);

      res.json({
        status: 'SUCCESS',
        message: 'Paciente deletado com sucesso'
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro ao deletar:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'ERROR',
          message: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        status: 'ERROR',
        message: 'Erro ao deletar paciente',
        code: 'DELETE_ERROR'
      });
    }
  }

  /**
   * Buscar pacientes por nome
   */
  static async search(req, res) {
    try {
      const { nome } = req.query;

      if (!nome || nome.length < 2) {
        throw new AppError('Nome deve ter pelo menos 2 caracteres', 400, 'INVALID_SEARCH');
      }

      const pacientes = await Paciente.findByName(nome);

      res.json({
        status: 'SUCCESS',
        data: pacientes.map(p => p.toJSON()),
        total: pacientes.length
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro na busca:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'ERROR',
          message: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        status: 'ERROR',
        message: 'Erro na busca de pacientes',
        code: 'SEARCH_ERROR'
      });
    }
  }

  /**
   * Obter estatísticas dos pacientes
   */
  static async statistics(req, res) {
    try {
      const { dataInicio, dataFim } = req.query;

      const stats = await Paciente.getStatistics({ dataInicio, dataFim });

      res.json({
        status: 'SUCCESS',
        data: stats,
        periodo: {
          dataInicio: dataInicio || 'Todos os registros',
          dataFim: dataFim || 'Todos os registros'
        },
        geradoEm: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro ao obter estatísticas:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erro ao obter estatísticas',
        code: 'STATS_ERROR'
      });
    }
  }

  /**
   * Validar se campo está disponível (para formulários)
   */
  static async validateField(req, res) {
    try {
      const { field, value, excludeId = null } = req.query;

      if (!field || !value) {
        throw new AppError('Campo e valor são obrigatórios', 400, 'MISSING_PARAMS');
      }

      // Por enquanto, só validamos nomes únicos se necessário
      // Esta função pode ser expandida conforme necessário

      res.json({
        status: 'SUCCESS',
        valid: true,
        message: 'Campo válido'
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro na validação:', error);
      
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          status: 'ERROR',
          message: error.message,
          code: error.code
        });
      }

      res.status(500).json({
        status: 'ERROR',
        message: 'Erro na validação',
        code: 'VALIDATION_ERROR'
      });
    }
  }

  /**
   * Gerar relatórios com filtros específicos
   */
  static async reports(req, res) {
    try {
      const {
        dataInicio = '',
        dataFim = '',
        sexo = '',
        municipio = '',
        uf = '',
        estadoCivil = '',
        escolaridade = '',
        orderBy = 'nome',
        order = 'ASC'
      } = req.query;

      const filters = {
        dataInicio,
        dataFim,
        sexo,
        municipio,
        uf,
        estadoCivil,
        escolaridade,
        orderBy,
        order
      };

      console.log('🔍 [RELATÓRIOS] Filtros aplicados:', filters);

      // Buscar pacientes com filtros
      const pacientes = await Paciente.findAllForReports(filters);
      
      // Calcular estatísticas
      const total = pacientes.length;
      const masculino = pacientes.filter(p => p.sexo === 'M').length;
      const feminino = pacientes.filter(p => p.sexo === 'F').length;
      const municipios = [...new Set(pacientes.map(p => p.municipio))].length;

      console.log(`📊 [RELATÓRIOS] ${total} pacientes encontrados`);

      res.json({
        status: 'SUCCESS',
        data: pacientes.map(p => ({
          id: p.id,
          nome: p.nome,
          mae: p.mae,
          nascimento: p.nascimento,
          sexo: p.sexo,
          estadoCivil: p.estadoCivil,
          profissao: p.profissao,
          escolaridade: p.escolaridade,
          raca: p.raca,
          endereco: p.endereco,
          bairro: p.bairro,
          municipio: p.municipio,
          uf: p.uf,
          cep: p.cep,
          created_at: p.created_at,
          updated_at: p.updated_at
        })),
        statistics: {
          total,
          masculino,
          feminino,
          municipios
        },
        filters
      });

    } catch (error) {
      console.error('❌ [RELATÓRIOS] Erro ao gerar relatório:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erro ao gerar relatório',
        code: 'REPORT_ERROR'
      });
    }
  }

  /**
   * Verificar se SUS está disponível
   */
  static async checkSusAvailability(req, res) {
    try {
      const { sus, excludeId = null } = req.query;

      if (!sus || sus.trim() === '') {
        return res.json({
          status: 'SUCCESS',
          available: true,
          message: 'SUS vazio é permitido'
        });
      }

      const existingSus = await Paciente.findBySus(sus, excludeId);
      const isAvailable = existingSus.length === 0;

      res.json({
        status: 'SUCCESS',
        available: isAvailable,
        message: isAvailable ? 'SUS disponível' : 'SUS já está em uso',
        sus: sus.trim()
      });

    } catch (error) {
      console.error('❌ [PACIENTES] Erro ao verificar SUS:', error);
      
      res.status(500).json({
        status: 'ERROR',
        message: 'Erro ao verificar disponibilidade do SUS',
        code: 'SUS_CHECK_ERROR'
      });
    }
  }

  // Buscar estados civis únicos para o filtro de relatórios
  static async getEstadosCivis(req, res) {
    try {
      const estadosCivis = await Paciente.getDistinctEstadosCivis();
      
      res.json({
        success: true,
        data: estadosCivis,
        message: 'Estados civis carregados com sucesso'
      });
    } catch (error) {
      console.error('❌ [ESTADOS CIVIS] Erro ao buscar estados civis:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'ESTADOS_CIVIS_ERROR'
      });
    }
  }

  // Buscar escolaridades únicas para o filtro de relatórios
  static async getEscolaridades(req, res) {
    try {
      const escolaridades = await Paciente.getDistinctEscolaridades();
      
      res.json({
        success: true,
        data: escolaridades,
        message: 'Escolaridades carregadas com sucesso'
      });
    } catch (error) {
      console.error('❌ [ESCOLARIDADES] Erro ao buscar escolaridades:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor',
        code: 'ESCOLARIDADES_ERROR'
      });
    }
  }
}

export default PacientesController;
