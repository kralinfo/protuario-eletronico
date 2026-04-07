/**
 * AtendimentosController - Refactored
 * Responsabilidade: Orquestrações de requisições HTTP para atendimentos
 * Lógica extraída: Validators e Repositories
 */

import db from '../config/database.js';
import { EventEmitter } from 'events';
import {
  validarIDPositivo,
  validarPacienteExiste,
  validarAtendimentoExiste,
  validarNovoAtendimento,
  validarAtualizacaoStatus,
  validarRegistroAbandono,
  validarNaoAbandoando,
  validarNaoConcluido,
  validarAtualizacaoCompleta
} from '../validators/atendimentosValidator.js';
import {
  verificarColunaAbandono,
  buscarRelatorio,
  buscarAtendimentosDoDia,
  buscarAtendimentoPorId,
  buscarAtendimentosPorPaciente,
  criarAtendimento,
  atualizarStatusAtendimento,
  registrarAbandonoAtendimento,
  buscarStatusAbandono,
  atualizarDadosMedico,
  atualizarAtendimento,
  salvarAlteracoesTriagem as salvarAlterTriagemDB,
  listarTodosAtendimentos
} from '../repositories/atendimentosRepository.js';

// Instância compartilhada do EventEmitter
export const eventEmitter = new EventEmitter();

/**
 * Relatório avançado de atendimentos com filtros e estatísticas
 */
export const reports = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { dataInicial, dataFinal } = req.query;

    const atendimentos = await buscarRelatorio(dataInicial, dataFinal);

    const masculino = atendimentos.filter(a => a.paciente_sexo === 'M').length;
    const feminino = atendimentos.filter(a => a.paciente_sexo === 'F').length;
    const municipios = new Set(atendimentos.map(a => a.paciente_municipio)).size;

    const filters = {
      dataInicio: dataInicial || '',
      dataFim: dataFinal || '',
      orderBy: 'created_at',
      order: 'DESC'
    };

    const total = atendimentos.length;
    res.json({
      status: 'SUCCESS',
      data: atendimentos,
      statistics: {
        total,
        sexo: { masculino, feminino },
        municipios
      },
      filters
    });
  } catch (err) {
    console.error('Erro reports:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Registra novo atendimento no sistema
 */
export const registrar = async (req, res) => {
  try {
    const { pacienteId, dataHora, motivo, observacoes, procedencia, classificacao_risco } = req.body;

    // Validar entrada
    validarNovoAtendimento({ pacienteId, dataHora, motivo });
    await validarPacienteExiste(pacienteId);

    // Criar atendimento
    const atendimento = await criarAtendimento({
      pacienteId,
      dataHora,
      motivo,
      observacoes,
      procedencia,
      classificacao_risco
    });

    // Emitir evento em tempo real
    eventEmitter.emit('atendimentoCriado', {
      atendimento,
      timestamp: new Date()
    });

    res.status(201).json({ status: 'SUCCESS', data: atendimento });
  } catch (err) {
    console.error('Erro registrar:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Atualiza status do atendimento
 */
export const atualizarStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { novoStatus } = req.body;

    // Validar entrada
    validarIDPositivo(id);
    await validarAtendimentoExiste(id);
    validarAtualizacaoStatus(novoStatus);

    // Atualizar no banco
    const atendimento = await atualizarStatusAtendimento(id, novoStatus);

    // Emitir evento
    eventEmitter.emit('statusAtualizado', {
      atendimentoId: id,
      novoStatus,
      timestamp: new Date()
    });

    res.json({ status: 'SUCCESS', data: atendimento });
  } catch (err) {
    console.error('Erro atualizarStatus:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Registra abandono de atendimento
 */
export const registrarAbandono = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar entrada
    validarIDPositivo(id);
    await validarAtendimentoExiste(id);
    validarRegistroAbandono(id);
    await validarNaoAbandoando(id);
    await validarNaoConcluido(id);

    // Registrar abandono
    const atendimento = await registrarAbandonoAtendimento(id);

    // Emitir evento
    eventEmitter.emit('atendimentoAbandonado', {
      atendimentoId: id,
      timestamp: new Date()
    });

    res.json({ status: 'SUCCESS', data: atendimento });
  } catch (err) {
    console.error('Erro registrarAbandono:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Lista atendimentos do dia
 */
export const listarDoDia = async (req, res) => {
  try {
    const atendimentos = await buscarAtendimentosDoDia();
    res.json({ status: 'SUCCESS', data: atendimentos });
  } catch (err) {
    console.error('Erro listarDoDia:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Salva dados médicos do atendimento
 */
export const salvarDadosMedico = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnostico, tratamento, prescricao, observacoes } = req.body;

    validarIDPositivo(id);
    await validarAtendimentoExiste(id);

    const atendimento = await atualizarDadosMedico(id, {
      diagnostico,
      tratamento,
      prescricao,
      observacoes
    });

    eventEmitter.emit('dadosMedicoSalvos', {
      atendimentoId: id,
      timestamp: new Date()
    });

    res.json({ status: 'SUCCESS', data: atendimento });
  } catch (err) {
    console.error('Erro salvarDadosMedico:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Salva alterações de triagem
 */
export const salvarAlteracoesTriagem = async (req, res) => {
  try {
    const { id } = req.params;
    const dados = req.body;

    validarIDPositivo(id);
    await validarAtendimentoExiste(id);

    const atendimento = await salvarAlterTriagemDB(id, dados);

    eventEmitter.emit('triagensAlterada', {
      atendimentoId: id,
      timestamp: new Date()
    });

    res.json({ status: 'SUCCESS', data: atendimento });
  } catch (err) {
    console.error('Erro salvarAlteracoesTriagem:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Lista todos os atendimentos com paginação
 */
export const listarTodos = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const atendimentos = await listarTodosAtendimentos(offset, parseInt(limit));
    res.json({ status: 'SUCCESS', data: atendimentos, page, limit });
  } catch (err) {
    console.error('Erro listarTodos:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Atualiza atendimento completo
 */
export const atualizar = async (req, res) => {
  try {
    const { id } = req.params;
    validarIDPositivo(id);
    validarAtualizacaoCompleta(req.body);
    await validarAtendimentoExiste(id);

    const atendimento = await atualizarAtendimento(id, req.body);

    eventEmitter.emit('atendimentoAtualizado', {
      atendimentoId: id,
      timestamp: new Date()
    });

    res.json({ status: 'SUCCESS', data: atendimento });
  } catch (err) {
    console.error('Erro atualizar:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Remove atendimento
 */
export const remover = async (req, res) => {
  try {
    const { id } = req.params;
    validarIDPositivo(id);
    await validarAtendimentoExiste(id);

    const query = 'DELETE FROM atendimentos WHERE id = $1';
    await db.query(query, [id]);

    eventEmitter.emit('atendimentoRemovido', {
      atendimentoId: id,
      timestamp: new Date()
    });

    res.json({ status: 'SUCCESS', message: 'Atendimento removido' });
  } catch (err) {
    console.error('Erro remover:', err);
    res.status(400).json({ error: err.message });
  }
};

/**
 * Busca atendimento por ID
 */
export const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;
    validarIDPositivo(id);

    const atendimento = await buscarAtendimentoPorId(id);
    if (!atendimento) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }

    res.json({ status: 'SUCCESS', data: atendimento });
  } catch (err) {
    console.error('Erro buscarPorId:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Estatísticas por período (semana, mês, ano)
 */
const getDataRange = (periodo) => {
  const hoje = new Date();
  let dataInicio, dataFim = new Date(hoje);
  dataFim.setHours(23, 59, 59, 999);

  switch (periodo) {
    case 'semana':
      const diaAtual = hoje.getDay();
      dataInicio = new Date(hoje);
      dataInicio.setDate(hoje.getDate() - (diaAtual === 0 ? 6 : diaAtual - 1));
      dataInicio.setHours(0, 0, 0, 0);
      break;
    case 'mes':
      dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      break;
    case 'ano':
      dataInicio = new Date(hoje.getFullYear(), 0, 1);
      break;
    default:
      throw new Error('Período inválido');
  }

  return { dataInicio, dataFim };
};

export const atendimentosPorSemana = async (req, res) => {
  try {
    const { dataInicio, dataFim } = getDataRange('semana');
    const result = await db.query(
      'SELECT COUNT(*) as count FROM atendimentos WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2',
      [dataInicio, dataFim]
    );
    res.json({ atendimentos: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Erro atendimentosPorSemana:', err);
    res.status(500).json({ error: err.message });
  }
};

export const atendimentosPorMes = async (req, res) => {
  try {
    const { dataInicio, dataFim } = getDataRange('mes');
    const result = await db.query(
      'SELECT COUNT(*) as count FROM atendimentos WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2',
      [dataInicio, dataFim]
    );
    res.json({ atendimentos: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Erro atendimentosPorMes:', err);
    res.status(500).json({ error: err.message });
  }
};

export const atendimentosPorAno = async (req, res) => {
  try {
    const { dataInicio, dataFim } = getDataRange('ano');
    const result = await db.query(
      'SELECT COUNT(*) as count FROM atendimentos WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2',
      [dataInicio, dataFim]
    );
    res.json({ atendimentos: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Erro atendimentosPorAno:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Tempo médio por período
 */
export const tempoMedioPorSemana = async (req, res) => {
  try {
    const { dataInicio, dataFim } = getDataRange('semana');
    const query = `
      SELECT AVG(CASE 
        WHEN data_inicio_triagem IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (data_inicio_triagem - data_hora_atendimento))/60
        WHEN status = 'encaminhado para triagem' THEN 
          EXTRACT(EPOCH FROM (NOW() - data_hora_atendimento))/60
        ELSE NULL END) as tempo_medio_minutos
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
    `;
    const result = await db.query(query, [dataInicio, dataFim]);
    const tempoMedio = Math.round(result.rows[0]?.tempo_medio_minutos || 0);
    res.json({ tempoMedioMinutos: tempoMedio });
  } catch (err) {
    console.error('Erro tempoMedioPorSemana:', err);
    res.status(500).json({ error: err.message });
  }
};

export const tempoMedioPorMes = async (req, res) => {
  try {
    const { dataInicio, dataFim } = getDataRange('mes');
    const query = `
      SELECT AVG(CASE 
        WHEN data_inicio_triagem IS NOT NULL THEN 
          EXTRACT(EPOCH FROM (data_inicio_triagem - data_hora_atendimento))/60
        WHEN status = 'encaminhado para triagem' THEN 
          EXTRACT(EPOCH FROM (NOW() - data_hora_atendimento))/60
        ELSE NULL END) as tempo_medio_minutos
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
    `;
    const result = await db.query(query, [dataInicio, dataFim]);
    const tempoMedio = Math.round(result.rows[0]?.tempo_medio_minutos || 0);
    res.json({ tempoMedioMinutos: tempoMedio });
  } catch (err) {
    console.error('Erro tempoMedioPorMes:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Classificação de risco por período
 */
const getClassificacoesPorPeriodo = async (periodo) => {
  const { dataInicio, dataFim } = getDataRange(periodo);
  const query = `
    SELECT COALESCE(classificacao_risco, 'nao_classificado') as classificacao, COUNT(*) as quantidade
    FROM atendimentos
    WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
    GROUP BY classificacao_risco ORDER BY quantidade DESC
  `;
  const result = await db.query(query, [dataInicio, dataFim]);

  const mapeamento = {
    'vermelho': 'Vermelha',
    'laranja': 'Laranja',
    'amarelo': 'Amarela',
    'verde': 'Verde',
    'azul': 'Azul',
    'nao_classificado': 'Não classificado'
  };

  const corMap = {
    'Vermelha': '#e53935',
    'Laranja': '#ff9800',
    'Amarela': '#fbc02d',
    'Verde': '#43a047',
    'Azul': '#1e88e5',
    'Não classificado': '#757575'
  };

  return result.rows.map(row => ({
    label: mapeamento[row.classificacao] || row.classificacao,
    value: parseInt(row.quantidade),
    color: corMap[mapeamento[row.classificacao]] || '#757575'
  }));
};

export const classificacaoRiscoPorSemana = async (req, res) => {
  try {
    const classificacoes = await getClassificacoesPorPeriodo('semana');
    res.json({ classificacoes });
  } catch (err) {
    console.error('Erro classificacaoRiscoPorSemana:', err);
    res.status(500).json({ error: err.message });
  }
};

export const classificacaoRiscoPorMes = async (req, res) => {
  try {
    const classificacoes = await getClassificacoesPorPeriodo('mes');
    res.json({ classificacoes });
  } catch (err) {
    console.error('Erro classificacaoRiscoPorMes:', err);
    res.status(500).json({ error: err.message });
  }
};

export const classificacaoRiscoPorAno = async (req, res) => {
  try {
    const classificacoes = await getClassificacoesPorPeriodo('ano');
    res.json({ classificacoes });
  } catch (err) {
    console.error('Erro classificacaoRiscoPorAno:', err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * Detalhes de atendimentos por período com índice
 */
export const detalhesAtendimentos = async (req, res) => {
  try {
    const { periodo, indice } = req.query;

    if (!periodo || indice === undefined) {
      return res.status(400).json({ error: 'Parâmetros período e índice são obrigatórios' });
    }

    const hoje = new Date();
    let dataInicio, dataFim;

    switch (periodo) {
      case 'semana': {
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        inicioSemana.setHours(0, 0, 0, 0);

        const diaEspecifico = new Date(inicioSemana);
        diaEspecifico.setDate(inicioSemana.getDate() + parseInt(indice));

        dataFim = new Date(diaEspecifico);
        dataFim.setHours(23, 59, 59, 999);
        dataInicio = diaEspecifico;
        break;
      }
      case 'mes': {
        const diaDoMes = parseInt(indice) + 1;
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), diaDoMes);
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), diaDoMes, 23, 59, 59, 999);
        break;
      }
      case 'ano': {
        const mesEspecifico = parseInt(indice);
        dataInicio = new Date(hoje.getFullYear(), mesEspecifico, 1);
        dataFim = new Date(hoje.getFullYear(), mesEspecifico + 1, 0, 23, 59, 59, 999);
        break;
      }
      default:
        return res.status(400).json({ error: 'Período inválido' });
    }

    const query = `
      SELECT a.id, p.nome as paciente, a.data_hora_atendimento, a.classificacao_risco, a.status
      FROM atendimentos a
      LEFT JOIN pacientes p ON a.paciente_id = p.id
      WHERE a.data_hora_atendimento >= $1 AND a.data_hora_atendimento <= $2
      ORDER BY a.data_hora_atendimento DESC
    `;

    const result = await db.query(query, [dataInicio, dataFim]);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro detalhesAtendimentos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Atendimentos por classificação e período
 */
export const atendimentosPorClassificacao = async (req, res) => {
  try {
    const { classificacao, periodo } = req.query;

    if (!classificacao || !periodo) {
      return res.status(400).json({ error: 'Classificação e período são obrigatórios' });
    }

    const { dataInicio, dataFim } = getDataRange(periodo);

    const query = `
      SELECT a.id, p.nome as paciente, a.data_hora_atendimento, a.classificacao_risco, a.status
      FROM atendimentos a
      JOIN pacientes p ON a.paciente_id = p.id
      WHERE a.classificacao_risco = $1 AND a.data_hora_atendimento >= $2 AND a.data_hora_atendimento <= $3
      ORDER BY a.data_hora_atendimento DESC
    `;

    const result = await db.query(query, [classificacao, dataInicio, dataFim]);
    res.json(result.rows);
  } catch (err) {
    console.error('Erro atendimentosPorClassificacao:', err);
    res.status(500).json({ error: err.message });
  }
};
