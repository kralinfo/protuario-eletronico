# ✏️ **Funcionalidade de Editar Atendimento**

## 📋 **Descrição**

Esta funcionalidade permite **editar e atualizar** os dados de atendimentos existentes, oferecendo controle completo sobre as informações registradas.

---

## 🎯 **Como Usar no Sistema**

### **1. 📱 No Grid de Atendimentos:**

1. **Acesse:** `Atendimentos do Dia`
2. **Localize** o atendimento na tabela
3. **Clique** no botão **azul** com ícone de edição (✏️)
4. **Atualize** as informações no dialog

### **2. 🖱️ Ações Disponíveis:**

Na tabela de atendimentos, cada linha tem botões:
- 🔵 **Azul** = **Editar** ← NOVA FUNCIONALIDADE!
- 🟣 **Roxo** = Gerar PDF  
- 🟠 **Laranja** = Registrar Abandono
- 🔴 **Vermelho** = Remover

### **3. ⚙️ Dialog de Edição:**

Campos editáveis:
- ✅ **Motivo do Atendimento** (obrigatório)
- ✅ **Observações** (opcional)
- ✅ **Status** (recepcao, triagem, consulta, ambulatorio, concluido)
- ✅ **Procedência** (ex: demanda espontânea)
- ✅ **Acompanhante** (nome, se houver)

Campos somente leitura:
- 👤 **Paciente** (não pode ser alterado)
- 📅 **Data/Hora** (não pode ser alterada)

---

## 🔧 **Funcionalidades Técnicas**

### **📊 Validações:**
- ✅ **Motivo obrigatório** - não pode estar vazio
- ✅ **Atendimento deve existir** - verificação no backend
- ❌ **Não permite editar** atendimentos abandonados
- ✅ **Sanitização** de dados (trim, validações)

### **🚫 Regras de Negócio:**
- ✅ Só permite edição de atendimentos **não abandonados**
- ✅ Atualiza **timestamp** de modificação automaticamente
- ✅ Registra **todas as alterações** no banco
- ✅ **Recarrega lista** após edição bem-sucedida

### **🗄️ Dados Atualizáveis:**
```sql
motivo       = novo texto do motivo
observacoes  = observações atualizadas
status       = novo status
procedencia  = procedência atualizada
acompanhante = nome do acompanhante
updated_at   = timestamp automático
```

---

## 🌐 **API Endpoints**

### **PUT** `/atendimentos/:id`

**Payload:**
```json
{
  "motivo": "Consulta de rotina - seguimento",
  "observacoes": "Paciente apresentou melhora significativa",
  "status": "consulta",
  "procedencia": "Demanda espontânea",
  "acompanhante": "Maria Silva (mãe)"
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Atendimento atualizado com sucesso.",
  "data": {
    "id": 123,
    "motivo": "Consulta de rotina - seguimento",
    "observacoes": "Paciente apresentou melhora significativa",
    "status": "consulta",
    "procedencia": "Demanda espontânea",
    "acompanhante": "Maria Silva (mãe)",
    "updated_at": "2025-08-04T01:00:00.000Z"
  }
}
```

**Errors:**
```json
{
  "error": "Motivo é obrigatório."
}
```

```json
{
  "error": "Não é possível editar um atendimento abandonado."
}
```

---

## 📈 **Interface do Dialog**

### **🎨 Layout:**
- **Header:** Título + dados do paciente (somente leitura)
- **Form:** Campos editáveis com validação
- **Footer:** Botões cancelar/salvar

### **✅ Feedback Visual:**
- **Verde:** Sucesso na atualização
- **Vermelho:** Erro de validação ou servidor
- **Loading:** Indicador durante salvamento
- **Auto-close:** Dialog fecha automaticamente após sucesso

### **📱 Responsivo:**
- **Desktop:** Width 600px
- **Mobile:** Adapta ao tamanho da tela
- **Max-height:** 90vh (scroll se necessário)

---

## 🚀 **Cenários de Uso**

### **📋 Cenário 1: Atualizar motivo**
1. Paciente registrado com motivo genérico
2. Após consulta, detalhar motivo específico
3. Editar e salvar com informações precisas

### **📋 Cenário 2: Alterar status**
1. Paciente na "recepção"
2. Movido para "triagem"
3. Atualizar status via edição

### **📋 Cenário 3: Adicionar acompanhante**
1. Atendimento registrado sem acompanhante
2. Familiar chega durante processo
3. Adicionar nome do acompanhante

### **📋 Cenário 4: Corrigir procedência**
1. Procedência marcada incorretamente
2. Verificar origem real do paciente
3. Corrigir informação no sistema

---

## ✅ **Validações do Sistema**

### **✅ Permitido:**
- Editar qualquer campo disponível no dialog
- Salvar com campos opcionais vazios
- Atualizar múltiplos campos de uma vez
- Cancelar edição sem salvar

### **❌ Não Permitido:**
- Editar atendimento **abandonado**
- Salvar sem motivo (campo obrigatório)
- Alterar **paciente** ou **data** do atendimento
- Editar atendimento **inexistente**

---

## 🔗 **Integração com Sistema**

### **🔄 Sincronização:**
- **Grid atualiza** automaticamente após edição
- **Dados persistem** no PostgreSQL
- **Auditoria** via updated_at timestamp
- **Feedback** em tempo real para usuário

### **🎯 Compatibilidade:**
- ✅ Funciona com **todas** as outras funcionalidades
- ✅ **Não afeta** abandono ou PDF
- ✅ **Mantém integridade** dos dados
- ✅ **Respeita permissões** de usuário

---

## 🎉 **Benefícios**

✅ **Correção rápida** de informações incorretas  
✅ **Atualização em tempo real** do status  
✅ **Detalhamento progressivo** conforme atendimento evolui  
✅ **Interface intuitiva** e responsiva  
✅ **Validação robusta** para integridade dos dados  
✅ **Auditoria automática** de modificações  

A funcionalidade está **100% operacional** e integrada ao sistema! 🎉
