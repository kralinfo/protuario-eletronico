import database from '../config/database.js';
import Paciente from '../models/Paciente.js';
import { decryptFields, SENSITIVE_FIELDS } from '../config/encryption.js';

const PACIENTE_SENSITIVE_FIELDS = SENSITIVE_FIELDS.paciente;

/**
 * Modulo para direitos do titular de dados (LGPD Art. 17-22).
 * Exportacao e exclusao/solicitacao de dados do paciente.
 */
class TitularDadosService {

  /**
   * Exportar TODOS os dados de um paciente em formato estruturado.
   * Inclui: dados pessoais, atendimentos, triagens, consultas medicas, consentimentos.
   *
   * @param {number} pacienteId - ID do paciente
   * @returns {Object} Dados completas do paciente
   */
  static async exportarDadosPaciente(pacienteId) {
    try {
      // 1. Dados do paciente
      const paciente = await Paciente.findById(pacienteId);
      if (!paciente) {
        throw new Error('Paciente nao encontrado');
      }

      const dadosPaciente = paciente.toJSON();

      // 2. Atendimentos
      const atendimentosResult = await database.query(
        'SELECT * FROM atendimentos WHERE paciente_id = $1 ORDER BY created_at DESC',
        [pacienteId]
      );

      const atendimentos = await Promise.all(
        atendimentosResult.rows.map(async (atend) => {
          // Buscar dados de triagem
          let triagem = null;
          if (atend.triagem_realizada) {
            const triagemResult = await database.query(
              `SELECT * FROM triagens WHERE atendimento_id = $1`,
              [atend.id]
            );
            if (triagemResult.rows.length > 0) {
              triagem = triagemResult.rows[0];
            }
          }

          // Buscar dados de consulta medica
          let consultaMedica = null;
          const consultaResult = await database.query(
            `SELECT * FROM consultas_medicas WHERE atendimento_id = $1`,
            [atend.id]
          );
          if (consultaResult.rows.length > 0) {
            consultaMedica = consultaResult.rows[0];
          }

          return {
            id: atend.id,
            data_hora: atend.data_hora_atendimento,
            status: atend.status,
            motivo: atend.motivo,
            observacoes: atend.observacoes,
            acompanhante: atend.acompanhante,
            procedencia: atend.procedencia,
            classificacao_risco: atend.classificacao_risco,
            // Dados de triagem
            triagem: triagem ? {
              pressao_arterial: triagem.pressao_arterial,
              temperatura: triagem.temperatura,
              frequencia_cardiaca: triagem.frequencia_cardiaca,
              saturacao_oxigenio: triagem.saturacao_oxigenio,
              queixa_principal: triagem.queixa_principal,
              historia_atual: triagem.historia_atual,
              observacoes: triagem.observacoes_triagem,
              classificacao_risco: triagem.classificacao_risco,
              realizada_por: triagem.triagem_realizada_por,
              realizada_em: triagem.triagem_realizada_em,
              status_destino: triagem.status_destino
            } : null,
            // Dados de consulta medica
            consulta_medica: consultaMedica ? {
              motivo_consulta: consultaMedica.motivo_consulta,
              exame_fisico: consultaMedica.exame_fisico,
              hipotese_diagnostica: consultaMedica.hipotese_diagnostica,
              conduta_prescricao: consultaMedica.conduta_prescricao,
              medico: consultaMedica.medico_responsavel,
              realizada_em: consultaMedica.created_at
            } : null,
            // Rastreio de abandono
            abandonado: atend.abandonado,
            motivo_abandono: atend.motivo_abandono,
            etapa_abandono: atend.etapa_abandono,
            data_abandono: atend.data_abandono
          };
        })
      );

      // 3. Consentimentos
      const consentimentosResult = await database.query(
        'SELECT * FROM consentimentos WHERE paciente_id = $1 ORDER BY data_consentimento DESC',
        [pacienteId]
      );

      // 4. Historico de status
      const historicoResult = await database.query(
        'SELECT * FROM historico_status WHERE paciente_id = $1 ORDER BY data_mudanca DESC',
        [pacienteId]
      );

      return {
        exportado_em: new Date().toISOString(),
        versao_exportacao: '1.0.0',
        paciente: dadosPaciente,
        total_atendimentos: atendimentos.length,
        atendimentos,
        total_consentimentos: consentimentosResult.rows.length,
        consentimentos: consentimentosResult.rows,
        total_historico: historicoResult.rows.length,
        historico_status: historicoResult.rows,
        observacoes: 'Estes sao todos os dados pessoais mantidos pelo sistema. ' +
          'Para correcao ou exclusao, entre em contato com o responsavel pelo sistema.'
      };
    } catch (error) {
      throw new Error(`Erro ao exportar dados do paciente: ${error.message}`);
    }
  }

  /**
   * Solicitar exclusao de dados do paciente (LGPD Art. 18 - direito de eliminacao).
   * Cria um registro de solicitacao de exclusao com auditoria.
   *
   * @param {number} pacienteId - ID do paciente
   * @param {number} usuarioId - Usuario que solicitou
   * @param {string} motivo - Motivo da solicitacao
   * @returns {Object} Registro da solicitacao
   */
  static async solicitarExclusao(pacienteId, usuarioId, motivo = '') {
    try {
      // Verificar se paciente existe
      const paciente = await Paciente.findById(pacienteId);
      if (!paciente) {
        throw new Error('Paciente nao encontrado');
      }

      // Registrar solicitacao de exclusao na tabela de auditoria
      await database.query(
        `INSERT INTO solicitacoes_exclusao (
          paciente_id, usuario_solicitante_id, motivo, status, data_solicitacao
        ) VALUES ($1, $2, $3, 'pendente', CURRENT_TIMESTAMP)
        RETURNING id`,
        [pacienteId, usuarioId, motivo]
      );

      return {
        success: true,
        message: 'Solicitacao de exclusao registrada. Sera processada pelo administrador.',
        paciente: { id: paciente.id, nome: paciente.nome },
        data_solicitacao: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Erro ao solicitar exclusao: ${error.message}`);
    }
  }

  /**
   * Executar exclusao real dos dados do paciente (admin).
   * Deleta paciente e todos os seus atendimentos em cascata.
   *
   * @param {number} pacienteId - ID do paciente
   * @param {number} usuarioId - Usuario admin que executou
   * @returns {boolean} Sucesso da operacao
   */
  static async executarExclusao(pacienteId, usuarioId) {
    try {
      // Verificar se paciente existe antes de deletar
      const paciente = await Paciente.findById(pacienteId);
      if (!paciente) {
        throw new Error('Paciente nao encontrado');
      }

      // Deletar paciente (cascata deleta atendimentos, triagens, consultas, consentimentos)
      await Paciente.delete(pacienteId);

      // Logar na auditoria
      await database.query(
        `INSERT INTO logs_auditoria (
          usuario_id, acao, entidade, entidade_id, ip, created_at
        ) VALUES ($1, 'DELETE', 'paciente', $2, 'admin_action', CURRENT_TIMESTAMP)`,
        [usuarioId, pacienteId]
      );

      return {
        success: true,
        message: `Paciente ${paciente.nome} (ID: ${pacienteId}) e todos os seus dados foram excluidos permanentemente.`,
        paciente_excluido: pacienteId
      };
    } catch (error) {
      throw new Error(`Erro ao executar exclusao: ${error.message}`);
    }
  }

  /**
   * Anonimizar dados do paciente (mantem registro estatistico sem PII).
   * Substitui dados pessoais por valores genericos mantendo dados estatisticos.
   *
   * @param {number} pacienteId - ID do paciente
   * @param {number} usuarioId - Usuario admin
   * @returns {Object} Resultado da anonimizacao
   */
  static async anonimizarPaciente(pacienteId, usuarioId) {
    try {
      const paciente = await Paciente.findById(pacienteId);
      if (!paciente) {
        throw new Error('Paciente nao encontrado');
      }

      // Substituir dados pessoais por valores anonimizados
      const dadosAnonimizados = {
        nome: `Paciente Anonimizado #${pacienteId}`,
        mae: null,
        endereco: null,
        bairro: null,
        municipio: null,
        cep: null,
        telefone: null,
        sus: null,
        profissao: null,
        estado_civil: null,
        escolaridade: null
      };

      await Paciente.update(pacienteId, dadosAnonimizados);

      // Revogar todos os consentimentos ativos
      await database.query(
        `UPDATE consentimentos SET ativo = false, data_revogacao = CURRENT_TIMESTAMP,
         observacoes = 'Revogado por anonimizacao de dados', updated_at = CURRENT_TIMESTAMP
         WHERE paciente_id = $1 AND ativo = true`,
        [pacienteId]
      );

      return {
        success: true,
        message: `Dados do paciente ${paciente.nome} foram anonimizados.`,
        paciente_id: pacienteId
      };
    } catch (error) {
      throw new Error(`Erro ao anonimizar paciente: ${error.message}`);
    }
  }

  /**
   * Listar solicitacoes de exclusao pendentes.
   */
  static async listarSolicitacoesExclusao() {
    try {
      const result = await database.query(
        `SELECT se.*, p.nome as paciente_nome
         FROM solicitacoes_exclusao se
         LEFT JOIN pacientes p ON se.paciente_id = p.id
         ORDER BY se.data_solicitacao DESC`
      );
      return result.rows;
    } catch (error) {
      throw new Error(`Erro ao listar solicitacoes de exclusao: ${error.message}`);
    }
  }
}

export default TitularDadosService;
