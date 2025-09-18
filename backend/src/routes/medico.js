import express from 'express';
import knex from '../db.js';
const router = express.Router();
router.get('/estatisticas', async (req, res) => {
  try {
    // Atendimentos do dia
    const atendimentosDia = await knex('atendimentos')
      .whereRaw('DATE(data_hora_atendimento) = CURRENT_DATE')
      .select('id', 'status', 'classificacao_risco');

    // Contagem por classificação
    const classificacoes = ['vermelho', 'laranja', 'amarelo', 'verde', 'azul'];
    const por_classificacao = {};
    classificacoes.forEach(cl => {
      por_classificacao[cl] = atendimentosDia.filter(a => a.classificacao_risco === cl).length;
    });

  // Outras estatísticas (considera variantes)
  const aguardandoVariants = ['aguardando', 'aguardando_atendimento', 'aguardando atendimento'];
  const emAtendimentoVariants = ['em_atendimento', 'em atendimento', 'em_atendimento_medico', 'em atendimento médico'];
  const concluidaVariants = ['concluida', 'concluído', 'atendimento_concluido', 'atendimento concluido'];

  const pacientes_aguardando = atendimentosDia.filter(a => aguardandoVariants.includes(a.status)).length;
  const pacientes_em_atendimento = atendimentosDia.filter(a => emAtendimentoVariants.includes(a.status)).length;
  const consultas_concluidas = atendimentosDia.filter(a => concluidaVariants.includes(a.status)).length;

    res.json({
      estatisticas: {
        pacientes_aguardando,
        pacientes_em_atendimento,
        consultas_concluidas,
        por_classificacao
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar atendimentos em sala médica
router.get('/atendimentos', async (req, res) => {
  try {
    const statusSalaMedica = [
      'em_sala_medica',
      'encaminhado_para_sala_medica',
      'encaminhado para sala médica',
      '3 - Encaminhado para sala médica'
    ];
    const atendimentos = await knex('atendimentos')
      .whereIn('status', statusSalaMedica)
      .select('*');
    res.json(atendimentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detalhes de uma consulta médica
router.get('/consulta/:id', async (req, res) => {
  try {
    const consulta = await knex('consultas_medicas')
      .where('atendimento_id', req.params.id)
      .orderBy('id', 'desc')
      .first();

    const atendimento = await knex('atendimentos as a')
      .leftJoin('pacientes as p', 'a.paciente_id', 'p.id')
      .select(
        'a.motivo as motivo',
        'a.observacoes as observacoes',
        'a.pressao_arterial as pressao_arterial',
        'a.temperatura as temperatura',
        'a.frequencia_cardiaca as frequencia_cardiaca',
        'a.frequencia_respiratoria as frequencia_respiratoria',
        'a.saturacao_oxigenio as saturacao_oxigenio',
        'a.peso as peso',
        'a.altura as altura',
        'a.classificacao_risco as classificacao_risco',
        'a.prioridade as prioridade',
        'a.queixa_principal as queixa_principal',
        'a.historia_atual as historia_atual',
        'a.alergias as alergias',
        'a.medicamentos_uso as medicamentos_uso',
        'a.observacoes_triagem as observacoes_triagem',
        'a.status_destino as status_destino',
        'p.nome as paciente_nome',
        'p.nascimento as paciente_nascimento',
        'p.sexo as paciente_sexo',
        'p.sus as paciente_sus'
      )
      .where('a.id', req.params.id)
      .first();

    res.json({ consulta: consulta || {}, triagem: atendimento || {} });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Criar nova consulta médica
router.post('/consulta', async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.data_hora_inicio) {
      payload.data_hora_inicio = new Date();
    }
    
    // Adicionar data de prescrição se não existir
    if (!payload.data_prescricao) {
      payload.data_prescricao = new Date();
    }
    
    // APENAS atualizar status se o status_destino for diferente de 'em_atendimento_medico'
    // Isso significa que o paciente está sendo encaminhado para outro setor
    if (payload.atendimento_id && payload.status_destino && payload.status_destino !== 'em_atendimento_medico') {
      // Normaliza status para ambulatorio
      let statusToSave = payload.status_destino;
      if (statusToSave === 'encaminhado para ambulatório' || statusToSave === 'Ambulatório') {
        statusToSave = 'encaminhado_para_ambulatorio';
      }
      if (statusToSave === 'encaminhado para exames' || statusToSave === 'Exames') {
        statusToSave = 'encaminhado_para_exames';
      }
      if (statusToSave === 'alta médica' || statusToSave === 'Alta' || statusToSave === 'Alta Médica' || statusToSave === 'atendimento_concluido') {
        statusToSave = 'atendimento_concluido';
      }
      
      // Atualizar apenas quando o paciente está sendo encaminhado/finalizado
      await knex('atendimentos')
        .where('id', payload.atendimento_id)
        .update({ status: statusToSave, status_destino: statusToSave });
    }
    
    const novaConsulta = await knex('consultas_medicas').insert(payload).returning('*');
    res.json(novaConsulta[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar consulta médica
router.put('/consulta/:id', async (req, res) => {
  try {
    await knex('consultas_medicas')
      .where('id', req.params.id)
      .update(req.body);
      
    // APENAS atualizar status se o status_destino for diferente de 'em_atendimento_medico'
    // Isso significa que o paciente está sendo encaminhado para outro setor
    if (req.body.atendimento_id && req.body.status_destino && req.body.status_destino !== 'em_atendimento_medico') {
      // Normaliza status para ambulatorio
      let statusToSave = req.body.status_destino;
      if (statusToSave === 'encaminhado para ambulatório' || statusToSave === 'Ambulatório') {
        statusToSave = 'encaminhado_para_ambulatorio';
      }
      if (statusToSave === 'encaminhado para exames' || statusToSave === 'Exames') {
        statusToSave = 'encaminhado_para_exames';
      }
      if (statusToSave === 'alta médica' || statusToSave === 'Alta' || statusToSave === 'Alta Médica' || statusToSave === 'atendimento_concluido') {
        statusToSave = 'atendimento_concluido';
      }
      
      // Atualizar apenas quando o paciente está sendo encaminhado/finalizado
      await knex('atendimentos')
        .where('id', req.body.atendimento_id)
        .update({ status: statusToSave, status_destino: statusToSave });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
