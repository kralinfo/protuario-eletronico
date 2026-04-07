# 🎯 Guia de Implementação Frontend

## Como Configurar WebSocket para Sincronização Atendimentos ↔ Triagem

---

## 1️⃣ Conectar ao Módulo de Atendimentos

```typescript
// atendimentos-realtime.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { NotificationService } from './notification.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AtendimentosRealtimeService {
  private socket: Socket;

  constructor(private notificationService: NotificationService) {
    // Conectar ao servidor WebSocket
    this.socket = io(environment.apiUrl, {
      auth: {
        token: localStorage.getItem('authToken'),
        userId: localStorage.getItem('userId')
      }
    });

    console.log('🔌 [AtendimentosRealtime] WebSocket inicializado');

    // Entrar no módulo 'atendimentos'
    this.socket.emit('join:module', { module: 'atendimentos' });
    console.log('📌 [AtendimentosRealtime] Entrou no módulo: atendimentos');

    // Monitorar conexão
    this.socket.on('connect', () => {
      console.log('✅ [AtendimentosRealtime] Conectado ao servidor');
      this.notificationService.info(
        'Conexão Estabelecida',
        'Sincronização de atendimentos ativa'
      );
    });

    this.socket.on('disconnect', () => {
      console.warn('⚠️ [AtendimentosRealtime] Desconectado do servidor');
      this.notificationService.warning(
        'Desconectado',
        'Tentando reconectar...'
      );
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ [AtendimentosRealtime] Erro de conexão:', error);
      this.notificationService.error(
        'Erro de Conexão',
        'Falha ao conectar ao servidor'
      );
    });
  }

  /**
   * Listener: Paciente foi transferido de atendimentos
   */
  onPatientTransferredOut$(callback: (data: any) => void) {
    this.socket.on('patient:transferred_out', (data: any) => {
      console.log('📤 [AtendimentosRealtime] Paciente transferido OUT:', {
        patientId: data.patientId,
        patientName: data.patientName,
        destination: data.destinationModule,
        timestamp: data.timestamp
      });

      // Mostrar notificação
      this.notificationService.info(
        'Paciente Encaminhado',
        `${data.patientName} foi transferido para ${data.destinationModule}`,
        {
          duration: 5000,
          icon: '➡️'
        }
      );

      callback(data);
    });
  }

  /**
   * Listener: Novo paciente chegou em atendimentos
   */
  onPatientNewArrival$(callback: (data: any) => void) {
    this.socket.on('patient:new_arrival', (data: any) => {
      console.log('🆕 [AtendimentosRealtime] Novo paciente chegou:', {
        patientId: data.patientId,
        patientName: data.patientName,
        timestamp: data.timestamp
      });

      // Mostrar notificação
      this.notificationService.success(
        'Novo Paciente',
        `${data.patientName} chegou nos atendimentos`,
        {
          duration: 8000,
          icon: '👥',
          action: {
            label: 'Ver',
            callback: () => {
              console.log('Ação: Visualizar paciente', data.patientId);
            }
          }
        }
      );

      callback(data);
    });
  }

  /**
   * Listener: Fila foi atualizada
   */
  onQueueUpdated$(callback: (data: any) => void) {
    this.socket.on('fila:updated', (data: any) => {
      console.log('📊 [AtendimentosRealtime] Fila atualizada:', {
        queueLength: data.queueLength,
        patientCount: data.patients?.length,
        timestamp: data.timestamp
      });

      callback(data);
    });
  }

  /**
   * Solicitação atualização da fila
   */
  requestQueueRefresh() {
    console.log('🔄 [AtendimentosRealtime] Solicitando atualização da fila...');
    this.socket.emit('fila:refresh_request');
  }

  /**
   * Listener: Fila está pronta para atualizar
   */
  onQueueUpdateAvailable$(callback: () => void) {
    this.socket.on('fila:update_available', () => {
      console.log('✅ [AtendimentosRealtime] Atualização de fila disponível');
      callback();
    });
  }

  /**
   * Desconectar do WebSocket
   */
  disconnect() {
    console.log('🔌 [AtendimentosRealtime] Desconectando...');
    this.socket.disconnect();
  }
}
```

---

## 2️⃣ Conectar ao Módulo de Triagem

```typescript
// triagem-realtime.service.ts
import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { NotificationService } from './notification.service';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TriagemRealtimeService {
  private socket: Socket;

  constructor(private notificationService: NotificationService) {
    // Conectar ao servidor WebSocket
    this.socket = io(environment.apiUrl, {
      auth: {
        token: localStorage.getItem('authToken'),
        userId: localStorage.getItem('userId')
      }
    });

    console.log('🔌 [TriagemRealtime] WebSocket inicializado');

    // Entrar no módulo 'triagem'
    this.socket.emit('join:module', { module: 'triagem' });
    console.log('📌 [TriagemRealtime] Entrou no módulo: triagem');

    // Monitorar conexão
    this.socket.on('connect', () => {
      console.log('✅ [TriagemRealtime] Conectado ao servidor');
      this.notificationService.info(
        'Conexão Estabelecida',
        'Sincronização de triagem ativa'
      );
    });

    this.socket.on('disconnect', () => {
      console.warn('⚠️ [TriagemRealtime] Desconectado do servidor');
      this.notificationService.warning(
        'Desconectado',
        'Tentando reconectar...'
      );
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('❌ [TriagemRealtime] Erro de conexão:', error);
      this.notificationService.error(
        'Erro de Conexão',
        'Falha ao conectar ao servidor'
      );
    });
  }

  /**
   * Listener: Novo paciente chegou na triagem
   */
  onPatientArrived$(callback: (data: any) => void) {
    this.socket.on('patient:arrived', (data: any) => {
      console.log('🎉 [TriagemRealtime] Paciente chegou na triagem:', {
        patientId: data.patientId,
        patientName: data.patientName,
        origin: data.originModule,
        classification: data.classificationRisk,
        timestamp: data.timestamp
      });

      // Mostrar notificação com som
      this.notificationService.success(
        'Novo Paciente na Triagem',
        `${data.patientName} chegou dos ${data.originModule}`,
        {
          duration: 10000,
          icon: '🏥',
          action: {
            label: 'Triagiar',
            callback: () => {
              console.log('Ação: Iniciar triagem para paciente', data.patientId);
            }
          }
        }
      );

      // Reproduzir som de notificação
      this.playNotificationSound();

      callback(data);
    });
  }

  /**
   * Listener: Paciente saiu da triagem
   */
  onPatientTransferredOut$(callback: (data: any) => void) {
    this.socket.on('patient:transferred_out', (data: any) => {
      console.log('📤 [TriagemRealtime] Paciente saiu da triagem:', {
        patientId: data.patientId,
        patientName: data.patientName,
        destination: data.destinationModule,
        timestamp: data.timestamp
      });

      // Mostrar notificação
      this.notificationService.info(
        'Paciente Encaminhado',
        `${data.patientName} foi transferido para ${data.destinationModule}`,
        {
          duration: 5000,
          icon: '➡️'
        }
      );

      callback(data);
    });
  }

  /**
   * Listener: Triagem foi iniciada
   */
  onTriagemStarted$(callback: (data: any) => void) {
    this.socket.on('triagem:started', (data: any) => {
      console.log('🔄 [TriagemRealtime] Triagem iniciada:', {
        patientId: data.patientId,
        patientName: data.patientName,
        startedBy: data.startedBy,
        timestamp: data.timestamp
      });

      this.notificationService.info(
        'Triagem Iniciada',
        `Triagem de ${data.patientName} foi iniciada`
      );

      callback(data);
    });
  }

  /**
   * Listener: Triagem foi finalizada
   */
  onTriagemFinished$(callback: (data: any) => void) {
    this.socket.on('triagem:finished', (data: any) => {
      console.log('✅ [TriagemRealtime] Triagem finalizada:', {
        patientId: data.patientId,
        patientName: data.patientName,
        classification: data.classificationRisk,
        finishedBy: data.finishedBy,
        timestamp: data.timestamp
      });

      // Mostrar notificação destacada
      this.notificationService.success(
        'Triagem Concluída',
        `${data.patientName} - Classificação: ${data.classificationRisk}`,
        {
          duration: 8000,
          icon: '✅'
        }
      );

      callback(data);
    });
  }

  /**
   * Listener: Fila foi atualizada
   */
  onQueueUpdated$(callback: (data: any) => void) {
    this.socket.on('fila:updated', (data: any) => {
      console.log('📊 [TriagemRealtime] Fila de triagem atualizada:', {
        queueLength: data.queueLength,
        patientCount: data.patients?.length,
        timestamp: data.timestamp
      });

      callback(data);
    });
  }

  /**
   * Solicitação atualização da fila
   */
  requestQueueRefresh() {
    console.log('🔄 [TriagemRealtime] Solicitando atualização da fila');
    this.socket.emit('fila:refresh_request');
  }

  /**
   * Reproduzir som de notificação
   */
  private playNotificationSound() {
    console.log('🔊 [TriagemRealtime] Reproduzindo som de notificação');
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => 
        console.warn('⚠️ [TriagemRealtime] Não foi possível reproduzir som:', err)
      );
    } catch (error) {
      console.warn('⚠️ [TriagemRealtime] Erro ao tentar reproduzir som:', error);
    }
  }

  /**
   * Desconectar do WebSocket
   */
  disconnect() {
    console.log('🔌 [TriagemRealtime] Desconectando...');
    this.socket.disconnect();
  }
}
```

---

## 3️⃣ Usar no Componente de Atendimentos

```typescript
// atendimentos.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AtendimentosRealtimeService } from './atendimentos-realtime.service';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-atendimentos',
  templateUrl: './atendimentos.component.html'
})
export class AtendimentosComponent implements OnInit, OnDestroy {
  filaAtendimentos: any[] = [];

  constructor(
    private realtimeService: AtendimentosRealtimeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    console.log('🚀 [AtendimentosComponent] Iniciando componente de atendimentos');
    
    this.carregarFila();
    this.setupRealtimeListeners();
  }

  ngOnDestroy() {
    console.log('🔌 [AtendimentosComponent] Destruindo componente');
    this.realtimeService.disconnect();
  }

  setupRealtimeListeners() {
    console.log('🔌 [AtendimentosComponent] Configurando listeners de realtime');

    // Quando paciente é transferido de atendimentos
    this.realtimeService.onPatientTransferredOut$((data) => {
      console.log('📤 [AtendimentosComponent] Paciente saiu - removendo da fila:', {
        patientId: data.patientId,
        patientName: data.patientName,
        destination: data.destinationModule
      });

      // Remover paciente da fila local
      this.filaAtendimentos = this.filaAtendimentos.filter(
        p => p.id !== data.patientId
      );

      console.log('✅ [AtendimentosComponent] Fila atualizada. Total:', this.filaAtendimentos.length);
    });

    // Quando novo paciente chega
    this.realtimeService.onPatientNewArrival$((data) => {
      console.log('🆕 [AtendimentosComponent] Novo paciente chegou:', {
        patientId: data.patientId,
        patientName: data.patientName
      });

      // Adicionar paciente à fila local
      this.filaAtendimentos.unshift(data);

      console.log('✅ [AtendimentosComponent] Fila atualizada. Total:', this.filaAtendimentos.length);
    });

    // Quando fila é atualizada
    this.realtimeService.onQueueUpdated$((data) => {
      console.log('📊 [AtendimentosComponent] Fila atualizada via realtime:', {
        queueLength: data.queueLength,
        patientCount: data.patients?.length
      });

      // Atualizar fila completa
      this.filaAtendimentos = data.patients || [];

      console.log('✅ [AtendimentosComponent] Fila sincronizada com servidor');
    });

    // Quando há atualização disponível
    this.realtimeService.onQueueUpdateAvailable$(() => {
      console.log('🔔 [AtendimentosComponent] Atualização disponível, recarregando');
      this.carregarFila();
    });
  }

  carregarFila() {
    console.log('📥 [AtendimentosComponent] Carregando fila de atendimentos');
    
    // Chamar API para carregar fila
    // this.atendimentosService.listar().subscribe(
    //   (data) => {
    //     console.log('✅ [AtendimentosComponent] Fila carregada:', data);
    //     this.filaAtendimentos = data;
    //   },
    //   (error) => {
    //     console.error('❌ [AtendimentosComponent] Erro ao carregar fila:', error);
    //     this.notificationService.error('Erro', 'Não foi possível carregar a fila');
    //   }
    // );
  }

  iniciarAtendimento(paciente: any) {
    console.log('🔄 [AtendimentosComponent] Iniciando atendimento para:', paciente);
    this.notificationService.info('Atendimento Iniciado', 
      `Paciente ${paciente.nome} está sendo atendido`
    );
  }

  encaminharParaTriagem(paciente: any) {
    console.log('📤 [AtendimentosComponent] Encaminhando para triagem:', paciente);
    this.notificationService.success('Encaminhamento', 
      `${paciente.nome} foi encaminhado para triagem`
    );
  }
}
```

---

## 4️⃣ Usar no Componente de Triagem

```typescript
// triagem.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { TriagemRealtimeService } from './triagem-realtime.service';
import { NotificationService } from 'src/app/services/notification.service';

@Component({
  selector: 'app-triagem',
  templateUrl: './triagem.component.html'
})
export class TriagemComponent implements OnInit, OnDestroy {
  filaTriagem: any[] = [];
  now = new Date().getTime();

  constructor(
    private realtimeService: TriagemRealtimeService,
    private notificationService: NotificationService
  ) {}

  ngOnInit() {
    console.log('🚀 [TriagemComponent] Iniciando componente de triagem');
    
    this.carregarFila();
    this.setupRealtimeListeners();
  }

  ngOnDestroy() {
    console.log('🔌 [TriagemComponent] Destruindo componente');
    this.realtimeService.disconnect();
  }

  setupRealtimeListeners() {
    console.log('🔌 [TriagemComponent] Configurando listeners de realtime');

    // Quando novo paciente chega na triagem
    this.realtimeService.onPatientArrived$((data) => {
      console.log('🎉 [TriagemComponent] Paciente chegou - adicionando à fila:', {
        patientId: data.patientId,
        patientName: data.patientName,
        origin: data.originModule,
        classification: data.classificationRisk
      });

      // Adicionar paciente à fila de triagem
      this.filaTriagem.unshift({
        id: data.patientId,
        nome: data.patientName,
        classificacao: data.classificationRisk,
        entradaEm: new Date(),
        origem: data.originModule,
        novo: true // Flag para animação
      });

      console.log('✅ [TriagemComponent] Fila atualizada. Total:', this.filaTriagem.length);

      // Remover flag de novo após animação
      setTimeout(() => {
        const paciente = this.filaTriagem.find(p => p.id === data.patientId);
        if (paciente) {
          paciente.novo = false;
        }
      }, 1000);

      // Reproduzir som de notificação
      this.playNotificationSound();
    });

    // Quando paciente sai da triagem
    this.realtimeService.onPatientTransferredOut$((data) => {
      console.log('📤 [TriagemComponent] Paciente saiu da triagem:', {
        patientId: data.patientId,
        patientName: data.patientName,
        destination: data.destinationModule
      });

      // Remover paciente da fila
      this.filaTriagem = this.filaTriagem.filter(
        p => p.id !== data.patientId
      );

      console.log('✅ [TriagemComponent] Fila atualizada. Total:', this.filaTriagem.length);
    });

    // Quando triagem é iniciada
    this.realtimeService.onTriagemStarted$((data) => {
      console.log('🔄 [TriagemComponent] Triagem iniciada:', {
        patientId: data.patientId,
        patientName: data.patientName
      });

      // Marcar paciente como "em triagem"
      const paciente = this.filaTriagem.find(p => p.id === data.patientId);
      if (paciente) {
        paciente.status = 'em_triagem';
        paciente.inicioTriagem = new Date();
        console.log('✅ [TriagemComponent] Paciente marcado como em triagem');
      }
    });

    // Quando triagem é finalizada
    this.realtimeService.onTriagemFinished$((data) => {
      console.log('✅ [TriagemComponent] Triagem finalizada:', {
        patientId: data.patientId,
        patientName: data.patientName,
        classification: data.classificationRisk
      });

      // Marcar paciente como "triagem completa"
      const paciente = this.filaTriagem.find(p => p.id === data.patientId);
      if (paciente) {
        paciente.status = 'triagem_completa';
        paciente.classificacao = data.classificationRisk;
        paciente.fimTriagem = new Date();
        console.log('✅ [TriagemComponent] Paciente marcado como triagem completa');
      }
    });
  }

  playNotificationSound() {
    console.log('🔊 [TriagemComponent] Reproduzindo som de notificação');
    try {
      const audio = new Audio('/assets/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(err => 
        console.warn('⚠️ [TriagemComponent] Não foi possível reproduzir som:', err)
      );
    } catch (error) {
      console.warn('⚠️ [TriagemComponent] Erro ao reproduzir som:', error);
    }
  }

  showNotification(message: string) {
    console.log('📢 [TriagemComponent] Notificação:', message);
    this.notificationService.info('Informação', message);
  }

  carregarFila() {
    console.log('📥 [TriagemComponent] Carregando fila de triagem');
    
    // Chamar API para carregar fila
    // this.triagemService.listarFila().subscribe(
    //   (data) => {
    //     console.log('✅ [TriagemComponent] Fila carregada:', data);
    //     this.filaTriagem = data;
    //   },
    //   (error) => {
    //     console.error('❌ [TriagemComponent] Erro ao carregar fila:', error);
    //     this.notificationService.error('Erro', 'Não foi possível carregar a fila');
    //   }
    // );
  }

  iniciarTriagem(paciente: any) {
    console.log('🔄 [TriagemComponent] Iniciando triagem para:', paciente);
    this.notificationService.info('Triagem Iniciada', 
      `Triagem de ${paciente.nome} foi iniciada`
    );
  }
}
```

---

## 5️⃣ Template (HTML)

### Atendimentos

```html
<!-- atendimentos.component.html -->
<div class="container">
  <h2>Fila de Atendimentos</h2>
  
  <table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Nome</th>
        <th>Motivo</th>
        <th>Status</th>
        <th>Ações</th>
      </tr>
    </thead>
    <tbody>
      <tr *ngFor="let paciente of filaAtendimentos" [class.highlight]="paciente.novo">
        <td>{{ paciente.id }}</td>
        <td>{{ paciente.nome }}</td>
        <td>{{ paciente.motivo }}</td>
        <td>{{ paciente.status }}</td>
        <td>
          <button (click)="editarAtendimento(paciente)">Editar</button>
          <button (click)="encaminharParaTriagem(paciente)">Triagem</button>
        </td>
      </tr>
    </tbody>
  </table>

  <div *ngIf="filaAtendimentos.length === 0" class="empty-state">
    <p>Nenhum atendimento pendente</p>
  </div>
</div>
```

### Triagem

```html
<!-- triagem.component.html -->
<div class="container">
  <h2>Fila de Triagem ({{ filaTriagem.length }})</h2>
  
  <div class="queue">
    <div *ngFor="let paciente of filaTriagem" 
         [class.novo]="paciente.entradaEm > (now - 5000)"
         [class.urgente]="paciente.classificacao === 'vermelho'"
         class="queue-item">
      
      <div class="patient-info">
        <strong>{{ paciente.nome }}</strong>
        <span class="risco" [class]="'risco-' + paciente.classificacao">
          {{ paciente.classificacao }}
        </span>
      </div>
      
      <div class="patient-meta">
        <small>Entrada: {{ paciente.entradaEm | date: 'HH:mm:ss' }}</small>
        <small>Status: {{ paciente.status }}</small>
      </div>
      
      <div class="actions">
        <button (click)="iniciarTriagem(paciente)">Iniciar</button>
      </div>
    </div>
  </div>

  <div *ngIf="filaTriagem.length === 0" class="empty-state">
    <p>Nenhum paciente na fila</p>
  </div>
</div>
```

---

## 6️⃣ CSS (Estilos)

```css
/* Destaque para novos pacientes */
.queue-item.novo {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
  animation: pulse 0.5s ease-in-out;
}

/* Pacientes urgentes */
.queue-item.urgente {
  background-color: #f8d7da;
  border-left: 4px solid #dc3545;
}

/* Animação para entrada */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

/* Classificação de risco */
.risco {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.risco-vermelho {
  background-color: #dc3545;
  color: white;
}

.risco-laranja {
  background-color: #fd7e14;
  color: white;
}

.risco-amarelo {
  background-color: #ffc107;
  color: black;
}

.risco-verde {
  background-color: #28a745;
  color: white;
}

.risco-azul {
  background-color: #17a2b8;
  color: white;
}
```

---

## 🧪 Testando a Sincronização

### Via Console do Navegador

```javascript
// Acessar Socket.io
const socket = window.io;

// Monitorar eventos
socket.on('patient:arrived', (data) => {
  console.log('✅ Evento recebido:', data);
});

socket.on('patient:transferred_out', (data) => {
  console.log('✅ Paciente saiu:', data);
});

// Monitorar todas as emissões
socket.onAny((event, ...args) => {
  console.log('📡 Evento:', event, args);
});
```

---

## 📊 Fluxo de Dados Esperado

```
Frontend (Atendimentos)
├─ Registra novo paciente
└─ POST /api/atendimentos

Backend
├─ Cria no banco
├─ Dispara evento via EventBus
└─ Emite via WebSocket

Frontend (Triagem)
├─ Recebe 'patient:arrived'
├─ Atualiza fila local
└─ Interface reflete mudança (Automático)
```

---

## 📊 Sistema de Logs Detalhados

Todos os eventos têm logs estruturados para facilitar debug. Abra a aba **Console (F12)** no navegador:

### Logs no Serviço
```javascript
🔌 [AtendimentosRealtime] WebSocket inicializado
📌 [AtendimentosRealtime] Entrou no módulo: atendimentos
✅ [AtendimentosRealtime] Conectado ao servidor
⚠️ [AtendimentosRealtime] Desconectado do servidor
❌ [AtendimentosRealtime] Erro de conexão: [erro]
📤 [AtendimentosRealtime] Paciente transferido OUT:
📊 [AtendimentosRealtime] Fila atualizada:
```

### Logs no Componente
```javascript
🚀 [AtendimentosComponent] Iniciando componente de atendimentos
🔌 [AtendimentosComponent] Configurando listeners de realtime
📤 [AtendimentosComponent] Paciente saiu - removendo da fila
✅ [AtendimentosComponent] Fila atualizada. Total: 5
📥 [AtendimentosComponent] Carregando fila de atendimentos
```

### Como Usar os Logs para Debug

1. **Abrir Devtools:** F12 no navegador
2. **Ir para Console:** Tab "Console"
3. **Filtrar por Módulo:** `[AtendimentosComponent]` ou `[TriagemComponent]`
4. **Ver Stack Completo:** Cada log mostra timestamp e dados

Exemplo de output:
```
🚀 [AtendimentosComponent] Iniciando componente de atendimentos
🔌 [AtendimentosComponent] Configurando listeners de realtime
📤 [AtendimentosComponent] Paciente saiu - removendo da fila: {
  patientId: 123,
  patientName: "João Silva",
  destination: "triagem"
}
✅ [AtendimentosComponent] Fila atualizada. Total: 4
```

---

## 🔔 Sistema de Notificações Push

Implementadas notificações automáticas usando `NotificationService`:

### Notificações no Serviço (AtendimentosRealtimeService)
```
✅ Conexão Estabelecida
   └─ Sincronização de atendimentos ativa

⚠️ Desconectado
   └─ Tentando reconectar...

❌ Erro de Conexão
   └─ Falha ao conectar ao servidor
```

### Notificações no Componente de Atendimentos
```
📤 Paciente Encaminhado
   └─ [Nome do Paciente] foi transferido para triagem

🆕 Novo Paciente
   └─ [Nome do Paciente] chegou nos atendimentos
   └─ Com botão "Ver" para ação rápida
```

### Notificações no Componente de Triagem
```
🎉 Novo Paciente na Triagem
   └─ [Nome do Paciente] chegou dos atendimentos
   └─ Duração: 10 segundos
   └─ Com botão "Triagiar" para ação rápida
   └─ Reproduz som automático

📤 Paciente Encaminhado
   └─ [Nome do Paciente] foi transferido para [próximo módulo]
   └─ Duração: 5 segundos

🔄 Triagem Iniciada
   └─ Triagem de [Nome do Paciente] foi iniciada

✅ Triagem Concluída
   └─ [Nome do Paciente] - Classificação: [cor]
   └─ Duração: 8 segundos
```

### Tipos de Notificação
```typescript
// Sucesso (verde)
this.notificationService.success('Título', 'Mensagem');

// Erro (vermelho)
this.notificationService.error('Título', 'Mensagem');

// Aviso (amarelo)
this.notificationService.warning('Título', 'Mensagem');

// Informação (azul)
this.notificationService.info('Título', 'Mensagem');
```

### Sons de Notificação

Arquivo: `/assets/sounds/notification.mp3`

Reproduzido automaticamente quando:
- ✅ Novo paciente chega na triagem
- Pode ser desabilitado pelo usuário (opcional)

---

## 🎯 Boas Práticas de Debug

### 1. Monitorar Conexão WebSocket
```javascript
// No console
socket.connected  // true/false

socket.listeners('patient:arrived')  // Verificar listeners
```

### 2. Forçar Reconexão
```javascript
socket.disconnect();
socket.connect();
```

### 3. Ver Todos os Eventos
```javascript
socket.onAny((event, ...args) => {
  console.log(`[EVENTO] ${event}:`, args);
});
```

### 4. Monitorar Estado do Serviço
```javascript
// Adicionar no ngOnInit do componente
console.log('[DEBUG] Listeners ativos:', socket.listeners('patient:arrived').length);
```

---

## ✅ Checklist de Implementação

### Frontend - Serviços
- [ ] **AtendimentosRealtimeService**: Copiar código da seção 1
  - [ ] Injetar `NotificationService`
  - [ ] Initializar com `console.log` prefixado
  - [ ] Implementar listeners com notificações
  - [ ] Adicionar tratamento de erros com `console.warn`
  - [ ] Testar logs no console (F12)

- [ ] **TriagemRealtimeService**: Copiar código da seção 2
  - [ ] Injetar `NotificationService`
  - [ ] Implementar 4 listeners principais
  - [ ] Adicionar método `playNotificationSound()`
  - [ ] Logs estruturados com emojis
  - [ ] Notificações para cada evento
  - [ ] Arquivo de som em `/assets/sounds/notification.mp3`

### Frontend - Componentes
- [ ] **AtendimentosComponent**: Seção 3
  - [ ] Injetar `AtendimentosRealtimeService`
  - [ ] Implementar `ngOnInit` com logs
  - [ ] Implementar `setupRealtimeListeners()`
  - [ ] Implementar `ngOnDestroy` com cleanup
  - [ ] Adicionar `playNotificationSound()` (opcional)
  - [ ] Verificar logs no console

- [ ] **TriagemComponent**: Seção 4
  - [ ] Injetar `TriagemRealtimeService`
  - [ ] Implementar `ngOnInit` com logs
  - [ ] Implementar `setupRealtimeListeners()`
  - [ ] Implementar `ngOnDestroy` com cleanup
  - [ ] Executar listener callbacks com console.log
  - [ ] Verificar notificações funcionando
  - [ ] Verificar som tocando

### Backend - Verificação
- [ ] **AtendimentosRealtimeModule.js**: Já implementado ✅
- [ ] **atendimentosController.js**: Já atualizado ✅
  - [ ] `registrar()`: Chama `emitPatientTransferred()`
  - [ ] `atualizarStatus()`: Chama `emitPatientTransferred()` para triagem
- [ ] **app.js**: Já importa e inicializa módulo ✅

### Testes de Validação
- [ ] Logs aparecem no console com prefixo `[ServiceName]`
- [ ] Emojis aparecem nos logs (exemplo: 🔌, ✅, ❌)
- [ ] Notificações aparecem no canto superior direito
- [ ] Notificações desaparecem após 5-10 segundos
- [ ] Som toca quando novo paciente chega na triagem
- [ ] Fila se atualiza em <100ms
- [ ] Desconexão e reconexão funcionam
- [ ] Múltiplos pacientes na fila funcionam
- [ ] Transferência de triagem para médico também funciona

---

## 🔧 Troubleshooting

### Evento não recebido?
```javascript
// Verificar conexão
console.log('Socket conectado:', socket.connected);

// Verificar inscrição no módulo
socket.on('connect', () => {
  console.log('Conectado!');
  socket.emit('join:module', { module: 'atendimentos' });
});
```

### Fila não atualiza?
```javascript
// Verificar se listener foi adicionado
socket.listeners('patient:arrived').length > 0

// Verificar se dados estão chegando
console.log('[DEBUG] Fila atualizada:', this.filaTriagem);
```

### WebSocket desconecta?
```javascript
socket.on('disconnect', (reason) => {
  console.log('Desconectado:', reason);
  // Reconectar automaticamente (Socket.io faz isso)
  
  // Verificar logs de reconexão
  console.log('[DEBUG] Tentando reconectar...');
});
```

### Logs não aparecem?
```javascript
// Verificar se console.log está funcionando
console.log('🔌 [DEBUG] Console funcionando');

// Verificar DevTools
// Pressionar F12 → Aba Console
// Filtrar por [AtendimentosComponent] ou [TriagemComponent]
```

### Notificações não aparecem?
```javascript
// Verificar NotificationService injetado
constructor(private notificationService: NotificationService) {
  console.log('[DEBUG] NotificationService:', this.notificationService);
}

// Testar notificação manual
this.notificationService.success('Teste', 'Notificação funcionando');
```

---

## 🚀 Próximos Passos

1. **Implementação Frontend**: 2-3 horas
   - Copiar código das 4 seções
   - Testar no navegador
   - Verificar console logs

2. **Testes Práticos**: Consultar `TESTES_PRATICOS.md`
   - 8 testes completos
   - Instruções passo a passo
   - Logs esperados documentados

3. **Produção**: 
   - Desabilitar logs de desenvolvimento (opcional)
   - Sincronizar som em todos os navegadores
   - Ajustar duração das notificações

---

**Status:** ✅ Backend Completo | ⏳ Frontend Pronto para Implementar | 📊 Completo com Logs e Notificações  
**Última Atualização:** 2026-04-07
