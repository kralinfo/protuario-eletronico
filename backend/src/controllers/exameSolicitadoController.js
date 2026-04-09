import ExameSolicitado from '../models/ExameSolicitado.js';

class ExameSolicitadoController {
  /**
   * POST /api/exames-solicitados - Criar solicitacao de exame
   */
  static async create(req, res) {
    try {
      const {
        atendimento_id, paciente_id, tipo_exame, nome_exame,
        observacoes, questao_clinica, prioridade
      } = req.body;

      if (!atendimento_id || !paciente_id || !tipo_exame || !nome_exame) {
        return res.status(400).json({
          success: false,
          error: 'atendimento_id, paciente_id, tipo_exame e nome_exame sao obrigatorios'
        });
      }

      const exame = await ExameSolicitado.create({
        atendimento_id,
        paciente_id,
        profissional_solicitante_id: req.user.id,
        tipo_exame,
        nome_exame,
        observacoes,
        questao_clinica,
        prioridade
      });

      return res.status(201).json({ success: true, data: exame });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/exames-solicitados/atendimento/:atendimentoId
   */
  static async findByAtendimento(req, res) {
    try {
      const exames = await ExameSolicitado.findByAtendimento(req.params.atendimentoId);
      return res.json({ success: true, data: exames });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * GET /api/exames-solicitados/paciente/:pacienteId
   */
  static async findByPaciente(req, res) {
    try {
      const exames = await ExameSolicitado.findByPaciente(req.params.pacienteId);
      return res.json({ success: true, data: exames });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * PATCH /api/exames-solicitados/:id - Atualizar status/resultado
   */
  static async update(req, res) {
    try {
      const exame = await ExameSolicitado.update(req.params.id, req.body);
      if (!exame) {
        return res.status(404).json({ success: false, error: 'Exame nao encontrado' });
      }
      return res.json({ success: true, data: exame });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * POST /api/exames-solicitados/:id/resultado - Registrar resultado
   */
  static async registrarResultado(req, res) {
    try {
      const { resultado } = req.body;
      if (!resultado) {
        return res.status(400).json({ success: false, error: 'Resultado e obrigatorio' });
      }

      const exame = await ExameSolicitado.registrarResultado(req.params.id, resultado);
      if (!exame) {
        return res.status(404).json({ success: false, error: 'Exame nao encontrado' });
      }
      return res.json({ success: true, data: exame });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  /**
   * DELETE /api/exames-solicitados/:id
   */
  static async delete(req, res) {
    try {
      const exame = await ExameSolicitado.delete(req.params.id);
      if (!exame) {
        return res.status(404).json({ success: false, error: 'Exame nao encontrado' });
      }
      return res.json({ success: true, message: 'Exame excluido' });
    } catch (error) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }
}

export default ExameSolicitadoController;
