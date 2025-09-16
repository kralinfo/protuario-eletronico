import Atendimento from '../models/Atendimento.js';
import db from '../config/database.js';

// Classificação de risco baseada no Protocolo Manchester
const CLASSIFICACAO_RISCO = {
  'vermelho': { prioridade: 1, tempo_max: 0, descricao: 'Emergência' },
  'laranja': { prioridade: 2, tempo_max: 10, descricao: 'Muito urgente' },
  'amarelo': { prioridade: 3, tempo_max: 60, descricao: 'Urgente' },
  'verde': { prioridade: 4, tempo_max: 120, descricao: 'Pouco urgente' },
  'azul': { prioridade: 5, tempo_max: 240, descricao: 'Não urgente' }
};

// Função para formatar tempo em horas e minutos
function formatarTempoEspera(minutosTotais) {
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;
  
  if (horas === 0) {
    return `${minutos} min`;
  } else if (minutos === 0) {
    return `${horas}h`;
  } else {
    return `${horas}h ${minutos}min`;
  }
}

class TriagemController {
  // Listar pacientes na fila de triagem
  static async listarFilaTriagem(req, res) {
    try {
      const pacientes = await Atendimento.listarFilaTriagem();

      // Calcular tempo de espera e adicionar alertas
      const pacientesComTempo = pacientes.map(paciente => {
        const tempoEsperaMinutos = Math.floor(
          (new Date() - new Date(paciente.data_hora_atendimento)) / (1000 * 60)
        );

        let alerta = null;
        if (paciente.classificacao_risco && CLASSIFICACAO_RISCO[paciente.classificacao_risco]) {
          const tempoMax = CLASSIFICACAO_RISCO[paciente.classificacao_risco].tempo_max;
          if (tempoEsperaMinutos > tempoMax) {
            alerta = 'tempo_excedido';
          }
        }

        return {
          ...paciente,
          tempo_espera: tempoEsperaMinutos,
          tempo_espera_formatado: formatarTempoEspera(tempoEsperaMinutos),
          alerta
        };
      });

      res.json(pacientesComTempo);
    } catch (error) {
      console.error('Erro ao listar fila de triagem:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Listar todos os atendimentos do dia (todos os status)
  static async listarTodosAtendimentosDia(req, res) {
    try {
      const pacientes = await Atendimento.listarTodosAtendimentosDia();

      // Calcular tempo de espera e adicionar alertas
      const pacientesComTempo = pacientes.map(paciente => {
        const tempoEsperaMinutos = Math.floor(
          (new Date() - new Date(paciente.data_hora_atendimento)) / (1000 * 60)
        );

        let alerta = null;
        if (paciente.classificacao_risco && CLASSIFICACAO_RISCO[paciente.classificacao_risco]) {
          const tempoMax = CLASSIFICACAO_RISCO[paciente.classificacao_risco].tempo_max;
          if (tempoEsperaMinutos > tempoMax) {
            alerta = 'tempo_excedido';
          }
        }

        return {
          ...paciente,
          tempo_espera: tempoEsperaMinutos,
          tempo_espera_formatado: formatarTempoEspera(tempoEsperaMinutos),
          alerta
        };
      });

      res.json(pacientesComTempo);
    } catch (error) {
      console.error('Erro ao listar todos atendimentos do dia:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Iniciar triagem de um paciente
  static async iniciarTriagem(req, res) {
    try {
      const { id } = req.params;
      const usuario_id = req.user?.id; // Pegar do token JWT

      if (!usuario_id) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório' });
      }

      const atendimento = await Atendimento.iniciarTriagem(id, usuario_id);

      if (!atendimento) {
        return res.status(404).json({ 
          error: 'Atendimento não encontrado ou não está disponível para triagem' 
        });
      }

      res.json({
        message: 'Triagem iniciada com sucesso',
        atendimento
      });
    } catch (error) {
      console.error('Erro ao iniciar triagem:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Obter dados completos do atendimento para triagem
  static async obterDadosTriagem(req, res) {
    try {
      const { id } = req.params;
      
      const dadosTriagem = await Atendimento.obterDadosTriagem(id);
      
      if (!dadosTriagem) {
        return res.status(404).json({ error: 'Atendimento não encontrado' });
      }

      res.json(dadosTriagem);
    } catch (error) {
      console.error('Erro ao obter dados de triagem:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Salvar dados da triagem (parcial - enquanto está sendo preenchida)
  static async salvarTriagem(req, res) {
    try {
      const { id } = req.params;
      const dadosTriagem = req.body;

      console.log(`[SALVAR TRIAGEM] ID: ${id}, Dados:`, dadosTriagem);

      // Verificar se o atendimento existe
      const atendimentoAtual = await db.query(
        'SELECT id, status FROM atendimentos WHERE id = $1',
        [id]
      );

      if (atendimentoAtual.rows.length === 0) {
        console.log(`[SALVAR TRIAGEM] Atendimento ${id} não encontrado`);
        return res.status(404).json({ 
          error: 'Atendimento não encontrado' 
        });
      }

      const statusAtual = atendimentoAtual.rows[0].status;
      console.log(`[SALVAR TRIAGEM] Status atual do atendimento ${id}: ${statusAtual}`);

      const atendimento = await Atendimento.salvarTriagem(id, dadosTriagem);
      
      if (!atendimento) {
        console.log(`[SALVAR TRIAGEM] Falha ao salvar triagem - Erro desconhecido`);
        return res.status(500).json({ 
          error: 'Erro ao salvar dados da triagem' 
        });
      }

      console.log(`[SALVAR TRIAGEM] Triagem salva com sucesso para atendimento ${id}`);
      res.json({
        message: 'Dados da triagem salvos com sucesso',
        atendimento
      });
    } catch (error) {
      console.error('Erro ao salvar triagem:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Finalizar triagem
  static async finalizarTriagem(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar se dados obrigatórios estão preenchidos
      const dadosAtuais = await Atendimento.obterDadosTriagem(id);
      
      if (!dadosAtuais) {
        return res.status(404).json({ error: 'Atendimento não encontrado' });
      }

      // Validações obrigatórias
      const camposObrigatorios = [
        'pressao_arterial', 'temperatura', 'frequencia_cardiaca',
        'classificacao_risco', 'queixa_principal'
      ];
      
      const camposFaltando = camposObrigatorios.filter(campo => 
        !dadosAtuais[campo] || dadosAtuais[campo] === ''
      );

      if (camposFaltando.length > 0) {
        return res.status(400).json({
          error: 'Campos obrigatórios não preenchidos',
          campos_faltando: camposFaltando
        });
      }

      const { status_destino = 'encaminhado para sala médica' } = req.body;
      
      console.log('DEBUG - Finalizando triagem:');
      console.log('ID:', id);
      console.log('Status destino recebido:', status_destino);
      console.log('Body completo:', req.body);

      const atendimento = await Atendimento.finalizarTriagem(id, status_destino);
      
      if (!atendimento) {
        return res.status(404).json({ 
          error: 'Não foi possível finalizar a triagem' 
        });
      }

      res.json({
        message: `Triagem finalizada com sucesso. Paciente encaminhado para: ${status_destino}`,
        atendimento
      });
    } catch (error) {
      console.error('Erro ao finalizar triagem:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Listar triagens realizadas (para relatórios)
  static async listarTriagensRealizadas(req, res) {
    try {
      const { usuario_id, data_inicio, data_fim } = req.query;
      
      const triagens = await Atendimento.listarTriagensRealizadas(
        usuario_id, data_inicio, data_fim
      );
      
      res.json(triagens);
    } catch (error) {
      console.error('Erro ao listar triagens realizadas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Obter configurações de classificação de risco
  static async obterClassificacaoRisco(req, res) {
    res.json(CLASSIFICACAO_RISCO);
  }

  // Obter opções de status de destino após triagem
  static async obterStatusDestino(req, res) {
    const statusDestino = {
      'encaminhado para sala médica': 'Encaminhado para Sala Médica',
      'encaminhado para ambulatório': 'Encaminhado para Ambulatório', 
      'encaminhado para exames': 'Encaminhado para Exames',
      'atendimento_concluido': 'Atendimento Concluído (Alta)'
    };
    
    res.json(statusDestino);
  }

  // Obter estatísticas para dashboard
  static async obterEstatisticas(req, res) {
    try {
      console.log('🔍 Iniciando cálculo de estatísticas...');
      
      // 1. Pacientes aguardando triagem (hoje)
      const aguardandoQuery = await db.query(
        `SELECT COUNT(*) as total FROM atendimentos 
         WHERE status = 'encaminhado para triagem' 
         AND DATE(data_hora_atendimento) = CURRENT_DATE`
      );
      const pacientesAguardando = parseInt(aguardandoQuery.rows[0].total) || 0;
      
  // 2. Pacientes em triagem (qualquer data, ainda não finalizados)
      const emTriagemQuery = await db.query(
        `SELECT COUNT(*) as total FROM atendimentos 
     WHERE status = 'em_triagem'`
      );
      const pacientesEmTriagem = parseInt(emTriagemQuery.rows[0].total) || 0;
      
      // 3. Triagens concluídas hoje (baseado na data_fim_triagem)
      const concluidasQuery = await db.query(
        `SELECT COUNT(*) as total FROM atendimentos 
         WHERE data_fim_triagem IS NOT NULL 
         AND DATE(data_fim_triagem) = CURRENT_DATE`
      );
      const triagensConcluidasHoje = parseInt(concluidasQuery.rows[0].total) || 0;
      
      // 4. Tempo médio de espera (apenas pacientes aguardando hoje)
      let tempoMedioEspera = 0;
      if (pacientesAguardando > 0) {
        const tempoQuery = await db.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (NOW() - data_hora_atendimento))/60) as tempo_medio
           FROM atendimentos 
           WHERE status = 'encaminhado para triagem' 
           AND DATE(data_hora_atendimento) = CURRENT_DATE`
        );
        tempoMedioEspera = Math.round(parseFloat(tempoQuery.rows[0].tempo_medio) || 0);
      }
      
      // 5. Por classificação de risco (incluindo triagens concluídas hoje)
      const classificacaoQuery = await db.query(
        `SELECT classificacao_risco, COUNT(*) as total
         FROM atendimentos 
         WHERE (
           status IN ('encaminhado para triagem', 'em_triagem')
           OR (data_fim_triagem IS NOT NULL AND DATE(data_fim_triagem) = CURRENT_DATE)
         )
         AND classificacao_risco IS NOT NULL
         GROUP BY classificacao_risco`
      );
      
      const classificacaoRisco = {
        vermelho: 0,
        laranja: 0,
        amarelo: 0,
        verde: 0,
        azul: 0
      };
      
      classificacaoQuery.rows.forEach(row => {
        if (row.classificacao_risco && classificacaoRisco.hasOwnProperty(row.classificacao_risco)) {
          classificacaoRisco[row.classificacao_risco] = parseInt(row.total);
        }
      });
      
      const estatisticas = {
        pacientes_aguardando: pacientesAguardando,
        pacientes_em_triagem: pacientesEmTriagem,
        triagens_concluidas: triagensConcluidasHoje,
        tempo_medio_espera: tempoMedioEspera,
        por_classificacao: classificacaoRisco
      };
      
      console.log('📊 Estatísticas calculadas:', estatisticas);
      
      res.json(estatisticas);
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  // Método para obter o status do atendimento
  static obterStatusAtendimento(status) {
    switch (status) {
      case 'aguardando_triagem':
        return 'Aguardando Triagem';
      case 'em_triagem':
        return 'Em Triagem';
      case 'triagem_finalizada':
        return 'Triagem Finalizada';
      case 'atendimento_concluido':
        return 'Atendimento Concluído';
      case 'encaminhado_para_triagem':
        return '1 - Encaminhado para Triagem';
      case 'em_triagem':
        return '2 - Em Triagem';
      case 'encaminhado_para_sala_medica':
        return '3 - Encaminhado para Sala Médica';
      case 'em_atendimento_medico':
        return '4 - Em Atendimento Médico';
      case 'encaminhado_para_ambulatorio':
        return '5 - Encaminhado para Ambulatório';
      case 'em_atendimento_ambulatorial':
        return '6 - Em Atendimento Ambulatorial';
      case 'encaminhado_para_exames':
        return '7 - Encaminhado para Exames';
      case 'atendimento_concluido':
        return '8 - Atendimento Concluído';
      default:
        return 'Status Desconhecido';
    }
  }
}

export default TriagemController;
