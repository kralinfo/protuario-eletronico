import dashboardService from '../services/dashboardService.js';

/**
 * DashboardController
 *
 * Camada HTTP — valida parâmetros, chama DashboardService e retorna JSON.
 * Todos os endpoints aceitam ?data=YYYY-MM-DD (opcional; padrão: hoje).
 */
class DashboardController {

  /**
   * GET /api/dashboard/overview
   * KPIs: totalPacientesHoje, pacientesEmAtendimento,
   *       tempoMedioEspera, atendimentosFinalizados
   */
  static async overview(req, res) {
    try {
      const resultado = await dashboardService.overview(req.query.data || null);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] overview:', error);
      res.status(500).json({ message: 'Erro interno ao carregar overview.' });
    }
  }

  /**
   * GET /api/dashboard/atendimentos-por-hora
   * [{ hora: "08:00", total: 10 }, ...]
   */
  static async atendimentosPorHora(req, res) {
    try {
      const resultado = await dashboardService.atendimentosPorHora(req.query.data || null);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] atendimentosPorHora:', error);
      res.status(500).json({ message: 'Erro interno ao carregar atendimentos por hora.' });
    }
  }

  /**
   * GET /api/dashboard/classificacao-risco
   * [{ nivel: "VERMELHO", total: 5 }, ...]
   */
  static async classificacaoRisco(req, res) {
    try {
      const resultado = await dashboardService.classificacaoRisco(req.query.data || null);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] classificacaoRisco:', error);
      res.status(500).json({ message: 'Erro interno ao carregar classificação de risco.' });
    }
  }

  /**
   * GET /api/dashboard/pacientes-por-etapa
   * { recepcao, triagem, aguardandoMedico, emAtendimento, observacao }
   */
  static async pacientesPorEtapa(req, res) {
    try {
      const resultado = await dashboardService.pacientesPorEtapa(req.query.data || null);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] pacientesPorEtapa:', error);
      res.status(500).json({ message: 'Erro interno ao carregar pacientes por etapa.' });
    }
  }

  /**
   * GET /api/dashboard/produtividade-medicos
   * [{ nome, atendimentos, tempoMedio }]
   */
  static async produtividadeMedicos(req, res) {
    try {
      const resultado = await dashboardService.produtividadeMedicos(req.query.data || null);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] produtividadeMedicos:', error);
      res.json([]); // retorna vazio se tabela não existir
    }
  }

  /**
   * GET /api/dashboard/pacientes-criticos
   * [{ nome, classificacao, tempoEspera, status }]
   */
  static async pacientesCriticos(req, res) {
    try {
      const resultado = await dashboardService.pacientesCriticos();
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] pacientesCriticos:', error);
      res.status(500).json({ message: 'Erro interno ao carregar pacientes críticos.' });
    }
  }

  // ── Legado: mantido para compatibilidade com o frontend já integrado ──────

  static async operacional(req, res) {
    try {
      const [overview, porEtapa, criticos, classificacao] = await Promise.all([
        dashboardService.overview(null),
        dashboardService.pacientesPorEtapa(null),
        dashboardService.pacientesCriticos(),
        dashboardService.classificacaoRisco(null)
      ]);

      const por_classificacao = Object.fromEntries(
        classificacao.map(c => [c.nivel.toLowerCase(), c.total])
      );

      res.json({
        total_hoje:         overview.totalPacientesHoje,
        aguardando_triagem: porEtapa.triagem,
        em_triagem:         0,
        pos_triagem:        porEtapa.aguardandoMedico,
        em_atendimento:     overview.pacientesEmAtendimento,
        concluidos:         overview.atendimentosFinalizados,
        abandonos:          0,
        tempo_medio_espera: overview.tempoMedioEspera,
        por_classificacao,
        alertas_criticos:   criticos.map(c => ({
          id:                  0,
          paciente_nome:       c.nome,
          status:              c.status,
          classificacao_risco: c.classificacao,
          minutos_espera:      c.tempoEspera
        }))
      });
    } catch (error) {
      console.error('[DashboardController] operacional:', error);
      res.status(500).json({ message: 'Erro interno ao carregar dados do dashboard.' });
    }
  }

  /** Legado: /api/dashboard/por-hora (mantém contrato antigo do frontend) */
  static async porHora(req, res) {
    try {
      const resultado = await dashboardService.atendimentosPorHora(req.query.data || null);
      // Legado retornava { hora: number } — converter para manter compatibilidade
      res.json(resultado.map(r => ({ hora: parseInt(r.hora), total: r.total })));
    } catch (error) {
      console.error('[DashboardController] porHora:', error);
      res.status(500).json({ message: 'Erro interno.' });
    }
  }

  /** Legado: /api/dashboard/medicos */
  static async medicosLegado(req, res) {
    try {
      const resultado = await dashboardService.produtividadeMedicos(req.query.data || null);
      res.json(resultado.map(r => ({
        medico_nome:          r.nome,
        total_atendimentos:   r.atendimentos,
        tempo_medio_minutos:  r.tempoMedio
      })));
    } catch (error) {
      console.error('[DashboardController] medicosLegado:', error);
      res.json([]);
    }
  }
}

export default DashboardController;

