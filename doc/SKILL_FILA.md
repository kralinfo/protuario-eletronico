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

### Backend (Node.js)
- **Módulo de Lógica:** [backend/src/realtime/modules/FilaRealtimeModule.js](backend/src/realtime/modules/FilaRealtimeModule.js)
- **Gerenciador Socket.io:** [backend/src/realtime/RealtimeManager.js](backend/src/realtime/RealtimeManager.js)
- **Persistência:** Tabela `fila_historico` no PostgreSQL.

## ⚙️ Funcionamento do Fluxo

### 1. Chamada de Paciente
O fluxo de chamada é iniciado pelos controllers de atendimento ou triagem:
1. O profissional clica em "Chamar" no seu respectivo módulo.
2. O backend emite um evento interno `patient:called`.
3. O `FilaRealtimeModule` captura esse evento e:
   - Normaliza o `patientId` para número.
   - Atualiza o card ativo (Triagem ou Consultório).
   - Executa a **Lógica de Fluxo Concluído**.
   - Persiste o chamado na tabela `fila_historico`.
   - Emite via WebSocket os eventos `fila:called` (para o alerta sonoro/card) e `fila:update_historico` (para a tabela).

### 2. Lógica de "Fluxo Concluído" (Auto-Hiding)
Para manter o painel limpo, um paciente some do histórico automaticamente sob as seguintes condições:
- **Regra:** O paciente deve ter passado pelos dois destinos: `triagem` **E** `medico`.
- **Comportamento:** Assim que o médico chama um paciente que já possui um registro de triagem no histórico atual, o backend o remove da lista e notifica todas as TVs para esconderem o nome da tabela.
- **Exceção (Re-chamada):** Se o médico chamar o paciente novamente (ex: após retorno do ambulatório), o ciclo é resetado e ele volta a aparecer normalmente.

### 3. Sincronização Multi-TV
- **Estado Inicial:** Ao abrir uma TV, o frontend faz um `GET /api/fila/estado` para carregar as chamadas atuais e o histórico filtrado do banco.
- **Realtime:** Todas as TVs conectadas ao módulo `fila` recebem as mesmas atualizações simultâneas via WebSocket, garantindo que o histórico seja idêntico em todos os monitores.

## 🔊 Padrões de UI/UX
- **Alerta Sonoro:** O arquivo `fila.component.ts` reproduz um som de "ding" a cada nova chamada via `reproduzirAlerta()`.
- **Tempo de Exibição:** Existe um `MIN_DISPLAY_MS` (30s) definido no frontend para garantir que um chamado não seja "atropelado" por outro imediatamente, criando uma fila de exibição visual.
- **Cores de Risco:** Os cards de consultório aplicam classes CSS dinâmicas baseadas na classificação de risco (Verde, Amarelo, Vermelho).

## 🛠️ Manutenção
- **Histórico não limpa:** Verifique se o `patientId` está sendo passado como `Number` em ambos os controllers (Triagem/Médico).
- **Sem som:** Verifique a URL do asset de áudio no método `reproduzirAlerta()`.
- **Tabela fila_historico:** O esquema é gerenciado pelo método `_ensureTable()` dentro do modulo backend.
