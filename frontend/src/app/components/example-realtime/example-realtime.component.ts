/**
 * EXEMPLO DE IMPLEMENTAÇÃO COMPLETA
 * Como integrar RealtimeService e NotificationSerivce em um componente existente
 *
 * Este arquivo mostra:
 * 1. Imports necessários
 * 2. Injeção de dependências
 * 3. Setup no ngOnInit
 * 4. Escuta de eventos WebSocket
 * 5. Gerenciamento de unsubscription
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, Subscription, firstValueFrom } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// ===== NOVOS IMPORTS PARA REALTIME =====
import { RealtimeService, PatientArrivedEvent } from '../../services/realtime.service';
import { NotificationService } from '../../services/notification.service';

// Services existentes
import { TriagemService } from '../../services/triagem.service';
import { TriagemEventService } from '../../services/triagem-event.service';

interface PacienteTriagem {
  id: number;
  paciente_nome: string;
  paciente_nascimento: string;
  paciente_sexo: string;
  data_hora_atendimento: string;
  status: string;
  classificacao_risco?: string;
  queixa_principal?: string;
  tempo_espera: number;
  tempo_espera_formatado?: string;
  alerta?: string;
}

interface Estatisticas {
  pacientes_aguardando: number;
  por_classificacao: Record<string, number>;
  tempo_medio_espera: number;
}

/**
 * ===== VERSÃO INTEGRADA COM REALTIME =====
 *
 * Alterações:
 * ✅ Injeta RealtimeService e NotificationService
 * ✅ Conecta ao módulo de triagem na inicialização
 * ✅ Escuta eventos de pacientes chegando
 * ✅ Escuta erros de conexão
 * ✅ Gerencia badges de fila
 * ✅ Unsubscribe corretamente no destroy
 */
@Component({
  selector: 'app-fila-triagem',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  template: ''
})
export class FilaTriagemComponent implements OnInit, OnDestroy {
  // ===== Estado do componente =====
  pacientes: PacienteTriagem[] = [];
  estatisticas: Estatisticas = {
    pacientes_aguardando: 0,
    por_classificacao: {},
    tempo_medio_espera: 0
  };
  carregando = true;
  filtroStatus: string = 'encaminhado_para_triagem';

  // ===== Novo: controle de unsubscription =====
  private destroy$ = new Subject<void>();
  private atualizacaoSubscription?: ReturnType<typeof setInterval>;

  // ===== Cores para classificação de risco =====
  private coresPrioridade: Record<string, string> = {
    'vermelho': '#E53E3E',
    'laranja': '#FF8C00',
    'amarelo': '#F6E05E',
    'verde': '#48BB78',
    'azul': '#4299E1'
  };

  constructor(
    private triagemService: TriagemService,
    private triagemEventService: TriagemEventService,
    private snackBar: MatSnackBar,
    private router: Router,

    // ===== NOVO: Injetar RealtimeService e NotificationService =====
    private realtimeService: RealtimeService,
    private notificationService: NotificationService
  ) {}

  /**
   * ngOnInit - Inicialização do componente
   *
   * Alterações:
   * - Setup de conexão WebSocket com módulo 'triagem'
   * - Configuração de listeners para eventos em tempo real
   * - Tratamento de erros de conexão
   * - Gerenciamento de badges
   */
  ngOnInit(): void {
    this.carregarFila();

    // ===== NOVO: Conectar ao módulo de triagem =====
    this._setupRealtimeConnection();

    // ===== Existente: setup de atualização periódica =====
    // Manter para fallback em caso de desconexão
    this.atualizacaoSubscription = setInterval(() => {
      this.carregarFila();
    }, 30000); // Recarregar a cada 30 segundos
  }

  /**
   * Setup de conexão em tempo real
   * Método privado que centraliza toda a lógica realtime
   *
   * @private
   */
  private _setupRealtimeConnection(): void {
    // 1. Conectar ao módulo de triagem
    this.realtimeService.connect('triagem')
      .then(() => {
        console.log('✅ Conectado ao módulo de triagem');
        this.notificationService.info(
          'Conexão',
          'Conectado a atualizações em tempo real'
        );
      })
      .catch((error: Error) => {
        console.error('❌ Erro ao conectar ao triagem realtime:', error);
        this.notificationService.warning(
          'Aviso',
          'Não foi possível conectar a atualizações em tempo real'
        );
      });

    // 2. Escutar quando novo paciente chega (de outro módulo)
    this.realtimeService.onPatientArrived()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: PatientArrivedEvent) => {
        console.log('📥 Novo paciente chegou em triagem:', data);

        // Se o módulo de destino é triagem, atualizar fila
        if (data.destinationModule === 'triagem') {
          this._onNewPatientArrived(data);
        }
      });

    // 3. Escutar quando triagem é finalizada
    this.realtimeService.onTriagemFinished()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('✅ Triagem finalizada:', data);

        // Decrement badge
        this.notificationService.decrementBadge('triagem');

        // Recarregar fila
        this.carregarFila();
      });

    // 4. Escutar atualizações de fila em tempo real
    this.realtimeService.onQueueUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        console.log('📊 Fila atualizada:', data);

        // Atualizar badge com informação da fila
        this.notificationService.addBadge(
          'triagem',
          data.queueLength,
          data.queueLength > 5 ? 'high' : (data.queueLength > 3 ? 'normal' : 'low')
        );
      });

    // 5. Escutar erros de conexão
    this.realtimeService.onConnectionError()
      .pipe(takeUntil(this.destroy$))
      .subscribe((error: string) => {
        console.error('🔴 Erro de conexão WebSocket:', error);

        this.notificationService.error(
          'Erro de Conexão',
          `Problema ao conectar com servidor: ${error}`,
          { duration: 8000 }
        );
      });

    // 6. Escutar mudanças no status de conexão
    this.realtimeService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((status: any) => {
        console.log('🔗 Status de conexão:', status);

        if (!status.connected && status.module !== 'idle') {
          // Se desconectou, mostrar warning
          this.notificationService.warning(
            'Desconectado',
            'Conexão perdida com servidor. Sincronizando localmente...',
            { duration: 5000 }
          );
        }
      });
  }

  /**
   * Callback quando novo paciente chega
   *
   * @private
   * @param data - Dados do paciente que chegou
   */
  private _onNewPatientArrived(data: PatientArrivedEvent): void {
    // 1. Mostrar notificação visual
    this.notificationService.patientArrived(
      data.patientName,
      'Triagem',
      data.classificationRisk || 'Não classificado'
    );

    // 2. Incrementar badge
    this.notificationService.incrementBadge('triagem');

    // 3. Recarregar fila para incluir o novo paciente
    this.carregarFila();

    // 4. Opcional: Log de auditoria
    console.log(`📝 Evento: Paciente ${data.patientName} chegou em triagem`, {
      pacienteId: data.patientId,
      origem: data.originModule,
      timestamp: data.timestamp,
      transferidoPor: data.transferredBy
    });
  }

  /**
   * carregarFila - Carrega pacientes da fila de triagem
   * Método existente, mantido como está
   */
  async carregarFila(): Promise<void> {
    try {
      this.carregando = true;

      // Chamar API para obter fila
      const response = await firstValueFrom(
        this.triagemService.listarFilaTriagem()
      );

      this.pacientes = response;
      this.estatisticas.pacientes_aguardando = response.length;

      // Atualizar badge com quantidade
      this.notificationService.addBadge(
        'triagem',
        response.length,
        response.length > 5 ? 'high' : (response.length > 3 ? 'normal' : 'low')
      );

      console.log(`📊 Fila carregada: ${response.length} pacientes`);
    } catch (error) {
      console.error('❌ Erro ao carregar fila:', error);

      this.notificationService.error(
        'Erro ao Carregar Fila',
        'Não foi possível carregar a lista de pacientes'
      );
    } finally {
      this.carregando = false;
    }
  }

  /**
   * irParaTriagem - Redireciona para formulário de triagem
   * Método existente
   */
  async irParaTriagem(pacienteId: number): Promise<void> {
    try {
      // Seu código existente
      this.router.navigate(['/triagem', pacienteId]);
    } catch (error) {
      this.notificationService.error('Erro', 'Não foi possível abrir triagem');
    }
  }

  /**
   * ngOnDestroy - Limpeza ao destruir componente
   *
   * Alterações:
   * - Unsubscribe de todos os observables
   * - Limpar timer
   * - Opcional: Desconectar do WebSocket (ou deixar para chave automática)
   */
  ngOnDestroy(): void {
    console.log('🧹 Limpando FilaTriagemComponent');

    // Parar os observables
    this.destroy$.next();
    this.destroy$.complete();

    // Limpar subscription de timer
    if (this.atualizacaoSubscription) {
      clearInterval(this.atualizacaoSubscription as any);
    }

    // Opcional: Deixar o módulo de triagem
    // Para deixar o módulo mas manter conexão:
    // this.realtimeService.switchModule('idle');

    // Para desconectar completamente:
    // this.realtimeService.disconnect();
  }

  // ===== Métodos auxiliares (existentes) =====

  getCorPrioridade(classificacao?: string): string {
    return this.coresPrioridade[classificacao || 'azul'] || '#4299E1';
  }

  getTextoPrioridade(classificacao?: string): string {
    const textos: Record<string, string> = {
      'vermelho': 'EMERGÊNCIA',
      'laranja': 'MUITO URGENTE',
      'amarelo': 'URGENTE',
      'verde': 'POUCO URGENTE',
      'azul': 'NÃO URGENTE'
    };
    return textos[classificacao || 'azul'] || 'AGUARDANDO';
  }
}

/**
 * ===== RESUMO DE ALTERAÇÕES =====
 *
 * ✅ Adicionado imports de RealtimeService e NotificationService
 * ✅ Injetado RealtimeService e NotificationService no constructor
 * ✅ Adicionado destroy$ subject para gerenciar unsubscriptions
 * ✅ Implementado _setupRealtimeConnection() para centralizar setup realtime
 * ✅ Implementado _onNewPatientArrived() para callback de novos pacientes
 * ✅ Adicionado ngOnDestroy com unsubscription correta
 * ✅ Mantida toda a funcionalidade existente
 * ✅ Recursos de WebSocket são opcionais, não quebram funcionalidade
 *
 * ===== FLUXO =====
 *
 * 1. Componente inicializa
 * 2. Fila é carregada via HTTP (como antes)
 * 3. Conexão WebSocket é estabelecida
 * 4. Listeners são configurados
 * 5. Quando evento chega, componente é atualizado em tempo real
 * 6. Se offline, recarregamento manual funciona como fallback
 * 7. Ao destruir comunente, tudo é limpo corretamente
 */
