# 🚀 Próximo Passo - Integração Frontend

## Visão Geral

Depois de adicionar os logs de debug, o próximo passo é **integrar os componentes realtime no frontend**. Aqui está o guia passo a passo.

## 1️⃣ Adicionar Componentes ao App Component

### Arquivo: `frontend/src/app/app.component.ts`

**Antes:**
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Prontuário Eletrônico';
}
```

**Depois (adicionar imports):**
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NotificationContainerComponent } from './shared/components/notification-container.component';
import { RealtimeStatusComponent } from './shared/components/realtime-status.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    NotificationContainerComponent,     // ← NOVO
    RealtimeStatusComponent              // ← NOVO
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Prontuário Eletrônico';
}
```

### Arquivo: `frontend/src/app/app.component.html`

**Antes:**
```html
<mat-toolbar color="primary">
  <span>{{ title }}</span>
</mat-toolbar>

<router-outlet></router-outlet>
```

**Depois (adicionar componentes realtime):**
```html
<mat-toolbar color="primary">
  <span>{{ title }}</span>
  <span class="spacer"></span>
  <app-realtime-status></app-realtime-status>  <!-- ← NOVO -->
</mat-toolbar>

<app-notification-container></app-notification-container>  <!-- ← NOVO -->

<router-outlet></router-outlet>
```

### Arquivo: `frontend/src/app/app.component.css`

**Adicionar estilo para espaçador:**
```css
.spacer {
  flex: 1 1 auto;
}
```

---

## 2️⃣ Integrar RealtimeService nos Componentes de Fila

### Arquivo: `frontend/src/app/components/fila-triagem/fila-triagem.component.ts`

**Localizar esta linha (por volta da linha 10-20):**
```typescript
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
```

**Adicionar após os imports:**
```typescript
import { RealtimeService } from '../../services/realtime.service';
import { NotificationService } from '../../services/notification.service';
```

**Localizar o constructor (por volta da linha 30-40):**
```typescript
constructor(
  private formBuilder: FormBuilder,
  private atendimentoService: AtendimentoService
) {
```

**Modificar para:**
```typescript
constructor(
  private formBuilder: FormBuilder,
  private atendimentoService: AtendimentoService,
  private realtimeService: RealtimeService,        // ← NOVO
  private notificationService: NotificationService // ← NOVO
) {
```

**Localizar o ngOnInit (por volta da linha 50-70):**
```typescript
ngOnInit(): void {
  this.loadTriagens();
}
```

**Modificar para:**
```typescript
ngOnInit(): void {
  this.loadTriagens();
  this.subscribeToRealtimeEvents();  // ← NOVO
}

// ← ADICIONAR NOVO MÉTODO
subscribeToRealtimeEvents(): void {
  // Conectar ao módulo de triagem
  this.realtimeService.connect('triagem');

  // Ouvir quando um paciente chega
  this.realtimeService.onPatientArrived()
    .subscribe(event => {
      console.log('Paciente chegou:', event);
      // Recarregar a fila
      this.loadTriagens();
      // Mostrar notificação
      this.notificationService.patientArrived(
        event.patientName,
        'triagem',
        event.classification
      );
    });

  // Ouvir quando um paciente sai da triagem
  this.realtimeService.onPatientTransferredOut()
    .subscribe(event => {
      console.log('Paciente saiu da triagem:', event);
      // Recarregar a fila
      this.loadTriagens();
    });
}
```

**Localizar o ngOnDestroy (se existir):**
```typescript
ngOnDestroy(): void {
  // Limpar subscriptions...
}
```

**Se não existir, adicionar:**
```typescript
ngOnDestroy(): void {
  // Desconectar do realtime
  this.realtimeService.disconnect();
}
```

---

### Arquivo: `frontend/src/app/components/fila-ambulatorio/fila-ambulatorio.component.ts`

**Fazer as mesmas mudanças que em FilaTriagemComponent:**

```typescript
import { RealtimeService } from '../../services/realtime.service';
import { NotificationService } from '../../services/notification.service';

constructor(
  private formBuilder: FormBuilder,
  private atendimentoService: AtendimentoService,
  private realtimeService: RealtimeService,
  private notificationService: NotificationService
) {

ngOnInit(): void {
  this.loadAmbulatorios();
  this.subscribeToRealtimeEvents();
}

subscribeToRealtimeEvents(): void {
  // Conectar ao módulo de ambulatório
  this.realtimeService.connect('ambulatorio');

  // Ouvir quando um paciente chega
  this.realtimeService.onPatientArrived()
    .subscribe(event => {
      console.log('Paciente chegou no ambulatório:', event);
      this.loadAmbulatorios();
      this.notificationService.patientArrived(
        event.patientName,
        'ambulatorio',
        event.classification
      );
    });

  // Ouvir quando um paciente sai
  this.realtimeService.onPatientTransferredOut()
    .subscribe(event => {
      console.log('Paciente saiu do ambulatório:', event);
      this.loadAmbulatorios();
    });
}

ngOnDestroy(): void {
  this.realtimeService.disconnect();
}
```

---

### Arquivo: `frontend/src/app/components/medico/medico.component.ts` (se aplicável)

**Mesma integração:**
```typescript
import { RealtimeService } from '../../services/realtime.service';
import { NotificationService } from '../../services/notification.service';

constructor(
  private realtimeService: RealtimeService,
  private notificationService: NotificationService
  // ... outros injects
) {}

ngOnInit(): void {
  this.subscribeToRealtimeEvents();
}

subscribeToRealtimeEvents(): void {
  this.realtimeService.connect('medico');
  
  this.realtimeService.onPatientArrived()
    .subscribe(event => {
      console.log('Paciente chegou:', event);
      this.reloadPacientes();
      this.notificationService.patientArrived(
        event.patientName,
        'medico',
        event.classification
      );
    });
}

ngOnDestroy(): void {
  this.realtimeService.disconnect();
}
```

---

## 3️⃣ Validar Integração

### Checklist de Validação

- [ ] `NotificationContainerComponent` importado em `AppComponent`
- [ ] `RealtimeStatusComponent` importado em `AppComponent`
- [ ] Componentes adicionados ao template de `AppComponent`
- [ ] `RealtimeService` importado em `FilaTriagemComponent`
- [ ] `NotificationService` importado em `FilaTriagemComponent`
- [ ] `RealtimeService` inicializado no `ngOnInit` de FilaTriagem
- [ ] Mesma integração em `FilaAmbulatórioComponent`
- [ ] Mesma integração em `MedicoComponent` (se aplicável)
- [ ] Nenhum erro de compilação TypeScript

### Comandos para Compilar

```bash
cd frontend

# Verificar erros de compilação
ng build

# Ou iniciar em desenvolvimento
npm start
```

---

## 4️⃣ Testar Integração

### No Navegador

1. Abrir DevTools (F12)
2. Ir para Console
3. Procurar por mensagens de conexão:
   ```
   Socket.io connected with ID: ...
   Realtime service connected to module: triagem
   ```

### Simular Transferência

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend  
cd frontend && npm start

# Terminal 3: Simular API
curl -X POST http://localhost:3000/api/triagem/1/finalizar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status_destino": "encaminhado para médico"}'
```

### Verificar Resultados

- [ ] Status badge mostra "Conectado" na toolbar
- [ ] Notificação (toast) aparece quando paciente é transferido
- [ ] Fila é atualizada automaticamente sem recarregar página
- [ ] Nenhum erro no console

---

## 5️⃣ Estrutura Final

Após completar, sua estrutura frontend deve ser:

```
frontend/src/app/
├── app.component.ts          ← MODIFICADO (adicionar componentes)
├── app.component.html        ← MODIFICADO (adicionar tags)
├── app.component.css         ← MODIFICADO (adicionar .spacer)
├── components/
│   ├── fila-triagem/
│   │   └── fila-triagem.component.ts  ← MODIFICADO (RealtimeService)
│   ├── fila-ambulatorio/
│   │   └── fila-ambulatorio.component.ts ← MODIFICADO (RealtimeService)
│   ├── medico/
│   │   └── medico.component.ts ← MODIFICADO (RealtimeService)
├── services/
│   ├── realtime.service.ts        ✅ JÁ CRIADO
│   ├── notification.service.ts    ✅ JÁ CRIADO
│   └── ... outros services
└── shared/components/
    ├── notification-container.component.ts  ✅ JÁ CRIADO
    └── realtime-status.component.ts         ✅ JÁ CRIADO
```

---

## 6️⃣ Troubleshooting

### Erro: "Cannot find module 'socket.io-client'"
```bash
cd frontend
npm install socket.io-client
```

### Erro: "RealtimeService is not injectable"
Verificar que `RealtimeService` está com `@Injectable()` decorator.

### Erro: "NotificationContainerComponent is not recognized"
Verificar que está importado em `AppComponent` imports array.

### Conexão WebSocket não estabelecida
1. Verificar que backend está rodando
2. Verificar CORS em backend
3. Verificar token JWT é válido
4. Ver console browser DevTools

### Notificação não aparece
1. Verificar se backend emitiu evento (ver DEBUG LOGS)
2. Verificar se frontend inscrito na observável
3. Verificar se `NotificationContainerComponent` renderizando

---

## ✅ Próximos Passos Após Integração

1. Testar end-to-end com múltiplos usuários
2. Validar performance com múltiplas transferências
3. Testar reconexão automática (derrubar conexão)
4. Remover logs de debug de produção
5. Deploy para produção
