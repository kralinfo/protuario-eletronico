# Skill: Relatório de Pacientes (Estatísticas e Filtros)

Este documento descreve a implementação técnica da tela de Relatório de Pacientes do e-Prontuário, focando na interface de filtros demográficos e indicadores de atendimento.

## 1. Visão Geral
A tela de **Relatório de Pacientes** (localizada no componente `RelatoriosComponent`) oferece uma visão analítica da base de pacientes cadastrados. Diferente do relatório de atendimentos, esta tela foca em dados demográficos (sexo, município, escolaridade) e integra indicadores em tempo real do fluxo da unidade.

## 2. Tecnologias
- **Frontend:** Angular (Standalone Component), Tailwind CSS, SCSS.
- **Backend:** Node.js (Express), Knex.js/PostgreSQL.
- **Utilitários:** jsPDF (Relatórios PDF), Reactive Forms.

## 3. Endpoints Utilizados
Os seguintes endpoints da API de pacientes e atendimentos são consumidos:

| Método | Endpoint | Função |
|:--- |:--- |:--- |
| **GET** | `/api/pacientes/reports` | Busca a lista completa de pacientes com dados demográficos para filtragem local. |
| **GET** | `/api/atendimentos/reports` | Consumido para alimentar os cards coloridos de estatísticas (Triagem, Médico, etc). |
| **GET** | `/api/pacientes/estados-civis` | Busca dinamicamente os estados civis presentes no banco para o filtro. |
| **GET** | `/api/pacientes/escolaridades` | Busca dinamicamente as escolaridades presentes no banco para o filtro. |

## 4. Funcionalidades da Interface
- **Cards de Estatísticas Coloridos:** Indicadores visuais rápidos do estado atual da unidade (Pendente, Em Triagem, Aguardando Médico, etc).
- **Filtros Demográficos:** Grid de filtros para Sexo, Município, UF, Estado Civil e Escolaridade.
- **Exportação Dual:** Geração de PDF Simples (Lista) e Detalhado (Dados completos do paciente).
- **Tabela Responsiva:** Listagem com gradiente no cabeçalho e paginação integrada.

## 5. Estrutura de Arquivos
- `frontend/src/app/relatorios/relatorios.component.html`: Estrutura de grids e cards.
- `frontend/src/app/relatorios/relatorios.component.scss`: Animações de fade-in e estilos de impressão.
- `frontend/src/app/relatorios/relatorios.component.ts`: Lógica de cruzamento de dados de pacientes e contadores de atendimentos.
- `backend/src/routes/pacientes.js`: Definição das rotas de relatórios demográficos.
- `backend/src/controllers/pacientesController.js`: Lógica de agregação de dados de pacientes.
