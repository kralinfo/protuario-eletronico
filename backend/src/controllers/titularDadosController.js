import TitularDadosService from '../services/titularDadosService.js';

class TitularDadosController {

  /**
   * GET /api/pacientes/:id/exportar-dados
   * Exportar todos os dados do paciente (portabilidade - LGPD Art. 18)
   */
  static async exportarDados(req, res) {
    try {
      const pacienteId = parseInt(req.params.id);
      const dados = await TitularDadosService.exportarDadosPaciente(pacienteId);

      return res.json({
        success: true,
        message: 'Dados exportados com sucesso',
        data: dados
      });
    } catch (error) {
      if (error.message.includes('nao encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/pacientes/:id/solicitar-exclusao
   * Solicitar exclusao de dados (LGPD Art. 18)
   */
  static async solicitarExclusao(req, res) {
    try {
      const pacienteId = parseInt(req.params.id);
      const { motivo } = req.body || {};

      const resultado = await TitularDadosService.solicitarExclusao(
        pacienteId,
        req.usuario.id,
        motivo || 'Solicitacao do titular dos dados'
      );

      return res.status(201).json({
        success: true,
        message: resultado.message,
        data: resultado
      });
    } catch (error) {
      if (error.message.includes('nao encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/pacientes/:id/excluir
   * Executar exclusao real dos dados (apenas admin)
   */
  static async executarExclusao(req, res) {
    try {
      const pacienteId = parseInt(req.params.id);

      const resultado = await TitularDadosService.executarExclusao(
        pacienteId,
        req.usuario.id
      );

      return res.json({
        success: true,
        message: resultado.message
      });
    } catch (error) {
      if (error.message.includes('nao encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/pacientes/:id/anonimizar
   * Anonimizar dados do paciente (LGPD Art. 18 - anonimizacao)
   */
  static async anonimizar(req, res) {
    try {
      const pacienteId = parseInt(req.params.id);

      const resultado = await TitularDadosService.anonimizarPaciente(
        pacienteId,
        req.usuario.id
      );

      return res.json({
        success: true,
        message: resultado.message
      });
    } catch (error) {
      if (error.message.includes('nao encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/admin/solicitacoes-exclusao
   * Listar solicitacoes de exclusao pendentes (admin)
   */
  static async listarSolicitacoes(req, res) {
    try {
      const solicitacoes = await TitularDadosService.listarSolicitacoesExclusao();

      return res.json({
        success: true,
        data: solicitacoes,
        total: solicitacoes.length
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default TitularDadosController;
