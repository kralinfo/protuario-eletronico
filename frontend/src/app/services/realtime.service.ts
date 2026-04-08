/**
 * RealtimeService
 * Serviço Angular para gerenciar conexão WebSocket
 * Responsabilidades:
 * - Estabelecer e manter conexão com servidor WebSocket
 * - Gerenciar eventos em tempo real
 * - Prover observables reativos para componentes
 * - Desacoplar lógica de realtime dos componentes
 */

import { Injectable, OnDestroy, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface PatientTransferredEvent {
  patientId: number;
  patientName: string;
  originModule: string;
  destinationModule: string;
  status: string;
  classificationRisk: string;
  transferredBy: number;
  timestamp: Date;
}

export interface PatientArrivedEvent {
  patientId: number;
  patientName: string;
  originModule: string;
  destinationModule: string;
  status: string;
  classificationRisk: string;
  transferredBy: number;
  timestamp: Date;
}

export interface QueueUpdateEvent {
  queueLength: number;
  patients: any[];
  timestamp: Date;
  module: string;
}

export interface RealtimeConnection {
  connected: boolean;
  socketId: string;
  module: string;
  lastUpdate: Date;
}

@Injectable({
  providedIn: 'root'
})
export class RealtimeService implements OnDestroy {
  private socket: Socket | null = null;
  private connectionStatus$ = new BehaviorSubject<RealtimeConnection>({
    connected: false,
    socketId: '',
    module: 'idle',
    lastUpdate: new Date()
  });

  // Observables para eventos específicos
  private patientTransferred$ = new Subject<PatientTransferredEvent>();
  private patientArrived$ = new Subject<PatientArrivedEvent>();
  private queueUpdated$ = new Subject<QueueUpdateEvent>();
  private triagemStarted$ = new Subject<any>();
  private triagemFinished$ = new Subject<any>();
  private atendimentoStarted$ = new Subject<any>();
  private atendimentoFinished$ = new Subject<any>();
  private patientCalled$ = new Subject<any>();
  private patientCleared$ = new Subject<any>();
  private connectionError$ = new Subject<string>();

  constructor(private ngZone: NgZone) {}

  /**
   * Inicializa conexão WebSocket
   * @param module - Módulo a se conectar (triagem, ambulatorio, medico, etc)
   */
  connect(module: string = 'default'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // DEBUG: Listar todas as chaves do localStorage
        console.log('[RealtimeService.connect] localStorage keys:', Object.keys(localStorage));
        console.log('[RealtimeService.connect] localStorage values:', {
          token: localStorage.getItem('token'),
          auth_token: localStorage.getItem('auth_token'),
          'auth-token': localStorage.getItem('auth-token')
        });

        // Obter token do localStorage - testar múltiplas chaves possíveis
        const token = localStorage.getItem('token')
          || localStorage.getItem('auth_token')
          || sessionStorage.getItem('token')
          || sessionStorage.getItem('auth_token');

        console.log('[RealtimeService.connect] Token encontrado:', token ? 'SIM' : 'NÃO');

        if (!token) {
          reject(new Error('Token não disponível. Usuário não autenticado.'));
          return;
        }

        const serverUrl = this._getServerUrl();

        this.socket = io(serverUrl, {
          auth: {
            token: token
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: 5,
          transports: ['websocket', 'polling']
        });

        // Event handlers de conexão
        this.socket.on('connect', () => {
          this.ngZone.run(() => {
            console.log('✅ Conectado ao servidor WebSocket:', this.socket?.id);

            // Entrar no módulo específico
            this.socket?.emit('join:module', { module });

            this.connectionStatus$.next({
              connected: true,
              socketId: this.socket?.id || '',
              module,
              lastUpdate: new Date()
            });

            resolve();
          });
        });

        this.socket.on('disconnect', (reason) => {
          this.ngZone.run(() => {
            console.log('❌ Desconectado do servidor WebSocket:', reason);
            this.connectionStatus$.next({
              connected: false,
              socketId: '',
              module: 'idle',
              lastUpdate: new Date()
            });
          });
        });

        this.socket.on('error', (error) => {
          this.ngZone.run(() => {
            console.error('🔴 Erro WebSocket:', error);
            this.connectionError$.next(error?.message || 'Erro de conexão desconhecido');
          });
        });

        // Event handlers de negócio - Transferência de pacientes
        this.socket.on('patient:transferred', (data: PatientTransferredEvent) => {
          this.ngZone.run(() => {
            console.log('📤 Paciente transferido:', data);
            this.patientTransferred$.next(data);
          });
        });

        this.socket.on('patient:arrived', (data: PatientArrivedEvent) => {
          this.ngZone.run(() => {
            console.log('📥 Paciente chegou:', data);
            this.patientArrived$.next(data);
          });
        });

        // Event handlers - Fila
        this.socket.on('fila:updated', (data: QueueUpdateEvent) => {
          this.ngZone.run(() => {
            console.log('📊 Fila atualizada:', data);
            this.queueUpdated$.next(data);
          });
        });

        this.socket.on('fila:update_available', () => {
          this.ngZone.run(() => {
            console.log('🔄 Atualização de fila disponível');
          });
        });

        // Event handlers - Triagem
        this.socket.on('triagem:started', (data) => {
          this.ngZone.run(() => {
            console.log('🔄 Triagem iniciada:', data);
            this.triagemStarted$.next(data);
          });
        });

        this.socket.on('triagem:finished', (data) => {
          this.ngZone.run(() => {
            console.log('✅ Triagem finalizada:', data);
            this.triagemFinished$.next(data);
          });
        });

        // Event handlers - Atendimento
        this.socket.on('atendimento:started', (data) => {
          this.ngZone.run(() => {
            console.log('🔄 Atendimento iniciado:', data);
            this.atendimentoStarted$.next(data);
          });
        });

        this.socket.on('atendimento:finished', (data) => {
          this.ngZone.run(() => {
            console.log('✅ Atendimento finalizado:', data);
            this.atendimentoFinished$.next(data);
          });
        });

        // Event handlers - Chamada de Paciente (Painel Fila)
        this.socket.on('fila:called', (data: any) => {
          this.ngZone.run(() => {
            console.log('📢 Paciente chamado para o painel:', data);
            this.patientCalled$.next(data);
          });
        });

        // Event handlers - Limpeza de card (Painel Fila)
        this.socket.on('fila:cleared', (data: any) => {
          this.ngZone.run(() => {
            console.log('🧹 Card removido do painel:', data);
            this.patientCleared$.next(data);
          });
        });

        // Event handlers - Notificações de usuário
        this.socket.on('user:joined', (data) => {
          this.ngZone.run(() => {
            console.log('👤 Usuário entrou:', data);
          });
        });

        this.socket.on('user:left', (data) => {
          this.ngZone.run(() => {
            console.log('👤 Usuário saiu:', data);
          });
        });

      } catch (error) {
        console.error('Erro ao conectar:', error);
        reject(error);
      }
    });
  }

  /**
   * Desconecta do servidor WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Muda de módulo
   */
  switchModule(newModule: string): void {
    const currentConnection = this.connectionStatus$.value;

    if (currentConnection.module !== 'idle') {
      this.socket?.emit('leave:module', { module: currentConnection.module });
    }

    this.socket?.emit('join:module', { module: newModule });

    this.connectionStatus$.next({
      ...currentConnection,
      module: newModule,
      lastUpdate: new Date()
    });
  }

  /**
   * Obtém observable de status de conexão
   */
  getConnectionStatus(): Observable<RealtimeConnection> {
    return this.connectionStatus$.asObservable();
  }

  /**
   * Obtém observable de pacientes transferidos
   */
  onPatientTransferred(): Observable<PatientTransferredEvent> {
    return this.patientTransferred$.asObservable();
  }

  /**
   * Obtém observable de pacientes chegando
   */
  onPatientArrived(): Observable<PatientArrivedEvent> {
    return this.patientArrived$.asObservable();
  }

  /**
   * Obtém observable de atualizações de fila
   */
  onQueueUpdated(): Observable<QueueUpdateEvent> {
    return this.queueUpdated$.asObservable();
  }

  /**
   * Obtém observable de triagens iniciadas
   */
  onTriagemStarted(): Observable<any> {
    return this.triagemStarted$.asObservable();
  }

  /**
   * Obtém observable de triagens finalizadas
   */
  onTriagemFinished(): Observable<any> {
    return this.triagemFinished$.asObservable();
  }

  /**
   * Obtém observable de atendimentos iniciados
   */
  onAtendimentoStarted(): Observable<any> {
    return this.atendimentoStarted$.asObservable();
  }

  /**
   * Obtém observable de atendimentos finalizados
   */
  onAtendimentoFinished(): Observable<any> {
    return this.atendimentoFinished$.asObservable();
  }

  /**
   * Obtém observable de pacientes chamados (Painel Fila)
   */
  onPatientCalled(): Observable<any> {
    return this.patientCalled$.asObservable();
  }

  /**
   * Obtém observable de cards removidos do painel de fila
   */
  onPatientCleared(): Observable<any> {
    return this.patientCleared$.asObservable();
  }

  /**
   * Obtém observable de erros de conexão
   */
  onConnectionError(): Observable<string> {
    return this.connectionError$.asObservable();
  }

  /**
   * Verifica se está conectado
   */
  isConnected(): boolean {
    return this.connectionStatus$.value.connected;
  }

  /**
   * Retorna informações de conexão
   */
  getConnectionInfo(): RealtimeConnection {
    return this.connectionStatus$.value;
  }

  /**
   * Emite evento customizado (para casos especiais)
   */
  emit(event: string, data: any): void {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }

  /**
   * Ouve por evento customizado
   */
  on(event: string, callback: (data: any) => void): void {
    if (this.socket) {
      this.socket.on(event, (data: any) => {
        this.ngZone.run(() => {
          callback(data);
        });
      });
    }
  }

  /**
   * Para de ouvir por evento
   */
  off(event: string, callback?: (data: any) => void): void {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  /**
   * Obtém URL do servidor baseado no ambiente
   * @private
   */
  private _getServerUrl(): string {
    // Em desenvolvimento, usar localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }

    // Em produção, usar a URL real do backend (Render)
    // O frontend está no Vercel, mas o WebSocket precisa conectar ao backend no Render
    return 'https://protuario-eletronico-1.onrender.com';
  }

  /**
   * Limpeza ao destuir o serviço
   */
  ngOnDestroy(): void {
    this.disconnect();
    this.patientTransferred$.complete();
    this.patientArrived$.complete();
    this.queueUpdated$.complete();
    this.triagemStarted$.complete();
    this.triagemFinished$.complete();
    this.atendimentoStarted$.complete();
    this.atendimentoFinished$.complete();
    this.patientCalled$.complete();
    this.connectionError$.complete();
  }
}
