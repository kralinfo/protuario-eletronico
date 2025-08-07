import Atendimento from '../models/Atendimento.js';

// Classificação de risco baseada no Protocolo Manchester
const CLASSIFICACAO_RISCO = {
  'vermelho': { prioridade: 1, tempo_max: 0, descricao: 'Emergência' },
  'laranja': { prioridade: 2, tempo_max: 10, descricao: 'Muito urgente' },
  'amarelo': { prioridade: 3, tempo_max: 60, descricao: 'Urgente' },
  'verde': { prioridade: 4, tempo_max: 120, descricao: 'Pouco urgente' },
  'azul': { prioridade: 5, tempo_max: 240, descricao: 'Não urgente' }
};

class TriagemController {
  // Listar pacientes na fila de triagem
  static async listarFilaTriagem(req, res) {
    try {
      const pacientes = await Atendimento.listarFilaTriagem();

      // Calcular tempo de espera e adicionar alertas
      const pacientesComTempo = pacientes.map(paciente => {
        const tempoEspera = Math.floor(
          (new Date() - new Date(paciente.data_hora_atendimento)) / (1000 * 60)
        );

        let alerta = null;
        if (paciente.classificacao_risco && CLASSIFICACAO_RISCO[paciente.classificacao_risco]) {
          const tempoMax = CLASSIFICACAO_RISCO[paciente.classificacao_risco].tempo_max;
          if (tempoEspera > tempoMax) {
            alerta = 'tempo_excedido';
          }
        }

        return {
          ...paciente,
          tempo_espera: tempoEspera,
          alerta
        };
      });

      res.json(pacientesComTempo);
    } catch (error) {
      console.error('Erro ao listar fila de triagem:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Iniciar triagem de um paciente
  static async iniciarTriagem(req, res) {
    try {
      const { id } = req.params;
      const { usuario_id } = req.body;

      if (!usuario_id) {
        return res.status(400).json({ error: 'ID do usuário é obrigatório' });
      }

      const atendimento = await Atendimento.iniciarTriagem(id, usuario_id);

      if (!atendimento) {
        return res.status(404).json({ 
          error: 'Atendimento não encontrado ou não está no status "encaminhado para triagem"' 
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

      // Validar classificação de risco se fornecida
      if (dadosTriagem.classificacao_risco && !CLASSIFICACAO_RISCO[dadosTriagem.classificacao_risco]) {
        return res.status(400).json({ 
          error: 'Classificação de risco inválida' 
        });
      }

      // Se classificação foi definida, definir prioridade automaticamente
      if (dadosTriagem.classificacao_risco) {
        dadosTriagem.prioridade = CLASSIFICACAO_RISCO[dadosTriagem.classificacao_risco].prioridade;
      }

      const atendimento = await Atendimento.salvarTriagem(id, dadosTriagem);
      
      if (!atendimento) {
        return res.status(404).json({ 
          error: 'Atendimento não encontrado ou não está em triagem' 
        });
      }

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

      const atendimento = await Atendimento.finalizarTriagem(id);
      
      if (!atendimento) {
        return res.status(404).json({ 
          error: 'Não foi possível finalizar a triagem' 
        });
      }

      res.json({
        message: 'Triagem finalizada com sucesso. Paciente agora está com status triagem_finalizada.',
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

  // Obter estatísticas da triagem
  static async obterEstatisticas(req, res) {
    try {
      const { data_inicio, data_fim } = req.query;
      
      // Aqui você pode implementar queries específicas para estatísticas
      // Por enquanto, vou retornar dados básicos da fila
      const filaTriagem = await Atendimento.listarFilaTriagem();
      
      const estatisticas = {
        pacientes_aguardando: filaTriagem.length,
        por_classificacao: {},
        tempo_medio_espera: 0
      };

      // Contar por classificação de risco
      filaTriagem.forEach(paciente => {
        const classificacao = paciente.classificacao_risco || 'sem_classificacao';
        estatisticas.por_classificacao[classificacao] = 
          (estatisticas.por_classificacao[classificacao] || 0) + 1;
      });

      // Calcular tempo médio de espera
      if (filaTriagem.length > 0) {
        const tempoTotal = filaTriagem.reduce((acc, paciente) => {
          const tempoEspera = Math.floor(
            (new Date() - new Date(paciente.data_hora_atendimento)) / (1000 * 60)
          );
          return acc + tempoEspera;
        }, 0);
        
        estatisticas.tempo_medio_espera = Math.round(tempoTotal / filaTriagem.length);
      }

      res.json(estatisticas);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Obter configurações de classificação de risco
  static async obterClassificacaoRisco(req, res) {
    res.json(CLASSIFICACAO_RISCO);
  }

  // Obter estatísticas para dashboard
  static async obterEstatisticas(req, res) {
    try {
      // Buscar todos os atendimentos relevantes
      const filaTriagem = await Atendimento.listarFilaTriagem();
      const hoje = new Date().toISOString().split('T')[0];
      
      console.log('Estatísticas - Fila de triagem:', filaTriagem.length, 'pacientes');
      console.log('Status dos pacientes:', filaTriagem.map(p => ({ id: p.id, status: p.status, nome: p.paciente_nome })));
      
      // Estatísticas básicas
      // Pacientes aguardando = recepcao + triagem (não incluir em_triagem)
      const pacientesAguardando = filaTriagem.filter(p => 
        p.status === 'encaminhado_para_triagem' || p.status === 'em_triagem'
      ).length;
      
      // Pacientes em triagem = apenas os que estão sendo atendidos
      const pacientesEmTriagem = filaTriagem.filter(p => p.status === 'em_triagem').length;
      
      // Total de pacientes na fila (todos os status relevantes)
      const totalAguardando = pacientesAguardando;
      
      // Triagens concluídas hoje
      const triagensConcluidas = await Atendimento.listarTriagensRealizadas(null, hoje, hoje);
      
      console.log('Triagens concluídas hoje:', triagensConcluidas?.length || 0);
      
      // Tempo médio de espera (calcular baseado na fila atual)
      let tempoMedioEspera = 0;
      if (filaTriagem.length > 0) {
        const totalTempo = filaTriagem.reduce((total, paciente) => {
          const tempoEspera = Math.floor(
            (new Date() - new Date(paciente.data_hora_atendimento)) / (1000 * 60)
          );
          return total + tempoEspera;
        }, 0);
        tempoMedioEspera = totalTempo / filaTriagem.length;
      }
      
      // Classificação de risco (contar quantos de cada tipo)
      const classificacaoRisco = {
        vermelho: 0,
        laranja: 0,
        amarelo: 0,
        verde: 0,
        azul: 0
      };
      
      filaTriagem.forEach(paciente => {
        if (paciente.classificacao_risco && classificacaoRisco.hasOwnProperty(paciente.classificacao_risco)) {
          classificacaoRisco[paciente.classificacao_risco]++;
        }
      });
      
      const estatisticas = {
        pacientes_aguardando: totalAguardando, // Total na fila (recepcao + aguardando_triagem)
        pacientes_em_triagem: pacientesEmTriagem, // Apenas os que estão sendo atendidos
        triagens_concluidas: triagensConcluidas?.length || 0,
        tempo_medio_espera: Math.round(tempoMedioEspera),
        por_classificacao: classificacaoRisco
      };
      
      console.log('Estatísticas calculadas:', estatisticas);
      
      res.json(estatisticas);
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}

export default TriagemController;
