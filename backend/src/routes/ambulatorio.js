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

    // Status específicos do ambulatório
    const encaminhadoVariants = ['encaminhado_para_ambulatorio', 'encaminhado para ambulatório', '5 - Encaminhado para ambulatório'];
    const emAtendimentoVariants = ['em atendimento ambulatorial', 'em_atendimento_ambulatorial'];

    const pacientes_aguardando = atendimentosDia.filter(a => encaminhadoVariants.includes(a.status)).length;
    const pacientes_em_atendimento = atendimentosDia.filter(a => emAtendimentoVariants.includes(a.status)).length;
    
    // Para consultas concluídas, vamos considerar atendimentos que saíram do ambulatório
    const concluidaVariants = ['alta_ambulatorial', 'encaminhado_para_exames', 'encaminhado_para_internacao'];
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

// Listar atendimentos em ambulatório
router.get('/atendimentos', async (req, res) => {
  try {
    const statusAmbulatorio = [
      'encaminhado_para_ambulatorio',
      'encaminhado para ambulatório',
      '5 - Encaminhado para ambulatório',
      'em atendimento ambulatorial',
      'em_atendimento_ambulatorial'
    ];
    
    const atendimentos = await knex('atendimentos')
      .whereIn('status', statusAmbulatorio)
      .select('*');
    
    res.json(atendimentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Detalhes de uma consulta ambulatorial
router.get('/consulta/:id', async (req, res) => {
  try {
    const consulta = await knex('consultas_ambulatoriais')
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

// Criar nova consulta ambulatorial
router.post('/consulta/:id', async (req, res) => {
  try {
    const { 
      diagnostico, 
      tratamento, 
      prescricao, 
      observacoes, 
      status_destino 
    } = req.body;

    const consulta = await knex('consultas_ambulatoriais').insert({
      atendimento_id: req.params.id,
      diagnostico,
      tratamento, 
      prescricao,
      observacoes,
      data_consulta: new Date()
    }).returning('*');

    // APENAS atualizar status se o status_destino for diferente de 'em_atendimento_ambulatorial'
    // Isso significa que o paciente está sendo encaminhado para outro setor ou recebendo alta
    if (status_destino && status_destino !== 'em_atendimento_ambulatorial') {
      await knex('atendimentos')
        .where('id', req.params.id)
        .update({ 
          status: status_destino || 'alta_ambulatorial',
          status_destino: status_destino || 'alta_ambulatorial'
        });
    }

    res.json(consulta[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar todos os atendimentos (para alertas e dashboard)
router.get('/todos', async (req, res) => {
  try {
    const atendimentos = await knex('atendimentos as a')
      .leftJoin('pacientes as p', 'a.paciente_id', 'p.id')
      .leftJoin('consultas_medicas as cm', 'a.id', 'cm.atendimento_id')
      .select(
        'a.*',
        'p.nome as paciente_nome',
        'p.nascimento as paciente_nascimento',
        'p.sexo as paciente_sexo',
        'p.sus as paciente_sus',
        knex.raw('CASE WHEN cm.id IS NOT NULL THEN true ELSE false END as passou_por_atendimento_medico')
      )
      .orderBy('a.data_hora_atendimento', 'desc');
    
    res.json(atendimentos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;