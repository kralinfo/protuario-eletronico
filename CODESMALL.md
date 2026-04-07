# 📋 CODESMALL - Diretrizes de Boas Práticas

**Versão:** 1.0  
**Data:** 2026-04-07  
**Objetivo:** Manter código limpo, mantenível e escalável

---

## 🎯 Princípios Fundamentais

O termo **CODESMALL** representa um conjunto de diretrizes para garantir que o código seja:
- **Small** (Pequeno): Funções e arquivos compactos
- **Clean** (Limpo): Sem redundância ou duplicação
- **Responsible** (Responsável): Uma responsabilidade por unidade
- **Strongly Typed** (Tipado): Sem `any`, sempre tipagem explícita
- **Modular** (Modular): Fácil de dividir e reutilizar
- **Atomic** (Atômico): Cada função faz uma coisa bem
- **Low coupled** (Baixo acoplamento): Independente de outras partes

---

## 1️⃣ Funções Atômicas

### Regra
Cada função deve ter **apenas uma responsabilidade**. Uma função que faz duas coisas deve ser dividida em duas.

### ❌ Exemplo Ruim
```typescript
function criarEAtualizarPaciente(paciente: Paciente) {
  // Valida paciente
  if (!paciente.nome) throw new Error('Nome obrigatório');
  
  // Cria no banco
  const id = db.insert(paciente);
  
  // Envia notificação
  sendEmail(paciente.email);
  
  // Emite evento
  eventBus.emit('patient:created', { id, nome: paciente.nome });
  
  return id;
}
```

**Violações:**
- Validação
- Inserção no banco
- Notificação por email
- Emissão de evento

### ✅ Exemplo Bom
```typescript
// Função 1: Validar
function validarPaciente(paciente: Paciente): void {
  if (!paciente.nome) throw new Error('Nome obrigatório');
  if (!paciente.email) throw new Error('Email obrigatório');
}

// Função 2: Criar
async function criarPaciente(paciente: Paciente): Promise<number> {
  validarPaciente(paciente);
  return await db.insert(paciente);
}

// Função 3: Notificar
async function notificarNovoPaciente(paciente: Paciente): Promise<void> {
  await emailService.send(paciente.email, 'Bem-vindo!');
}

// Função 4: Publicar evento
function publicarPacienteCriado(id: number, nome: string): void {
  eventBus.emit('patient:created', { id, nome });
}

// Orquestrador: combina as funções
async function procesarNovoPaciente(paciente: Paciente): Promise<number> {
  const id = await criarPaciente(paciente);
  await notificarNovoPaciente(paciente);
  publicarPacienteCriado(id, paciente.nome);
  return id;
}
```

### Checklist
- [ ] A função tem apenas um motivo para mudar?
- [ ] Ela pode ser testada isoladamente?
- [ ] Seu nome descreve exatamente o que faz?
- [ ] Ela não chama muitas outras funções (máximo 3-4)?

---

## 2️⃣ Redundância Proibida

### Regra
Nunca duplicar código. Se a mesma lógica aparece 2+ vezes, **refatorar em uma função reutilizável**.

### ❌ Exemplo Ruim
```typescript
// Em atendimentosController.js
async function registrar(req, res) {
  const paciente = await db.query('SELECT id FROM pacientes WHERE id = $1', [pacienteIdNum]);
  if (paciente.rowCount === 0) {
    return res.status(404).json({ error: 'Paciente não encontrado.' });
  }
  // ... resto do código
}

// Em triagemController.js
async function iniciarTriagem(req, res) {
  const paciente = await db.query('SELECT id FROM pacientes WHERE id = $1', [pacienteIdNum]);
  if (paciente.rowCount === 0) {
    return res.status(404).json({ error: 'Paciente não encontrado.' });
  }
  // ... resto do código
}
```

**Problema:** Validação duplicada

### ✅ Exemplo Bom
```typescript
// Em um novo arquivo: validators.js
async function validarPacienteExiste(pacienteId: number): Promise<void> {
  const paciente = await db.query('SELECT id FROM pacientes WHERE id = $1', [pacienteId]);
  if (paciente.rowCount === 0) {
    throw new Error('Paciente não encontrado.');
  }
}

// Reutilizar em ambos controllers
async function registrar(req, res) {
  try {
    await validarPacienteExiste(pacienteIdNum);
    // ... resto do código
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
}
```

### Checklist
- [ ] A lógica aparece mais de uma vez no projeto?
- [ ] Existe uma função que encapsula essa lógica?
- [ ] Todos os lugares chamam essa função?
- [ ] A função é testável isoladamente?

---

## 3️⃣ Tipagem Forte (Sem `any`)

### Regra
Sempre usar **tipagem explícita**. Nunca usar `any`. Se necessário, usar `unknown` e fazer type guard.

### ❌ Exemplo Ruim
```typescript
// Ruim: any permite qualquer coisa
function processarDados(dados: any): any {
  return dados.map((item: any) => ({
    id: item.id,
    nome: item.nome
  }));
}

// Chamar função sem garantia de tipo
const resultado = processarDados(dadosAleatorios);
```

### ✅ Exemplo Bom
```typescript
// Bom: tipos explícitos
interface Paciente {
  id: number;
  nome: string;
  email: string;
}

function processarPacientes(pacientes: Paciente[]): Array<{ id: number; nome: string }> {
  return pacientes.map(paciente => ({
    id: paciente.id,
    nome: paciente.nome
  }));
}

// Se dados vêm de fonte externa, validar primeiro
function validarPacientes(dados: unknown): Paciente[] {
  if (!Array.isArray(dados)) {
    throw new Error('Dados devem ser um array');
  }
  
  return dados.map(item => {
    if (typeof item !== 'object' || item === null) {
      throw new Error('Item inválido');
    }
    
    const obj = item as Record<string, unknown>;
    return {
      id: Number(obj.id),
      nome: String(obj.nome),
      email: String(obj.email)
    };
  });
}
```

### Tipos Proibidos
```typescript
❌ any          // Nunca usar
❌ any[]        // Array sem tipo
❌ (param: any) // Parâmetros sem tipo

✅ unknown      // Usar em inputs não tipados
✅ Tipo | null  // Union types explícitos
✅ generic<T>   // Genéricos tipados
```

### Checklist
- [ ] Nenhuma variável tem tipo `any`?
- [ ] Todos os parâmetros de função tem tipo?
- [ ] Todos os retornos de função tem tipo?
- [ ] Objetos retornam interfaces definidas?

---

## 4️⃣ Tamanho dos Arquivos

### Regra
Nenhum arquivo deve ter **mais de 500 linhas**. Se aproximando disso, **dividir em módulos menores**.

### Limite de Tamanho
```
0-200 linhas     → ✅ Excelente
200-400 linhas   → ✅ Bom
400-500 linhas   → ⚠️ Atenção - refatorar quando possível
500+ linhas      → ❌ Crítico - dividir imediatamente
```

### Exemplo: Dashboard com 600 linhas

#### ❌ Antes (1 arquivo - 600 linhas)
```
dashboard.component.ts (600 linhas)
├─ ngOnInit logic
├─ Carregamento de dados
├─ Listeners de WebSocket
├─ Atualização de gráficos
├─ Cálculo de estatísticas
├─ Formatação de dados
└─ UI events
```

#### ✅ Depois (Dividido em 4 arquivos - <150 linhas cada)
```
dashboard.component.ts (150 linhas)
├─ Component setup
├─ ngOnInit orchestration
└─ UI event handlers

dashboard-data.service.ts (120 linhas)
├─ Carregamento de dados
├─ API calls
└─ Cache

dashboard-realtime.service.ts (100 linhas)
├─ WebSocket connections
├─ Event listeners
└─ Data updates

dashboard-stats.service.ts (110 linhas)
├─ Cálculo de estatísticas
├─ Formatação de dados
└─ Transformação
```

### Checklist
- [ ] Arquivo tem menos de 500 linhas?
- [ ] Cada classe tem máximo 2-3 responsabilidades?
- [ ] Métodos têm menos de 30 linhas?
- [ ] Arquivo pode ser dividido logicamente?

---

## 5️⃣ Tamanho de Funções

### Regra
Funções devem ser **pequenas e focadas**. Máximo:
- **20 linhas** para lógica de negócio
- **30 linhas** para orquestração
- **50 linhas** em casos excepcionais

### ❌ Exemplo Ruim (150 linhas)
```typescript
async function processarAtendimento(req, res) {
  // 1. Validação (20 linhas)
  // 2. Banco de dados (30 linhas)
  // 3. Cálculos (25 linhas)
  // 4. Formatação (20 linhas)
  // 5. Eventos (20 linhas)
  // 6. Resposta (15 linhas)
}
```

### ✅ Exemplo Bom (funções pequenas)
```typescript
async function processarAtendimento(req, res) {
  try {
    const dados = await validarRequisicao(req);
    const atendimento = await criarAtendimento(dados);
    const evento = formatarEvento(atendimento);
    publicarEvento(evento);
    return res.status(201).json(atendimento);
  } catch (erro) {
    return res.status(400).json({ error: erro.message });
  }
}
```

### Checklist
- [ ] Função tem menos de 30 linhas?
- [ ] Nome da função descreve exatamente o que ela faz?
- [ ] Todos os paths podem ser testados?
- [ ] Sem lógica aninhada profunda (máximo 2 níveis)?

---

## 📏 Métricas de Qualidade

### Usar para monitorar
```
Métrica                    Meta
─────────────────────────────────
Linhas por arquivo         < 500
Linhas por função          < 30
Complessidade ciclomática  < 10
Cobertura de testes        > 80%
Duplicação de código       < 5%
```

### Ferramentas Recomendadas
- **ESLint** - Lint de código
- **SonarQube** - Análise de qualidade
- **VS Code Metrics** - Métricas de código
- **TypeScript strict** - Tipagem forte

---

## 🔍 Refatoração: Checklist

Ao revisar código, verificar:

### 1. Responsabilidade Única
- [ ] Função tem 1 razão para mudar?
- [ ] Pode ser testada isoladamente?
- [ ] Nome descreve tudo que faz?

### 2. Sem Redundância
- [ ] Lógica aparece 2+ vezes?
- [ ] Pode ser extraída em função?
- [ ] Todos reutilizam a mesma função?

### 3. Tipagem Explícita
- [ ] Nenhum `any`?
- [ ] Type guards para `unknown`?
- [ ] Interfaces bem definidas?

### 4. Tamanho Apropriado
- [ ] Arquivo < 500 linhas?
- [ ] Função < 30 linhas?
- [ ] Classe < 2-3 responsabilidades?

### 5. Qualidade
- [ ] Está testada?
- [ ] Error handling implementado?
- [ ] Sem lógica duplicada?

---

## 📚 Referências

- [Clean Code - Robert Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Single Responsibility Principle](https://wikipedia.org/wiki/Single-responsibility_principle)
- [DRY - Don't Repeat Yourself](https://wikipedia.org/wiki/Don%27t_repeat_yourself)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

---

## 🚀 Como Aplicar

1. **Imediato:** Usar este documento como referência para code reviews
2. **Curto Prazo:** Refatorar código não-conforme na branch atual
3. **Médio Prazo:** Adicionar linting rules automático
4. **Longo Prazo:** Treinar time e estabelecer cultura **CODESMALL**

---

**Desenvolvido:** 2026-04-07  
**Status:** ✅ Ativo  
**Responsável:** Equipe de Desenvolvimento  
**Revisão:** Trimestral

---

## ❓ Perguntas Frequentes

**P: E se uma função precisar fazer 2 coisas?**
A: Dividir em 2 funções + 1 função orquestradora.

**P: E se `any` for mais prático?**
A: Não é. Usar `unknown` + validação é mais seguro.

**P: E se o arquivo ficar muito grande?**
A: Dividir em módulos menores (services, utilities, etc).

**P: E se a função precisar de 50+ linhas?**
A: Provavelmente tem múltiplas responsabilidades. Refatorar.

---

*Mantenha o código SMALL, mantenha o código CLEAN.* ✨
