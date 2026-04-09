import Consentimento from '../models/Consentimento.js';

class ConsentimentoController {
  /**
   * POST /api/consentimentos - Registrar consentimento
   */
  static async registrar(req, res) {
    try {
      const { paciente_id, tipo, versao_termos, observacoes } = req.body;

      const consentimento = await Consentimento.registrar({
        paciente_id,
        usuario_id: req.usuario.id,
        tipo: tipo || 'cadastro',
        versao_termos: versao_termos || '1.0.0',
        ip_coleta: req.ip,
        user_agent: req.get('User-Agent') || null,
        observacoes
      });

      return res.status(201).json({
        success: true,
        message: 'Consentimento registrado com sucesso',
        data: consentimento
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * DELETE /api/consentimentos/:id - Revogar consentimento
   */
  static async revogar(req, res) {
    try {
      const { id } = req.params;

      const consentimento = await Consentimento.revogar(id, req.usuario.id);

      return res.json({
        success: true,
        message: 'Consentimento revogado com sucesso',
        data: consentimento
      });
    } catch (error) {
      if (error.message.includes('nao encontrado')) {
        return res.status(404).json({ success: false, error: error.message });
      }
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/consentimentos/paciente/:pacienteId - Buscar consentimentos do paciente
   */
  static async buscarPorPaciente(req, res) {
    try {
      const { pacienteId } = req.params;

      const consentimentos = await Consentimento.buscarPorPaciente(pacienteId);

      return res.json({
        success: true,
        data: consentimentos
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/consentimentos/paciente/:pacienteId/verificar/:tipo - Verificar consentimento ativo
   */
  static async verificar(req, res) {
    try {
      const { pacienteId, tipo } = req.params;

      const ativo = await Consentimento.temConsentimentoAtivo(
        pacienteId,
        tipo !== 'undefined' ? tipo : null
      );

      return res.json({
        success: true,
        paciente_id: pacienteId,
        tipo: tipo || null,
        tem_consentimento: ativo
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/consentimentos - Listar todos (admin)
   */
  static async listar(req, res) {
    try {
      const { paciente_id, usuario_id, tipo, ativo, limit, offset } = req.query;

      const consentimentos = await Consentimento.listar({
        paciente_id: paciente_id ? parseInt(paciente_id) : undefined,
        usuario_id: usuario_id ? parseInt(usuario_id) : undefined,
        tipo,
        ativo: ativo !== undefined ? ativo === 'true' : undefined,
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0
      });

      return res.json({
        success: true,
        data: consentimentos,
        total: consentimentos.length
      });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default ConsentimentoController;
