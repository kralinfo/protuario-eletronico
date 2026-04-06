/**
 * Módulo Realtime para a Fila de Espera/Painel de Chamada
 * Gerencia eventos de chamada de pacientes para triagem e consultório médico.
 */

import eventBus from '../EventBus.js';
import realtimeManager from '../RealtimeManager.js';

class FilaRealtimeModule {
  static MODULE_NAME = 'fila';

  /**
   * Inicializa o módulo de fila
   */
  static initialize() {
    console.log('🚀 Inicializando módulo Fila Realtime (Painel)');

    // Registrar módulo no RealtimeManager
    realtimeManager.registerModule(this.MODULE_NAME, this);

    // Inscrever a handlers de eventos de negócio
    this._setupEventHandlers();

    console.log('✅ Módulo Fila Realtime inicializado');
  }

  /**
   * Configura listeners de eventos de negócio
   * @private
   */
  static _setupEventHandlers() {
    /**
     * Evento: Paciente chamado
     * Disparo: Quando um paciente é chamado para triagem ou consultório
     */
    eventBus.subscribe(
      'patient:called',
      (data) => this._onPatientCalled(data),
      { priority: 10 }
    );
  }

  /**
   * Tratador para o evento 'patient:called'
   * @param {Object} data - Dados do paciente e destino
   * @private
   */
  static _onPatientCalled(data) {
    console.log(`[FilaRealtimeModule] Paciente chamado: ${data.patientName} para ${data.target}`);

    // Emite para todos os clientes conectados ao módulo 'fila'
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:called', {
      patientId: data.patientId,
      patientName: data.patientName,
      target: data.target, // 'triagem' | 'medico'
      timestamp: data.timestamp || new Date()
    });
  }
}

export default FilaRealtimeModule;
