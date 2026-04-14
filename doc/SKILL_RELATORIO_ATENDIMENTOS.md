# Skill: Relatório de Atendimentos (Modern UI)

Este documento descreve a implementação técnica da tela de Relatório de Atendimentos do e-Prontuário, focando na interface moderna com abas animadas e integração com o backend.

## 1. Visão Geral
A tela de **Relatório de Atendimentos** permite a gestão e auditoria do fluxo de pacientes. Ela oferece filtros avançados por período, status, nome do paciente e observações, apresentando os resultados em uma tabela paginada e segmentada por status de atendimento.

## 2. Tecnologias
- **Frontend:** Angular 18 (Standalone Components), Tailwind CSS, SCSS.
- **Backend:** Node.js (Express), Knex.js, PostgreSQL.
- **Utilitários:** jsPDF (Geração de relatórios), Reactive Forms (Filtros).

## 3. Endpoints Utilizados
Os seguintes endpoints da API de atendimentos são consumidos por esta tela:

| Método | Endpoint | Função |
|:--- |:--- |:--- |
| **GET** | `/api/atendimentos/todos` | Carregamento inicial de todos os atendimentos para os contadores das abas. |
| **GET** | `/api/atendimentos/por-status` | Filtragem flexível aceitando um ou múltiplos status. |
| **GET** | `/api/atendimentos/reports` | Geração de dados brutos formatados para PDF. |

## 4. Funcionalidades da Interface
- **Filtro Horizontal Compacto:** Otimiza o espaço de trabalho.
- **Indicador de Aba Animado:** Um `tab-indicator` que desliza entre as categorias usando cálculos de telemetria no TypeScript (`getBoundingClientRect`).
- **Mapeamento de Variantes de Status:** Sistema inteligente que traduz diferentes strings do banco (ex: "em_triagem", "em triagem") para categorias unificadas.
- **Busca Rápida Local:** Campo de busca instantânea para filtrar a lista atual sem nova requisição à API.

## 5. Estrutura de Arquivos
- `frontend/src/app/relatorios/relatorio-atendimentos.component.html`: Estrutura visual.
- `frontend/src/app/relatorios/relatorio-atendimentos.component.scss`: Estilos das abas e botões.
- `frontend/src/app/relatorios/relatorio-atendimentos.component.ts`: Lógica de filtragem e UI.
- `backend/src/routes/atendimentos.js`: Configuração das rotas.
- `backend/src/controllers/atendimentosController.js`: Lógica de banco de dados.
