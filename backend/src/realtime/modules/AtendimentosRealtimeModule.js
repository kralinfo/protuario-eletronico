/**
 * AtendimentosRealtimeModule
 * Módulo de tempo real para atendimentos
 * Gerencia sincronização assíncrona entre atendimentos e triagem
 */

import eventBus from '../EventBus.js';
import realtimeManager from '../RealtimeManager.js';

class AtendimentosRealtimeModule {
  static MODULE_NAME = 'atendimentos';

  /**
   * Inicializa o módulo de atendimentos
   */
  static initialize() {
    console.log('🚀 Inicializando módulo Atendimentos Realtime');

    // Registrar módulo no RealtimeManager
    realtimeManager.registerModule(this.MODULE_NAME, this);

    // Inscrever a handlers de eventos de negócio
    this._setupEventHandlers();

    console.log('✅ Módulo Atendimentos Realtime inicializado');
  }

  /**
   * Configura listeners de eventos de negócio
   * @private
   */
  static _setupEventHandlers() {
    /**
     * Evento: Paciente transferido de atendimentos
     * Disparo: Quando atendimento envia paciente para triagem
     */
    eventBus.subscribe(
      'patient:transferred',
      (data) => this._onPatientTransferred(data),
      { priority: 10 }
    );

    /**
     * Evento: Atendimento registrado
     */
    eventBus.subscribe(
      'patient:atendimento_registrado',
      (data) => this._onAtendimentoRegistrado(data),
      { priority: 10 }
    );

    console.log('📍 Event handlers do atendimento registrados');
  }

  /**
   * Manipula transferência de paciente de atendimentos
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

    // Se o destino é triagem, notificar módulo de atendimentos que enviou
    if (destinationModule === 'triagem' && originModule === 'atendimentos') {
      console.log(`📤 Paciente transferido de atendimentos para triagem: ${patientName}`);

      // Notificar módulo de atendimentos que paciente saiu
      realtimeManager.emitToModule(this.MODULE_NAME, 'patient:transferred_out', {
        patientId,
        patientName,
        destinationModule,
        timestamp
      });

      // Notificar triagem que novo paciente chegou
      realtimeManager.emitToModule('triagem', 'patient:arrived', {
        patientId,
        patientName,
        originModule,
        destinationModule: 'triagem',
        status,
        classificationRisk,
        transferredBy: userId,
        timestamp
      });

      console.log(`✅ Notificações enviadas para módulos: ${this.MODULE_NAME}, triagem`);
    }
  }

  /**
   * Manipula atendimento registrado
   * @private
   */
  static async _onAtendimentoRegistrado(data) {
    const { patientId, patientName, userId, timestamp } = data;

    console.log(`🔄 Atendimento registrado para: ${patientName}`);

    realtimeManager.emitToModule(this.MODULE_NAME, 'atendimento:registrado', {
      patientId,
      patientName,
      registeredBy: userId,
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
      console.log(`🔄 Refresh request recebido de ${socket.id} no atendimento`);
      socket.emit('fila:update_available');
    });
  }

  /**
   * Notifica sobre atualização na fila de atendimentos
   */
  static notifyQueueUpdate(queueData) {
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:updated', {
      queueLength: queueData.length,
      patients: queueData,
      timestamp: new Date()
    });
  }

  /**
   * Notifica sobre novo paciente na fila
   */
  static notifyPatientArrival(patientData) {
    realtimeManager.emitToModule(this.MODULE_NAME, 'patient:new_arrival', {
      ...patientData,
      timestamp: new Date()
    });
  }
}

export default AtendimentosRealtimeModule;
