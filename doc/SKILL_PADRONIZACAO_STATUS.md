# Skill: Padronização de Status (Snake Case)

Este documento define a estratégia e o mapeamento para padronizar todos os status de atendimento no sistema e-Prontuário para o formato `snake_case` (ex: `encaminhado_para_triagem`).

## 1. Visão Geral
O sistema atualmente possui inconsistências nos status armazenados no banco de dados, misturando formatos com espaços, acentos e prefixos numéricos (ex: "encaminhado para triagem" vs "encaminhado_para_triagem"). Esta skill orienta a unificação para um padrão resiliente.

## 2. Padrão de Nomenclatura
- Todos os status devem ser gravados e lidos como **lowercased snake_case**.
- Caracteres especiais e acentos devem ser removidos ou substituídos por sublinhados.
- Espaços devem ser substituídos por sublinhados.

## 3. Mapeamento de De/Para
Abaixo está o mapeamento das variantes encontradas para os novos padrões:

### 3.1. Triagem Pendente
- **Atual:** `encaminhado para triagem`, `triagem pendente`, `triagem_pendente`
- **Padrão:** `encaminhado_para_triagem`

### 3.2. Em Triagem
- **Atual:** `em triagem`, `em_triagem`
- **Padrão:** `em_triagem`

### 3.3. Aguardando Médico
- **Atual:** `aguardando medico`, `aguardando médico`, `encaminhado para sala medica`, `encaminhado para sala médica`, `3 - encaminhado para sala médica`
- **Padrão:** `aguardando_medico`

### 3.4. Em Atendimento
- **Atual:** `em atendimento`, `em atendimento médico`, `em_atendimento_medico`, `em atendimento ambulatorial`, `4 - em atendimento médico`
- **Padrão:** `em_atendimento`

### 3.5. Finalizados/Concluídos
- **Atual:** `atendimento concluido`, `atendimento concluído`, `finalizado`, `alta medica`, `alta médica`, `alta_medica`, `encaminhado para exames`, `8 - atendimento concluído`
- **Padrão:** `finalizado`

### 3.6. Interrompidos/Abandono
- **Atual:** `interrompido`, `abandonado`
- **Padrão:** `abandonado`

## 4. Estratégia de Implementação

### 4.1. Backend (Controladores e Modelos)
- Toda função que salva ou atualiza o status (ex: `atendimentosController.js`) deve converter a string antes do `INSERT/UPDATE`:
  ```javascript
  const statusPadrao = statusOriginal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_');
  ```
- Criar um script global de migração de dados para atualizar registros antigos no banco.

### 4.2. Frontend (Serviços e Componentes)
- Centralizar o `STATUS_MAP` em um arquivo de constantes ou no `AtendimentoService`.
- Utilizar um `pipe` ou função de utilidade para exibir os nomes amigáveis na UI, mantendo a lógica de filtro baseada no padrão `snake_case`.

## 5. Locais Críticos para Alteração
- `backend/src/controllers/atendimentosController.js`: Onde os status são injetados.
- `frontend/src/app/relatorios/relatorios.component.ts`: Onde o `STATUS_MAP` é consumido.
- `frontend/src/app/relatorios/relatorio-atendimentos.component.ts`: Onde o `STATUS_MAP` é consumido.
- `backend/init.sql` e scripts de semente: Garantir que novos dados de teste sigam o padrão.
