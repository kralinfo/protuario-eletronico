# 🔌 Camada de Comunicação em Tempo Real - README

## ⚡ Resumo Rápido

Implementamos **WebSocket em tempo real com Socket.io** na sua aplicação. Agora:

✅ Pacientes são transferidos entre módulos **instantaneamente**  
✅ Notificações **visuais e sonoras** ao chegar novo paciente  
✅ **Status de conexão** visível no header  
✅ **Reconexão automática** em caso de falha  
✅ **Modular e escalável** - pronto para novos módulos  

---

## 🎯 O que foi implementado

### Backend (✅ Pronto)

```
✅ Socket.io integrado no Express
✅ RealtimeManager (gerenciador central)
✅ EventBus (sistema de eventos pub/sub)
✅ Módulos realtime para cada setor
✅ Emissão de eventos ao transferir pacientes
✅ Autenticação JWT para WebSocket
```

### Frontend (✅ Pronto)

```
✅ RealtimeService (gerencia conexão WebSocket)
✅ NotificationService (notificações)
✅ Componente NotificationContainer (toasts)
✅ Componente RealtimeStatus (status badge)
```

---

## 🚀 Como Começar

### 1. Iniciar Backend e Frontend

```bash
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd frontend && npm start

# Abrir navegador em http://localhost:4200
```

No header do navegador, deve aparecer um badge verde: **"Conectado"**

### 2. Integrar nos Componentes Principais

#### 2.1 app.component.ts

Adicione os componentes de notificação:

```typescript
import { NotificationContainerComponent } from './shared/components/notification-container.component';
import { RealtimeStatusComponent } from './shared/components/realtime-status.component';

@Component({
  imports: [
    // ... seus imports
    NotificationContainerComponent,
    RealtimeStatusComponent
  ],
  template: `
    <div class="navbar">
      <app-realtime-status></app-realtime-status>
    </div>
    <router-outlet></router-outlet>
    <app-notification-container></app-notification-container>
  `
})
export class AppComponent { }
```

#### 2.2 FilaTriagemComponent

```typescript
import { RealtimeService } from 'src/app/services/realtime.service';
import { NotificationService } from 'src/app/services/notification.service';
import { takeUntil } from 'rxjs/operators';

export class FilaTriagemComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  constructor(
    private realtimeService: RealtimeService,
    private notificationService: NotificationService,
    private triagemService: TriagemService
  ) {}

  ngOnInit(): void {
    // Sua lógica existente
    this.carregarFila();

    // NOVO: Conectar ao módulo de triagem
    this.realtimeService.connect('triagem').catch(error => {
      console.error('Erro ao conectar:', error);
    });

    // NOVO: Escutar novo paciente chegando
    this.realtimeService.onPatientArrived()
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        if (data.destinationModule === 'triagem') {
          // Mostrar notificação
          this.notificationService.patientArrived(
            data.patientName,
            'Triagem',
            data.classificationRisk
          );
          
          // Recarregar fila
          this.carregarFila();
        }
      });
  }

  carregarFila(): Promise<void> {
    // Sua lógica existente...
    return Promise.resolve();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

#### 2.3 FilaAmbulatórioComponent / MedicoComponent

Mesmo padrão que `FilaTriagemComponent`, mas conectar aos módulos corretos:

```typescript
this.realtimeService.connect('ambulatorio');  // ou 'medico'
```

---

## 📊 Fluxo em Tempo Real

```
1. Usuário finaliza triagem
   ↓
2. Backend emite evento 'patient:transferred'
   ↓
3. EventBus propaga para módulos realtime
   ↓
4. RealtimeManager emite via WebSocket
   ↓
5. Frontend recebe evento via RealtimeService
   ↓
6. Notificação toast aparece
7. Fila atualiza instantaneamente
```

---

## 📖 Documentação Completa

| Documento | Para Quem | Conteúdo |
|-----------|----------|---------|
| **IMPLEMENTACAO_COMPLETA.md** | Todos | Resumo executivo + arquitetura |
| **REALTIME_INTEGRATION_GUIDE.md** | Desenvolvedores | Guia detalhado de integração |
| **EXAMPLE_REALTIME_COMPONENT.ts** | Desenvolvedores | Exemplo anotado linha por linha |
| **REALTIME_TESTING_GUIDE.md** | QA + Dev | Como testar cada funcionalidade |
| **ROTEIRO_IMPLEMENTACAO.md** | Gerenciador | Checklist de implementação |

---

## 🛠 API Rápida

### RealtimeService

```typescript
// Conectar
this.realtimeService.connect('triagem');

// Eventos
this.realtimeService.onPatientArrived().subscribe(data => {...});
this.realtimeService.onQueueUpdated().subscribe(data => {...});

// Status
if (this.realtimeService.isConnected()) { ... }

// Desconectar
this.realtimeService.disconnect();
```

### NotificationService

```typescript
// Notificações simples
this.notificationService.success('Título', 'Mensagem');
this.notificationService.error('Erro', 'Mensagem de erro');
this.notificationService.warning('Aviso', 'Mensagem de aviso');
this.notificationService.info('Info', 'Mensagem informativa');

// Notificações especializadas
this.notificationService.patientArrived('João', 'Ambulatório', 'Vermelho');
this.notificationService.triagemFinished('João', 'Amarelo');

// Badges
this.notificationService.addBadge('triagem', 5, 'high');
this.notificationService.incrementBadge('triagem');
this.notificationService.removeBadge('triagem');
```

---

## 🧪 Testar Rapidamente

### Teste 1: Verificar Conexão

No console do navegador (F12 > Console):

```javascript
// Deve retornar true
navigator.onLine

// Deve haver logs de conexão
// ✅ Conectado ao servidor WebSocket: [socket-id]
```

### Teste 2: Disparar Notificação

```bash
# Terminal: Simular transferência de paciente
curl -X POST http://localhost:3000/api/triagem/1/finalizar \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status_destino": "encaminhado para ambulatório"}'
```

Esperado: Toast notification aparece

### Teste 3: Desconexão/Reconexão

No DevTools do navegador:
1. Ir para Network tab
2. Click em offline (🔴)
3. Verificar que status muda para "Desconectado"
4. Click em online
5. Verificar que reconecta

---

## ✅ Checklist Final

- [ ] Backend iniciando sem erros (`npm start`)
- [ ] Frontend iniciando sem erros (`npm start`)
- [ ] Status "Conectado" aparecendo no header
- [ ] `NotificationContainerComponent` adicionado ao `app.component`
- [ ] `RealtimeStatusComponent` adicionado ao `app.component`
- [ ] `FilaTriagemComponent` integrando `RealtimeService`
- [ ] `FilaAmbulatórioComponent` integrando `RealtimeService`
- [ ] Teste manual: transferir paciente vê notificação em tempo real
- [ ] Console sem erros (F12 > Console)
- [ ] Badge atualiza quando novo paciente chega

---

## 🐛 Troubleshooting

### "No data" ou "Conectado" não aparece

```bash
# 1. Backend está rodando?
lsof -i :3000

# 2. Port está correta no frontend?
# Deve ser: http://localhost:3000 (verify em realtime.service.ts)

# 3. Verificar console (F12 > Console)
```

### Notificações não aparecem

```bash
# 1. NotificationContainerComponent está em app.component? 
grep -n "NotificationContainerComponent" frontend/src/app/app.component.ts

# 2. Verificar CSS
# Inspecionar elemento (F12 > Elements)

# 3. Verificar console para erros
```

### Fila não atualiza

```bash
# 1. Componente está usando takeUntil?
# Deve haver: .pipe(takeUntil(this.destroy$))

# 2. ngOnDestroy está completando o subject?
# Deve haver: this.destroy$.next(); this.destroy$.complete();

# 3. Verificar logs do backend
```

---

## 📱 Próximas Etapas

### Hoje
1. ✅ Adicionar componentes ao app.component
2. ✅ Integrar FilaTriagemComponent

### Amanhã  
3. Integrar FilaAmbulatórioComponent
4. Integrar MedicoComponent (se houver)

### Próxima Semana
5. Testar em produção (Render/Vercel)
6. Considerar Redis adapter para múltiplas instâncias

---

## 💪 Suporte

### Dúvidas sobre arquitetura?
→ Ler `REALTIME_INTEGRATION_GUIDE.md`

### Como implementar em meu componente?
→ Seguir `EXAMPLE_REALTIME_COMPONENT.ts`

### Como testar funcionalidade X?
→ Consultar `REALTIME_TESTING_GUIDE.md`

### Qual é o checklist de implementação?
→ Ver `ROTEIRO_IMPLEMENTACAO.md`

---

## 🎓 Quick Reference

```typescript
// Import em componente
import { RealtimeService } from 'src/app/services/realtime.service';
import { NotificationService } from 'src/app/services/notification.service';

// Injetar
constructor(
  private realtimeService: RealtimeService,
  private notificationService: NotificationService
) {}

// No ngOnInit
ngOnInit() {
  this.realtimeService.connect('seu_modulo');
  
  this.realtimeService.onPatientArrived()
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      this.notificationService.patientArrived(
        data.patientName,
        data.destinationModule,
        data.classificationRisk
      );
      this.carregarFila(); // seu método
    });
}

// No ngOnDestroy
ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

---

## 📞 Resumo

Você tem uma **solução profissional de tempo real** pronta para uso. 

Os próximos passos são:
1. Adicionar componentes ao app.component (**5 mins**)
2. Integrar no seu componente de fila (**15 mins** por componente)
3. Testar (**10 mins**)

Total: **~30 mins** para funcionar completamente!

---

**Bom trabalho! 🚀**
