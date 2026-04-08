# Skill: Painel de Fila (TV)

Este documento descreve a arquitetura, o fluxo de dados em tempo real e as regras de negócio da tela de Painel de Fila (TV). Consulte este arquivo para manutenção ou implementação de novas funcionalidades no painel.

## 📌 Visão Geral
O Painel de Fila é uma aplicação "read-only" projetada para ser exibida em TVs nas salas de espera. Ele anuncia chamadas de pacientes para Triagem e Consultórios Médicos em tempo real via WebSockets.

## 📂 Estrutura de Arquivos

### Frontend (Angular)
- **Componente Principal:** [frontend/src/app/fila/fila.component.ts](frontend/src/app/fila/fila.component.ts)
- **Template:** [frontend/src/app/fila/fila.component.html](frontend/src/app/fila/fila.component.html)
- **Estilos (TV Optimized):** [frontend/src/app/fila/fila.component.scss](frontend/src/app/fila/fila.component.scss)
- **Serviço de Realtime:** [frontend/src/app/services/realtime.service.ts](frontend/src/app/services/realtime.service.ts)
- **Serviço de Fila:** [frontend/src/app/services/fila.service.ts](frontend/src/app/services/fila.service.ts)
- **Fila de Triagem (botão Chamar):** [frontend/src/app/triagem/fila-triagem/fila-triagem.component.ts](frontend/src/app/triagem/fila-triagem/fila-triagem.component.ts)
- **Fila Médica (botão Chamar):** [frontend/src/app/medico/fila-atendimentos-medicos/fila-atendimentos-medicos.component.ts](frontend/src/app/medico/fila-atendimentos-medicos/fila-atendimentos-medicos.component.ts)

### Backend (Node.js)
- **Módulo de Lógica:** [backend/src/realtime/modules/FilaRealtimeModule.js](backend/src/realtime/modules/FilaRealtimeModule.js)
- **Gerenciador Socket.io:** [backend/src/realtime/RealtimeManager.js](backend/src/realtime/RealtimeManager.js)
- **Persistência:** Tabela `fila_historico` no PostgreSQL.

## ⚙️ Funcionamento do Fluxo

### Estados do Atendimento (Fila)
- `encaminhado para triagem` → aparece na fila de triagem
- `encaminhado para sala médica` → aparece na fila do médico
- `em_triagem` e `em atendimento médico` → **NÃO** aparecem nas filas de espera

### 1. Encaminhamento (sem chamada automática)
Quando o paciente é encaminhado para triagem ou para sala médica, seu status muda mas **nenhum evento WebSocket é disparado**. O paciente apenas entra na fila de espera.

### 2. Chamada Manual (botão "Chamar")
O profissional clica em **"Chamar"** na tela de fila para anunciar o paciente na TV:
1. O frontend chama `POST /api/fila/chamar` com `{ patientId, destino }` via `FilaService`.
2. O backend valida e emite o evento interno `patient:called`.
3. O `FilaRealtimeModule` captura o evento e:
   - Normaliza o `patientId` para número (`Number()`).
   - Executa a **Lógica de Fluxo Concluído** (ver seção 4).
   - Persiste o chamado na tabela `fila_historico`.
   - Emite via WebSocket `fila:called` (alerta sonoro + card) e `fila:update_historico` (tabela).
4. **Todas as TVs** recebem a atualização simultaneamente.

### 3. Abertura do Atendimento
Quando o profissional abre o atendimento (clica em "Iniciar Triagem" / "Iniciar Atendimento"):
- Triagem iniciada → status muda para `em_triagem` → paciente some da fila de triagem.
- Atendimento médico iniciado → status muda para `em atendimento médico` → paciente some da fila médica.
- **Nenhum WebSocket disparado aqui.**

### 4. Lógica de "Fluxo Concluído" (Auto-Hiding na TV)
Para manter o painel limpo, um paciente some do histórico automaticamente:
- **Regra:** O paciente deve ter sido chamado para `triagem` **E** para `medico`.
- **Comportamento:** Assim que o médico chama um paciente que já possui registro de triagem no histórico atual, o backend remove da lista e notifica todas as TVs.
- **Exceção (Re-chamada):** Se o médico chamar novamente (ex: após ambulatório), o ciclo é resetado e o paciente volta ao histórico.

### 5. Sincronização Multi-TV
- **Estado Inicial:** GET `/api/fila/estado` retorna o histórico filtrado do banco.
- **Realtime:** WebSocket via `emitToModule('fila', ...)` — **somente** o módulo `fila` recebe.
- Banco PostgreSQL é a fonte de verdade persistente.

## 🔊 Padrões de UI/UX
- **Alerta Sonoro:** O arquivo `fila.component.ts` reproduz um som de "ding" a cada nova chamada via `reproduzirAlerta()`.
- **Tempo de Exibição:** Existe um `MIN_DISPLAY_MS` (30s) definido no frontend para garantir que um chamado não seja "atropelado" por outro imediatamente, criando uma fila de exibição visual.
- **Cores de Risco:** Os cards de consultório aplicam classes CSS dinâmicas baseadas na classificação de risco (Verde, Amarelo, Vermelho).

## 🛠️ Manutenção
- **Botão "Chamar" não aparece:** Verifique se o `status` do paciente é exatamente `'encaminhado para triagem'` ou `'encaminhado para sala médica'`.
- **Histórico não limpa na TV:** Verifique se o `patientId` está chegando como `Number` nos dois destinos (triagem e médico). Use `Number()` no `FilaRealtimeModule`.
- **TV não atualiza em tempo real:** Confirme que o frontend está conectado ao módulo `fila` via `realtimeService.connect('fila')` e que o backend usa `emitToModule('fila', ...)`.
- **Sem som:** Verifique a URL do asset de áudio no método `reproduzirAlerta()`.
- **Tabela fila_historico:** O esquema é gerenciado pelo método `_ensureTable()` dentro do `FilaRealtimeModule`.
- **NÃO** adicionar chamadas automáticas nos controllers de triagem ou atendimento — a chamada é sempre manual via `POST /api/fila/chamar`.
