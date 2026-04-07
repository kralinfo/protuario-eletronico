# 🔄 Sincronização Assíncrona: Atendimentos → Triagem

## Visão Geral

O sistema agora está configurado para sincronização assíncrona em tempo real entre os módulos **"atendimentos"** e **"triagem"**, seguindo o mesmo padrão já implementado entre **"triagem"** e **"médico/ambulatório"**.

## Arquitetura Implementada

### 1. **EventBus Pattern**
- Centraliza eventos de negócio
- Desacopla lógica de negócio de comunicação em tempo real
- Eventos são publicados e subscribers se inscrevem

### 2. **RealtimeManager (WebSocket)**
- Gerencia conexões Socket.io
- Emite eventos para módulos específicos
- Suporta broadcasting para múltiplos clientes

### 3. **Módulos de Realtime**
Cada módulo é responsável por:
- Se inscrever em eventos relevantes do EventBus
- Emitir eventos para os clientes WebSocket conectados
- Gerenciar a transferência de dados entre módulos

## Fluxo de Dados: Atendimentos → Triagem

```
┌─────────────────────────────────────────────────────────────┐
│                    ATENDIMENTOS                             │
│  (Recepção/Entrada - Novo Paciente Registrado)             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─→ PatientEventService.emitPatientTransferred()
                     │
                     └─→ EventBus (evento: patient:transferred)
                     
                            │
                            ├─→ AtendimentosRealtimeModule
                            │   └─→ Emite 'patient:transferred_out'
                            │       para módulo 'atendimentos'
                            │
                            └─→ TriagemRealtimeModule
                                └─→ Emite 'patient:arrived'
                                    para módulo 'triagem'

┌─────────────────────────────────────────────────────────────┐
│                      TRIAGEM                                │
│        (Paciente Entra na Fila Aguardando)                 │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Implementados

### 1. **AtendimentosRealtimeModule** ✅
**Arquivo:** `backend/src/realtime/modules/AtendimentosRealtimeModule.js`

**Responsabilidades:**
- Se inscrever no evento `patient:transferred`
- Quando a transferência é de saudações → triagem:
  - Emitir `patient:transferred_out` para o módulo 'atendimentos'
  - Emitir `patient:arrived` para o módulo 'triagem'
- Gerenciar notificações de fila e novas chegadas

**Eventos que escuta:**
- `patient:transferred` - Quando um paciente é transferido
- `patient:atendimento_registrado` - Quando um atendimento é registrado

**Eventos que emite:**
- `patient:transferred_out` - Paciente saiu de atendimentos
- `patient:arrived` - Paciente chegou na triagem
- `atendimento:registrado` - Novo atendimento registrado
- `fila:updated` - Atualização na fila
- `patient:new_arrival` - Nova chegada

### 2. **Controller de Atendimentos** ✅
**Arquivo:** `backend/src/controllers/atendimentosController.js`

**Alterações:**
- Adicionada importação de `PatientEventService`
- Método `registrar()`: Dispara evento quando novo atendimento é criado
- Método `atualizarStatus()`: Dispara evento quando status muda para 'encaminhado para triagem'

**Eventos disparados:**
```javascript
await PatientEventService.emitPatientTransferred({
  patientId: atendimento.paciente_id,
  patientName: pacienteName,
  originModule: 'atendimentos',
  destinationModule: 'triagem',
  status: finalStatus,
  classificationRisk: null,
  userId
});
```

### 3. **App.js** ✅
**Arquivo:** `backend/src/app.js`

**Alterações:**
- Importação do `AtendimentosRealtimeModule`
- Inicialização do módulo na startup do servidor

```javascript
import AtendimentosRealtimeModule from './realtime/modules/AtendimentosRealtimeModule.js';

// Na inicialização:
AtendimentosRealtimeModule.initialize();
```

## Fluxo Completo Passo a Passo

### Cenário: Novo Paciente Chega na Recepção

1️⃣ **Frontend (Atendimentos) envia POST**
```javascript
POST /api/atendimentos
{
  pacienteId: 123,
  motivo: "Dor de cabeça",
  procedencia: "externo",
  status: "encaminhado para triagem"
}
```

2️⃣ **Backend - atendimentosController.registrar()**
```javascript
// a. Cria atendimento
const atendimento = await Atendimento.criar({...});

// b. Dispara evento
await PatientEventService.emitPatientTransferred({
  originModule: 'atendimentos',
  destinationModule: 'triagem',
  // ...
});
```

3️⃣ **EventBus - Evento 'patient:transferred'**
```javascript
eventBus.emit('patient:transferred', {
  patientId: 123,
  patientName: "João Silva",
  originModule: 'atendimentos',
  destinationModule: 'triagem',
  // ...
});
```

4️⃣ **Módulos de Realtime recebem o evento**

**AtendimentosRealtimeModule:**
```javascript
// Reconhece que é uma transferência para triagem
if (destinationModule === 'triagem' && originModule === 'atendimentos') {
  // Notifica clientes de atendimentos que paciente saiu
  realtimeManager.emitToModule('atendimentos', 'patient:transferred_out', {...});
  
  // Notifica clientes de triagem que paciente chegou
  realtimeManager.emitToModule('triagem', 'patient:arrived', {...});
}
```

5️⃣ **WebSocket emite para clientes conectados**
- Todos os clientes em `module:atendimentos` recebem `patient:transferred_out`
- Todos os clientes em `module:triagem` recebem `patient:arrived`

6️⃣ **Frontend atualiza em tempo real**
- Atendimentos: Remove paciente da fila
- Triagem: Adiciona paciente à fila

## Comparação: Triagem → Médico vs Atendimentos → Triagem

| Aspecto | Triagem → Médico | Atendimentos → Triagem |
|---------|-----------------|----------------------|
| **Módulo de Origem** | TriagemRealtimeModule | AtendimentosRealtimeModule |
| **Origem String** | 'triagem' | 'atendimentos' |
| **Destino String** | 'medico' / 'ambulatorio' | 'triagem' |
| **Classificação de Risco** | Sim (já foi feita) | Não (será feita na triagem) |
| **Disparador** | triagemController.finalizarTriagem() | atendimentosController.registrar() / atualizarStatus() |
| **Evento** | patient:transferred | patient:transferred |

## Logs de Debug Disponíveis

O sistema inclui logs estruturados para acompanhar o fluxo:

```
🚀 Inicializando módulo Atendimentos Realtime
📍 Event handlers do atendimento registrados
✅ Módulo Atendimentos Realtime inicializado

[REALTIME DEBUG] EventBus.emit('patient:transferred') | patientId=123 | ...
📤 Paciente transferido de atendimentos para triagem: João Silva
✅ Notificações enviadas para módulos: atendimentos, triagem
📡 Evento 'patient:transferred_out' enviado para módulo 'atendimentos'
📡 Evento 'patient:arrived' enviado para módulo 'triagem'
```

## Frontend - Listeners no Socket.io

O frontend deve estar preparado para receber os eventos:

```javascript
// Conexão ao módulo
socket.emit('join:module', { module: 'atendimentos' });
socket.emit('join:module', { module: 'triagem' });

// Atendimentos
socket.on('patient:transferred_out', (data) => {
  // Remover paciente da fila local
  updateQueue(data.patientId);
});

// Triagem
socket.on('patient:arrived', (data) => {
  // Adicionar paciente à fila de triagem
  addToQueue(data);
});
```

## Benefícios da Implementação

✅ **Sincronização em Tempo Real**
- Atualizações instantâneas entre módulos
- Sem necessidade de refresh manual

✅ **Desacoplamento**
- Lógica de negócio separada da comunicação
- Fácil adicionar novos módulos

✅ **Escalabilidade**
- Suporta múltiplos clientes
- Broadcasting eficiente

✅ **Manutenibilidade**
- Padrão consistente em todos os módulos
- Logs estruturados para debugging

✅ **Confiabilidade**
- Reconexão automática do WebSocket
- Tratamento de erros robusto

## Próximos Passos

Se quiser expandir ainda mais:

1. **Adicionar mais eventos** no PatientEventService
   - `patient:triagem_started`
   - `patient:triagem_finished`
   - `patient:status_changed`

2. **Criar módulo para Dashboard/Administrador**
   - Sincronizar estatísticas em tempo real
   - Alertas de pacientes críticos

3. **Notificações de Alerta**
   - Quando tempo de espera excede limite
   - Quando Status muda

## Testes Recomendados

```bash
# 1. Verificar se o módulo está inicializado
curl http://localhost:3000/api/health

# 2. Criar novo atendimento
curl -X POST http://localhost:3000/api/atendimentos \
  -H "Content-Type: application/json" \
  -d '{
    "pacienteId": 1,
    "motivo": "Teste",
    "procedencia": "externo"
  }'

# 3. Monitorar logs de realtime
# Verificar console do backend para logs [REALTIME DEBUG]
```

---

**Status:** ✅ Implementação Completa
**Data:** 2026-04-06
**Módulos Sincronizados:** Atendimentos ↔ Triagem
