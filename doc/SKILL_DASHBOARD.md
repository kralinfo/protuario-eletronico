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
  - `Informações Hoje`: [frontend/src/app/dashboard/components/info-hoje/](frontend/src/app/dashboard/components/info-hoje/)
  - `Tabela de Atendimentos`: [frontend/src/app/dashboard/components/atendimentos-table/](frontend/src/app/dashboard/components/atendimentos-table/)
  - `Tabela de Médicos`: [frontend/src/app/dashboard/components/doctors-table/](frontend/src/app/dashboard/components/doctors-table/)
  - `Lista Crítica`: [frontend/src/app/dashboard/components/critical-list/](frontend/src/app/dashboard/components/critical-list/)

### Backend
- **Controller:** [backend/src/controllers/dashboardController.js](backend/src/controllers/dashboardController.js)
- **Service:** [backend/src/services/dashboardService.js](backend/src/services/dashboardService.js)

## 🚀 Funcionalidades Chave

### 1. Filtros de Período e "Hoje Real"
- **Padrão:** Hoje (`dia`).
- **Opções:** Semana, Mês, Ano e Personalizado.
- **Identificação de Hoje:** A seção superior ("Informações Hoje") expande automaticamente apenas se o período for `dia` E a data selecionada coincidir com a data atual do servidor/máquina.
- **Polling:** A seção "Informações Hoje" possui polling independente de 30 segundos (`INTERVALO_POLLING`), garantindo monitoramento em tempo real mesmo com filtros de datas históricas ativos no restante do dashboard.

### 2. Fluxo de Dados (RxJS)
- O `DashboardService` utiliza um `BehaviorSubject` (`refresh$`) para gerenciar as atualizações de todo o dashboard.
- O método `getDashboardStream()` centraliza as requisições via `switchMap`.
- A tabela detalhada de atendimentos (`DashboardAtendimentosTableComponent`) escuta as mudanças no `FiltroDashboard` e realiza requisições paginadas (server-side) automaticamente.

### 3. Drill-down e Interatividade de Gráficos
- **Sem Modais:** Os cliques nos gráficos (atendimentos por hora e classificação de risco) não abrem mais modais. Eles atualizam diretamente o filtro global.
- **Filtros Dinâmicos:** 
  - Clicar em uma barra de hora filtra a tabela por aquela hora específica.
  - Clicar em uma fatia do gráfico de pizza filtra por aquela classificação de risco.
  - Clicar no centro do gráfico de pizza (total) limpa o filtro de classificação.
- O estado do filtro é centralizado na interface `FiltroDashboard`, que suporta `periodo`, `data`, `dataInicio`, `dataFim`, `classificacao`, `hora` e `medicoId`.

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
