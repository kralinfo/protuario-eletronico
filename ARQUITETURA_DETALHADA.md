# 🏗️ Arquitetura da Sincronização Assíncrona

## 📐 Diagrama de Componentes

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         SINCRONIZAÇÃO ATENDIMENTOS ↔ TRIAGEM               │
└────────────────────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Angular)                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────┐      ┌─────────────────────────────┐       │
│  │  Atendimentos Component     │      │   Triagem Component         │       │
│  ├─────────────────────────────┤      ├─────────────────────────────┤       │
│  │ • Fila de Atendimentos      │      │ • Fila de Triagem           │       │
│  │ • Submit novo paciente      │      │ • Lista de triagem          │       │
│  │ • Atualizar status          │      │ • Status em tempo real      │       │
│  │                             │      │                             │       │
│  │ Socket Events:              │      │ Socket Events:              │       │
│  │ • patient:transferred_out   │      │ • patient:arrived           │       │
│  │ • fila:updated              │      │ • triagem:started           │       │
│  │ • patient:new_arrival       │      │ • triagem:finished          │       │
│  └──────────────┬──────────────┘      └──────────────┬──────────────┘       │
│                 │                                    │                      │
│                 └────────────────────┬───────────────┘                      │
│                                      │                                      │
│                          ┌───────────▼────────────┐                         │
│                          │  Socket.io Client      │                         │
│                          │  • Conectado a WS      │                         │
│                          │  • Autenticado (token) │                         │
│                          │  • Em módulos          │                         │
│                          │  • Listeners ativados  │                         │
│                          └───────────┬────────────┘                         │
│                                      │                                      │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ WebSocket
                                       │ Conexão Persistente
                                       │ TCP/IP com fallback HTTP
                                       │
                 HTTP/HTTPS            │
        ┌────────────────────────┐     │
        │  REST API Calls        │     │
        │  POST /api/atendimentos│     │
        │  PUT /api/atendimentos │     │
        │  GET /api/triagem      │     │
        │                        │     │
        └─────────┬──────────────┘     │
                  │                    │
┌─────────────────▼────────────────────▼──────────────────────────────────────┐
│                              BACKEND (Node.js/Express)                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│ ┌──────────────────────────────────────────────────────────────────────────┐ │
│ │           AtendimentosController & TriagemController                    │ │
│ ├──────────────────────────────────────────────────────────────────────────┤ │
│ │                                                                          │ │
│ │  POST /api/atendimentos                                                │ │
│ │  ├─ Validação                                                          │ │
│ │  ├─ Criar no banco                                                    │ │
│ │  └─ 🔌 PatientEventService.emitPatientTransferred()                   │ │
│ │                            │                                           │ │
│ │  PUT /api/atendimentos/:id/status                                     │ │
│ │  ├─ Validação                                                         │ │
│ │  ├─ Atualizar status                                                 │ │
│ │  └─ 🔌 PatientEventService.emitPatientTransferred()                  │ │
│ │                            │                                          │ │
│ │                            └─→ if (status === 'encaminhado para triagem')
│ │                                                                        │ │
│ └────────────────────────┬─────────────────────────────────────────────┘ │
│                          │                                              │ │
│                          ▼                                              │ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │            PatientEventService                                      │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │                                                                      │ │
│ │  emitPatientTransferred(data)                                      │ │
│ │  ├─ originModule: 'atendimentos'                                   │ │
│ │  ├─ destinationModule: 'triagem'                                   │ │
│ │  ├─ patientId, patientName, classificationRisk                    │ │
│ │  └─ 📢 EventBus.emit('patient:transferred', data)                │ │
│ │                            │                                      │ │
│ └────────────────────────────┼──────────────────────────────────────┘ │
│                              │                                        │ │
│                              ▼                                        │ │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │  EventBus (Pub/Sub - Event Emitter)                                │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │                                                                      │ │
│ │  emit('patient:transferred', {                                     │ │
│ │    patientId: 123,                                                 │ │
│ │    patientName: 'João',                                           │ │
│ │    originModule: 'atendimentos',                                  │ │
│ │    destinationModule: 'triagem',                                  │ │
│ │    status: 'encaminhado para triagem',                           │ │
│ │    classificationRisk: null                                       │ │
│ │  })                                                               │ │
│ │                                                                      │ │
│ │  ↓ Dispatch para Subscribers (handlers)                           │ │
│ │                                                                      │ │
│ │  ┌─────────────────────┐    ┌─────────────────────┐              │ │
│ │  │ AtendimentosRealtime│    │  TriagemRealtime    │              │ │
│ │  │ Module              │    │  Module             │              │ │
│ │  └──────────┬──────────┘    └──────────┬──────────┘              │ │
│ │             │                         │                         │ │
│ └─────────────┼─────────────────────────┼───────────────────────┘ │
│               │                         │                        │ │
│               ▼                         ▼                        │ │
│ ┌──────────────────────────┐ ┌──────────────────────────┐       │ │
│ │ AtendimentosRealtime     │ │ TriagemRealtime          │       │ │
│ │ Module                   │ │ Module                   │       │ │
│ ├──────────────────────────┤ ├──────────────────────────┤       │ │
│ │                          │ │                          │       │ │
│ │ recebe evento:           │ │ recebe evento:          │       │ │
│ │ 'patient:transferred'    │ │ 'patient:transferred'   │       │ │
│ │                          │ │                         │       │ │
│ │ Se origem é 'atendimentos'│ │ Se destino é 'triagem'│       │ │
│ │ e destino é 'triagem':  │ │                         │       │ │
│ │                         │ │ Emite para seus         │       │ │
│ │ Emite para seus Clientes│ │ clientes:               │       │ │
│ │ (Socket.io):            │ │                         │       │ │
│ │ realtimeManager.        │ │ realtimeManager.        │       │ │
│ │ emitToModule(           │ │ emitToModule(           │       │ │
│ │  'atendimentos',         │ │  'triagem',             │       │ │
│ │  'patient:transferred_   │ │  'patient:arrived',     │       │ │
│ │   out',                  │ │  {...}                  │       │ │
│ │  {...}                   │ │ )                       │       │ │
│ │ )                        │ │                         │       │ │
│ │                          │ │                         │       │ │
│ │ realtimeManager.         │ │                         │       │ │
│ │ emitToModule(            │ │                         │       │ │
│ │  'triagem',              │ │                         │       │ │
│ │  'patient:arrived'       │ │                         │       │ │
│ │  {...}                   │ │                         │       │ │
│ │ )                        │ │                         │       │ │
│ │                          │ │                         │       │ │
│ └──────────┬───────────────┘ └──────────┬──────────────┘       │ │
│            │                            │                      │ │
└────────────┼────────────────────────────┼──────────────────────┘ │
             │                            │                       
             ▼                            ▼                       
    ┌──────────────────┐        ┌──────────────────┐            
    │ RealtimeManager  │        │ RealtimeManager  │            
    │ (Socket.io)      │        │ (Socket.io)      │            
    ├──────────────────┤        ├──────────────────┤            
    │                  │        │                  │            
    │ io.to(           │        │ io.to(           │            
    │ 'module:         │        │ 'module:         │            
    │ atendimentos'    │        │ triagem'         │            
    │ ).emit(...)      │        │ ).emit(...)      │            
    │                  │        │                  │            
    └────────┬─────────┘        └────────┬─────────┘            
             │                           │                       
             │      WebSocket Channels   │                       
             │                           │                       
             └─────────────┬─────────────┘                       
                           │                                    
                ┌──────────▼──────────┐                         
                │ Socket.io Server    │                         
                │ (port 3000)         │                         
                │                     │                         
                │ Rooms:              │                         
                │ • module:atendimentos│                         
                │ • module:triagem     │                         
                │ • module:medico      │                         
                │                     │                         
                └─────────┬───────────┘                         
                          │                                    
                          │ Protocolo: WebSocket               
                          │ + HTTP Long Polling Fallback       
                          │                                    
└──────────────────────────────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────┐
│                      BANCO DE DADOS (PostgreSQL)                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tabelas:                                                       │
│  • pacientes (id, nome, ...)                                   │
│  • atendimentos (id, paciente_id, status, ...)                │
│  • usuarios (id, nome, role, ...)                             │
│                                                                │
│  INSERT → Atendimento Criado                                  │
│  UPDATE → Status Mudado                                       │
│  SELECT → Listar Filas                                        │
│                                                                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo Detalhado de um Novo Atendimento

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASSO 1: Frontend Atendimentos - Novo Paciente                             │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│   Usuário preenche:                                                         │
│   • Paciente: João Silva (ID: 123)                                         │
│   • Motivo: Dor de cabeça                                                  │
│   • Procedência: Externo                                                    │
│   • Clica: "Registrar Atendimento"                                        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASSO 2: HTTP POST → Backend                                              │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│   POST /api/atendimentos HTTP/1.1                                          │
│   Content-Type: application/json                                           │
│   Authorization: Bearer token123                                           │
│                                                                              │
│   {                                                                          │
│     "pacienteId": 123,                                                     │
│     "motivo": "Dor de cabeça",                                            │
│     "procedencia": "externo",                                             │
│     "observacoes": "",                                                     │
│     "acompanhante": ""                                                     │
│   }                                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASSO 3: Backend - atendimentosController.registrar()                      │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│   1. Validar dados                                                         │
│   2. Buscar paciente: SELECT * FROM pacientes WHERE id=123                │
│   3. Nome encontrado: "João Silva"                                        │
│   4. Criar atendimento: INSERT INTO atendimentos (...)                   │
│      → ID Do atendimento criado: 456                                     │
│   5. Status do atendimento: "encaminhado para triagem"                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASSO 4: Disparar Evento de Transferência                                 │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│   PatientEventService.emitPatientTransferred({                             │
│     patientId: 123,                                                        │
│     patientName: "João Silva",                                            │
│     originModule: "atendimentos",              ← ORIGEM                    │
│     destinationModule: "triagem",              ← DESTINO                   │
│     status: "encaminhado para triagem",                                   │
│     classificationRisk: null,                  ← Ainda não classificado   │
│     userId: 999                                ← Quem criou              │
│   });                                                                       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASSO 5: EventBus - Publicar Evento                                       │
│─────────────────────────────────────────────────────────────────────────────│
│                                                                              │
│   eventBus.emit('patient:transferred', {                                  │
│     patientId: 123,                                                        │
│     patientName: "João Silva",                                            │
│     originModule: "atendimentos",                                         │
│     destinationModule: "triagem",                                         │
│     status: "encaminhado para triagem",                                   │
│     classificationRisk: null,                                             │
│     userId: 999,                                                          │
│     timestamp: "2024-04-06T10:30:00.000Z"                                │
│   });                                                                       │
│                                                                              │
│   ✅ Evento publicado - Subscribers serão notificados                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                    ↙                              ↘
    ┌─────────────────────────────────────────────────────────────────┐
    │       EventBus chama handlers registrados em ordem              │
    └─────────────────────────────────────────────────────────────────┘
           ↓                                           ↓
┌──────────────────────────────────────────┐ ┌────────────────────────────────────┐
│ PASSO 6A: AtendimentosRealtimeModule    │ │ PASSO 6B: TriagemRealtimeModule   │
│─────────────────────────────────────────│ │────────────────────────────────────│
│                                          │ │                                    │
│ _onPatientTransferred() é chamado:      │ │ _onPatientTransferred() é chamado:│
│                                          │ │                                    │
│ if (destinationModule === 'triagem' &&  │ │ if (destinationModule === 'triagem'│
│     originModule === 'atendimentos') {  │ │     && originModule ===           │
│                                          │ │     'atendimentos') {            │
│   // Emitir para clientes atendimentos │ │   // Emitir para clientes triagem │
│   realtimeManager.emitToModule(        │ │   realtimeManager.emitToModule(   │
│     'atendimentos',                     │ │     'triagem',                     │
│     'patient:transferred_out',          │ │     'patient:arrived',             │
│     {                                    │ │     {                              │
│       patientId: 123,                    │ │       patientId: 123,              │
│       patientName: "João Silva",        │ │       patientName: "João Silva",   │
│       destinationModule: 'triagem'      │ │       originModule: 'atendimentos',│
│     }                                    │ │       status: "encaminhado para   │
│   );                                     │ │                      triagem",    │
│                                          │ │       classificationRisk: null,   │
│   realtimeManager.emitToModule(         │ │       transferredBy: 999          │
│     'triagem',                          │ │     }                              │
│     'patient:arrived',                  │ │   );                               │
│     { ... }                             │ │                                    │
│   );                                     │ │ }                                  │
│                                          │ │                                    │
│ }                                        │ │                                    │
│                                          │ │                                    │
└──────────────────────────────────────────┘ └────────────────────────────────────┘
           ↓                                           ↓
        ┌─────────────────────────────────────────────────────────────────┐
        │        RealtimeManager - Socket.io Broadcasting                 │
        ├─────────────────────────────────────────────────────────────────┤
        │                                                                  │
        │ io.to('module:atendimentos').emit('patient:transferred_out', {})│
        │                                                                  │
        │ io.to('module:triagem').emit('patient:arrived', {})            │
        │                                                                  │
        │ ✅ Mensagens enviadas via WebSocket para todos os clientes nos │
        │    respectivos rooms                                            │
        │                                                                  │
        └─────────────────────────────────────────────────────────────────┘
           ↙                                           ↘
        Network (WebSocket)                        Network (WebSocket)
           ↙                                           ↘
┌──────────────────────────────────────────┐ ┌────────────────────────────────────┐
│ PASSO 7A: Frontend Atendimentos         │ │ PASSO 7B: Frontend Triagem         │
│─────────────────────────────────────────│ │────────────────────────────────────│
│                                          │ │                                    │
│ socket.on('patient:transferred_out',    │ │ socket.on('patient:arrived',       │
│   (data) => {                           │ │   (data) => {                      │
│     // Remover paciente da fila         │ │     // Adicionar paciente à fila   │
│     this.filaAtendimentos =             │ │     this.filaTriagem.unshift({     │
│       this.filaAtendimentos.filter(     │ │       id: data.patientId,          │
│         p => p.id !== data.patientId    │ │       nome: data.patientName,      │
│       );                                 │ │       origem: data.originModule,   │
│     // UI atualiza automaticamente      │ │       entradaEm: new Date()        │
│   });                                    │ │     });                             │
│                                          │ │     // Playar som (opcional)       │
│                                          │ │     this.playNotificationSound();  │
│                                          │ │   });                              │
│                                          │ │                                    │
│ ✅ Paciente desaparece da lista        │ │ ✅ Paciente aparece na lista       │
│    (Em tempo real!)                      │ │    (Em tempo real!)                │
│                                          │ │                                    │
└──────────────────────────────────────────┘ └────────────────────────────────────┘
           ↓                                          ↓
┌──────────────────────────────────────────┐ ┌────────────────────────────────────┐
│ Interface reflete mudança                │ │ Interface reflete mudança          │
│ em tempo real!                           │ │ em tempo real!                     │
└──────────────────────────────────────────┘ └────────────────────────────────────┘
```

---

## 🎯 Estados do Paciente no Sistema

```
                    ATENDIMENTOS                TRIAGEM
                       │                          │
                       ▼                          ▼
                   ┌─────────┐              ┌──────────────┐
                   │ NOVO    │   transfer   │ AGUARDANDO   │
                   │ REGISTRO│  ◄────────►  │ TRIAGEM      │
                   └─────────┘              └──────────────┘
                                               │  │  │
                                       ┌───────┘  │  └──────┐
                                       ▼         ▼         ▼
                                    TRIAGEM  TRIAGEM  TRIAGEM
                                    (Urgente) (Normal) (Baixa)
                                       │         │         │
                                       └─────────┼───────┬──┘
                                               │        │
                                       ┌───────┘        │
                                       ▼                │
                                   CLASSIFICADO       │
                                       │              │
                  ┌────────────────┬───┘              │
                  ▼                ▼                  ▼
            ┌──────────┐    ┌──────────┐      ┌──────────┐
            │ MEDICO   │    │ EXAMES   │      │ ABANDONO │
            │ CONSULTA │    │ SOLICITADOS     │          │
            └──────────┘    └──────────┘      └──────────┘
                  │                │
                  │                ▼
                  │            ┌──────────┐
                  │            │ CONCLUIDO│
                  │            └──────────┘
                  │                │
                  └────────┬───────┘
                           ▼
                     ┌──────────────┐
                     │ ARQUIVO      │
                     │ PRONTUARIO   │
                     └──────────────┘
```

---

## 🔗 Relacionamentos entre Módulos

```
┌──────────────┐
│ ATENDIMENTOS │
│ (Recepção)   │
└──────┬───────┘
       │
       │ Evento: patient:transferred
       │ (originModule: 'atendimentos')
       │ (destinationModule: 'triagem')
       │
       ▼
┌──────────────────┐
│ TRIAGEM          │
│ (Classificação)  │
└──────┬───────────┘
       │
       │ Evento: patient:transferred
       │ (originModule: 'triagem')
       │ (destinationModule: 'medico' | 'ambulatorio' | 'exames')
       │
       ├────────────────────────────┬────────────────────────┐
       │                            │                        │
       ▼                            ▼                        ▼
┌──────────────┐         ┌──────────────────┐      ┌────────────────┐
│ MEDICO       │         │ AMBULATORIO      │      │ EXAMES         │
│ (Consulta)   │         │ (Atendimento)    │      │ (Laboratorio)  │
└──────────────┘         └──────────────────┘      └────────────────┘
```

---

## 📊 Matriz de Eventos

| Evento | Origem | Destino | Dados | Observer |
|--------|--------|---------|-------|----------|
| `patient:transferred` | atendimentos | triagem | patientId, name, risk | ✅ AtendimentosRM |
| `patient:transferred` | triagem | medico | patientId, name, risk | ✅ TriagemRM |
| `patient:triagem_started` | triagem | - | patientId, name | ✅ TriagemRM |
| `patient:triagem_finished` | triagem | - | patientId, name, risk | ✅ TriagemRM |
| `patient:atendimento_started` | ambulatorio | - | patientId, name, module | ✅ AmbulatoriRM |
| `patient:atendimento_finished` | ambulatorio | - | patientId, name, module | ✅ AmbulatoriRM |

---

**Última Atualização:** 2026-04-06  
**Arquitetura:** Event-Driven com Pub/Sub + WebSocket  
**Status:** ✅ Implementação Completa
