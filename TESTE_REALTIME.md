# 🧪 Guia de Testes - Camada Realtime

## 🎯 Objetivo
Validar que a camada realtime está funcionando corretamente com WebSocket, notificações e sincronização de dados em tempo real.

---

## ✅ Pré-Requisitos

- ✅ Backend rodando: `docker-compose up` (porta 3001)
- ✅ Frontend rodando: `npm start` (porta 4200)
- ✅ PostgreSQL rodando: Docker (porta 5432)

### Verificar Status

```bash
# Backend
curl http://localhost:3001/api/health

# Frontend
curl http://localhost:4200
```

---

## 📝 Teste 1: Verificar Conexão WebSocket

### 1.1 Abrir Browser DevTools

1. Abra http://localhost:4200
2. Pressione **F12** (abrir DevTools)
3. Vá para **Console**

### 1.2 Procurar por Mensagens de Conexão

Procure por:
```
✅ Conectado ao servidor WebSocket: ...
Realtime service connected to module: triagem
```

### 1.3 Verificar Socket ID

No console, digite:
```javascript
// Verificar conexão
socketId = document.querySelector('app-realtime-status')?.textContent
console.log('Socket ID:', socketId)
```

**Esperado**: Deve mostrar um ID alpanumérico como `eJhXWE-zGHrJAAAA`

---

## 🔄 Teste 2: Transferência de Paciente em Tempo Real

### 2.1 Preparar Dois Browsers

**Browser 1 (Triagem):**
- Login como usuário de triagem
- Navegue para a fila de triagem
- Observe a lista de pacientes

**Browser 2 (Médico):**
- Login como usuário médico/ambulatório
- Navegue para fila de atendimentos

### 2.2 Transferir Paciente (Browser 1 - Triagem)

1. Clique em um paciente da fila
2. Procure por botão "Finalizar"/"Encaminhar"
3. Selecione "Encaminhar para Médico"
4. Clique em confirmar

### 2.3 Verificar Efeitos (Browser 2 - Médico)

**Browser 2 deve mostrar:**
- ✅ Notificação Toast no topo ("Paciente João chegou em Médico")
- ✅ Badge de notificação no header
- ✅ Fila atualizada com novo paciente (sem recarregar página)

---

## 📊 Teste 3: Validar Debug Logs (Backend)

### 3.1 Localizar Logs no Backend

No terminal onde o backend está rodando, procure por:

```
[REALTIME DEBUG] Iniciando transferência de paciente | patientId=...
[REALTIME DEBUG] Transferência salva no banco | patientId=...
[REALTIME DEBUG] Emitindo evento de transferência | patientId=...
[REALTIME DEBUG] EventBus.emit('patient:transferred')
[REALTIME DEBUG] Evento propagado para módulos realtime
[REALTIME DEBUG] WebSocket.emitToModule() | evento=patient:arrived
[REALTIME DEBUG] TriagemRealtimeModule._onPatientTransferred
[REALTIME DEBUG] Emitindo 'patient:arrived' para módulo medico
[REALTIME DEBUG] Emitindo 'patient:transferred_out' para módulo triagem
[REALTIME DEBUG] AmbulatoriRealtimeModule._onPatientTransferred
[REALTIME DEBUG] Emitindo 'patient:arrived' para módulo medico
```

### 3.2 Sequência Esperada

Os logs devem aparecer na seguinte ordem:

```
1. Iniciando transferência
   ↓
2. Transferência salva no banco
   ↓
3. Emitindo evento de transferência
   ↓
4. EventBus.emit()
   ↓
5. Evento propagado para módulos
   ↓
6. TriagemRealtimeModule recebe
   ↓
7. Emitindo para médico (destination)
   ↓
8. Emitindo para triagem (origin)
   ↓
9. WebSocket.emitToModule (múltiplas vezes)
   ↓
10. AmbulatoriRealtimeModule recebe
   ↓
11. Emitindo para médico
```

### 3.3 Filtrar Logs (opcional)

Se muitos logs aparecerem, use:

```bash
# Windows PowerShell
docker-compose logs -f backend | Select-String "REALTIME DEBUG"

# Linux/Mac Bash
docker-compose logs -f backend | grep "REALTIME DEBUG"
```

---

## 🔍 Teste 4: Verificar Network (Browser DevTools)

### 4.1 Abrir Network Tab

1. DevTools → **Network**
2. Filtro: `WebSocket`
3. Procure por conexão ativa

### 4.2 Validar Mensagens WebSocket

1. Clique na conexão WebSocket
2. Vá para aba **Messages**
3. Você deve ver:

```json
{
  "event": "patient:arrived",
  "data": {
    "patientId": 123,
    "patientName": "João Silva",
    "classification": "vermelho",
    "timestamp": "2026-04-02T17:35:45.123Z"
  }
}
```

---

## 🎨 Teste 5: Validar Componentes UI

### 5.1 Status Badge (Header)

**Esperado:**
- Texto: "Conectado"
- Indicador verde pulsante
- Tooltip: Socket ID e timestamp

**Como testar:**
1. Hover sobre o indicador
2. Deve mostrar tooltip com conexão info

### 5.2 Notificação Toast

**Esperado ao receber paciente:**
- Toast aparece no topo-direito
- Desaparece após 5 segundos (automático)
- Mensagem clara: "Paciente [Nome] chegou em [Módulo]"

**Como testar:**
1. Transfira paciente
2. Observe toast aparecendo
3. Verifique timestamp

### 5.3 Badge de Notificação

**Esperado:**
- Número com contagem de pacientes
- Cor: Verde (baixo), Amarelo (médio), Vermelho (alto)

---

## ⚠️ Teste 6: Simulação de Desconexão

### 6.1 Desconectar WiFi/Network

1. Desligue internet ou desconecte WiFi
2. Observe status mudar para "Desconectado"
3. Reunir conexão
4. Status deve voltar a "Conectado" automaticamente

### 6.2 Verificar Reconexão

No console, procure por:
```
❌ Desconectado do servidor WebSocket
✅ Conectado ao servidor WebSocket (reconectado)
```

**Esperado:** Reconexão automática em até 5 segundos

---

## 🚨 Teste 7: Problemas Comuns e Soluções

### Problema: "WebSocket não conecta"

**Checklist:**
- [ ] Backend está rodando? (`docker-compose ps`)
- [ ] Port 3001 está open? (`telnet localhost 3001`)
- [ ] CORS configurado? (Ver app.js)
- [ ] Você está logado? (Token válido?)
- [ ] Token no localStorage? (DevTools → Application → LocalStorage)

**Solução:**
```bash
# Reiniciar backend
cd backend
docker-compose down
docker-compose up --build
```

---

### Problema: "Notificação não aparece"

**Checklist:**
- [ ] Frontend não mostra erros no console? (F12 → Console)
- [ ] `NotificationContainerComponent` está no app.component?
- [ ] RealtimeService foi injetado no componente de fila?
- [ ] Logs de debug aparecem no backend?

**Solução:**
1. Verify import em app.component.ts
2. Verify subscription em fila-triagem.component.ts
3. Check browser console para erros

---

### Problema: "Logs [REALTIME DEBUG] não aparecem"

**Checklist:**
- [ ] Backend foi reiniciado após mudanças?
- [ ] Transferência foi executada?
- [ ] Você está vendo logs do container correto?

**Solução:**
```bash
# Ver logs ao vivo
docker-compose logs -f backend

# Buscar por REALTIME DEBUG
docker-compose logs backend | grep "REALTIME DEBUG"
```

---

## ✨ Teste 8: Teste Completo End-to-End

### Cenário: Triagem → Médico → Consultório

**Preparação:**
- 3 browsers abertos (Triagem, Médico, Consultório)
- 3 usuários diferentes logados
- Fila de triagem com pelo menos 1 paciente

**Execução:**

```
1. [Triagem] Seleciona paciente
2. [Triagem] Clica "Finalizar Triagem"
3. [Triagem] Seleciona "Encaminhar para Médico"
4. [Triagem] Submete formulário
   ↓
5. [Médico] Recebe notificação (toast)
6. [Médico] Vê paciente na fila (em tempo real)
7. [Médico] Clica em paciente
8. [Médico] Atende paciente
9. [Médico] Finaliza atendimento
   ↓
10. [Backend] Mostra 11 debug logs
11. [Frontend] Notificações funcionam
12. [Filas] Sincronizam sem refresh
```

**Validações:**
- ✅ Cada step ocorre sem página recarregar
- ✅ Logs aparecem no backend com timestamps
- ✅ Notificações aparecem/desaparecem corretamente
- ✅ Filas atualizam em tempo real

---

## 📈 Teste 9: Performance e Carga

### Teste de Múltiplas Transferências

1. Automatize com script:
```javascript
// Execute no console de triagem
for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    // Trigger transfer
    document.querySelector('[data-test="transfer-btn"]').click();
  }, i * 2000); // A cada 2 segundos
}
```

2. Observe:
   - [ ] Backend aguenta múltiplas emissões
   - [ ] Frontend não fica travado
   - [ ] Notificações não duplicam
   - [ ] Sem memory leak

### Monitorar

```bash
# Terminal separado
docker stats backend-backend-1

# Observe:
# - CPU < 50%
# - MEM < 200MB
# - Network stable
```

---

## 🔐 Teste 10: Segurança

### Teste de Token JWT

1. Open DevTools → Application → LocalStorage
2. Copie o token
3. No console, execute:
```javascript
// Verificar token
const token = localStorage.getItem('token');
console.log('Token:', token.substring(0, 20) + '...');

// Decodificar (sem verificar assinatura)
const parts = token.split('.');
const payload = JSON.parse(atob(parts[1]));
console.log('Payload:', payload);
```

4. Verifique:
   - [ ] Token contém userId e role
   - [ ] Token não expirado
   - [ ] Backend valida token

### Teste de Autorização

1. Faça login como diferentes roles
2. Verifique que cada um vê apenas sua fila
3. Tente chamar endpoint sem token:
```bash
curl -X GET http://localhost:3001/api/triagem \
  -H "Authorization: Bearer INVALID_TOKEN"
```

**Esperado:** 401 Unauthorized

---

## 📊 Teste 11: Monitorar com DevTools

### Chrome DevTools

1. **Network Tab:**
   - WebSocket connection active
   - No errors in red
   - Update frequency normal (< 1 req/sec)

2. **Console Tab:**
   - No errors (✅ only info/debug)
   - Logs estruturados
   - Socket events visible

3. **Performance Tab:**
   - Runtime < 100ms per transfer
   - No long tasks
   - Memory stable

4. **Application Tab:**
   - Token in LocalStorage
   - SessionStorage clean
   - Cookies for session

---

## ✅ Checklist Final

- [ ] Backend rodando com Docker
- [ ] Frontend rodando em 4200
- [ ] WebSocket conecta (console mostra conexão)
- [ ] 11 debug logs aparecem ao transferir paciente
- [ ] Status badge mostra "Conectado"
- [ ] Notificação toast aparece
- [ ] Fila atualiza sem refresh
- [ ] Reconexão automática funciona
- [ ] Múltiplas transferências sem erro
- [ ] Performance aceitável (< 100ms)
- [ ] Nenhum erro no console
- [ ] Token válido e autorização funciona

---

## 🎓 Próximos Passos

Se tudo passou:

1. **Remover Debug Logs** (opcional agora)
   ```bash
   grep -r "\[REALTIME DEBUG\]" backend/src/ | wc -l
   ```

2. **Deploy para Produção** (depois)
   ```bash
   cd backend && npm run build
   cd frontend && ng build --prod
   ```

3. **Documentar Comportamento**
   - Screenshots de notificações
   - Performance metrics
   - User acceptance testing

---

**Status:** ✅ Pronto para testar!
