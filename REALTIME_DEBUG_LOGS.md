# 🔍 Debug Logs - Fluxo de Transferência de Pacientes

## Visão Geral

Foram adicionados **11 logs de debug temporários** com o prefixo `[REALTIME DEBUG]` para rastrear o fluxo completo de transferência de pacientes em tempo real.

## 📍 Localização dos Logs

### Backend - Arquivo: `src/controllers/triagemController.js`

#### LOG 1: Antes da Transferência
**Local:** Método `finalizarTriagem()` - antes de chamar `Atendimento.finalizarTriagem()`

```console
[REALTIME DEBUG] Iniciando transferência de paciente | patientId=123 | de=triagem | para=medico | timestamp=2026-04-02T10:30:45.123Z
```

**O que significa:** Marca o início do processo de transferência. Se você vir este log sem os posteriores, significa que houve erro antes do salvamento no banco.

---

#### LOG 2: Após Transferência ser Salva
**Local:** Método `finalizarTriagem()` - após chamar `Atendimento.finalizarTriagem()`

```console
[REALTIME DEBUG] Transferência salva no banco | patientId=123 | atendimentoId=456 | novoStatus=encaminhado para sala médica | timestamp=2026-04-02T10:30:45.234Z
```

**O que significa:** Confirma que a transferência foi salva no banco de dados. Se você vir LOG 1 mas não LOG 2, houve erro ao salvar.

---

#### LOG 3: Antes de Emitir Evento Realtime
**Local:** Método `finalizarTriagem()` - antes de chamar `PatientEventService.emitPatientTransferred()`

```console
[REALTIME DEBUG] Emitindo evento de transferência | patientId=123 | de=triagem | para=medico | classificacao=vermelho | timestamp=2026-04-02T10:30:45.345Z
```

**O que significa:** O evento está prestes a ser emitido. Verifica que os dados estão corretos e os módulos foram mapeados.

---

### Backend - Arquivo: `src/services/PatientEventService.js`

#### LOG 4: EventBus emit
**Local:** Método `emitPatientTransferred()` - antes de chamar `eventBus.emit()`

```console
[REALTIME DEBUG] EventBus.emit('patient:transferred') | patientId=123 | originModule=triagem | destinationModule=medico | timestamp=2026-04-02T10:30:45.456Z
```

**O que significa:** O evento está sendo publicado no EventBus. Todos os subscribers será.o notificados.

---

#### LOG 5: Após EventBus Emitir
**Local:** Método `emitPatientTransferred()` - após chamar `eventBus.emit()`

```console
[REALTIME DEBUG] Evento propagado para módulos realtime | patientId=123 | timestamp=2026-04-02T10:30:45.567Z
```

**O que significa:** EventBus propagou o evento para todos os módulos realtime inscritos. Os módulos devem receber e processar nos próximos logs.

---

### Backend - Arquivo: `src/realtime/RealtimeManager.js`

#### LOG 6: WebSocket Emit to Module
**Local:** Método `emitToModule()` - quando evento contém dados de paciente

```console
[REALTIME DEBUG] WebSocket.emitToModule() | evento=patient:arrived | módulo=medico | patientId=123 | timestamp=2026-04-02T10:30:45.678Z
```

**O que significa:** O método `emitToModule()` está enviando dados via WebSocket para o módulo conectado. Se você não vê este log, significa que o filtro `if (event.includes('patient') && data.patientId)` não foi atendido.

---

### Backend - Arquivo: `src/realtime/modules/TriagemRealtimeModule.js`

#### LOG 7: Triagem Module Recebe Evento
**Local:** Método `_onPatientTransferred()` - entrada

```console
[REALTIME DEBUG] TriagemRealtimeModule._onPatientTransferred | patientId=123 | de=triagem | para=medico | timestamp=2026-04-02T10:30:45.789Z
```

**O que significa:** O módulo de Triagem recebeu o evento do EventBus e está processando.

---

#### LOG 8: Emitindo para Módulo de Destino
**Local:** Método `_onPatientTransferred()` - antes de `emitToModule(destinationModule, 'patient:arrived')`

```console
[REALTIME DEBUG] Emitindo 'patient:arrived' para módulo medico | patientId=123 | timestamp=2026-04-02T10:30:45.890Z
```

**O que significa:** O módulo de Triagem está emitindo notificação para o módulo de destino (ex: médico) que um paciente chegou.

---

#### LOG 9: Emitindo para Módulo de Origem
**Local:** Método `_onPatientTransferred()` - antes de `emitToModule(originModule, 'patient:transferred_out')`

```console
[REALTIME DEBUG] Emitindo 'patient:transferred_out' para módulo triagem | patientId=123 | timestamp=2026-04-02T10:30:45.901Z
```

**O que significa:** O módulo de Triagem emite notificação para ele mesmo que o paciente saiu da fila.

---

### Backend - Arquivo: `src/realtime/modules/AmbulatoriRealtimeModule.js`

#### LOG 10: Ambulatório Module Recebe Evento
**Local:** Método `_onPatientTransferred()` - entrada

```console
[REALTIME DEBUG] AmbulatoriRealtimeModule._onPatientTransferred | patientId=123 | de=triagem | para=medico | timestamp=2026-04-02T10:30:45.012Z
```

**O que significa:** O módulo de Ambulatório recebeu o evento e está processando (se for para ambulatório/médico).

---

#### LOG 11: Emitindo para Módulo
**Local:** Método `_onPatientTransferred()` - antes de emitir

```console
[REALTIME DEBUG] Emitindo 'patient:arrived' para módulo medico | patientId=123 | timestamp=2026-04-02T10:30:45.123Z
```

**O que significa:** O módulo de Ambulatório está emitindo para o módulo de destino.

---

## 📊 Fluxo Completo com Logs

```
INÍCIO DA TRANSFERÊNCIA
    ↓
LOG 1: [Iniciando transferência]
    ↓
SALVAMENTO NO BANCO
    ↓
LOG 2: [Transferência salva no banco]
    ↓
LOG 3: [Emitindo evento de transferência]
    ↓
PatientEventService.emitPatientTransferred()
    ↓
LOG 4: [EventBus.emit()]
    ↓
LOG 5: [Evento propagado para módulos realtime]
    ↓
TriagemRealtimeModule recebe evento
    ↓
LOG 7: [TriagemRealtimeModule._onPatientTransferred()]
    ├─ LOG 8: [Emitindo para módulo de destino]
    └─ LOG 9: [Emitindo para módulo de origem]
    ↓
RealtimeManager.emitToModule() (2x)
    ↓
LOG 6: [WebSocket.emitToModule()] (2x - um para cada módulo)
    ↓
AmbulatoriRealtimeModule recebe evento
    ↓
LOG 10: [AmbulatoriRealtimeModule._onPatientTransferred()]
    ├─ LOG 11: [Emitindo para módulo]
    ↓
RealtimeManager.emitToModule()
    ↓
LOG 6: [WebSocket.emitToModule()]
    ↓
CLIENTES FRONTEND RECEBEM EVENTOS VIA WEBSOCKET
    ↓
Notificações e atualizações de UI
```

## 🧪 Como Testar

### 1. Iniciar Backend com Logs Visíveis

```bash
cd backend
npm start 2>&1 | grep "\[REALTIME DEBUG\]"
```

### 2. Simular Transferência de Paciente

```bash
curl -X POST http://localhost:3000/api/triagem/123/finalizar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status_destino": "encaminhado para ambulatório"}'
```

### 3. Observar Sequência de Logs

Deve aparecer na ordem:
```
[REALTIME DEBUG] Iniciando transferência...
[REALTIME DEBUG] Transferência salva no banco...
[REALTIME DEBUG] Emitindo evento de transferência...
[REALTIME DEBUG] EventBus.emit(...)
[REALTIME DEBUG] Evento propagado para módulos...
[REALTIME DEBUG] TriagemRealtimeModule._onPatientTransferred...
[REALTIME DEBUG] Emitindo 'patient:arrived'...
[REALTIME DEBUG] Emitindo 'patient:transferred_out'...
[REALTIME DEBUG] WebSocket.emitToModule() (x2)...
[REALTIME DEBUG] AmbulatoriRealtimeModule._onPatientTransferred...
[REALTIME DEBUG] Emitindo 'patient:arrived'...
[REALTIME DEBUG] WebSocket.emitToModule()...
```

## 🔧 Removendo Logs de Debug

### Quando remover

Após validação e testes em produção, remova com:

```bash
# Remover todos os logs [REALTIME DEBUG]
cd backend
grep -r "\[REALTIME DEBUG\]" src/
# Remover manualmente ou com script
```

### Script para Remover (opcional)

```bash
#!/bin/bash
# remove-debug-logs.sh

# Controllers
sed -i "/\[REALTIME DEBUG\]/d" backend/src/controllers/triagemController.js

# Services
sed -i "/\[REALTIME DEBUG\]/d" backend/src/services/PatientEventService.js

# Realtime
sed -i "/\[REALTIME DEBUG\]/d" backend/src/realtime/RealtimeManager.js
sed -i "/\[REALTIME DEBUG\]/d" backend/src/realtime/modules/TriagemRealtimeModule.js
sed -i "/\[REALTIME DEBUG\]/d" backend/src/realtime/modules/AmbulatoriRealtimeModule.js

echo "✅ Logs de debug removidos"
```

## 📋 Checklist de Validação

- [ ] LOG 1 aparece quando inicia transferência
- [ ] LOG 2 aparece após salvar no banco
- [ ] LOG 3 aparece antes de emitir eventos
- [ ] LOG 4 e 5 aparecem consecutivamente
- [ ] LOG 7 aparece (TriagemRealtimeModule recebeu)
- [ ] LOG 8 e 9 aparecem (emissões para origem/destino)
- [ ] LOG 6 aparece pelo menos uma vez (WebSocket)
- [ ] LOG 10 aparece (AmbulatoriRealtimeModule recebeu)
- [ ] LOG 11 aparece (Ambulatório emitindo)
- [ ] Frontend mostra notificação após LOG 6/11
- [ ] Nenhum LOG sem o `[REALTIME DEBUG]` foi adicionado
- [ ] Lógica de negócio não foi alterada

## 🎯 Interpretando Problemas

### Problema: LOG 1 aparece mas não LOG 2
**Causa:** Erro ao salvar no banco  
**Solução:** Verificar banco de dados, permissões, constraints

### Problema: LOG 2 aparece mas não LOG 3
**Causa:** Erro ao mapear módulo de destino  
**Solução:** Verificar mapa `statusToModuleMap`

### Problema: LOG 4 aparece mas não LOG 5
**Causa:** Erro no EventBus  
**Solução:** Verificar se subscribers estão registrados

### Problema: LOG 7 aparece mas não LOG 8/9
**Causa:** Erro ao emitir para módulos  
**Solução:** Verificar `realtimeManager.emitToModule()`

### Problema: LOG 6 não aparece
**Causa:** Filtro `if (event.includes('patient'))` não passou  
**Solução:** Verificar nome do evento e dados

### Problema: Sem notificação no Frontend
**Causa:** Frontend não recebeu evento WebSocket  
**Solução:** Verificar conexão WebSocket, módulos inscritos

## 📈 Análise de Performance

Os logs também ajudam a medir latência:

```javascript
// Tempo entre LOG 1 e LOG 2
t1 = inicio transferencia (LOG 1)
t2 = fim salvamento (LOG 2)
delta = t2 - t1  // Tempo de salvamento no banco

// Tempo total do fluxo
tiempo = LOG 11 - LOG 1  // Tempo total em ms
```

Tipicamente deve ser < 200ms para um fluxo completo.

## 🧹 Limpeza

Os logs foram projetados para serem facilmente removíveis:
- Todas as linhas têm `[REALTIME DEBUG]` como identificador
- Não modificam a lógica do código
- Podem ser deletadas com um simples `grep -v "[REALTIME DEBUG]"`

---

**Importante:** Estes logs são **temporários**. Remova após validação em produção para não impactar logs do servidor.
