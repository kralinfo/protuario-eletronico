/**
 * Sistema de Logging Profissional
 * Substitui todos os console.log por um sistema estruturado com níveis
 */

import { config } from '../config/env.js';

// Níveis de log em ordem de severidade
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
  silent: 5
};

// Configuração padrão
const DEFAULT_LEVEL = config.NODE_ENV === 'production' ? 'info' : 'debug';
const currentLevel = LOG_LEVELS[config.LOG_LEVEL || DEFAULT_LEVEL];

class Logger {
  constructor() {
    this.level = currentLevel;
  }

  /**
   * Log de debug (apenas em desenvolvimento)
   */
  debug(...args) {
    if (this.level <= LOG_LEVELS.debug) {
      console.log(`🐛 [DEBUG] ${new Date().toISOString()} -`, ...args);
    }
  }

  /**
   * Log de informação
   */
  info(...args) {
    if (this.level <= LOG_LEVELS.info) {
      console.log(`ℹ️ [INFO] ${new Date().toISOString()} -`, ...args);
    }
  }

  /**
   * Log de aviso
   */
  warn(...args) {
    if (this.level <= LOG_LEVELS.warn) {
      console.warn(`⚠️ [WARN] ${new Date().toISOString()} -`, ...args);
    }
  }

  /**
   * Log de erro
   */
  error(...args) {
    if (this.level <= LOG_LEVELS.error) {
      console.error(`❌ [ERROR] ${new Date().toISOString()} -`, ...args);
    }
  }

  /**
   * Log de erro fatal
   */
  fatal(...args) {
    if (this.level <= LOG_LEVELS.fatal) {
      console.error(`💀 [FATAL] ${new Date().toISOString()} -`, ...args);
      process.exit(1);
    }
  }

  /**
   * Log de sucesso
   */
  success(...args) {
    if (this.level <= LOG_LEVELS.info) {
      console.log(`✅ [SUCCESS] ${new Date().toISOString()} -`, ...args);
    }
  }
}

// Singleton
const logger = new Logger();

export default logger;