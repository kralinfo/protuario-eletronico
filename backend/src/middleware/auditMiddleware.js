import database from '../config/database.js';

/**
 * Middleware de auditoria persistente para LGPD.
 * Registra TODAS as operacoes com dados pessoais no banco de dados.
 *
 * LGPD Art. 46: Medidas de seguranca tecnicas e administrativas.
 *
 * Uso:
 *   router.post('/pacientes', auditMiddleware('CREATE', 'paciente'), ...);
 *   router.get('/pacientes/:id', auditMiddleware('READ', 'paciente'), ...);
 */

function auditMiddleware(acao, entidade) {
  return async (req, res, next) => {
    // Capturar o metodo original do res
    const originalJson = res.json.bind(res);

    // Override do res.json para capturar o resultado
    res.json = function (body) {
      // Registrar log de auditoria de forma assincrona (nao bloqueante)
      try {
        const logData = {
          usuario_id: req.usuario?.id || null,
          acao: acao,
          entidade: entidade,
          entidade_id: req.params?.id || req.body?.paciente_id || req.body?.id || null,
          ip: req.ip,
          user_agent: req.get('User-Agent') || null,
          observacoes: `${req.method} ${req.originalUrl}`
        };

        // Para operacoes de UPDATE/DELETE, capturar campos alterados
        if ((acao === 'UPDATE' || acao === 'CREATE') && req.body) {
          const camposAlterados = Object.keys(req.body).filter(k =>
            typeof req.body[k] !== 'object' || req.body[k] === null
          );

          if (camposAlterados.length > 0 && camposAlterados.length <= 10) {
            logData.campo_alterado = camposAlterados.join(', ');
          }
        }

        // Para DELETE, logar entidade_id
        if (acao === 'DELETE' && req.params?.id) {
          logData.entidade_id = parseInt(req.params.id);
        }

        // Registrar de forma assincrona (fire-and-forget para nao afetar a resposta)
        database.query(
          `INSERT INTO logs_auditoria (
            usuario_id, acao, entidade, entidade_id, ip, user_agent,
            campo_alterado, observacoes, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
          [
            logData.usuario_id,
            logData.acao,
            logData.entidade,
            logData.entidade_id,
            logData.ip,
            logData.user_agent,
            logData.campo_alterado || null,
            logData.observacoes
          ]
        ).catch(err => {
          // Log error but don't fail the request
          console.error('❌ Erro ao registrar log de auditoria:', err.message);
        });

      } catch (err) {
        // Nao falhar a requisicao se auditoria falhar
        console.error('❌ Erro no middleware de auditoria:', err.message);
      }

      // Chamar o json original
      return originalJson(body);
    };

    next();
  };
}

/**
 * Funcao auxiliar para registrar logs de auditoria manualmente.
 * Uso: await logAuditoria(usuarioId, 'EXPORT', 'paciente', pacienteId, 'Exportacao de dados');
 */
export async function logAuditoria(usuarioId, acao, entidade, entidadeId, observacoes = '', camposAlterados = null) {
  try {
    await database.query(
      `INSERT INTO logs_auditoria (
        usuario_id, acao, entidade, entidade_id, campo_alterado, observacoes, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [usuarioId, acao, entidade, entidadeId, camposAlterados, observacoes]
    );
  } catch (error) {
    console.error('❌ Erro ao registrar log de auditoria:', error.message);
  }
}

export default auditMiddleware;
