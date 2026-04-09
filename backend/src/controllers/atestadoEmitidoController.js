import AtestadoEmitido from '../models/AtestadoEmitido.js';

class AtestadoEmitidoController {
  /**
   * POST /api/atestados - Emitir atestado
   */
  static async create(req, res) {
    try {
      const {
        atendimento_id, paciente_id, cid, tipo_atestado,
        dias_afastamento, observacoes, data_inicio, data_fim, horario_atestado
      } = req.body;

      if (!atendimento_id || !paciente_id || !tipo_atestado || !data_inicio) {
        return res.status(400).json({
          success: false,
          error: 'atendimento_id, paciente_id, tipo_atestado e data_inicio sao obrigatorios'
        });
      }

      const atestado = await AtestadoEmitido.create({
        atendimento_id,
        paciente_id,
        medico_id: req.user.id,
        cid,
        tipo_atestado,
        dias_afastamento,
        observacoes,
        data_inicio,
        data_fim,
        horario_atestado
      });

      return res.status(201).json({ success: true, data: atestado });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/atestados/atendimento/:atendimentoId
   */
  static async findByAtendimento(req, res) {
    try {
      const atestados = await AtestadoEmitido.findByAtendimento(req.params.atendimentoId);
      return res.json({ success: true, data: atestados });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/atestados/paciente/:pacienteId
   */
  static async findByPaciente(req, res) {
    try {
      const atestados = await AtestadoEmitido.findByPaciente(req.params.pacienteId);
      return res.json({ success: true, data: atestados });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/atestados/:id
   */
  static async delete(req, res) {
    try {
      const atestado = await AtestadoEmitido.delete(req.params.id);
      if (!atestado) {
        return res.status(404).json({ success: false, error: 'Atestado nao encontrado' });
      }
      return res.json({ success: true, message: 'Atestado excluido' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default AtestadoEmitidoController;
