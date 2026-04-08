import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import FilaRealtimeModule from '../realtime/modules/FilaRealtimeModule.js';
import PatientEventService from '../services/PatientEventService.js';
import Atendimento from '../models/Atendimento.js';
import Paciente from '../models/Paciente.js';

const router = Router();

/**
 * GET /api/fila/estado
 * Retorna o estado atual da fila: chamadas ativas e histórico recente.
 */
router.get('/estado', authenticateToken, (req, res) => {
  try {
    const estado = FilaRealtimeModule.getEstado();
    res.json({ status: 'SUCCESS', data: estado });
  } catch (error) {
    console.error('Erro ao buscar estado da fila:', error);
    res.status(500).json({ status: 'ERROR', message: 'Erro interno ao buscar estado da fila' });
  }
});

/**
 * POST /api/fila/chamar
 * Chama um paciente manualmente para o painel de TV.
 */
router.post('/chamar', authenticateToken, async (req, res) => {
  try {
    const { patientId, destino } = req.body;

    if (!patientId || !destino) {
      return res.status(400).json({ 
        status: 'ERROR', 
        message: 'patientId e destino são obrigatórios' 
      });
    }

    if (destino !== 'triagem' && destino !== 'medico') {
      return res.status(400).json({ 
        status: 'ERROR', 
        message: 'destino deve ser "triagem" ou "medico"' 
      });
    }

    // Buscar dados do atendimento para pegar o paciente_id e classificação se houver
    const resultAtendimento = await Atendimento.findByAtendimentoId(patientId);
    if (!resultAtendimento) {
      return res.status(404).json({ status: 'ERROR', message: 'Atendimento não encontrado' });
    }

    const paciente = await Paciente.findById(resultAtendimento.paciente_id);
    const pacienteNome = paciente ? paciente.nome : 'Paciente';

    console.log(`[FILA] Chamada manual: ${pacienteNome} para ${destino}`);

    // Emitir evento que o FilaRealtimeModule escuta
    await PatientEventService.emitPatientCalled({
      patientId: parseInt(patientId),
      patientName: pacienteNome,
      target: destino,
      classificationRisk: resultAtendimento.classificacao_risco || null,
      timestamp: new Date()
    });

    res.json({ status: 'SUCCESS', message: 'Paciente chamado com sucesso' });
  } catch (error) {
    console.error('Erro ao chamar paciente:', error);
    res.status(500).json({ status: 'ERROR', message: 'Erro interno ao processar chamada' });
  }
});

export default router;
