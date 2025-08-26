// Relatório avançado de atendimentos
const reports = async (req, res) => {
  try {
    const { dataInicial, dataFinal } = req.query;
    let query = `SELECT a.id, a.created_at as data_criacao, p.nome as paciente_nome, a.data_hora_atendimento, a.procedencia as procedimento, a.motivo as motivo, a.observacoes as observacao, a.status, a.motivo_interrupcao, a.abandonado, a.data_abandono, p.nascimento as paciente_nascimento, p.sexo as paciente_sexo, p.municipio as paciente_municipio
      FROM atendimentos a
      JOIN pacientes p ON p.id = a.paciente_id
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (dataInicial) {
      query += ` AND a.created_at >= $${idx}`;
      params.push(new Date(dataInicial + 'T00:00:00'));
      idx++;
    }
    if (dataFinal) {
      query += ` AND a.created_at <= $${idx}`;
      params.push(new Date(dataFinal + 'T23:59:59'));
      idx++;
    }
    // profissional removido do filtro e do retorno
    query += ` ORDER BY a.created_at DESC`;
    const result = await db.query(query, params);
    const atendimentos = result.rows || [];

    const masculino = atendimentos.filter(a => a.paciente_sexo === 'M').length;
    const feminino = atendimentos.filter(a => a.paciente_sexo === 'F').length;
    const municipios = new Set(atendimentos.map(a => a.paciente_municipio)).size;

    // Filtros retornados
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
        masculino,
        feminino,
        municipios
      },
      filters
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de atendimentos:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao gerar relatório.' 
    });
  }
};
import Atendimento from '../models/Atendimento.js';
import db from '../config/database.js';

const registrar = async (req, res) => {
  try {
    const { pacienteId, motivo, observacoes, acompanhante, procedencia, status, motivo_interrupcao } = req.body;
    
    if (!pacienteId || !motivo) {
      return res.status(400).json({ error: 'pacienteId e motivo são obrigatórios.' });
    }
    
    // Validar se o pacienteId é um número válido
    const pacienteIdNum = parseInt(pacienteId);
    if (isNaN(pacienteIdNum) || pacienteIdNum <= 0) {
      return res.status(400).json({ 
        error: 'ID do paciente inválido. Deve ser um número inteiro positivo.' 
      });
    }
    
    // Valida se paciente existe
    const paciente = await db.query('SELECT id FROM pacientes WHERE id = $1', [pacienteIdNum]);
    if (paciente.rowCount === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado.' });
    }
    
    // Cria atendimento
    const atendimento = await Atendimento.criar({ 
      pacienteId: pacienteIdNum, 
      motivo, 
      observacoes, 
      acompanhante, 
      procedencia, 
      status: status || 'encaminhado para triagem', // Garante status correto
      motivo_interrupcao 
    });
    return res.status(201).json(atendimento);
  } catch (error) {
    console.error('Erro ao registrar atendimento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao registrar atendimento.' 
    });
  }
};

const atualizarStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, motivo_interrupcao } = req.body;
    
    // Validar se o ID é um número válido
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ 
        error: 'ID do atendimento inválido. Deve ser um número inteiro positivo.' 
      });
    }
    
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório.' });
    }
    // Se status for interrompido, motivo_interrupcao deve ser informado
    if (status === 'interrompido' && (!motivo_interrupcao || motivo_interrupcao.trim() === '')) {
      return res.status(400).json({ error: 'Motivo da interrupção é obrigatório quando status for interrompido.' });
    }
    const atendimento = await Atendimento.atualizarStatus(id, status, status === 'interrompido' ? motivo_interrupcao : 'N/A');
    if (!atendimento) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }
    return res.json(atendimento);
  } catch (error) {
    console.error('Erro ao atualizar status do atendimento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao atualizar status do atendimento.' 
    });
  }
};

// Registrar abandono de atendimento
const registrarAbandono = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { motivo_abandono, etapa_abandono, usuario_id } = req.body;
    
    // Validar se o ID é um número válido
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ 
        error: 'ID do atendimento inválido. Deve ser um número inteiro positivo.' 
      });
    }
    
    if (!etapa_abandono) {
      return res.status(400).json({ 
        error: 'Etapa do abandono é obrigatória (ex: recepcao, triagem, sala_medica, ambulatorio).' 
      });
    }
    
    // Verificar se o atendimento existe e não foi abandonado ainda
    const atendimentoExistente = await db.query(
      'SELECT id, status, abandonado FROM atendimentos WHERE id = $1',
      [id]
    );
    
    if (atendimentoExistente.rowCount === 0) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }
    
    if (atendimentoExistente.rows[0].abandonado) {
      return res.status(400).json({ 
        error: 'Este atendimento já foi marcado como abandonado.' 
      });
    }
    
    if (atendimentoExistente.rows[0].status === 'concluido') {
      return res.status(400).json({ 
        error: 'Não é possível abandonar um atendimento já concluído.' 
      });
    }
    
    // Atualizar o atendimento com informações de abandono
    const updateQuery = `
      UPDATE atendimentos 
      SET 
        abandonado = true,
        data_abandono = CURRENT_TIMESTAMP,
        motivo_abandono = $1,
        etapa_abandono = $2,
        usuario_abandono_id = $3,
        status = 'abandonado',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [
      motivo_abandono || 'Não informado',
      etapa_abandono,
      usuario_id || null,
      id
    ]);
    
    const atendimentoAtualizado = result.rows[0];
    
    res.json({
      status: 'SUCCESS',
      message: 'Atendimento marcado como abandonado com sucesso.',
      data: atendimentoAtualizado
    });
    
  } catch (error) {
    console.error('Erro ao registrar abandono do atendimento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao registrar abandono do atendimento.' 
    });
  }
};

const listarPorPaciente = async (req, res) => {
  try {
    const pacienteId = parseInt(req.params.pacienteId);
    
    // Validar se o pacienteId é um número válido
    if (isNaN(pacienteId) || pacienteId <= 0) {
      return res.status(400).json({ 
        error: 'ID do paciente inválido. Deve ser um número inteiro positivo.' 
      });
    }
    
    const atendimentos = await Atendimento.listarPorPaciente(pacienteId);
    res.json(atendimentos);
  } catch (error) {
    console.error('Erro ao listar atendimentos por paciente:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar atendimentos.' 
    });
  }
};

const listarDoDia = async (req, res) => {
  try {
    // Filtros: pacienteId, data, status
    const { pacienteId, data, status } = req.query;
    let whereClauses = [];
    let params = [];
    let idx = 1;


    if (pacienteId) {
      const pacienteIdNum = parseInt(pacienteId);
      if (isNaN(pacienteIdNum) || pacienteIdNum <= 0) {
        return res.status(400).json({ error: 'ID do paciente inválido. Deve ser um número inteiro positivo.' });
      }
      whereClauses.push(`a.paciente_id = $${idx++}`);
      params.push(pacienteIdNum);
    }
    // ...continuação da função listarDoDia...
    // (restante do código da função listarDoDia)
  } catch (error) {
    console.error('Erro ao listar atendimentos do dia:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao buscar atendimentos do dia.' });
  }
}

// Novo endpoint: salvar apenas dados do atendimento médico
const salvarDadosMedico = async (req, res) => {
  try {
    const { id } = req.params;
    const dadosMedico = req.body;
    // Filtrar campos que NÃO são da triagem
    const {
      motivo_consulta,
      exame_fisico,
      hipotese_diagnostica,
      conduta_prescricao,
      status_destino,
      observacoes
    } = dadosMedico;
    // Corrige status se vier com hífen
    let statusCorrigido = dadosMedico.status;
    if (statusCorrigido === 'encaminhado_para_sala_medica') {
      statusCorrigido = 'encaminhado para sala médica';
    } else if (statusCorrigido === 'em_atendimento_medico') {
      statusCorrigido = 'em atendimento médico';
    } else if (statusCorrigido === 'encaminhado_para_ambulatorio') {
      statusCorrigido = 'encaminhado para ambulatório';
    } else if (statusCorrigido === 'em_atendimento_ambulatorial') {
      statusCorrigido = 'em atendimento ambulatorial';
    } else if (statusCorrigido === 'encaminhado_para_exames') {
      statusCorrigido = 'encaminhado para exames';
    } else if (statusCorrigido === 'atendimento_concluido') {
      statusCorrigido = 'atendimento concluido';
    }
    // Se não vier, mantém padrão
    if (!statusCorrigido) {
      statusCorrigido = 'em atendimento médico';
    }
    const result = await db.query(
        `UPDATE atendimentos SET 
          motivo = $2,
          exame_fisico = $3,
          hipotese_diagnostica = $4,
          conduta_prescricao = $5,
          status_destino = $6,
          observacoes = $7,
          status = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
        [id, motivo_consulta, exame_fisico, hipotese_diagnostica, conduta_prescricao, status_destino, observacoes, statusCorrigido]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }
    res.json({ message: 'Dados do atendimento médico salvos com sucesso', atendimento: result.rows[0] });
  } catch (error) {
    console.error('Erro ao salvar dados do atendimento médico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Novo endpoint: salvar apenas alterações da triagem
const salvarAlteracoesTriagem = async (req, res) => {
  try {
    const { id } = req.params;
    const dadosTriagem = req.body;
    // Chama o método já existente do model para salvar triagem
    const atendimento = await Atendimento.salvarTriagem(id, dadosTriagem);
    if (!atendimento) {
      return res.status(404).json({ error: 'Atendimento não encontrado ou não está em triagem' });
    }
    res.json({ message: 'Alterações da triagem salvas com sucesso', atendimento });
  } catch (error) {
    console.error('Erro ao salvar alterações da triagem:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const listarTodos = async (req, res) => {
  try {
    const atendimentos = await Atendimento.listarTodos();
    res.json(atendimentos);
  } catch (error) {
    console.error('Erro ao listar todos os atendimentos:', error);
    res.status(500).json({ error: 'Erro ao listar atendimentos' });
  }
};

// Atualizar atendimento completo
const atualizar = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
  const { motivo, observacoes, status, procedencia, acompanhante, queixa_principal, historia_atual } = req.body;
    
    // Validar se o ID é um número válido
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ 
        error: 'ID do atendimento inválido. Deve ser um número inteiro positivo.' 
      });
    }
    
    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'Motivo é obrigatório.' });
    }
    
    // Verificar se o atendimento existe
    const atendimentoExistente = await db.query(
      'SELECT id, abandonado FROM atendimentos WHERE id = $1',
      [id]
    );
    
    if (atendimentoExistente.rowCount === 0) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }
    
    if (atendimentoExistente.rows[0].abandonado) {
      return res.status(400).json({ 
        error: 'Não é possível editar um atendimento abandonado.' 
      });
    }
    
    // Atualizar o atendimento usando o método do modelo
    const atendimentoAtualizado = await Atendimento.update(id, {
      motivo: motivo.trim(),
      observacoes: observacoes ? observacoes.trim() : null,
      status: status || 'encaminhado para triagem',
      procedencia: procedencia ? procedencia.trim() : null,
      acompanhante: acompanhante ? acompanhante.trim() : null,
      queixa_principal: queixa_principal ? queixa_principal.trim() : null,
      historia_atual: historia_atual ? historia_atual.trim() : null
    });
    
    res.json({
      status: 'SUCCESS',
      message: 'Atendimento atualizado com sucesso.',
      data: atendimentoAtualizado
    });
    
  } catch (error) {
    console.error('Erro ao atualizar atendimento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao atualizar atendimento.' 
    });
  }
}

const remover = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Validar se o ID é um número válido
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ 
        error: 'ID do atendimento inválido. Deve ser um número inteiro positivo.' 
      });
    }
    
    const result = await db.query('DELETE FROM atendimentos WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover atendimento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao remover atendimento.' 
    });
  }
};

// Buscar atendimento por ID
const buscarPorId = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Validar se o ID é um número válido
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ 
        error: 'ID do atendimento inválido. Deve ser um número inteiro positivo.' 
      });
    }
    
    const result = await db.query(`
      SELECT a.*, p.nome as paciente_nome, p.id as paciente_id, p.mae as paciente_mae, p.nascimento as paciente_nascimento, p.sexo as paciente_sexo, p.estado_civil as paciente_estado_civil, p.profissao as paciente_profissao, p.escolaridade as paciente_escolaridade, p.raca as paciente_raca, p.endereco as paciente_endereco, p.bairro as paciente_bairro, p.municipio as paciente_municipio, p.uf as paciente_uf, p.cep as paciente_cep, p.telefone as paciente_telefone, p.sus as paciente_sus
      FROM atendimentos a
      JOIN pacientes p ON p.id = a.paciente_id
      WHERE a.id = $1
    `, [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }
    
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar atendimento:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor ao buscar atendimento.' 
    });
  }
};

export default { registrar, listarPorPaciente, listarDoDia, listarTodos, atualizarStatus, registrarAbandono, atualizar, remover, reports, buscarPorId, salvarDadosMedico, salvarAlteracoesTriagem };
