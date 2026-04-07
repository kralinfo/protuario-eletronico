/**
 * TriagemRealtimeModule
 * Módulo de tempo real específico para a triagem
 * Gerencia eventos e atualiza clientes conectados em tempo real
 */

import eventBus from '../EventBus.js';
import realtimeManager from '../RealtimeManager.js';

class TriagemRealtimeModule {
  static MODULE_NAME = 'triagem';

  /**
   * Inicializa o módulo de triagem
   */
  static initialize() {
    console.log('🚀 Inicializando módulo Triagem Realtime');

    // Registrar módulo no RealtimeManager
    realtimeManager.registerModule(this.MODULE_NAME, this);

    // Inscrever a handlers de eventos de negócio
    this._setupEventHandlers();

    console.log('✅ Módulo Triagem Realtime inicializado');
  }

  /**
   * Configura listeners de eventos de negócio
   * @private
   */
  static _setupEventHandlers() {
    /**
     * Evento: Paciente transferido
     * Disparo: Quando triagem é finalizada e paciente é encaminhado
     */
    eventBus.subscribe(
      'patient:transferred',
      (data) => this._onPatientTransferred(data),
      { priority: 10 }
    );

    /**
     * Evento: Triagem iniciada
     */
    eventBus.subscribe(
      'patient:triagem_started',
      (data) => this._onTriagemStarted(data),
      { priority: 10 }
    );

    /**
     * Evento: Triagem finalizada
     */
    eventBus.subscribe(
      'patient:triagem_finished',
      (data) => this._onTriagemFinished(data),
      { priority: 10 }
    );

    /**
     * Evento: Novo atendimento registrado na recepção
     * Quando um paciente é registrado, ele chega na triagem
     */
    eventBus.subscribe(
      'patient:atendimento_registrado',
      (data) => this._onAtendimentoRegistrado(data),
      { priority: 10 }
    );

    console.log('📍 Event handlers da triagem registrados');
  }

  /**
   * Manipula transferência de paciente
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

    // [REALTIME DEBUG] LOG 7: TRIAGEM MODULE RECEBE EVENTO
    const debugTimestamp7 = new Date().toISOString();
    console.log(`[REALTIME DEBUG] TriagemRealtimeModule._onPatientTransferred | patientId=${patientId} | de=${originModule} | para=${destinationModule} | timestamp=${debugTimestamp7}`);

    console.log(`📤 Paciente transferido: ${patientName} de ${originModule} para ${destinationModule}`);

    // [REALTIME DEBUG] LOG 8: EMITINDO PARA MÓDULO DE DESTINO
    const debugTimestamp8 = new Date().toISOString();
    console.log(`[REALTIME DEBUG] Emitindo 'patient:arrived' para módulo ${destinationModule} | patientId=${patientId} | timestamp=${debugTimestamp8}`);

    // Notificar módulo de destino sobre novo paciente
    realtimeManager.emitToModule(destinationModule, 'patient:arrived', {
      patientId,
      patientName,
      originModule,
      destinationModule,
      status,
      classificationRisk,
      transferredBy: userId,
      timestamp
    });

    // [REALTIME DEBUG] LOG 9: EMITINDO PARA MÓDULO DE ORIGEM
    const debugTimestamp9 = new Date().toISOString();
    console.log(`[REALTIME DEBUG] Emitindo 'patient:transferred_out' para módulo ${originModule} | patientId=${patientId} | timestamp=${debugTimestamp9}`);

    // Notificar módulo de origem que paciente saiu
    realtimeManager.emitToModule(originModule, 'patient:transferred_out', {
      patientId,
      patientName,
      destinationModule,
      timestamp
    });

    // Log para auditoria/analytics
    console.log(`✅ Notificações enviadas para módulos: ${originModule}, ${destinationModule}`);
  }

  /**
   * Manipula triagem iniciada
   * @private
   */
  static async _onTriagemStarted(data) {
    const { patientId, patientName, userId, timestamp } = data;

    console.log(`🔄 Triagem iniciada para: ${patientName}`);

    realtimeManager.emitToModule(this.MODULE_NAME, 'triagem:started', {
      patientId,
      patientName,
      startedBy: userId,
      timestamp
    });
  }

  /**
   * Manipula triagem finalizada
   * @private
   */
  static async _onTriagemFinished(data) {
    const {
      patientId,
      patientName,
      classificationRisk,
      userId,
      timestamp
    } = data;

    console.log(`✅ Triagem finalizada para: ${patientName}`);

    realtimeManager.emitToModule(this.MODULE_NAME, 'triagem:finished', {
      patientId,
      patientName,
      classificationRisk,
      finishedBy: userId,
      timestamp
    });
  }

  /**
   * Manipula novo atendimento registrado na recepção
   * Quando um paciente é registrado na recepção, ele entra na fila de triagem
   * @private
   */
  static async _onAtendimentoRegistrado(data) {
    const { patientId, patientName, userId, timestamp } = data;

    // [REALTIME DEBUG] LOG 8: TRIAGEM RECEBE NOTIFICAÇÃO DE NOVO ATENDIMENTO
    const debugTimestamp8 = new Date().toISOString();
    console.log(`[REALTIME DEBUG] TriagemRealtimeModule._onAtendimentoRegistrado | patientId=${patientId} | patientName=${patientName} | timestamp=${debugTimestamp8}`);

    console.log(`🎯 Novo atendimento registrado indo para triagem: ${patientName}`);

    // [REALTIME DEBUG] LOG 9: EMITINDO 'patient:arrived' PARA MÓDULO TRIAGEM
    const debugTimestamp9 = new Date().toISOString();
    console.log(`[REALTIME DEBUG] Emitindo 'patient:arrived' para triagem | patientId=${patientId} | timestamp=${debugTimestamp9}`);

    // Notificar triagem sobre novo paciente
    realtimeManager.emitToModule(this.MODULE_NAME, 'patient:arrived', {
      patientId,
      patientName,
      originModule: 'recepcao',
      destinationModule: 'triagem',
      status: 'aguardando_triagem',
      classificationRisk: 'pendente',
      transferredBy: userId,
      timestamp
    });
  }

  /**
   * Setup de listeners Socket.io para eventos personalizados
   * @param {Socket} socket - Socket do cliente
   */
  static setupSocketListeners(socket) {
    // Clientes podem escutar quando entram no módulo triagem
    socket.on('fila:refresh_request', () => {
      console.log(`🔄 Refresh request recebido de ${socket.id}`);
      // Emitir sinal para atualizar fila (será respondido pelo frontend)
      socket.emit('fila:update_available');
    });
  }

  /**
   * Notifica todos os clientes da triagem sobre atualização na fila
   */
  static notifyQueueUpdate(queueData) {
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:updated', {
      queueLength: queueData.length,
      patients: queueData,
      timestamp: new Date()
    });
  }

  /**
   * Notifica sobre paciente que chegou
   */
  static notifyPatientArrival(patientData) {
    realtimeManager.emitToModule(this.MODULE_NAME, 'patient:new_arrival', {
      ...patientData,
      timestamp: new Date()
    });
  }
}

export default TriagemRealtimeModule;
