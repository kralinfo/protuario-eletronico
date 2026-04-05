/**
 * EventBus
 * Centralizador de eventos para desacoplar lógica de negócio da comunicação em tempo real
 * Implementa padrão Observer/Pub-Sub
 */

import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.subscribers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 100;
    this.setMaxListeners(50);
  }

  /**
   * Inscreve listener para evento
   * @param {string} eventName - Nome do evento
   * @param {Function} handler - Handler do evento
   * @param {Object} options - Opções (once, priority, etc)
   */
  subscribe(eventName, handler, options = {}) {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }

    const subscription = {
      id: Math.random().toString(36),
      handler,
      priority: options.priority || 0,
      once: options.once || false,
      context: options.context || null
    };

    const subscribers = this.subscribers.get(eventName);
    subscribers.push(subscription);

    // Ordenar por prioridade (maior prioridade primeiro)
    subscribers.sort((a, b) => b.priority - a.priority);

    console.log(`📍 Subscriber registrado para evento: ${eventName}`);

    // Retornar função para desinscrição
    return () => this.unsubscribe(eventName, subscription.id);
  }

  /**
   * Inscreve listener que executa uma única vez
   * @param {string} eventName - Nome do evento
   * @param {Function} handler - Handler do evento
   */
  subscribeOnce(eventName, handler, options = {}) {
    return this.subscribe(eventName, handler, { ...options, once: true });
  }

  /**
   * Desinscreve listener
   * @param {string} eventName - Nome do evento
   * @param {string} subscriptionId - ID da inscrição
   */
  unsubscribe(eventName, subscriptionId) {
    if (!this.subscribers.has(eventName)) {
      return;
    }

    const subscribers = this.subscribers.get(eventName);
    const index = subscribers.findIndex(s => s.id === subscriptionId);

    if (index > -1) {
      subscribers.splice(index, 1);
      console.log(`🗑️  Subscriber removido do evento: ${eventName}`);
    }
  }

  /**
   * Dispara evento sobre todos os subscribers
   * @param {string} eventName - Nome do evento
   * @param {Object} data - Dados do evento
   * @returns {Promise} Promessa que resolve quando todos os handlers completarem
   */
  async emit(eventName, data = {}) {
    console.log(`🔔 Evento disparado: ${eventName}`, data);

    // Adicionar ao histórico
    this._addToHistory({
      event: eventName,
      data,
      timestamp: new Date()
    });

    if (!this.subscribers.has(eventName)) {
      return;
    }

    const subscribers = this.subscribers.get(eventName);
    const handlers = [...subscribers]; // Copy para evitar modificações durante execução

    // Executar handlers
    for (const subscription of handlers) {
      try {
        const result = subscription.handler.call(
          subscription.context,
          data
        );

        // Se retornar Promise, aguardar
        if (result instanceof Promise) {
          await result;
        }

        // Se é um subscriber único, remover
        if (subscription.once) {
          this.unsubscribe(eventName, subscription.id);
        }
      } catch (error) {
        console.error(`❌ Erro ao executar handler para evento '${eventName}':`, error);
      }
    }
  }

  /**
   * Dispara evento e aguarda resposta (para padrão request-reply)
   * @param {string} eventName - Nome do evento
   * @param {Object} data - Dados do evento
   * @param {number} timeout - Timeout em ms
   */
  async request(eventName, data = {}, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout ao aguardar resposta de '${eventName}'`));
      }, timeout);

      this.subscribeOnce(`${eventName}:response`, (response) => {
        clearTimeout(timeoutHandle);
        resolve(response);
      });

      this.emit(eventName, data);
    });
  }

  /**
   * Responde a um request
   * @param {string} eventName - Nome do evento
   * @param {Object} response - Resposta
   */
  respond(eventName, response) {
    this.emit(`${eventName}:response`, response);
  }

  /**
   * Limpa todos os subscribers de um evento
   * @param {string} eventName - Nome do evento
   */
  clear(eventName) {
    if (eventName) {
      this.subscribers.delete(eventName);
      console.log(`🗑️  Todos os subscribers de '${eventName}' foram removidos`);
    } else {
      this.subscribers.clear();
      console.log(`🗑️  Todos os subscribers foram removidos`);
    }
  }

  /**
   * Obtém histórico de eventos
   * @param {number} limit - Quantidade de eventos a retornar
   */
  getHistory(limit = 10) {
    return this.eventHistory.slice(-limit);
  }

  /**
   * Adiciona evento ao histórico
   * @private
   */
  _addToHistory(event) {
    this.eventHistory.push(event);
    
    // Manter tamanho máximo
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Obtém estatísticas de subscribers
   * @returns {Object}
   */
  getStats() {
    const stats = {
      totalEvents: this.subscribers.size,
      events: {}
    };

    for (const [eventName, subscribers] of this.subscribers) {
      stats.events[eventName] = subscribers.length;
    }

    return stats;
  }
}

// Singleton
const eventBus = new EventBus();

export default eventBus;
