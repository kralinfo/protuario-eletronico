import Encaminhamento from '../models/Encaminhamento.js';

class EncaminhamentoController {
  /**
   * POST /api/encaminhamentos - Criar encaminhamento
   */
  static async create(req, res) {
    try {
      const {
        atendimento_id, paciente_id, tipo_encaminhamento,
        estabelecimento_destino, motivo_encaminhamento, resumo_clinico,
        cid_relacionado, prioridade, data_agendada
      } = req.body;

      if (!atendimento_id || !paciente_id || !tipo_encaminhamento || !motivo_encaminhamento) {
        return res.status(400).json({
          success: false,
          error: 'atendimento_id, paciente_id, tipo_encaminhamento e motivo_encaminhamento sao obrigatorios'
        });
      }

      const encaminhamento = await Encaminhamento.create({
        atendimento_id,
        paciente_id,
        profissional_solicitante_id: req.user.id,
        tipo_encaminhamento,
        estabelecimento_destino,
        motivo_encaminhamento,
        resumo_clinico,
        cid_relacionado,
        prioridade,
        data_agendada
      });

      return res.status(201).json({ success: true, data: encaminhamento });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/encaminhamentos/atendimento/:atendimentoId
   */
  static async findByAtendimento(req, res) {
    try {
      const encaminhamentos = await Encaminhamento.findByAtendimento(req.params.atendimentoId);
      return res.json({ success: true, data: encaminhamentos });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/encaminhamentos/paciente/:pacienteId
   */
  static async findByPaciente(req, res) {
    try {
      const encaminhamentos = await Encaminhamento.findByPaciente(req.params.pacienteId);
      return res.json({ success: true, data: encaminhamentos });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/encaminhamentos/:id
   */
  static async update(req, res) {
    try {
      const encaminhamento = await Encaminhamento.update(req.params.id, req.body);
      if (!encaminhamento) {
        return res.status(404).json({ success: false, error: 'Encaminhamento nao encontrado' });
      }
      return res.json({ success: true, data: encaminhamento });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/encaminhamentos/:id
   */
  static async delete(req, res) {
    try {
      const encaminhamento = await Encaminhamento.delete(req.params.id);
      if (!encaminhamento) {
        return res.status(404).json({ success: false, error: 'Encaminhamento nao encontrado' });
      }
      return res.json({ success: true, message: 'Encaminhamento excluido' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default EncaminhamentoController;
