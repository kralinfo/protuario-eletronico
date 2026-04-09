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
      await database.query(`
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
      // SQL inteligente:
      // 1. Pega os últimos movimentos de cada paciente
      // 2. Filtra aqueles que já passaram por triagem E médico
      // 3. Retorna o histórico "limpo" (quem ainda não concluiu os dois passos ou é re-chamada ao médico)
      const result = await database.query(
        `WITH 
          -- Pega todos os movimentos recentes
          movimentos AS (
            SELECT DISTINCT ON (patient_id, target) 
              patient_id, patient_name, target, chamado_em
            FROM fila_historico
            ORDER BY patient_id, target, chamado_em DESC
          ),
          -- Identifica quem já completou o fluxo (tem triagem E médico)
          fluxos_completos AS (
            SELECT patient_id
            FROM movimentos
            GROUP BY patient_id
            HAVING COUNT(DISTINCT target) >= 2
          )
        -- Retorna o histórico excluindo quem já completou os dois passos
        SELECT m.patient_id, m.patient_name, m.target, m.chamado_em
        FROM movimentos m
        LEFT JOIN fluxos_completos f ON m.patient_id = f.patient_id
        WHERE f.patient_id IS NULL
        ORDER BY m.chamado_em DESC
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
      console.log(`✅ Histórico da fila carregado e filtrado: ${this.state.historico.length} registros`);
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
      'patient:triagem_started',
      (data) => this._onTriagemStarted(data),
      { priority: 10 }
    );

    eventBus.subscribe(
      'patient:atendimento_started',
      (data) => this._onAtendimentoStarted(data),
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
      patientId: Number(data.patientId),
      patientName: data.patientName,
      target: data.target,
      classificationRisk: data.classificationRisk || null,
      timestamp: data.timestamp || new Date(),
      displayedAt: new Date()
    };

    // Armazena chamada ativa — usada depois pelo _onTriagemStarted / _onAtendimentoStarted
    if (chamada.target === 'triagem') {
      this.state.currentTriagem = chamada;
    } else {
      this.state.currentMedico = chamada;
    }

    // Emite APENAS o banner de chamada na TV.
    // O histórico SÓ é atualizado quando o profissional clicar em "Iniciar Triagem" ou "Iniciar Atendimento".
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:called', chamada);
  }

  /**
   * Chamado quando o profissional clica em "Iniciar Triagem" (status → em_triagem).
   * Adiciona o paciente ao histórico e persiste no banco.
   * @private
   */
  static async _onTriagemStarted(data) {
    console.log(`[FilaRealtimeModule] Triagem iniciada: ${data.patientName} (ID: ${data.patientId})`);

    // Reutiliza dados da chamada ativa se for o mesmo paciente; senão cria entrada com dados mínimos
    const chamada = (this.state.currentTriagem &&
                     Number(this.state.currentTriagem.patientId) === Number(data.patientId))
      ? this.state.currentTriagem
      : {
          patientId: Number(data.patientId),
          patientName: data.patientName,
          target: 'triagem',
          timestamp: data.timestamp || new Date(),
          displayedAt: new Date()
        };

    // Deduplica e adiciona ao histórico
    this.state.historico = this.state.historico.filter(
      h => !(h.patientId === chamada.patientId && h.target === 'triagem')
    );
    this.state.historico.unshift(chamada);

    if (this.state.historico.length > MAX_HISTORICO) {
      this.state.historico = this.state.historico.slice(0, MAX_HISTORICO);
    }

    this._persistirNoBanco(chamada).catch(err =>
      console.error('⚠️  Erro ao persistir histórico de triagem:', err.message)
    );
    // Limpa o banner ativo de triagem na TV (paciente já está sendo atendido)
    this.state.currentTriagem = null;
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:cleared', { target: 'triagem', patientId: chamada.patientId });
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:update_historico', { historico: this.state.historico });
  }

  /**
   * Chamado quando o médico clica em "Iniciar Atendimento" (status → em atendimento médico).
   * Se o paciente já passou pela triagem, o fluxo está completo e é removido do histórico.
   * Caso contrário é adicionado ao histórico (ex: atendimento direto sem triagem).
   * @private
   */
  static async _onAtendimentoStarted(data) {
    console.log(`[FilaRealtimeModule] Atendimento médico iniciado: ${data.patientName} (ID: ${data.patientId})`);

    const chamada = (this.state.currentMedico &&
                     Number(this.state.currentMedico.patientId) === Number(data.patientId))
      ? this.state.currentMedico
      : {
          patientId: Number(data.patientId),
          patientName: data.patientName,
          target: 'medico',
          timestamp: data.timestamp || new Date(),
          displayedAt: new Date()
        };

    const hasTriagem = this.state.historico.some(
      h => h.patientId === chamada.patientId && h.target === 'triagem'
    );

    // No médico, sempre removemos do histórico para não poluir, 
    // já que o paciente já passou pela triagem e agora está sendo atendido.
    // Isso iguala ao comportamento da triagem que sai do banner e vai pro histórico,
    // mas como o médico é o passo final, removemos o paciente da visão da TV.
    if (hasTriagem) {
      console.log(`[FilaRealtimeModule] Fluxo COMPLETO para ${chamada.patientName}. Removendo do histórico.`);
      this.state.historico = this.state.historico.filter(h => h.patientId !== chamada.patientId);
    } else {
      // Caso não tenha triagem (atendimento direto), removemos chamadas anteriores do médico e adicionamos ao histórico
      this.state.historico = this.state.historico.filter(
        h => !(h.patientId === chamada.patientId && h.target === 'medico')
      );
      this.state.historico.unshift(chamada);
    }

    if (this.state.historico.length > MAX_HISTORICO) {
      this.state.historico = this.state.historico.slice(0, MAX_HISTORICO);
    }

    this._persistirNoBanco(chamada).catch(err =>
      console.error('⚠️  Erro ao persistir histórico de atendimento médico:', err.message)
    );
    // Limpa o banner ativo de médico na TV (paciente já está sendo atendido)
    this.state.currentMedico = null;
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:cleared', { target: 'medico', patientId: chamada.patientId });
    realtimeManager.emitToModule(this.MODULE_NAME, 'fila:update_historico', { historico: this.state.historico });
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
    await database.query(
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
