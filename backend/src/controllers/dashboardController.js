import dashboardService from '../services/dashboardService.js';

/**
 * DashboardController
 *
 * Camada HTTP — valida parâmetros, chama DashboardService e retorna JSON.
 * Params aceitos: ?periodo=dia|semana|mes|ano  (padrão: 'dia')
 *                 ?data=YYYY-MM-DD             (sobrescreve periodo, usa data exata)
 *                 ?dataInicio=YYYY-MM-DD       (intervalo personalizado, junto com dataFim)
 *                 ?dataFim=YYYY-MM-DD
 */

const PERIODOS_VALIDOS = ['dia', 'semana', 'mes', 'ano'];
const RE_DATA = /^\d{4}-\d{2}-\d{2}$/;

function extrairParams(req) {
  const data      = req.query.data      && RE_DATA.test(req.query.data)      ? req.query.data      : null;
  const dataInicio = req.query.dataInicio && RE_DATA.test(req.query.dataInicio) ? req.query.dataInicio : null;
  const dataFim   = req.query.dataFim   && RE_DATA.test(req.query.dataFim)   ? req.query.dataFim   : null;
  const periodo   = PERIODOS_VALIDOS.includes(req.query.periodo) ? req.query.periodo : 'dia';
  return { periodo, data, dataInicio, dataFim };
}

class DashboardController {

  static async overview(req, res) {
    try {
      const { periodo, data, dataInicio, dataFim } = extrairParams(req);
      const resultado = await dashboardService.overview(periodo, data, dataInicio, dataFim);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] overview:', error);
      res.status(500).json({ message: 'Erro interno ao carregar overview.' });
    }
  }

  static async atendimentosPorHora(req, res) {
    try {
      const { periodo, data, dataInicio, dataFim } = extrairParams(req);
      const resultado = await dashboardService.atendimentosPorHora(periodo, data, dataInicio, dataFim);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] atendimentosPorHora:', error);
      res.status(500).json({ message: 'Erro interno ao carregar atendimentos por hora.' });
    }
  }

  static async classificacaoRisco(req, res) {
    try {
      const { periodo, data, dataInicio, dataFim } = extrairParams(req);
      const resultado = await dashboardService.classificacaoRisco(periodo, data, dataInicio, dataFim);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] classificacaoRisco:', error);
      res.status(500).json({ message: 'Erro interno ao carregar classificação de risco.' });
    }
  }

  static async pacientesPorEtapa(req, res) {
    try {
      const { periodo, data, dataInicio, dataFim } = extrairParams(req);
      const resultado = await dashboardService.pacientesPorEtapa(periodo, data, dataInicio, dataFim);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] pacientesPorEtapa:', error);
      res.status(500).json({ message: 'Erro interno ao carregar pacientes por etapa.' });
    }
  }

  static async produtividadeMedicos(req, res) {
    try {
      const { periodo, data, dataInicio, dataFim } = extrairParams(req);
      const resultado = await dashboardService.produtividadeMedicos(periodo, data, dataInicio, dataFim);
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] produtividadeMedicos:', error);
      res.json([]);
    }
  }

  static async pacientesCriticos(req, res) {
    try {
      const resultado = await dashboardService.pacientesCriticos();
      res.json(resultado);
    } catch (error) {
      console.error('[DashboardController] pacientesCriticos:', error);
      res.status(500).json({ message: 'Erro interno ao carregar pacientes críticos.' });
    }
  }

  // ── Endpoint principal consumido pelo frontend ─────────────────────────────
  static async operacional(req, res) {
    try {
      const { periodo, data, dataInicio, dataFim } = extrairParams(req);

      const [overview, porEtapa, criticos, classificacao, abandonosRes] = await Promise.all([
        dashboardService.overview(periodo, data, dataInicio, dataFim),
        dashboardService.pacientesPorEtapa(periodo, data, dataInicio, dataFim),
        dashboardService.pacientesCriticos(),
        dashboardService.classificacaoRisco(periodo, data, dataInicio, dataFim),
        dashboardService.contarAbandonos(periodo, data, dataInicio, dataFim)
      ]);

      const por_classificacao = Object.fromEntries(
        classificacao.map(c => [c.nivel.toLowerCase(), c.total])
      );

      res.json({
        total_hoje:         overview.totalPacientesHoje,
        aguardando_triagem: porEtapa.aguardandoTriagem ?? 0,
        em_triagem:         porEtapa.emTriagem ?? 0,
        pos_triagem:        porEtapa.aguardandoMedico ?? 0,
        em_atendimento:     overview.pacientesEmAtendimento,
        concluidos:         overview.atendimentosFinalizados,
        abandonos:          abandonosRes,
        tempo_medio_espera: overview.tempoMedioEsperaFila,
        por_classificacao,
        alertas_criticos:   criticos.map((c, i) => ({
          id:                  c.id ?? i + 1,
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

  /** Legado: /api/dashboard/por-hora */
  static async porHora(req, res) {
    try {
      const { periodo, data } = extrairParams(req);
      const resultado = await dashboardService.atendimentosPorHora(periodo, data);
      res.json(resultado.map(r => ({ hora: parseInt(r.hora), total: r.total })));
    } catch (error) {
      console.error('[DashboardController] porHora:', error);
      res.status(500).json({ message: 'Erro interno.' });
    }
  }

  /** Legado: /api/dashboard/medicos */
  static async medicosLegado(req, res) {
    try {
      const { periodo, data } = extrairParams(req);
      const resultado = await dashboardService.produtividadeMedicos(periodo, data);
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

