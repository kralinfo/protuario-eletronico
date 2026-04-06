# Guia de Integração - Camada de Comunicação em Tempo Real

## Visão Geral

Este guia explica como integrar a camada de WebSocket (realtime) nos componentes Angular existentes da aplicação. A solução é modular, escalável e não quebra funcionalidade existente.

## Arquitetura Implementada

```
┌─────────────────────────────────────────────────────────────┐
│                   APLICAÇÃO ANGULAR                         │
├────────────────────┬────────────────────┬───────────────────┤
│  Módulo: Triagem   │ Módulo: Ambulatório│ Módulo: Médico    │
│                    │                    │                   │
│ [Componentes]      │ [Componentes]      │ [Componentes]     │
└────────────────────┴────────────────────┴───────────────────┘
         ▲                    ▲                     ▲
         │                    │                     │
         └────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │ RealtimeService   │
                    │ (Ng Service)      │
                    └─────────┬─────────┘
                              │
                    ┌─────────▼─────────┐
                    │   Socket.io       │
                    │ (WebSocket)       │
                    └─────────┬─────────┘
                              │
                              │ ws://localhost:3000
                              │
         ┌────────────────────▼────────────────────┐
         │     BACKEND - Node.js/Express          │
         ├─────────────────────────────────────────┤
         │  RealtimeManager (Socket.io Server)    │
         │                                         │
         │  ├─ EventBus (Pub/Sub)                 │
         │  │                                     │
         │  ├─ TriagemRealtimeModule              │
         │  ├─ AmbulatoriRealtimeModule           │
         │  └─ [Auto-scalável para novos módulos] │
         │                                         │
         │  ├─ Controllers (triagem, ambulatorio) │
         │  └─ Services (PatientEventService)     │
         └─────────────────────────────────────────┘
```

## Componentes Criados

### Backend

1. **RealtimeManager** (`src/realtime/RealtimeManager.js`)
   - Gerenciador centralizado de WebSocket
   - Padrão Singleton
   - Gerencia conexões por módulo

2. **EventBus** (`src/realtime/EventBus.js`)
   - Sistema de Pub/Sub para eventos de negócio
   - Desacopla lógica de negócio do realtime
   - Suporta subscribers com prioridade e execução única

3. **TriagemRealtimeModule** (`src/realtime/modules/TriagemRealtimeModule.js`)
   - Módulo específico para triagem
   - Escuta eventos de negócio `patient:transferred`, `patient:triagem_started`, etc
   - Emite notificações WebSocket para clientes

4. **AmbulatoriRealtimeModule** (`src/realtime/modules/AmbulatoriRealtimeModule.js`)
   - Módulo específico para ambulatório/médico
   - Mesmo padrão de TriagemRealtimeModule
   - Suporta comunicação para múltiplos destinos

5. **PatientEventService** (`src/services/PatientEventService.js`)
   - Interface simples para disparar eventos de pacientes
   - Usado pelos controllers
   - Desacopla lógica de negócio da camada realtime

### Frontend

1. **RealtimeService** (`src/app/services/realtime.service.ts`)
   - Gerencia conexão WebSocket
   - Expõe Observables para cada tipo de evento
   - Auto-reconnect
   - Gerenciamento de módulos

2. **NotificationService** (`src/app/services/notification.service.ts`)
   - Serviço centralizado de notificações
   - Suporta múltiplos tipos: toast, badge, sound, desktop
   - Interface simples para componentes

3. **NotificationContainerComponent** (`src/app/shared/components/notification-container.component.ts`)
   - Componente que exibe notificações toast
   - Deve ser adicionado uma vez ao `app.component.ts`
   - Gerencia animações e ciclo de vida das notificações

4. **RealtimeStatusComponent** (`src/app/shared/components/realtime-status.component.ts`)
   - Exibe status de conexão WebSocket
   - Deve ser adicionado ao header/navbar
   - Mostra módulo conectado e última atualização

## Como Integrar nos Componentes Existentes

### 1. Setup Inicial - app.component.ts

Adicione os componentes de notificação e status ao seu app.component.ts:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RealtimeService } from './services/realtime.service';
import { NotificationContainerComponent } from './shared/components/notification-container.component';
import { RealtimeStatusComponent } from './shared/components/realtime-status.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    // ... seus imports
    NotificationContainerComponent,
    RealtimeStatusComponent
  ],
  template: `
    <!-- No header/navbar -->
    <div class="navbar">
      <!-- ... seu conteúdo -->
      <app-realtime-status></app-realtime-status>
    </div>

    <!-- Seu conteúdo principal -->
    <div class="content">
      <router-outlet></router-outlet>
    </div>

    <!-- Container de notificações (deve estar uma vez) -->
    <app-notification-container></app-notification-container>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private realtimeService: RealtimeService) {}

  ngOnInit(): void {
    // Conectar ao servidor WebSocket ao iniciar a app
    this.realtimeService.connect('default').catch(error => {
      console.error('Erro ao conectar ao WebSocket:', error);
    });
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }
}
```

### 2. Integração em Componentes - Fila de Triagem

Exemplo de como integrar no `FilaTriagemComponent`:

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RealtimeService } from 'src/app/services/realtime.service';
import { NotificationService } from 'src/app/services/notification.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-fila-triagem',
  // ... seu resto do componente
})
export class FilaTriagemComponent implements OnInit, OnDestroy {
  pacientes: PacienteTriagem[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private triagemService: TriagemService,
    private realtimeService: RealtimeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Setup existente
    this.carregarFila();

    // NOVO: Conectar ao módulo de triagem via WebSocket
    this.realtimeService.connect('triagem').catch(error => {
      console.error('Erro ao conectar ao triagem realtime:', error);
    });

    // NOVO: Escutar quando novo paciente chega
    this.realtimeService.onPatientArrived()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        console.log('Novo paciente chegou:', data);
        
        // Notificação visual
        this.notificationService.patientArrived(
          data.patientName,
          data.destinationModule,
          data.classificationRisk
        );

        // Atualizar fila
        this.carregarFila();
      });

    // NOVO: Escutar atualizações de fila em tempo real
    this.realtimeService.onQueueUpdated()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        console.log('Fila atualizada:', data);
        
        // Incrementar badge do módulo
        this.notificationService.addBadge('triagem', data.queueLength, 'high');
      });

    // NOVO: Escutar erros de conexão
    this.realtimeService.onConnectionError()
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        this.notificationService.warning(
          'Problema de Conexão',
          `Erro ao conectar ao servidor: ${error}`
        );
      });
  }

  async carregarFila(): Promise<void> {
    try {
      this.carregando = true;
      const response = await firstValueFrom(this.triagemService.listarFilaTriagem());
      this.pacientes = response;
      
      // Atualizar badge
      this.notificationService.addBadge(
        'triagem',
        this.pacientes.length,
        this.pacientes.length > 5 ? 'high' : 'normal'
      );
    } catch (error) {
      console.error('Erro ao carregar fila:', error);
      this.notificationService.error('Erro', 'Não foi possível carregar a fila');
    } finally {
      this.carregando = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

### 3. Exemplo - Módulo de Ambulatório

Interface semelhante para ambulatório/médico:

```typescript
export class FilaAmbulatórioComponent implements OnInit, OnDestroy {
  pacientes: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    private ambulatorioService: AmbulatórioService,
    private realtimeService: RealtimeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Conectar ao módulo ambulatório
    this.realtimeService.connect('ambulatorio').catch(error => {
      console.error('Erro:', error);
    });

    // Escutar pacientes chegando
    this.realtimeService.onPatientArrived()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data.destinationModule === 'ambulatorio') {
          this.notificationService.patientArrived(
            data.patientName,
            'Ambulatório',
            data.classificationRisk
          );
          this.carregarFila();
        }
      });

    this.carregarFila();
  }

  private carregarFila(): void {
    // Implement seu carregamento
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

## Flow Completo: Transferência de Paciente

### 1. Backend - Finalização de Triagem

```typescript
// No TriagemController.finalizarTriagem()
const atendimento = await Atendimento.finalizarTriagem(id, status_destino);

// Emitir eventos de negócio
await PatientEventService.emitPatientTransferred({
  patientId: atendimento.paciente_id,
  patientName: dadosAtuais.paciente_nome,
  originModule: 'triagem',
  destinationModule: 'medico',
  status: status_destino,
  classificationRisk: atendimento.classificacao_risco,
  userId
});
```

### 2. EventBus - Propagação de Eventos

```typescript
// EventBus recebe o evento 'patient:transferred'
// Todos os subscribers são notificados
TriagemRealtimeModule.onPatientTransferred(data);
AmbulatoriRealtimeModule.onPatientTransferred(data);
```

### 3. Módulos Realtime - Emissão WebSocket

```typescript
// TriagemRealtimeModule notifica módulo de triagem
realtimeManager.emitToModule('triagem', 'patient:transferred_out', data);

// MédicoRealtimeModule notifica módulo de médico
realtimeManager.emitToModule('medico', 'patient:arrived', data);
```

### 4. Frontend - Recebimento e Exibição

```typescript
// RealtimeService recebe evento 'patient:arrived'
// Todos os subscribers são notificados
onPatientArrived().subscribe(data => {
  // Componente de médico atualiza UI
  notificationService.patientArrived(...);
});
```

## API - Métodos Disponíveis

### RealtimeService

```typescript
// Conexão
connect(module: string): Promise<void>
disconnect(): void
switchModule(newModule: string): void

// Status
isConnected(): boolean
getConnectionInfo(): RealtimeConnection
getConnectionStatus(): Observable<RealtimeConnection>

// Events
onPatientTransferred(): Observable<PatientTransferredEvent>
onPatientArrived(): Observable<PatientArrivedEvent>
onQueueUpdated(): Observable<QueueUpdateEvent>
onTriagemStarted(): Observable<any>
onTriagemFinished(): Observable<any>
onAtendimentoStarted(): Observable<any>
onAtendimentoFinished(): Observable<any>
onConnectionError(): Observable<string>

// Custom
emit(event: string, data: any): void
on(event: string, callback: (data: any) => void): void
off(event: string, callback?: (data: any) => void): void
```

### NotificationService

```typescript
// Notificações simples
success(title: string, message: string, options?: Partial<Notification>): string
error(title: string, message: string, options?: Partial<Notification>): string
warning(title: string, message: string, options?: Partial<Notification>): string
info(title: string, message: string, options?: Partial<Notification>): string

// Notificações especializadas
patientArrived(patientName: string, module: string, classification: string): string
triagemFinished(patientName: string, classification: string): string
atendimentoStarted(patientName: string, module: string): string

// Gerenciamento
dismiss(id: string): void
clearAll(): void
markAsRead(id: string): void
markAllAsRead(): void

// Badges
addBadge(module: string, count: number, severity: 'high' | 'normal' | 'low'): void
removeBadge(module: string): void
incrementBadge(module: string, amount?: number): void
decrementBadge(module: string, amount?: number): void

// Configuração
setAudioEnabled(enabled: boolean): void

// Observables
getNotifications(): Observable<Notification[]>
getBadges(): Observable<Map<string, Badge>>
getUnreadCount(): Observable<number>
```

## Criando Novos Módulos Realtime

Para adicionar um novo módulo de realtime (ex: "exames"):

### 1. Backend - Novo Módulo

Crie `src/realtime/modules/ExamesRealtimeModule.js`:

```typescript
import eventBus from '../realtime/EventBus.js';
import realtimeManager from '../realtime/RealtimeManager.js';

class ExamesRealtimeModule {
  static MODULE_NAME = 'exames';

  static initialize() {
    realtimeManager.registerModule(this.MODULE_NAME, this);
    eventBus.subscribe('patient:transferred', (data) => {
      if (data.destinationModule === 'exames') {
        realtimeManager.emitToModule(this.MODULE_NAME, 'patient:arrived', data);
      }
    });
  }

  static setupSocketListeners(socket) {
    // listeners específicos do módulo
  }
}

export default ExamesRealtimeModule;
```

### 2. Backend - Registrar Módulo

Em `src/app.js`, adicione:

```typescript
import ExamesRealtimeModule from './realtime/modules/ExamesRealtimeModule.js';

// Na função start()
ExamesRealtimeModule.initialize();
```

### 3. Frontend - Conectar

No componente do módulo exames:

```typescript
this.realtimeService.connect('exames');
```

## Boas Práticas

1. **Sempre testar desconexão**: Verifique se `ngOnDestroy` desinscreve dos observables
2. **Use takeUntil pattern**: Evita memory leaks
3. **Trate erros**: Sempre subscreva a `onConnectionError()`
4. **Cache local**: Mantenha sincronização local enquanto desconectado
5. **Modular**: Crie módulos separados para diferentes funcionalidades
6. **Sem replicação**: EventBus evita replicação de listeners

## Troubleshooting

### "WebSocket connection failed"
- Verifique se backend está rodando na porta 3000
- Verifique CORS settings
- Verifique token JWT

### "Notificações não aparecem"
- Garanta que `NotificationContainerComponent` está no app.component
- Verifique console para erros
- Verifique CSS/animações

### "Pacientes não atualizam em tempo real"
- Verifique se componente está inscrito aos eventos
- Verifique se módulo está correto
- Verifique socket.io connection status

## Suporte para Múltiplas Instâncias (Escalabilidade)

Para suportar múltiplas instâncias do backend (horizontal scaling), considere:

1. **Redis Adapter**: Use redis com socket.io para sincronizar entre instâncias
2. **Message Queue**: Implementar fila (RabbitMQ, Kafka) para eventos
3. **Dedicatory WebSocket Server**: Separar WebSocket em servidor diferente

Exemplo com Redis (futura implementação):

```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

## Referências

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [RxJS Operators](https://rxjs.dev/guide/operators)
- [Angular Services](https://angular.io/guide/architecture-services)
