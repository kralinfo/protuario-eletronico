# 🚪 **Funcionalidade de Abandono de Atendimento**

## 📋 **Descrição**

Esta funcionalidade permite registrar quando um paciente **sai da unidade sem completar o atendimento**, fornecendo controle total sobre os atendimentos não finalizados.

---

## 🎯 **Como Usar no Sistema**

### **1. 📱 No Grid de Atendimentos:**

1. **Acesse:** `Atendimentos do Dia`
2. **Localize** o atendimento na tabela
3. **Clique** no botão **laranja** com ícone de saída (🚪)
4. **Preencha** as informações do abandono

### **2. 🖱️ Ações Disponíveis:**

Na tabela de atendimentos, cada linha tem botões:
- 🔵 **Azul** = Editar
- 🟣 **Roxo** = Gerar PDF  
- 🟠 **Laranja** = **Registrar Abandono** ← NOVA!
- 🔴 **Vermelho** = Remover

### **3. ⚙️ Dialog de Abandono:**

Campos obrigatórios:
- ✅ **Etapa onde abandonou:**
  - `Recepção` - Paciente saiu antes/durante recepção
  - `Triagem` - Saiu durante ou após triagem
  - `Sala Médica` - Saiu antes/durante consulta médica
  - `Ambulatório` - Saiu durante procedimentos
  - `Sala de Espera` - Saiu enquanto aguardava

Campos opcionais:
- 📝 **Motivo do abandono** (texto livre)

---

## 🔧 **Funcionalidades Técnicas**

### **📊 Status Visual:**
- ❌ **"ABANDONADO"** - Badge vermelho
- ✅ **"CONCLUIDO"** - Badge verde  
- 🟡 **"RECEPCAO"** - Badge amarelo
- 🔵 **"TRIAGEM"** - Badge azul

### **🚫 Regras de Negócio:**
- ✅ Só permite abandono em atendimentos **não concluídos**
- ✅ Só permite abandono em atendimentos **não abandonados**
- ✅ Registra **data/hora automática** do abandono
- ✅ Registra **usuário** que fez o abandono
- ✅ Atualiza **status** para "abandonado"

### **🗄️ Dados Armazenados:**
```sql
abandonado          = true
data_abandono       = timestamp automático
motivo_abandono     = texto informado pelo usuário
etapa_abandono      = etapa selecionada
usuario_abandono_id = ID do usuário logado
status              = 'abandonado'
```

---

## 🌐 **API Endpoints**

### **PATCH** `/atendimentos/:id/abandono`

**Payload:**
```json
{
  "etapa_abandono": "recepcao",
  "motivo_abandono": "Paciente saiu por emergência familiar",
  "usuario_id": 1
}
```

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Atendimento marcado como abandonado com sucesso.",
  "data": {
    "id": 123,
    "abandonado": true,
    "data_abandono": "2025-08-04T00:30:00.000Z",
    "etapa_abandono": "recepcao",
    "motivo_abandono": "Paciente saiu por emergência familiar"
  }
}
```

---

## 📈 **Relatórios e Filtros**

### **🔍 Grid Atualizado:**
- Mostra status **"ABANDONADO"** com destaque visual
- Filtra por **status** incluindo abandonados
- Botão de abandono **visível apenas** quando aplicável

### **📋 Relatórios:**
- Atendimentos abandonados aparecem nos relatórios
- Possibilidade de filtrar **apenas abandonados**
- Estatísticas de **taxa de abandono**

---

## 🚀 **Cenários de Uso**

### **📋 Cenário 1: Paciente sai da recepção**
1. Paciente chega, faz cadastro
2. Sai antes da triagem (emergência, desistência)
3. Recepcionista marca como "abandonado" na etapa "recepção"

### **📋 Cenário 2: Paciente sai da sala de espera**
1. Paciente passa pela triagem
2. Aguarda na sala de espera
3. Desiste e vai embora
4. Enfermeiro marca como "abandonado" na etapa "espera"

### **📋 Cenário 3: Paciente sai durante consulta**
1. Paciente está em consulta médica
2. Sai no meio do atendimento
3. Médico marca como "abandonado" na etapa "sala_medica"

---

## ✅ **Validações do Sistema**

### **✅ Permitido:**
- Abandonar atendimento com status "recepcao", "triagem", etc.
- Qualquer usuário logado pode registrar abandono
- Motivo é opcional (pode ficar em branco)

### **❌ Não Permitido:**
- Abandonar atendimento já **concluído**
- Abandonar atendimento já **abandonado**
- Registrar abandono sem informar **etapa**

---

## 🎯 **Benefícios**

✅ **Controle completo** dos atendimentos não finalizados  
✅ **Rastreabilidade** de quando e onde paciente saiu  
✅ **Dados estatísticos** para gestão da unidade  
✅ **Organização** do fluxo de atendimento  
✅ **Histórico** detalhado para auditoria  

A funcionalidade está **100% operacional** e integrada ao sistema! 🎉
