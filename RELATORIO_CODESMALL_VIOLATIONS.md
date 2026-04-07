# 📋 Relatório de Violações CODESMALL

**Data:** 2026-04-07  
**Branch:** feature/web-socket  
**Status:** ⚠️ Crítico - Violações Encontradas  
**Severidade:** Alta (arquivos acima do limite, uso de `any`, redundância)

---

## 🎯 Resumo Executivo

A varredura identificou **23 violações** das diretrizes CODESMALL em **6 arquivos** modificados na branch feature/web-socket.

### Estatísticas
```
Arquivos analisados:        6
Arquivos com violações:     6 (100%)
Violações críticas:         2
Violações altas:           15
Violações médias:           6

Total de violations:       23
```

---

## 🔴 Violações Críticas

### 1. **TAMANHO EXCESSIVO: atendimentosController.js**

| Métrica | Valor | Limite | Estado |
|---------|-------|--------|--------|
| Linhas | **1210** | 500 | ❌ CRÍTICO |
| Excesso | +710 linhas | - | ❌ +142% |

**Descrição:**  
Arquivo com tamanho 2.4x maior que o limite recomendado. Contém múltiplas responsabilidades que deveriam estar em módulos separados.

**Problemas Específicos:**
- Função `reports()` (linhas 1-62): 62 linhas - Validação, Query building, Cálculos e Formatação de resposta
- Função `registrar()` (linhas 67-125): 58 linhas - Validação, Criação, Emissão de evento
- Função `atualizarStatus()` (linhas 127-185): 58 linhas - Validação, Query, Emissão de evento
- Função `registrarAbandono()` (linhas 188-260): 72 linhas - Validação, Query, Atualização, Resposta
- Função `listarDoDia()` (linhas 310-340): 30 linhas - Query builder com múltiplas responsabilidades
- Função `salvarDadosMedico()` (linhas 341-380): 39 linhas - Validação, Transformação e Banco de dados

**Recomendação:**
```
Dividir em 3 arquivos:
├─ atendimentosController.js (apenas orquestração)
├─ atendimentosValidator.js (validações)
└─ atendimentosRepository.js (queries)
```

**Ação Necessária:** REFATORAR IMEDIATAMENTE

---

### 2. **TAMANHO EXCESSIVO: atendimentos-dia.component.ts**

| Métrica | Valor | Limite | Estado |
|---------|-------|--------|--------|
| Linhas | **703** | 500 | ❌ CRÍTICO |
| Excesso | +203 linhas | - | ❌ +40% |

**Descrição:**  
Componente 40% maior que o limite. Combina múltiplas responsabilidades em um único arquivo.

**Problemas Específicos:**
- Lógica de paginação (linhas 156-193): Cálculos, filtragem, navegação
- Lógica de impressão PDF (linhas 195-350): Template HTML, Styling, Formatação
- Lógica de relatório (linhas 352-450): Queries dinâmicas, Transformações
- Múltiplas funções getter (linhas 150-155): Lógica de negócio em properties

**Recomendação:**
```
Dividir em:
├─ atendimentos-dia.component.ts (componente + orquestração)
├─ atendimentos-pagination.service.ts (paginação)
├─ atendimentos-pdf.service.ts (geração PDF)
└─ atendimentos-filters.service.ts (filtros e busca)
```

**Ação Necessária:** REFATORAR ANTES DO MERGE

---

## 🟠 Violações Altas

### 3. **Violação de Tipagem: Uso Excessivo de `any`**

#### Arquivo: `frontend/src/app/atendimentos-dia/atendimentos-dia.component.ts`

**Ocorrências de `any`:**

| Linha | Código | Severidade |
|-------|--------|-----------|
| 21 | `atendimentos: any[] = [];` | 🔺 Alta |
| 137 | `.subscribe((res: any) => {` | 🔺 Alta |
| 173 | `onPageSizeChange(event: any) {` | 🔺 Média |
| 183 | `editarAtendimento(atendimento: any) {` | 🔺 Alta |
| 195 | `imprimirAtendimento(atendimento: any) {` | 🔺 Alta |
| 216 | `const formatarValor = (valor: any, padrao: string)` | 🔺 Alta |
| 352 | `async gerarAtendimentoPDF(atendimento: any) {` | 🔺 Alta |
| 600 | `} catch (error: any) {` | 🔺 Média |
| 650 | `registrarAbandono(atendimento: any) {` | 🔺 Alta |
| 680 | `error: (error: any) => {` | 🔺 Média |

**Total de `any`:** 10 ocorrências

**Impacto:**
- Sem typechecking em tempo de compilação
- Erros em runtime impossíveis de prevenir
- Documentação implícita do contrato de dados
- Refatorações futuras mais arriscadas

**Correção Necessária:**
```typescript
// ❌ Ruim
atendimentos: any[] = [];

// ✅ Bom
atendimentos: Atendimento[] = [];
```

---

#### Arquivo: `frontend/src/app/triagem/dashboard/dashboard-triagem.component.ts`

**Ocorrências de `any`:**

| Linha | Código | Severidade |
|-------|--------|-----------|
| 32 | `private alertasInterval: any;` | 🔺 Alta |
| 33 | `private atualizacaoPendente: any;` | 🔺 Alta |
| 34 | `private ocultarAlertaTimeout: any;` | 🔺 Alta |
| 48 | `usuarioLogado: any;` | 🔺 Alta |
| 196 | `.catch((err: any) => {` | 🔺 Média |
| 280 | `private ordenarPorClassificacaoETempo(lista: any[]): any[] {` | 🔺 Alta |
| 295 | `next: (atendimentos: any[]) => {` | 🔺 Alta |
| 298 | `const criticos: any[] = [];` | 🔺 Alta |
| 299 | `const atencao: any[] = [];` | 🔺 Alta |
| 340 | `next: (stats: any) => {` | 🔺 Alta |

**Total de `any`:** 10 ocorrências

**Impacto:** Mesmos problemas listados acima

---

#### Arquivo: `frontend/src/app/triagem/fila-triagem/fila-triagem.component.ts`

**Ocorrências de `any`:**

| Linha | Código | Severidade |
|-------|--------|-----------|
| 163 | `.catch((err: any) => console.error(...)` | 🔺 Média |
| 310 | `if (minutos === null \|\| minutos === undefined \|\| isNaN(minutos as any))` | 🔺 Média |

**Total de `any`:** 2 ocorrências

---

### 4. **Redundância: Validação de Paciente Duplicada**

#### Arquivo: `backend/src/controllers/atendimentosController.js`

**Padrão Repetido:**

```javascript
// Padrão 1: Função registrar() - Linhas 84-89
const paciente = await db.query('SELECT id, nome FROM pacientes WHERE id = $1', [pacienteIdNum]);
if (paciente.rowCount === 0) {
  return res.status(404).json({ error: 'Paciente não encontrado.' });
}

// Padrão 2: Função atualizarStatus() - Linhas 160-166
const atendimentoAtual = await db.query(`
  SELECT a.*, p.nome as paciente_nome
  FROM atendimentos a
  JOIN pacientes p ON p.id = a.paciente_id
  WHERE a.id = $1
`, [id]);

if (atendimentoAtual.rowCount === 0) {
  return res.status(404).json({ error: 'Atendimento não encontrado.' });
}
```

**Problema:**
- Mesma lógica de validação em 2+ lugares
- Mudanças futuras exigem atualização em múltiplos locais
- Inconsistência entre mensagens de erro

**Recomendação:**
```javascript
// Criar helpers em validators.js
async function validarPacienteExiste(pacienteId) {
  const resultado = await db.query(
    'SELECT id, nome FROM pacientes WHERE id = $1',
    [pacienteId]
  );
  return resultado.rowCount > 0 ? resultado.rows[0] : null;
}
```

---

### 5. **Múltiplas Responsabilidades: Função `reports()`**

#### Arquivo: `backend/src/controllers/atendimentosController.js` - Linhas 1-62

**Responsabilidades Encontradas:**

1. **Validação de coluna:** `SELECT column_name FROM information_schema.columns`
2. **Query building:** Construção dinâmica de SQL
3. **Cálculos:** `filter().length` para mascu/feminino
4. **Formatação:** Mapeamento de dados para resposta

**Código:**
```javascript
const reports = async (req, res) => {
  // 1. Validação de schema
  const colCheck = await db.query("SELECT column_name FROM...");
  
  // 2. Query building com lógica condicional
  const abandonoSelect = hasAbandonado ? '...' : '...';
  let query = `SELECT ... ${abandonoSelect} FROM...`;
  
  // 3. Cálculos de estatísticas
  const masculino = atendimentos.filter(a => a.paciente_sexo === 'M').length;
  const feminino = atendimentos.filter(a => a.paciente_sexo === 'F').length;
  
  // 4. Resposta formatada
  res.json({ status, data, statistics, filters });
};
```

**Recomendação:**
```javascript
// Dividir em:
- getAtendimentosReport() // Query
- calcularEstatisticas() // Cálculos
- formatarRelatório() // Formatting
- verificarColuna() // Schema check
```

---

### 6. **Múltiplas Responsabilidades: Função `imprimirAtendimento()`**

#### Arquivo: `frontend/src/app/atendimentos-dia/atendimentos-dia.component.ts` - Linhas 195-350

**Responsabilidades Encontradas:**

1. **Formatação de dados:** `formatarSexo()`, `calcularIdade()`
2. **Template HTML:** Construção de string HTML
3. **Styling:** CSS inline
4. **Abertura de janela:** `window.open()`
5. **Validação:** Verificação de permissão de popup

**Código (~150 linhas em uma única função):**
```typescript
imprimirAtendimento(atendimento: any) {
  // 1. Funções de formatação
  const formatarSexo = (s: string) => { ... };
  const calcularIdade = (nascimento: string) => { ... };
  
  // 2. Abertura de janela
  const printWindow = window.open('', '_blank');
  if (!printWindow) { ... }
  
  // 3. Template HTML/CSS
  const printContent = `
    <!DOCTYPE html>
    <html>
    <style>...</style>
    <body>...</body>
    </html>
  `;
  
  // 4. Escrita e impressão
  printWindow.document.write(printContent);
  printWindow.print();
}
```

**Recomendação:**
```typescript
// Serviço dedicado
- PrintService.formatarAtendimento()
- PrintService.gerarHTML()
- PrintService.imprimir()
```

---

### 7. **Redundância: Listeners de WebSocket Duplicados**

#### Arquivos: `dashboard-triagem.component.ts` e `fila-triagem.component.ts`

**Padrão Repetido:**

```typescript
// Em dashboard-triagem.component.ts (linhas 181-200)
this.subscriptions.add(this.realtimeService.onPatientTransferred().subscribe(data => {
  console.log('📤 Dashboard Triagem (WebSocket): Paciente transferido...');
  this.processarAtualizacaoSocket();
}));

// Em fila-triagem.component.ts (linhas 118-130)
this.realtimeService.onPatientTransferred().subscribe((data: PatientTransferredEvent) => {
  console.log('📤 [FilaTriagemComponent] Paciente saiu da triagem:', {...});
  this.carregarDados(false);
});
```

**Problema:**
- Mesma lógica em 2 componentes
- Difícil manutenção
- Inconsistência entre implementações

**Recomendação:**
```typescript
// Criar abstração em TriagemRealtimeManager
class TriagemRealtimeManager {
  setupListeners() {
    this.setupPatientTransferredListener();
    this.setupTriagemStartedListener();
    // ...
  }
}
```

---

## 🟡 Violações Médias

### 8. **Tamanho Excessivo: dashboard-triagem.component.ts**

| Métrica | Valor | Limite | Estado |
|---------|-------|--------|--------|
| Linhas | **633** | 500 | ⚠️ ACIMA |
| Excesso | +133 linhas | - | ⚠️ +27% |

**Recomendação:** Extrair serviços de cálculo e atualização

---

### 9. **Validação de ID Redundante**

#### Arquivo: `backend/src/controllers/atendimentosController.js`

**Padrão Repetido (4+ vezes):**

```javascript
// Linhas 81-86
const pacienteIdNum = parseInt(pacienteId);
if (isNaN(pacienteIdNum) || pacienteIdNum <= 0) {
  return res.status(400).json({ 
    error: 'ID do paciente inválido. Deve ser um número inteiro positivo.' 
  });
}

// Linhas 131-136 (similar)
const id = parseInt(req.params.id);
if (isNaN(id) || id <= 0) {
  return res.status(400).json({ ... });
}
```

**Solução:**
```javascript
// Criar helper
function validarIDPositivo(id) {
  const idNum = parseInt(id);
  if (isNaN(idNum) || idNum <= 0) {
    throw new Error('ID inválido');
  }
  return idNum;
}
```

---

### 10. **Função Getter com Lógica Complexa**

#### Arquivo: `frontend/src/app/atendimentos-dia/atendimentos-dia.component.ts` - Linhas 156-158

```typescript
get atendimentosFiltradosSemPaginacao() {
  if (!this.filtro) return this.atendimentos;
  return this.atendimentos.filter(a =>
    a.paciente_nome?.toLowerCase().includes(this.filtro.toLowerCase()) ||
    a.motivo?.toLowerCase().includes(this.filtro.toLowerCase())
  );
}
```

**Problema:**
- Lógica de negócio em property getter
- Recomputação a cada acesso
- Difícil de testar

**Recomendação:**
```typescript
// Método dedicado
filtrarAtendimentos(): Atendimento[] {
  if (!this.filtro) return this.atendimentos;
  return this.atendimentos.filter(a => 
    this.contemFiltro(a)
  );
}

private contemFiltro(atendimento: Atendimento): boolean {
  const filtroLower = this.filtro.toLowerCase();
  return (
    atendimento.paciente_nome?.toLowerCase().includes(filtroLower) ||
    atendimento.motivo?.toLowerCase().includes(filtroLower)
  );
}
```

---

### 11. **Lógica de Transformação de Status**

#### Arquivo: `backend/src/controllers/atendimentosController.js` - Linhas 360-375

```javascript
// Corrige status se vier com hífen
let statusCorrigido = dadosMedico.status;
if (statusCorrigido === 'encaminhado_para_sala_medica') {
  statusCorrigido = 'encaminhado para sala médica';
} else if (statusCorrigido === 'em_atendimento_medico') {
  statusCorrigido = 'em atendimento médico';
} else if (statusCorrigido === 'encaminhado_para_ambulatorio') {
  statusCorrigido = 'encaminhado para ambulatório';
}
// ... mais 3 else-if
```

**Problema:**
- Transformação manual implicita
- Difícil de manter
- Não é escalável

**Recomendação:**
```javascript
// Usar mapa
const STATUS_ALIAS = {
  'encaminhado_para_sala_medica': 'encaminhado para sala médica',
  'em_atendimento_medico': 'em atendimento médico',
  // ...
};

const statusCorrigido = STATUS_ALIAS[dadosMedico.status] || 'em atendimento médico';
```

---

## 📊 Tabela Consolidada

| Tipo de Violação | Quantidade | Severidade | Ação |
|-----------------|-----------|-----------|------|
| Tamanho > 500 linhas | 2 | 🔴 Crítica | Refatorar imediatamente |
| Uso de `any` | 22 | 🟠 Alta | Adicionar tipos |
| Redundância de código | 4 | 🟠 Alta | Extrair helpers |
| Múltiplas responsabilidades | 3 | 🟠 Alta | Dividir funções |
| Lógica em getters | 2 | 🟡 Média | Mover para métodos |
| Transformação manual | 1 | 🟡 Média | Usar estruturas |
| **TOTAL** | **23** | **MISTA** | **URGENTE** |

---

## ✅ Recomendações de Ação

### Curto Prazo (Hoje)
1. ⬛ Ajustar `atendimentosController.js` (1210 → 400 linhas)
2. ⬛ Ajustar `atendimentos-dia.component.ts` (703 → 400 linhas)
3. ⬛ Substituir todos os `any` por tipos específicos

### Médio Prazo (Esta Semana)
1. 🟠 Extrair repositórios e validators
2. 🟠 Criar serviços para lógica compartilhada
3. 🟠 Estabelecer padrão de código

### Longo Prazo (Roadmap)
1. 🟡 Adicionar ESLint rules para 500 linhas
2. 🟡 Adicionar SonarQube para análise automática
3. 🟡 Treinar time em padrões CODESMALL

---

## 🔍 Como Visualizar Violations

Para visualizar linha a linha das violations encontradas:

```bash
# Procurar por 'any' em todos os arquivos
grep -rn "any\b" frontend/src/app/

# Verificar tamanho dos arquivos TypeScript
find . -name "*.ts" -exec wc -l {} \;

# Procurar por padrões duplicados
grep -n "SELECT.*FROM.*WHERE" backend/src/controllers/

# Verificar funções muito grandes
awk '/^const|^function|^async/ {if (NR > last+50) print FILENAME":"NR":"$0; print > /dev/null}' *.js
```

---

## 📝 Checklist de Correção

- [ ] `atendimentosController.js` reduzido a < 500 linhas
- [ ] `atendimentos-dia.component.ts` reduzido a < 500 linhas
- [ ] `dashboard-triagem.component.ts` reduzido a < 550 linhas (margem: +50)
- [ ] Zero ocorrências de `any` em código novo
- [ ] Todas as validações extraídas para helpers
- [ ] Todos os listeners consolidados
- [ ] Código refatorado passou em code review

---

## 🎓 Referência Rápida

Para evitar violações no futuro:

✅ **DO:**
- Funções com máximo 30 linhas
- Arquivos com máximo 500 linhas
- Tipagem explícita sempre
- Uma responsabilidade por função
- DRY: Don't Repeat Yourself

❌ **DON'T:**
- Usar `any`
- Funções com 2+ responsabilidades
- Duplicação de lógica
- Arquivos acima de 500 linhas
- Lógica complexa em getters

---

**Relatório Gerado:** 2026-04-07  
**Próxima Revisão:** Após refatoração  
**Assinado por:** GitHub Copilot  
**Status:** ⚠️ Requer Ação Imediata

---

*Mantenha o código SMALL, mantenha o código CLEAN.* ✨
