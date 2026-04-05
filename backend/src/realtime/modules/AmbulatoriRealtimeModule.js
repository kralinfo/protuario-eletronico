/**
 * AmbulatoriRealtimeModule
 * Módulo de tempo real para ambulatório/médico
 * Gerencia eventos e atualiza clientes conectados em tempo real
 */

import eventBus from '../EventBus.js';
import realtimeManager from '../RealtimeManager.js';

class AmbulatoriRealtimeModule {
  static MODULE_NAME = 'ambulatorio';
  static MEDICO_MODULE = 'medico';

  /**
   * Inicializa o módulo de ambulatório
   */
  static initialize() {
    console.log('🚀 Inicializando módulo Ambulatório Realtime');

    // Registrar módulo no RealtimeManager
    realtimeManager.registerModule(this.MODULE_NAME, this);
    realtimeManager.registerModule(this.MEDICO_MODULE, this);

    // Inscrever a handlers de eventos de negócio
    this._setupEventHandlers();

    console.log('✅ Módulo Ambulatório Realtime inicializado');
  }

  /**
   * Configura listeners de eventos de negócio
   * @private
   */
  static _setupEventHandlers() {
    /**
     * Evento: Paciente transferido para ambulatório/médico
     */
    eventBus.subscribe(
      'patient:transferred',
      (data) => this._onPatientTransferred(data),
      { priority: 10 }
    );

    /**
     * Evento: Atendimento iniciado
     */
    eventBus.subscribe(
      'patient:atendimento_started',
      (data) => this._onAtendimentoStarted(data),
      { priority: 10 }
    );

    /**
     * Evento: Atendimento finalizado
     */
    eventBus.subscribe(
      'patient:atendimento_finished',
      (data) => this._onAtendimentoFinished(data),
      { priority: 10 }
    );

    console.log('📍 Event handlers do ambulatório registrados');
  }

  /**
   * Manipula transferência de paciente para ambulatório/médico
   * @private
   */
  static async _onPatientTransferred(data) {
    const {
      patientId,
      patientName,
      originModule,
      destinationModule,
      status,
      classificationRisk,
      userId,
      timestamp
    } = data;

    // Se for para ambulatório ou médico, notificar
    if (destinationModule === 'ambulatorio' || destinationModule === 'medico') {
      // [REALTIME DEBUG] LOG 10: AMBULATORIO MODULE RECEBE EVENTO
      const debugTimestamp10 = new Date().toISOString();
      console.log(`[REALTIME DEBUG] AmbulatoriRealtimeModule._onPatientTransferred | patientId=${patientId} | de=${originModule} | para=${destinationModule} | timestamp=${debugTimestamp10}`);

      console.log(`📤 Paciente chegou ao ${destinationModule}: ${patientName}`);

      const moduleToNotify = destinationModule === 'medico' ? this.MEDICO_MODULE : this.MODULE_NAME;

      // [REALTIME DEBUG] LOG 11: EMITINDO PARA MÓDULO
      const debugTimestamp11 = new Date().toISOString();
      console.log(`[REALTIME DEBUG] Emitindo 'patient:arrived' para módulo ${moduleToNotify} | patientId=${patientId} | timestamp=${debugTimestamp11}`);

      realtimeManager.emitToModule(moduleToNotify, 'patient:arrived', {
        patientId,
        patientName,
        originModule,
        destinationModule,
        status,
        classificationRisk,
        transferredBy: userId,
        timestamp
      });
    }
  }

  /**
   * Manipula atendimento iniciado
   * @private
   */
  static async _onAtendimentoStarted(data) {
    const { patientId, patientName, module, userId, timestamp } = data;

    console.log(`🔄 Atendimento iniciado para: ${patientName} no ${module}`);

    realtimeManager.emitToModule(module, 'atendimento:started', {
      patientId,
      patientName,
      startedBy: userId,
      timestamp
    });
  }

  /**
   * Manipula atendimento finalizado
   * @private
   */
  static async _onAtendimentoFinished(data) {
    const { patientId, patientName, module, userId, timestamp } = data;

    console.log(`✅ Atendimento finalizado para: ${patientName} no ${module}`);

    realtimeManager.emitToModule(module, 'atendimento:finished', {
      patientId,
      patientName,
      finishedBy: userId,
      timestamp
    });
  }

  /**
   * Setup de listeners Socket.io para eventos personalizados
   * @param {Socket} socket - Socket do cliente
   */
  static setupSocketListeners(socket) {
    // Clientes podem requisitar atualização de fila
    socket.on('fila:refresh_request', () => {
      console.log(`🔄 Refresh request recebido de ${socket.id} no ambulatório`);
      socket.emit('fila:update_available');
    });
  }

  /**
   * Notifica sobre atualização na fila
   */
  static notifyQueueUpdate(module, queueData) {
    realtimeManager.emitToModule(module, 'fila:updated', {
      queueLength: queueData.length,
      patients: queueData,
      timestamp: new Date()
    });
  }

  /**
   * Notifica sobre novo paciente na fila
   */
  static notifyPatientArrival(module, patientData) {
    realtimeManager.emitToModule(module, 'patient:new_arrival', {
      ...patientData,
      timestamp: new Date()
    });
  }
}

export default AmbulatoriRealtimeModule;
