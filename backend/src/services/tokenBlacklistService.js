import database from '../config/database.js';
import { createHash } from 'crypto';

/**
 * Servico de blacklist de tokens JWT.
 * Permite invalidar tokens no logout e em casos de seguranca.
 */
class TokenBlacklistService {

  /**
   * Gerar hash do token para armazenamento seguro.
   */
  static hashToken(token) {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Adicionar token a blacklist (invalidar).
   *
   * @param {string} token - Token JWT completo
   * @param {number} usuarioId - ID do usuario
   * @param {string} jti - JWT ID (identificador unico)
   * @param {Date} expiraEm - Data de expiracao do token
   * @param {string} motivo - Motivo da invalidacao
   */
  static async blacklistToken(token, usuarioId, jti, expiraEm, motivo = 'logout') {
    try {
      const tokenHash = this.hashToken(token);

      await database.query(
        `INSERT INTO token_blacklist (jti, usuario_id, token_hash, expira_em, motivo)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (jti) DO NOTHING`,
        [jti, usuarioId, tokenHash, expiraEm, motivo]
      );
    } catch (error) {
      console.error('❌ Erro ao adicionar token a blacklist:', error.message);
    }
  }

  /**
   * Verificar se token esta na blacklist.
   *
   * @param {string} jti - JWT ID do token
   * @returns {boolean} True se token esta na blacklist
   */
  static async isBlacklisted(jti) {
    try {
      const result = await database.query(
        'SELECT 1 FROM token_blacklist WHERE jti = $1',
        [jti]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('❌ Erro ao verificar blacklist:', error.message);
      return false; // Em caso de erro, permitir o acesso (fail open)
    }
  }

  /**
   * Invalidar todos os tokens de um usuario (forcar logout em todos os dispositivos).
   *
   * @param {number} usuarioId - ID do usuario
   * @param {string} motivo - Motivo da revogacao
   */
  static async invalidateAllUserTokens(usuarioId, motivo = 'revogacao_seguranca') {
    try {
      // Note: Tokens ainda validos serao marcados, mas so serao verificados no proximo uso
      // Nao temos como saber todos os JTIs ativos, entao marcamos por usuario_id
      // A verificacao no auth middleware checara esta tabela
      await database.query(
        `INSERT INTO token_blacklist (jti, usuario_id, token_hash, expira_em, motivo)
         VALUES ('user_all_' || $1 || '_' || extract(epoch from now()), $1, 'all_tokens', NOW() + INTERVAL '24 hours', $2)`,
        [usuarioId, motivo]
      );
    } catch (error) {
      console.error('❌ Erro ao invalidar todos os tokens do usuario:', error.message);
    }
  }

  /**
   * Limpar tokens expirados da blacklist (manutencao).
   * Rodar periodicamente (cron job).
   */
  static async cleanExpiredTokens() {
    try {
      const result = await database.query(
        `DELETE FROM token_blacklist WHERE expira_em < CURRENT_TIMESTAMP`
      );
      console.log(`🧹 Limpeza de tokens expirados: ${result.rowCount} tokens removidos`);
      return result.rowCount;
    } catch (error) {
      console.error('❌ Erro ao limpar tokens expirados:', error.message);
      return 0;
    }
  }
}

export default TokenBlacklistService;
