/**
 * PatientEventService
 * Serviço para disparar eventos de negócio relacionados a pacientes
 * Desacopla a lógica de negócio de chamadas diretas ao eventBus
 */

import eventBus from '../realtime/EventBus.js';
import TriagemRealtimeModule from '../realtime/modules/TriagemRealtimeModule.js';
import AmbulatoriRealtimeModule from '../realtime/modules/AmbulatoriRealtimeModule.js';

/**
 * Interface centralizada para eventos de pacientes
 */
class PatientEventService {
  /**
   * Emite evento de transferência de paciente
   * @param {Object} data - Dados da transferência
   * @param {number} data.patientId - ID do paciente
   * @param {string} data.patientName - Nome do paciente
   * @param {string} data.originModule - Módulo de origem
   * @param {string} data.destinationModule - Módulo de destino
   * @param {string} data.status - Status após transferência
   * @param {string} data.classificationRisk - Classificação de risco
   * @param {number} data.userId - ID do usuário que fez a transferência
   */
  static async emitPatientTransferred(data) {
    const eventData = {
      patientId: data.patientId,
      patientName: data.patientName,
      originModule: data.originModule,
      destinationModule: data.destinationModule,
      status: data.status,
      classificationRisk: data.classificationRisk,
      userId: data.userId,
      timestamp: new Date()
    };

    // [REALTIME DEBUG] LOG 4: EVENTO SENDO EMITIDO NO EVENTBUS
    const debugTimestamp4 = new Date().toISOString();
    console.log(`[REALTIME DEBUG] EventBus.emit('patient:transferred') | patientId=${data.patientId} | originModule=${data.originModule} | destinationModule=${data.destinationModule} | timestamp=${debugTimestamp4}`);

    await eventBus.emit('patient:transferred', eventData);
    console.log(`✅ Evento 'patient:transferred' emitido para ${data.patientName}`);

    // [REALTIME DEBUG] LOG 5: APÓS EVENTBUS EMITIR
    const debugTimestamp5 = new Date().toISOString();
    console.log(`[REALTIME DEBUG] Evento propagado para módulos realtime | patientId=${data.patientId} | timestamp=${debugTimestamp5}`);
  }

  /**
   * Emite evento de triagem iniciada
   */
  static async emitTriagemStarted(data) {
    const eventData = {
      patientId: data.patientId,
      patientName: data.patientName,
      userId: data.userId,
      timestamp: new Date()
    };

    await eventBus.emit('patient:triagem_started', eventData);
    console.log(`✅ Evento 'patient:triagem_started' emitido para ${data.patientName}`);
  }

  /**
   * Emite evento de triagem finalizada
   */
  static async emitTriagemFinished(data) {
    const eventData = {
      patientId: data.patientId,
      patientName: data.patientName,
      classificationRisk: data.classificationRisk,
      userId: data.userId,
      timestamp: new Date()
    };

    await eventBus.emit('patient:triagem_finished', eventData);
    console.log(`✅ Evento 'patient:triagem_finished' emitido para ${data.patientName}`);
  }

  /**
   * Emite evento de atendimento iniciado
   */
  static async emitAtendimentoStarted(data) {
    const eventData = {
      patientId: data.patientId,
      patientName: data.patientName,
      module: data.module,
      userId: data.userId,
      timestamp: new Date()
    };

    await eventBus.emit('patient:atendimento_started', eventData);
    console.log(`✅ Evento 'patient:atendimento_started' emitido para ${data.patientName}`);
  }

  /**
   * Emite evento de paciente chamado
   * @param {Object} data - Dados da chamada
   */
  static async emitPatientCalled(data) {
    const eventData = {
      patientId: data.patientId,
      patientName: data.patientName,
      target: data.target, // 'triagem' | 'medico'
      classificationRisk: data.classificationRisk || null,
      timestamp: data.timestamp || new Date()
    };

    await eventBus.emit('patient:called', eventData);
    console.log(`✅ Evento 'patient:called' emitido para ${data.patientName} (${data.target})`);
  }

  /**
   * Emite evento de atendimento finalizado
   */
  static async emitAtendimentoFinished(data) {
    const eventData = {
      patientId: data.patientId,
      patientName: data.patientName,
      module: data.module,
      userId: data.userId,
      timestamp: new Date()
    };

    await eventBus.emit('patient:atendimento_finished', eventData);
    console.log(`✅ Evento 'patient:atendimento_finished' emitido para ${data.patientName}`);
  }

  /**
   * Notifica atualização de fila de triagem
   */
  static notifyTriagemQueueUpdate(queueData) {
    TriagemRealtimeModule.notifyQueueUpdate(queueData);
  }

  /**
   * Notifica nova chegada na triagem
   */
  static notifyTriagemPatientArrival(patientData) {
    TriagemRealtimeModule.notifyPatientArrival(patientData);
  }

  /**
   * Notifica atualização de fila no ambulatório/médico
   */
  static notifyAmbulatoriQueueUpdate(module, queueData) {
    AmbulatoriRealtimeModule.notifyQueueUpdate(module, queueData);
  }

  /**
   * Notifica nova chegada no ambulatório/médico
   */
  static notifyAmbulatoriPatientArrival(module, patientData) {
    AmbulatoriRealtimeModule.notifyPatientArrival(module, patientData);
  }
}

export default PatientEventService;
