/**
 * Módulo Realtime para a Fila de Espera/Painel de Chamada
 * Gerencia eventos de chamada de pacientes para triagem e consultório médico.
 * O estado é mantido em memória no backend e persistido no banco de dados.
 */

import eventBus from '../EventBus.js';
import realtimeManager from '../RealtimeManager.js';
import database from '../../config/database.js';

const MAX_HISTORICO = 20;

class FilaRealtimeModule {
  static MODULE_NAME = 'fila';

  // Estado em memória — fonte de verdade para novos clientes que se conectam
  static state = {
    currentTriagem: null, // { patientId, patientName, target, timestamp, displayedAt }
    currentMedico: null,
    historico: []          // últimos MAX_HISTORICO chamados
  };

  /**
   * Inicializa o módulo de fila e cria a tabela se não existir
   */
  static async initialize() {
    console.log('🚀 Inicializando módulo Fila Realtime (Painel)');

    await this._ensureTable();
    await this._carregarEstadoInicial();

    // Registrar módulo no RealtimeManager
    realtimeManager.registerModule(this.MODULE_NAME, this);

    // Inscrever handlers de eventos de negócio
    this._setupEventHandlers();

    console.log('✅ Módulo Fila Realtime inicializado');
  }

  /**
   * Cria a tabela fila_historico se não existir
   * @private
   */
  static async _ensureTable() {
    try {
      const db = await database.getConnection();
      await db.query(`
        CREATE TABLE IF NOT EXISTS fila_historico (
          id SERIAL PRIMARY KEY,
          patient_id INTEGER NOT NULL,
          patient_name VARCHAR(255) NOT NULL,
          target VARCHAR(20) NOT NULL CHECK (target IN ('triagem', 'medico')),
          chamado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
      console.log('✅ Tabela fila_historico verificada/criada');
    } catch (err) {
      console.error('⚠️  Erro ao criar tabela fila_historico:', err.message);
    }
  }

  /**
   * Carrega o histórico recente do banco para preencher o estado inicial em memória
   * @private
   */
  static async _carregarEstadoInicial() {
    try {
      const db = await database.getConnection();
      const result = await db.query(
        `SELECT patient_id, patient_name, target, chamado_em
         FROM fila_historico
         ORDER BY chamado_em DESC
         LIMIT $1`,
        [MAX_HISTORICO]
      );
      this.state.historico = result.rows.map(r => ({
        patientId: r.patient_id,
        patientName: r.patient_name,
        target: r.target,
        timestamp: r.chamado_em,
        displayedAt: r.chamado_em
      }));
      console.log(`✅ Histórico da fila carregado: ${this.state.historico.length} registros`);
    } catch (err) {
      console.error('⚠️  Erro ao carregar histórico da fila:', err.message);
    }
  }

  /**
   * Configura listeners de eventos de negócio
   * @private
   */
  static _setupEventHandlers() {
    eventBus.subscribe(
      'patient:called',
      (data) => this._onPatientCalled(data),
      { priority: 10 }
    );

    eventBus.subscribe(
      'patient:triagem_finished',
      (data) => this._onTriagemFinished(data),
      { priority: 10 }
    );

    eventBus.subscribe(
      'patient:atendimento_finished',
      (data) => this._onAtendimentoFinished(data),
      { priority: 10 }
    );
  }

  /**
   * Tratador para o evento 'patient:called'
   * Atualiza o estado em memória, persiste no banco e emite para os clientes
   * @private
   */
  static async _onPatientCalled(data) {
    console.log(`[FilaRealtimeModule] Paciente chamado: ${data.patientName} para ${data.target}`);

    const chamada = {
      patientId: data.patientId,
      patientName: data.patientName,
      target: data.target,
      classificationRisk: data.classificationRisk || null,
      timestamp: data.timestamp || new Date(),
      displayedAt: new Date()
    };

    // Atualiza chamada ativa
    if (chamada.target === 'triagem') {
      this.state.currentTriagem = chamada;
    } else {
      this.state.currentMedico = chamada;
    }

    // Atualiza histórico em memória (remove duplicata, insere no topo, limita tamanho)
    this.state.historico = this.state.historico.filter(
      h => !(h.patientId === chamada.patientId && h.target === chamada.target)
    );
    this.state.historico.unshift(chamada);
    if (this.state.historico.length > MAX_HISTORICO) {
      this.state.historico = this.state.historico.slice(0, MAX_HISTORICO);
    }

    // Persiste no banco de forma assíncrona (não bloqueia o evento)
    this._persistirNoBanco(chamada).catch(err =>
      console.error('⚠️  Erro ao persistir chamada no banco:', err.message)
    );

    // Emite para todos os clientes conectados ao módulo 'fila'
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:called', chamada);
  }

  /**
   * Limpa o card de triagem quando o paciente sai de 'em triagem'
   * @private
   */
  static _onTriagemFinished(data) {
    if (!this.state.currentTriagem) return;
    console.log(`[FilaRealtimeModule] Triagem finalizada, limpando card. patientId=${data.patientId}`);
    this.state.currentTriagem = null;
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:cleared', {
      target: 'triagem',
      patientId: data.patientId
    });
  }

  /**
   * Limpa o card do médico quando o paciente sai de 'em atendimento médico'
   * @private
   */
  static _onAtendimentoFinished(data) {
    if (!this.state.currentMedico) return;
    console.log(`[FilaRealtimeModule] Atendimento médico finalizado, limpando card. patientId=${data.patientId}`);
    this.state.currentMedico = null;
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:cleared', {
      target: 'medico',
      patientId: data.patientId
    });
  }

  /**
   * Persiste a chamada no banco de dados
   * @private
   */
  static async _persistirNoBanco(chamada) {
    const db = await database.getConnection();
    await db.query(
      `INSERT INTO fila_historico (patient_id, patient_name, target, chamado_em)
       VALUES ($1, $2, $3, $4)`,
      [chamada.patientId, chamada.patientName, chamada.target, chamada.timestamp]
    );
  }

  /**
   * Retorna o estado atual da fila (chamadas ativas + histórico)
   * Usado pelo endpoint HTTP GET /api/fila/estado
   */
  static getEstado() {
    return {
      currentTriagem: this.state.currentTriagem,
      currentMedico: this.state.currentMedico,
      historico: this.state.historico
    };
  }
}

export default FilaRealtimeModule;
