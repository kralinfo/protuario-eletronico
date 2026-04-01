# Skill: Dashboard Operacional

Este documento descreve a arquitetura, funcionalidades e padrões da tela de Dashboard do sistema de prontuário eletrônico. Consulte este arquivo sempre que for realizar alterações no Dashboard.

## 📌 Visão Geral
O dashboard oferece uma visão em tempo real e histórica da operação da unidade de saúde, incluindo fluxo de pacientes, produtividade médica e indicadores de risco.

## 📂 Estrutura de Arquivos

### Frontend
- **Página Principal:** [frontend/src/app/dashboard/pages/dashboard.component.ts](frontend/src/app/dashboard/pages/dashboard.component.ts)
- **Template:** [frontend/src/app/dashboard/pages/dashboard.component.html](frontend/src/app/dashboard/pages/dashboard.component.html)
- **Serviço:** [frontend/src/app/services/dashboard.service.ts](frontend/src/app/services/dashboard.service.ts)
- **Componentes:**
  - `KPI Cards`: [frontend/src/app/dashboard/components/kpi-card/](frontend/src/app/dashboard/components/kpi-card/)
  - `Gráfico de Risco`: [frontend/src/app/dashboard/components/risk-chart/](frontend/src/app/dashboard/components/risk-chart/)
  - `Gráfico de Fluxo`: [frontend/src/app/dashboard/components/flow-chart/](frontend/src/app/dashboard/components/flow-chart/)
  - `Tabela de Médicos`: [frontend/src/app/dashboard/components/doctors-table/](frontend/src/app/dashboard/components/doctors-table/)
  - `Lista Crítica`: [frontend/src/app/dashboard/components/critical-list/](frontend/src/app/dashboard/components/critical-list/)

### Backend
- **Controller:** [backend/src/controllers/dashboardController.js](backend/src/controllers/dashboardController.js)
- **Service:** [backend/src/services/dashboardService.js](backend/src/services/dashboardService.js)

## 🚀 Funcionalidades Chave

### 1. Filtros de Período
- **Padrão:** Hoje (`dia`).
- **Opções:** Semana, Mês, Ano e Personalizado.
- **Polling:** Quando o período 'dia' está selecionado, o dashboard atualiza automaticamente a cada 30 segundos (`INTERVALO_POLLING`).

### 2. Fluxo de Dados (RxJS)
- O `DashboardService` utiliza um `BehaviorSubject` (`refresh$`) para gerenciar as atualizações.
- O método `getDashboardStream()` centraliza as requisições via `switchMap`, garantindo que apenas a última requisição seja processada.
- Os dados são agregados no frontend através da interface `DadosDashboard`.

### 3. Drill-down e Filtros Dinâmicos
- Os gráficos permitem cliques para filtrar períodos específicos (ex: clicar em um mês no gráfico anual muda a visão para aquele mês).
- O estado do filtro é mantido na interface `FiltroDashboard`.

## 🎨 Padrões de UI/UX
- **Framework:** Angular 17+ (Standalone Components).
- **Estilização:** Tailwind CSS + Angular Material.
- **Gráficos:** Implementados via componentes customizados (ver pasta `components/`).
- **Feedback:** `mat-snack-bar` para erros e `mat-progress-spinner`/esqueletos para carregamento.

## 🛠️ Como dar Manutenção

### Adicionar um novo KPI
1. Atualize a interface `DadosOperacional` no frontend e no backend.
2. Adicione o novo `app-dashboard-kpi-card` no `dashboard.component.html`.
3. Garanta que o `dashboardService.js` no backend calcule o novo valor.

### Alterar Gráficos
- Os componentes de gráfico são isolados. Utilize @Input para passar os dados e @Output para eventos de clique (filtros).

## ⚠️ Observações Importantes
- O dashboard é sensível à performance do banco de dados devido às agregações. Sempre verifique o impacto de novas queries no `dashboardService.js`.
- O polling é desativado automaticamente quando o usuário navega para fora da página via `takeUntil(this.destroy$)`.
