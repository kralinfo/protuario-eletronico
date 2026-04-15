// Relatório avançado de atendimentos
const reports = async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    const { dataInicial, dataFinal } = req.query;
    // Verificar se a coluna 'abandonado' existe na tabela atendimentos
    const colCheck = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='abandonado'");
    const hasAbandonado = colCheck.rowCount > 0;

    // Montar SELECT dinamicamente conforme existência da coluna
    const abandonoSelect = hasAbandonado ? 'a.abandonado, a.data_abandono,' : "false as abandonado, NULL as data_abandono,";

    let query = `SELECT a.id, a.paciente_id, a.created_at as data_criacao, p.nome as paciente_nome, a.data_hora_atendimento, a.procedencia as procedimento, a.motivo as motivo, a.observacoes as observacao, a.status, a.motivo_interrupcao, 
      (SELECT cm.hipotese_diagnostica FROM consultas_medicas cm WHERE cm.atendimento_id = a.id ORDER BY cm.created_at DESC LIMIT 1) as hipotese_diagnostica, 
      ${abandonoSelect} p.nascimento as paciente_nascimento, p.sexo as paciente_sexo, p.municipio as paciente_municipio, p.mae as paciente_mae, p.estado_civil as paciente_estado_civil, p.profissao as paciente_profissao, p.escolaridade as paciente_escolaridade, p.raca as paciente_raca, p.endereco as paciente_endereco, p.bairro as paciente_bairro, p.uf as paciente_uf, p.cep as paciente_cep, p.telefone as paciente_telefone, p.sus as paciente_sus
      FROM atendimentos a
      JOIN pacientes p ON p.id = a.paciente_id
      WHERE 1=1`;
    const params = [];
    let idx = 1;
    if (dataInicial) {
      query += ` AND a.data_hora_atendimento >= $${idx}`;
      params.push(new Date(dataInicial + 'T00:00:00'));
      idx++;
    }
    if (dataFinal) {
      query += ` AND a.data_hora_atendimento <= $${idx}`;
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
import Paciente from '../models/Paciente.js';
import db from '../config/database.js';
import PatientEventService from '../services/PatientEventService.js';
import { normalizeStatus } from '../utils/normalizeStatus.js';

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
      status: normalizeStatus(status || 'encaminhado_para_triagem'),
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
    const statusNorm = normalizeStatus(status);
    // Se status for interrompido, motivo_interrupcao deve ser informado
    if (statusNorm === 'interrompido' && (!motivo_interrupcao || motivo_interrupcao.trim() === '')) {
      return res.status(400).json({ error: 'Motivo da interrupção é obrigatório quando status for interrompido.' });
    }
    const atendimento = await Atendimento.atualizarStatus(id, statusNorm, statusNorm === 'interrompido' ? motivo_interrupcao : 'N/A');
    if (!atendimento) {
      return res.status(404).json({ error: 'Atendimento não encontrado.' });
    }

    // Se começou o atendimento agora, avisar o sistema de fila para limpar o banner "Chamado"
    if (statusNorm === 'em_atendimento_medico') {
      PatientEventService.emitAtendimentoStarted({
        patientId: id,
        patientName: atendimento.paciente_nome || 'Paciente',
        module: 'medico',
        timestamp: new Date()
      }).catch(err => console.error('[REALTIME] Erro ao emitir atendimento_started via atualizarStatus:', err.message));
    }

    // Limpar card do médico no painel de fila assim que o status sair de 'em_atendimento_medico'
    if (statusNorm !== 'em_atendimento_medico') {
      PatientEventService.emitAtendimentoFinished({
        patientId: id,
        patientName: '',
        module: 'medico',
        timestamp: new Date()
      }).catch(err => console.error('[REALTIME] Erro ao emitir atendimento_finished:', err.message));
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
      `SELECT id, status,
        (CASE WHEN (SELECT count(*) FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='abandonado') > 0
          THEN abandonado ELSE false END) as abandonado
       FROM atendimentos WHERE id = $1`,
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
    
    if (atendimentoExistente.rows[0].status === 'atendimento_concluido') {
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
    if (data) {
      whereClauses.push(`a.data_hora_atendimento::date = $${idx++}`);
      params.push(new Date(data).toISOString().split('T')[0]);
    }
    if (status) {
      whereClauses.push(`a.status = $${idx++}`);
      params.push(status);
    }
    
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const query = `
      SELECT a.*, p.nome as paciente_nome, p.telefone as paciente_telefone
      FROM atendimentos a
      JOIN pacientes p ON p.id = a.paciente_id
      ${whereClause}
      ORDER BY a.data_hora_atendimento DESC
    `;
    const result = await db.query(query, params);
    res.json(result.rows);
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
    
    // IMPORTANTE: Buscar o atendimento atual para preservar campos críticos da triagem
    const atendimentoAtual = await db.query('SELECT classificacao_risco, prioridade FROM atendimentos WHERE id = $1', [id]);
    if (!atendimentoAtual.rows[0]) {
      return res.status(404).json({ error: 'Atendimento não encontrado' });
    }
    
    // Filtrar campos que NÃO são da triagem
    const {
      motivo_consulta,
      exame_fisico,
      hipotese_diagnostica,
      conduta_prescricao,
      status_destino,
      observacoes
    } = dadosMedico;
    // Corrige status usando normalizeStatus
    let statusCorrigido = normalizeStatus(dadosMedico.status || 'em_atendimento_medico');
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

    // Notifica o painel de TV quando o médico inicia o atendimento
    if (statusCorrigido === 'em_atendimento_medico') {
      (async () => {
        try {
          const pacNomeRes = await db.query(
            `SELECT p.nome FROM atendimentos a JOIN pacientes p ON p.id = a.paciente_id WHERE a.id = $1`,
            [id]
          );
          await PatientEventService.emitAtendimentoStarted({
            patientId: Number(id),
            patientName: pacNomeRes.rows[0]?.nome || 'Paciente',
            module: 'medico',
            timestamp: new Date()
          });
        } catch (err) {
          console.error('[REALTIME] Erro ao emitir atendimento_started via salvarDadosMedico:', err.message);
        }
      })();
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
      `SELECT id,
        (CASE WHEN (SELECT count(*) FROM information_schema.columns WHERE table_name='atendimentos' AND column_name='abandonado') > 0
          THEN abandonado ELSE false END) as abandonado
       FROM atendimentos WHERE id = $1`,
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

// Atendimentos por semana
export const atendimentosPorSemana = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/atendimentos/por-semana');
    const hoje = new Date();
    const diaSemanaHoje = hoje.getDay(); // 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta...
    console.log('Hoje é:', hoje.toISOString(), 'Dia da semana:', diaSemanaHoje);
    
    const segunda = new Date(hoje);
    segunda.setDate(hoje.getDate() - ((diaSemanaHoje + 6) % 7));
    segunda.setHours(0,0,0,0);
    
    // Ajustar para incluir todo o dia de hoje
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23,59,59,999);
    
    console.log('Intervalo:', segunda.toISOString(), 'até', fimHoje.toISOString());
    
    // Query com mais debug
    const queryDebug = `SELECT 
      data_hora_atendimento,
      EXTRACT(DOW FROM data_hora_atendimento) AS dow,
      TO_CHAR(data_hora_atendimento, 'YYYY-MM-DD HH24:MI:SS') as data_formatada
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      ORDER BY data_hora_atendimento`;
    
    const debugResult = await db.query(queryDebug, [segunda, fimHoje]);
    console.log('=== DEBUG: Todos os atendimentos do período ===');
    debugResult.rows.forEach(row => {
      console.log(`Data: ${row.data_formatada}, DOW: ${row.dow}`);
    });
    
    const query = `SELECT EXTRACT(DOW FROM data_hora_atendimento) AS dow, COUNT(*) AS total
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      GROUP BY dow
      ORDER BY dow`;
    const params = [segunda, fimHoje];
    const result = await db.query(query, params);
    console.log('Resultado SQL agregado:', result.rows);
    
    const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const hojeIdx = ((diaSemanaHoje + 6) % 7); // Converter domingo=0 para nossa indexação segunda=0
    console.log('Hoje é índice:', hojeIdx, '(' + dias[hojeIdx] + ')');
    
    let counts = Array(7).fill(0);
    result.rows.forEach(row => {
      // PostgreSQL DOW: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
      // Nossa indexação: 0=Segunda, 1=Terça, 2=Quarta, 3=Quinta, 4=Sexta, 5=Sábado, 6=Domingo
      let idx;
      if (row.dow == 0) { // Domingo
        idx = 6;
      } else { // Segunda=1 vira 0, Terça=2 vira 1, etc
        idx = row.dow - 1;
      }
      
      console.log(`DOW ${row.dow} -> Índice ${idx} (${dias[idx]}) = ${row.total} atendimentos`);
      if (idx <= hojeIdx) counts[idx] = parseInt(row.total);
    });
    
    // Zerar dias futuros
    for (let i = hojeIdx + 1; i < 7; i++) counts[i] = 0;
    
    const diasRetorno = dias.slice(0, hojeIdx + 1);
    const countsRetorno = counts.slice(0, hojeIdx + 1);
    
    console.log('=== RESULTADO FINAL ===');
    console.log('Dias:', diasRetorno);
    console.log('Counts:', countsRetorno);
    
    res.json({ dias: diasRetorno, counts: countsRetorno });
  } catch (err) {
    console.error('Erro atendimentosPorSemana:', err);
    res.status(500).json({ error: err.message });
  }
};

// Atendimentos por mês
export const atendimentosPorMes = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/atendimentos/por-mes');
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    // Ajustar para incluir todo o dia de hoje
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23,59,59,999);
    
    console.log('Hoje é:', hoje.toISOString(), 'Dia do mês:', diaAtual);
    console.log('Intervalo:', inicioMes.toISOString(), 'até', fimHoje.toISOString());
    
    // Query com debug
    const queryDebug = `SELECT 
      data_hora_atendimento,
      EXTRACT(DAY FROM data_hora_atendimento) AS dia,
      TO_CHAR(data_hora_atendimento, 'YYYY-MM-DD HH24:MI:SS') as data_formatada
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      ORDER BY data_hora_atendimento`;
    
    const debugResult = await db.query(queryDebug, [inicioMes, fimHoje]);
    console.log('=== DEBUG: Todos os atendimentos do mês ===');
    debugResult.rows.forEach(row => {
      console.log(`Data: ${row.data_formatada}, Dia: ${row.dia}`);
    });
    
    const query = `SELECT EXTRACT(DAY FROM data_hora_atendimento) AS dia, COUNT(*) AS total
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      GROUP BY dia
      ORDER BY dia`;
    const params = [inicioMes, fimHoje];
    const result = await db.query(query, params);
    console.log('Resultado SQL agregado:', result.rows);
    
    // Criar array de dias de 1 até hoje
    const dias = [];
    const counts = [];
    for (let i = 1; i <= diaAtual; i++) {
      dias.push(i.toString());
      counts.push(0);
    }
    
    result.rows.forEach(row => {
      const dia = parseInt(row.dia);
      const idx = dia - 1; // dia 1 = índice 0
      console.log(`Dia ${dia} -> Índice ${idx} = ${row.total} atendimentos`);
      if (idx >= 0 && idx < counts.length) {
        counts[idx] = parseInt(row.total);
      }
    });
    
    console.log('=== RESULTADO FINAL ===');
    console.log('Dias:', dias);
    console.log('Counts:', counts);
    
    res.json({ dias, counts });
  } catch (err) {
    console.error('Erro atendimentosPorMes:', err);
    res.status(500).json({ error: err.message });
  }
};

// Atendimentos por ano
export const atendimentosPorAno = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/atendimentos/por-ano');
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    console.log('Intervalo:', inicioAno, hoje);
    const query = `SELECT EXTRACT(MONTH FROM data_hora_atendimento) AS mes, COUNT(*) AS total
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      GROUP BY mes`;
    const params = [inicioAno, hoje];
    const result = await db.query(query, params);
    console.log('Resultado SQL:', result.rows);
    let counts = Array(12).fill(0);
    result.rows.forEach(row => {
      const idx = row.mes - 1;
      if (idx <= mesAtual) counts[idx] = parseInt(row.total);
    });
    for (let i = mesAtual + 1; i < 12; i++) counts[i] = 0;
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    console.log('Meses:', meses.slice(0, mesAtual + 1), 'Counts:', counts.slice(0, mesAtual + 1));
    res.json({ meses: meses.slice(0, mesAtual + 1), counts: counts.slice(0, mesAtual + 1) });
  } catch (err) {
    console.error('Erro atendimentosPorAno:', err);
    res.status(500).json({ error: err.message });
  }
};

// Endpoints para tempo médio de espera
export const tempoMedioPorSemana = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/tempo-medio/semana');
    const hoje = new Date();
    const diaAtual = hoje.getDay();
    
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - (diaAtual === 0 ? 6 : diaAtual - 1));
    inicioSemana.setHours(0, 0, 0, 0);
    
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);
    
    console.log('Calculando tempo médio de espera da semana até hoje');
    console.log('Intervalo:', inicioSemana.toISOString(), 'até', fimHoje.toISOString());
    
    const query = `
      SELECT AVG(
        CASE 
          WHEN data_inicio_triagem IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (data_inicio_triagem - data_hora_atendimento))/60
          WHEN status = 'encaminhado para triagem' THEN 
            EXTRACT(EPOCH FROM (NOW() - data_hora_atendimento))/60
          ELSE NULL
        END
      ) as tempo_medio_minutos
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      AND data_hora_atendimento IS NOT NULL
    `;
    
    const result = await db.query(query, [inicioSemana, fimHoje]);
    const tempoMedio = Math.round(result.rows[0]?.tempo_medio_minutos || 0);
    
    console.log('Tempo médio de espera calculado:', tempoMedio, 'minutos');
    res.json({ tempoMedioMinutos: tempoMedio });
  } catch (err) {
    console.error('Erro tempoMedioPorSemana:', err);
    res.status(500).json({ error: err.message });
  }
};

export const tempoMedioPorMes = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/tempo-medio/mes');
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);
    
    console.log('Calculando tempo médio de espera do mês até hoje');
    console.log('Intervalo:', inicioMes.toISOString(), 'até', fimHoje.toISOString());
    
    const query = `
      SELECT AVG(
        CASE 
          WHEN data_inicio_triagem IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (data_inicio_triagem - data_hora_atendimento))/60
          WHEN status = 'encaminhado para triagem' THEN 
            EXTRACT(EPOCH FROM (NOW() - data_hora_atendimento))/60
          ELSE NULL
        END
      ) as tempo_medio_minutos
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      AND data_hora_atendimento IS NOT NULL
    `;
    
    const result = await db.query(query, [inicioMes, fimHoje]);
    const tempoMedio = Math.round(result.rows[0]?.tempo_medio_minutos || 0);
    
    console.log('Tempo médio de espera calculado:', tempoMedio, 'minutos');
    res.json({ tempoMedioMinutos: tempoMedio });
  } catch (err) {
    console.error('Erro tempoMedioPorMes:', err);
    res.status(500).json({ error: err.message });
  }
};

export const tempoMedioPorAno = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/tempo-medio/ano');
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);
    
    console.log('Calculando tempo médio de espera do ano até hoje');
    console.log('Intervalo:', inicioAno.toISOString(), 'até', fimHoje.toISOString());
    
    const query = `
      SELECT AVG(
        CASE 
          WHEN data_inicio_triagem IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (data_inicio_triagem - data_hora_atendimento))/60
          WHEN status = 'encaminhado para triagem' THEN 
            EXTRACT(EPOCH FROM (NOW() - data_hora_atendimento))/60
          ELSE NULL
        END
      ) as tempo_medio_minutos
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      AND data_hora_atendimento IS NOT NULL
    `;
    
    const result = await db.query(query, [inicioAno, fimHoje]);
    const tempoMedio = Math.round(result.rows[0]?.tempo_medio_minutos || 0);
    
    console.log('Tempo médio de espera calculado:', tempoMedio, 'minutos');
    res.json({ tempoMedioMinutos: tempoMedio });
  } catch (err) {
    console.error('Erro tempoMedioPorAno:', err);
    res.status(500).json({ error: err.message });
  }
};

// Endpoints para classificação de risco
export const classificacaoRiscoPorSemana = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/classificacao-risco/semana');
    const hoje = new Date();
    const diaAtual = hoje.getDay();
    
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - (diaAtual === 0 ? 6 : diaAtual - 1));
    inicioSemana.setHours(0, 0, 0, 0);
    
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);
    
    console.log('Calculando classificação de risco para a semana');
    console.log('Intervalo:', inicioSemana.toISOString(), 'até', fimHoje.toISOString());
    
    const query = `
      SELECT 
        COALESCE(classificacao_risco, 'nao_classificado') as classificacao,
        COUNT(*) as quantidade
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      GROUP BY classificacao_risco
      ORDER BY quantidade DESC
    `;
    
    const result = await db.query(query, [inicioSemana, fimHoje]);
    
    // Mapear os valores do banco para o formato esperado pelo frontend
    const classificacoes = {
      'Vermelha': 0,
      'Laranja': 0,
      'Amarela': 0,
      'Verde': 0,
      'Azul': 0,
      'Não classificado': 0
    };
    
    result.rows.forEach(row => {
      const cor = row.classificacao;
      if (cor === 'vermelho') classificacoes['Vermelha'] = parseInt(row.quantidade);
      else if (cor === 'laranja') classificacoes['Laranja'] = parseInt(row.quantidade);
      else if (cor === 'amarelo') classificacoes['Amarela'] = parseInt(row.quantidade);
      else if (cor === 'verde') classificacoes['Verde'] = parseInt(row.quantidade);
      else if (cor === 'azul') classificacoes['Azul'] = parseInt(row.quantidade);
      else if (cor === 'nao_classificado') classificacoes['Não classificado'] = parseInt(row.quantidade);
    });
    
    const dados = Object.entries(classificacoes).map(([label, value]) => ({
      label,
      value,
      color: label === 'Vermelha' ? '#e53935' :
             label === 'Laranja' ? '#ff9800' :
             label === 'Amarela' ? '#fbc02d' :
             label === 'Verde' ? '#43a047' : 
             label === 'Azul' ? '#1e88e5' : '#757575'
    }));
    
    console.log('Classificação de risco calculada:', dados);
    res.json({ classificacoes: dados });
  } catch (err) {
    console.error('Erro classificacaoRiscoPorSemana:', err);
    res.status(500).json({ error: err.message });
  }
};

export const classificacaoRiscoPorMes = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/classificacao-risco/mes');
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);
    
    console.log('Calculando classificação de risco para o mês');
    console.log('Intervalo:', inicioMes.toISOString(), 'até', fimHoje.toISOString());
    
    const query = `
      SELECT 
        COALESCE(classificacao_risco, 'nao_classificado') as classificacao,
        COUNT(*) as quantidade
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      GROUP BY classificacao_risco
      ORDER BY quantidade DESC
    `;
    
    const result = await db.query(query, [inicioMes, fimHoje]);
    
    // Mapear os valores do banco para o formato esperado pelo frontend
    const classificacoes = {
      'Vermelha': 0,
      'Laranja': 0,
      'Amarela': 0,
      'Verde': 0,
      'Azul': 0
    };
    
    result.rows.forEach(row => {
      const cor = row.classificacao;
      if (cor === 'vermelho') classificacoes['Vermelha'] = parseInt(row.quantidade);
      else if (cor === 'laranja') classificacoes['Laranja'] = parseInt(row.quantidade);
      else if (cor === 'amarelo') classificacoes['Amarela'] = parseInt(row.quantidade);
      else if (cor === 'verde') classificacoes['Verde'] = parseInt(row.quantidade);
      else if (cor === 'azul') classificacoes['Azul'] = parseInt(row.quantidade);
    });
    
    const dados = Object.entries(classificacoes).map(([label, value]) => ({
      label,
      value,
      color: label === 'Vermelha' ? '#e53935' :
             label === 'Laranja' ? '#ff9800' :
             label === 'Amarela' ? '#fbc02d' :
             label === 'Verde' ? '#43a047' : '#1e88e5'
    }));
    
    console.log('Classificação de risco calculada:', dados);
    res.json({ classificacoes: dados });
  } catch (err) {
    console.error('Erro classificacaoRiscoPorMes:', err);
    res.status(500).json({ error: err.message });
  }
};

export const classificacaoRiscoPorAno = async (req, res) => {
  try {
    console.log('Recebida requisição GET /api/classificacao-risco/ano');
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);
    
    console.log('Calculando classificação de risco para o ano');
    console.log('Intervalo:', inicioAno.toISOString(), 'até', fimHoje.toISOString());
    
    const query = `
      SELECT 
        COALESCE(classificacao_risco, 'nao_classificado') as classificacao,
        COUNT(*) as quantidade
      FROM atendimentos
      WHERE data_hora_atendimento >= $1 AND data_hora_atendimento <= $2
      GROUP BY classificacao_risco
      ORDER BY quantidade DESC
    `;
    
    const result = await db.query(query, [inicioAno, fimHoje]);
    
    // Mapear os valores do banco para o formato esperado pelo frontend
    const classificacoes = {
      'Vermelha': 0,
      'Laranja': 0,
      'Amarela': 0,
      'Verde': 0,
      'Azul': 0
    };
    
    result.rows.forEach(row => {
      const cor = row.classificacao;
      if (cor === 'vermelho') classificacoes['Vermelha'] = parseInt(row.quantidade);
      else if (cor === 'laranja') classificacoes['Laranja'] = parseInt(row.quantidade);
      else if (cor === 'amarelo') classificacoes['Amarela'] = parseInt(row.quantidade);
      else if (cor === 'verde') classificacoes['Verde'] = parseInt(row.quantidade);
      else if (cor === 'azul') classificacoes['Azul'] = parseInt(row.quantidade);
    });
    
    const dados = Object.entries(classificacoes).map(([label, value]) => ({
      label,
      value,
      color: label === 'Vermelha' ? '#e53935' :
             label === 'Laranja' ? '#ff9800' :
             label === 'Amarela' ? '#fbc02d' :
             label === 'Verde' ? '#43a047' : '#1e88e5'
    }));
    
    console.log('Classificação de risco calculada:', dados);
    res.json({ classificacoes: dados });
  } catch (err) {
    console.error('Erro classificacaoRiscoPorAno:', err);
    res.status(500).json({ error: err.message });
  }
};

// Detalhes de atendimentos por período
export const detalhesAtendimentos = async (req, res) => {
  try {
    console.log('🔍 Recebida requisição GET /api/atendimentos/detalhes');
    console.log('Query params:', req.query);
    
    const { periodo, indice } = req.query;
    
    if (!periodo || indice === undefined) {
      return res.status(400).json({ 
        error: 'Parâmetros período e índice são obrigatórios' 
      });
    }
    
    let query;
    let params = [];
    
    const hoje = new Date();
    
    switch (periodo) {
      case 'semana':
        // Para semana, indice representa o dia da semana (0=domingo, 1=segunda, etc.)
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        inicioSemana.setHours(0, 0, 0, 0);
        
        const diaEspecifico = new Date(inicioSemana);
        diaEspecifico.setDate(inicioSemana.getDate() + parseInt(indice));
        
        const fimDiaEspecifico = new Date(diaEspecifico);
        fimDiaEspecifico.setHours(23, 59, 59, 999);
        
        query = `
          SELECT 
            a.id,
            p.nome as paciente,
            a.data_hora_atendimento,
            a.classificacao_risco,
            a.status
          FROM atendimentos a
          LEFT JOIN pacientes p ON a.paciente_id = p.id
          WHERE a.data_hora_atendimento >= $1 
            AND a.data_hora_atendimento <= $2
          ORDER BY a.data_hora_atendimento DESC
        `;
        params = [diaEspecifico, fimDiaEspecifico];
        console.log('📅 Período semana - dia específico:', diaEspecifico.toISOString(), 'até', fimDiaEspecifico.toISOString());
        break;
        
      case 'mes':
        // Para mês, indice representa o dia do mês (0=dia 1, 1=dia 2, etc.)
        const diaDoMes = parseInt(indice) + 1; // indice 0 = dia 1, indice 1 = dia 2, etc.
        const inicioMesDia = new Date(hoje.getFullYear(), hoje.getMonth(), diaDoMes);
        const fimMesDia = new Date(hoje.getFullYear(), hoje.getMonth(), diaDoMes, 23, 59, 59, 999);
        
        query = `
          SELECT 
            a.id,
            p.nome as paciente,
            a.data_hora_atendimento,
            a.classificacao_risco,
            a.status
          FROM atendimentos a
          LEFT JOIN pacientes p ON a.paciente_id = p.id
          WHERE a.data_hora_atendimento >= $1 
            AND a.data_hora_atendimento <= $2
          ORDER BY a.data_hora_atendimento DESC
        `;
        params = [inicioMesDia, fimMesDia];
        console.log('📅 Período mês - dia específico:', inicioMesDia.toISOString(), 'até', fimMesDia.toISOString());
        break;
        
      case 'ano':
        // Para ano, indice representa o mês (0=janeiro, 1=fevereiro, etc.)
        const mesEspecifico = parseInt(indice); // 0=janeiro, 1=fevereiro, etc.
        const inicioMesAno = new Date(hoje.getFullYear(), mesEspecifico, 1);
        const fimMesAno = new Date(hoje.getFullYear(), mesEspecifico + 1, 0, 23, 59, 59, 999);
        
        query = `
          SELECT 
            a.id,
            p.nome as paciente,
            a.data_hora_atendimento,
            a.classificacao_risco,
            a.status
          FROM atendimentos a
          LEFT JOIN pacientes p ON a.paciente_id = p.id
          WHERE a.data_hora_atendimento >= $1 
            AND a.data_hora_atendimento <= $2
          ORDER BY a.data_hora_atendimento DESC
        `;
        params = [inicioMesAno, fimMesAno];
        console.log('📅 Período ano - mês específico:', inicioMesAno.toISOString(), 'até', fimMesAno.toISOString());
        break;
        
      default:
        return res.status(400).json({ error: 'Período inválido. Use: semana, mes ou ano' });
    }
    
    console.log('📋 Executando query:', query);
    console.log('📋 Parâmetros:', params);
    
    const result = await db.query(query, params);
    const atendimentos = result.rows;
    
    console.log(`✅ Encontrados ${atendimentos.length} atendimentos para ${periodo} - índice ${indice}`);
    
    res.json(atendimentos);
    
  } catch (err) {
    console.error('❌ Erro detalhesAtendimentos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Função para buscar atendimentos por classificação de risco e período
export const atendimentosPorClassificacao = async (req, res) => {
  try {
    const { classificacao, periodo } = req.query;

    if (!classificacao || !periodo) {
      return res.status(400).json({ error: 'Classificação e período são obrigatórios.' });
    }

    const hoje = new Date();
    let dataInicio, dataFim;
    
    switch (periodo) {
      case 'semana':
        // Mesma lógica do atendimentosPorSemana
        const diaSemanaHoje = hoje.getDay(); // 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta...
        dataInicio = new Date(hoje);
        dataInicio.setDate(hoje.getDate() - ((diaSemanaHoje + 6) % 7));
        dataInicio.setHours(0,0,0,0);
        
        dataFim = new Date(hoje);
        dataFim.setHours(23,59,59,999);
        break;
        
      case 'mes':
        // Mesma lógica do atendimentosPorMes
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        
        dataFim = new Date(hoje);
        dataFim.setHours(23,59,59,999);
        break;
        
      case 'ano':
        // Mesma lógica do atendimentosPorAno
        dataInicio = new Date(hoje.getFullYear(), 0, 1);
        
        dataFim = new Date(hoje);
        dataFim.setHours(23,59,59,999);
        break;
        
      default:
        return res.status(400).json({ error: 'Período inválido. Use semana, mes ou ano.' });
    }

    console.log(`🔍 Buscando atendimentos com classificação: ${classificacao}, período: ${periodo}`);
    console.log(`📅 Intervalo: ${dataInicio.toISOString()} até ${dataFim.toISOString()}`);

    const query = `
      SELECT 
        a.id,
        p.nome as paciente,
        a.data_hora_atendimento,
        a.classificacao_risco,
        a.status
      FROM atendimentos a
      JOIN pacientes p ON a.paciente_id = p.id
      WHERE a.classificacao_risco = $1
        AND a.data_hora_atendimento >= $2
        AND a.data_hora_atendimento <= $3
      ORDER BY a.data_hora_atendimento DESC
    `;

    const result = await db.query(query, [classificacao, dataInicio, dataFim]);
    console.log(`✅ Encontrados ${result.rows.length} atendimentos`);
    
    // Debug: vamos ver todas as classificações existentes se não encontrou nada
    if (result.rows.length === 0) {
      console.log('🔍 Debug: Nenhum atendimento encontrado, listando todas as classificações no banco...');
      const debugQuery = `SELECT DISTINCT classificacao_risco FROM atendimentos WHERE classificacao_risco IS NOT NULL`;
      const debugResult = await db.query(debugQuery);
      console.log('🔍 Classificações existentes no banco:', debugResult.rows.map(r => r.classificacao_risco));
    }
    
    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar atendimentos por classificação:', error);
    res.status(500).json({ error: 'Erro interno ao buscar atendimentos.' });
  }
};

export default {
  registrar,
  listarPorPaciente,
  listarDoDia,
  listarTodos,
  atualizarStatus,
  registrarAbandono,
  atualizar,
  remover,
  reports,
  buscarPorId,
  salvarDadosMedico,
  salvarAlteracoesTriagem,
  atendimentosPorSemana,
  atendimentosPorMes,
  atendimentosPorAno,
  tempoMedioPorSemana,
  tempoMedioPorMes,
  tempoMedioPorAno,
  classificacaoRiscoPorSemana,
  classificacaoRiscoPorMes,
  classificacaoRiscoPorAno,
  detalhesAtendimentos,
  atendimentosPorClassificacao
};
