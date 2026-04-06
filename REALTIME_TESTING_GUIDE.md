# Guia de Testes - Camada de Comunicação em Tempo Real

## 1. Verificação de Setup

### Backend

#### 1.1 Verificar se Socket.io está instalado

```bash
cd backend
npm list socket.io
# Deve retornar: socket.io@^4.x.x
```

#### 1.2 Verificar imports no app.js

```bash
grep -n "import realtimeManager" backend/src/app.js
grep -n "TriagemRealtimeModule.initialize" backend/src/app.js
```

### Frontend

#### 1.3 Verificar se Socket.io-client está instalado

```bash
cd frontend
npm list socket.io-client
# Deve retornar: socket.io-client@^4.x.x
```

#### 1.4 Verificar se componentes foram criados

```bash
ls -la frontend/src/app/services/realtime.service.ts
ls -la frontend/src/app/services/notification.service.ts
ls -la frontend/src/app/shared/components/notification-container.component.ts
ls -la frontend/src/app/shared/components/realtime-status.component.ts
```

## 2. Teste de Inicialização

### 2.1 Iniciar Backend

```bash
cd backend
npm start
```

Deve aparecer na saída:
```
✅ RealtimeManager inicializado com sucesso
✅ Módulo Triagem Realtime inicializado
✅ Módulo Ambulatório Realtime inicializado
🚀 WebSocket: ws://localhost:3000
```

### 2.2 Iniciar Frontend

```bash
cd frontend
npm start
```

Em outro terminal, abra: http://localhost:4200

#### Verificar no console do navegador:

```javascript
// Deve haver referências a conexão
✅ Conectado ao servidor WebSocket: [socket-id]
```

### 2.3 Verificar status de conexão

Um componente no canto superior direito deve mostrar:
- Indicador verde com "Conectado"
- ID do socket truncado
- Módulo conectado

## 3. Teste de Eventos - Paciente Transferido

### Setup

1. Certifique-se de que backend + frontend estão rodando
2. Abra DevTools do navegador (F12)
3. Vá para aba Console
4. Abra duas abas do navegador, uma em Triagem, outra em Ambulatório

### 3.1 Teste manual via cURL

```bash
# Terminal 1: Backend rodando

# Terminal 2: Simular uma transferência de paciente
curl -X POST http://localhost:3000/api/triagem/1/finalizar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "status_destino": "encaminhado para ambulatório"
  }'
```

### 3.2 Verificar logs no backend

```
📤 Paciente transferido: João Silva de Triagem para Ambulatório
📡 Evento 'patient:transferred' enviado para módulo 'triagem'
📡 Evento 'patient:arrived' enviado para módulo 'ambulatorio'
✅ Notificações enviadas para módulos: triagem, ambulatorio
```

### 3.3 Verificar frontend

Na aba do Ambulatório:
- Deve aparecer notificação toast: "Novo Paciente - João Silva chegou no ambulatorio"
- Status connection deve mostrar "Conectado" (verde)
- Badge "ambulatorio" com número de pacientes deve aparecer

Na aba de Triagem:
- Paciente deve desaparecer da fila
- Notificação: "Paciente transferido: João Silva"

## 4. Teste de Notificações

### 4.1 Testar NotificationService programaticamente

No console do navegador (Developer Tools):

```javascript
// Injetar NotificationService
import { NotificationService } from './src/app/services/notification.service';

// Criar instância (em componente real seria injetado)
const notificationService = new NotificationService();

// Testes
notificationService.success('Sucesso', 'Operação realizada com sucesso');
notificationService.warning('Aviso', 'Atenção: existe um problema');
notificationService.error('Erro', 'Não foi possível completar a operação');
notificationService.info('Info', 'Esta é uma notificação informativa');

// Notificação especializada
notificationService.patientArrived('Maria Silva', 'Ambulatório', 'Vermelho');
```

### 4.2 Testar badges

```javascript
notificationService.addBadge('triagem', 5, 'high');
notificationService.incrementBadge('triagem');
notificationService.decrementBadge('triagem');
```

## 5. Teste de Reconnection

### 5.1 Desconectar simulando falha

1. Abrir DevTools do navegador
2. Ir para Network tab
3. Click no botão de conexão offline/online
4. Observar logs no console

Esperado:
```
❌ Desconectado do servidor WebSocket: transport close
🔴 Erro WebSocket: ...
[auto-reconnect happening]
✅ Reconectado ao servidor WebSocket
```

### 5.2 Restart do backend

1. Stop backend (Ctrl+C)
2. Verificar se frontend mostra "Desconectado"
3. Reiniciar backend
4. Verificar se frontend reconecta automaticamente

## 6. Teste de Múltiplos Módulos

### 6.1 Testar switch de módulos

No console:

```javascript
// Simulando switching entre módulos
realtimeService.connect('triagem');
// ... após conectado
realtimeService.switchModule('ambulatorio');
```

Esperado:
```
📌 Cliente entrou no módulo: triagem
📌 Cliente saiu do módulo: triagem
📌 Cliente entrou no módulo: ambulatorio
```

## 7. Teste de Performance

### 7.1 Monitor de conexões

No backend, adicione um endpoint de debug:

```typescript
// app.js
this.app.get('/api/health/realtime', (req, res) => {
  res.json(realtimeManager.getStatus());
});
```

Test:
```bash
curl http://localhost:3000/api/health/realtime
```

Resposta esperada:
```json
{
  "initialized": true,
  "connections": 5,
  "modules": ["triagem", "ambulatorio", "medico"],
  "io": { "status": "active" }
}
```

### 7.2 Monitor de mensagens

Abrir DevTools → Network → Filter "ws"

Deve haver:
- Conexão WebSocket estabelecida
- Mensagens periódicas (ping/pong)
- Mensagens quando eventos acontecem

## 8. Teste de Produção (Render/Vercel)

### 8.1 Preparar para produção

1. Verificar CORS settings para produção
2. Verificar JWT_SECRET em variáveis de ambiente
3. Verificar DATABASE_URL

### 8.2 Testar localmente em modo produção

```bash
# Backend
NODE_ENV=production npm start

# Frontend
ng build --configuration production
```

### 8.3 Verificar logs

```bash
# No servidor de produção
docker logs prontuario-backend
```

## 9. Testes de Stress

### 9.1 Simular múltiplos pacientes sendo transferidos

```bash
# Script para simular transferências
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/triagem/$i/finalizar \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"status_destino": "encaminhado para ambulatório"}' &
done
wait
```

Monitor:
- Backend não deve ficar lento
- Frontend deve processar notificações
- Não deve haver memory leak

### 9.2 Verificar memory leak

No navegador DevTools:
1. Abrir Performance tab
2. Tirar screenshot da memória inicial
3. Simular transferências de pacientes (10+)
4. Aguardar 30 segundos
5. Tirar screenshot final
6. Memory deve estar estável ou ligeiramente menor (com GC)

## 10. Testes de Erro

### 10.1 Teste de token expirado

```bash
# Enviar requisição com token expirado
curl -X GET http://localhost:3000/api/triagem/fila \
  -H "Authorization: Bearer eyJhbGc..."
```

Esperado: Erro 401, "Autenticação falhou"

### 10.2 Teste de module inválido

No console do navegador:

```javascript
realtimeService.connect('modulo-inexistente');
```

Esperado: Erro no console, desconexão

### 10.3 Teste de dados corrompidos

```javascript
realtimeService.emit('patient:transferred', {
  // dados incompletos ou inválidos
});
```

Esperado: Log de erro no backend, sem crash

## 11. Checklist Final

Antes de fazer deploy:

- [ ] Backend inicia sem erros
- [ ] Frontend conecta ao WebSocket com sucesso
- [ ] Notificações aparecem quando paciente é transferido
- [ ] Badge atualiza corretamente
- [ ] Conexão reconecta após falha
- [ ] Módulos podem ser alternados sem problemas
- [ ] Memory leak: OK (testado)
- [ ] Performance: OK (testado)
- [ ] Erros são tratados corretamente
- [ ] Todos os componentes têm unsubscription correta (no ngOnDestroy)

## 12. Scripts de Teste (opcional)

### test-realtime.js

```javascript
// backend/test-realtime.js
const io = require('socket.io-client');

const socket = io('http://localhost:3000', {
  auth: {
    token: 'seu-token-jwt-aqui'
  }
});

socket.on('connect', () => {
  console.log('✅ Conectado ao servidor');
  socket.emit('join:module', { module: 'triagem' });
});

socket.on('patient:arrived', (data) => {
  console.log('📥 Paciente chegou:', data);
  process.exit(0);
});

socket.on('error', (error) => {
  console.error('❌ Erro:', error);
  process.exit(1);
});

setTimeout(() => {
  console.error('❌ Timeout: nenhum evento recebido');
  process.exit(1);
}, 10000);
```

Run:
```bash
node backend/test-realtime.js
```

## Troubleshooting

### Problema: "WebSocket connection failed"
**Solução:**
- Verifique se backend está rodando: `lsof -i :3000`
- Verifique CORS settings
- Verifique firewall

### Problema: "Notificações não aparecem"
**Solução:**
- Verifique se `NotificationContainerComponent` está no `app.component.ts`
- Verifique se CSS está carregando
- Verifique console para erros

### Problema: "Reconexão infinita"
**Solução:**
- Verifique se token é válido
- Verifique logs do backend
- Resete o navegador

### Problema: "Pacientes desaparecem instantaneamente"
**Solução:**
- Verifique se há múltiplas instâncias do serviço
- Verifique se há race condition no carregamento da fila
- Adicione delay no reload

## Próximas Etapas

1. **Persistência**: Salvar estado em localStorage para fallback offline
2. **Analytics**: Logar eventos para dashboard de uso
3. **Notificações Desktop**: Implementar com Service Workers
4. **Grupos**: Criar salas por departamento
5. **Escalabilidade**: Implementar Redis adapter para múltiplas instâncias
