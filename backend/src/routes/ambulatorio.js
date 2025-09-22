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

// Buscar um atendimento específico
router.get('/atendimento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const atendimento = await knex('atendimentos')
      .leftJoin('consultas_medicas as cm', 'atendimentos.id', 'cm.atendimento_id')
      .where('atendimentos.id', id)
      .select(
        'atendimentos.*',
        // Dados do atendimento médico
        'cm.pressao_arterial',
        'cm.frequencia_cardiaca', 
        'cm.temperatura',
        'cm.saturacao_oxigenio',
        'cm.frequencia_respiratoria',
        'cm.peso',
        'cm.altura',
        'cm.glicemia',
        'cm.queixa_principal',
        'cm.historia_doenca_atual',
        'cm.exame_fisico',
        'cm.hipotese_diagnostica',
        'cm.plano_terapeutico',
        'cm.orientacoes_gerais',
        'cm.observacoes',
        'cm.diagnostico_principal',
        'cm.procedimentos_realizados', 
        'cm.medicamentos_prescritos',
        'cm.status_destino',
        'cm.observacoes_destino'
      )
      .first();

    if (!atendimento) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }

    res.json(atendimento);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar status do atendimento
router.put('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await knex('atendimentos')
      .where('id', id)
      .update({ status });

    res.json({ message: 'Status atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Salvar dados do atendimento ambulatorial
router.put('/atendimento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    // Primeiro, verificar se já existe uma consulta médica para este atendimento
    const consultaExistente = await knex('consultas_medicas')
      .where('atendimento_id', id)
      .first();

    if (consultaExistente) {
      // Atualizar a consulta médica existente com os dados ambulatoriais
      await knex('consultas_medicas')
        .where('atendimento_id', id)
        .update({
          // Dados vitais (pode ser atualizado no ambulatório)
          pressao_arterial: dados.pressao_arterial || consultaExistente.pressao_arterial,
          frequencia_cardiaca: dados.frequencia_cardiaca || consultaExistente.frequencia_cardiaca,
          temperatura: dados.temperatura || consultaExistente.temperatura,
          saturacao_oxigenio: dados.saturacao_oxigenio || consultaExistente.saturacao_oxigenio,
          frequencia_respiratoria: dados.frequencia_respiratoria || consultaExistente.frequencia_respiratoria,
          peso: dados.peso || consultaExistente.peso,
          altura: dados.altura || consultaExistente.altura,
          glicemia: dados.glicemia || consultaExistente.glicemia,

          // Dados que podem ser complementados no ambulatório
          plano_terapeutico: dados.plano_terapeutico || consultaExistente.plano_terapeutico,
          orientacoes_gerais: dados.orientacoes_gerais || consultaExistente.orientacoes_gerais,
          observacoes: dados.observacoes || consultaExistente.observacoes,
          medicamentos_prescritos: dados.medicamentos_prescritos || consultaExistente.medicamentos_prescritos,
          status_destino: dados.status_destino || consultaExistente.status_destino,
          observacoes_destino: dados.observacoes_destino || consultaExistente.observacoes_destino,

          // Dados específicos do ambulatório
          usuario_ambulatorio: dados.usuario_ambulatorio,
          data_atendimento_ambulatorio: new Date()
        });
    } else {
      // Criar nova entrada na consultas_medicas (caso não tenha passado pelo médico)
      await knex('consultas_medicas').insert({
        atendimento_id: id,
        pressao_arterial: dados.pressao_arterial,
        frequencia_cardiaca: dados.frequencia_cardiaca,
        temperatura: dados.temperatura,
        saturacao_oxigenio: dados.saturacao_oxigenio,
        frequencia_respiratoria: dados.frequencia_respiratoria,
        peso: dados.peso,
        altura: dados.altura,
        glicemia: dados.glicemia,
        queixa_principal: dados.queixa_principal,
        historia_doenca_atual: dados.historia_doenca_atual,
        exame_fisico: dados.exame_fisico,
        hipotese_diagnostica: dados.hipotese_diagnostica,
        plano_terapeutico: dados.plano_terapeutico,
        orientacoes_gerais: dados.orientacoes_gerais,
        observacoes: dados.observacoes,
        medicamentos_prescritos: dados.medicamentos_prescritos,
        status_destino: dados.status_destino,
        observacoes_destino: dados.observacoes_destino,
        usuario_ambulatorio: dados.usuario_ambulatorio,
        data_atendimento_ambulatorio: new Date()
      });
    }

    // Atualizar o status na tabela atendimentos se necessário
    if (dados.status_destino) {
      await knex('atendimentos')
        .where('id', id)
        .update({
          status: dados.status_destino
        });
    }

    res.json({ message: 'Atendimento ambulatorial salvo com sucesso' });
  } catch (err) {
    console.error('Erro ao salvar atendimento ambulatorial:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;