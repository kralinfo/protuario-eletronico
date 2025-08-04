# 🚀 Como Deployar o Backend no Render

## 📋 Problema Identificado
A API de produção não está acessível. Nenhuma das URLs testadas está funcionando.

## 🔧 Solução: Deploy no Render

### **1. Acesse o Render:**
- Vá em: https://render.com
- Faça login na sua conta

### **2. Criar Novo Web Service:**
1. Clique em **"New +"**
2. Selecione **"Web Service"**
3. Conecte ao seu repositório GitHub: `fpjunior/protuario-eletronico`

### **3. Configurações do Serviço:**
```
Name: protuario-eletronico-api
Environment: Node
Region: Oregon (US West)
Branch: main
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

**IMPORTANTE:** O comando `npm start` agora executa as migrations automaticamente antes de iniciar o servidor!

### **4. Variáveis de Ambiente:**
Adicione TODAS essas variáveis:

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://mydb_l01f_user:9SMTVGi0Sb1QgSesdVxAmGZuCXnMEtKJ@dpg-d1jjelemcj7s739u1vjg-a.oregon-postgres.render.com/mydb_l01f
JWT_SECRET=jwt_secret_production_2025_alianca_pe_secure_key_12345
FRONTEND_URL=https://protuario-eletronico-t3wu.vercel.app

# CONFIGURAÇÕES DE EMAIL (CRÍTICAS!)
EMAIL_USER=kralinfo18@gmail.com
EMAIL_PASS=pmcrdimhpqtigdfz
EMAIL_FROM=e-Prontuario Alianca-PE <noreply@alianca.com>
```

### **5. Deploy:**
1. Clique em **"Create Web Service"**
2. Aguarde o build (pode demorar alguns minutos)
3. Anote a URL gerada (ex: `https://protuario-eletronico-api.onrender.com`)

### **6. Testar:**
Após o deploy, use:
```bash
curl https://SUA-URL.onrender.com/api/health
```

## 🗄️ **Gerenciamento de Migrations**

### **Execução Automática (Configurada):**
- ✅ Migrations executam automaticamente a cada deploy
- ✅ Logs mostram quais migrations foram aplicadas
- ✅ Falhas na migration impedem o início do servidor

### **Execução Manual (Se Necessário):**

**Opção 1 - Via Render Shell:**
1. No dashboard do Render, vá para seu serviço
2. Clique em "Shell" (se disponível no seu plano)
3. Execute: `npm run migrate:prod`

**Opção 2 - Forçar Redeploy:**
1. Vá para "Settings" do seu serviço
2. Clique em "Manual Deploy"
3. Selecione "Deploy latest commit"

**Opção 3 - Scripts Disponíveis:**
```bash
# Executar migrations
npm run migrate:prod

# Verificar status das migrations
npm run db:status

# Rollback (cuidado em produção!)
npm run db:rollback
```

### **Logs de Migration:**
Nos logs do deploy, você verá:
```
🚀 Iniciando execução das migrations...
📍 Ambiente: production
🔗 Conectando: postgresql://user:***@host:5432/db
✅ Conexão estabelecida
📋 2 migration(s) pendente(s):
  - 20250804_add_new_table.js
  - 20250804_update_schema.js
⚡ Executando migrations...
✅ 2 migration(s) executada(s) com sucesso (batch 3):
  ✓ 20250804_add_new_table.js
  ✓ 20250804_update_schema.js
🎉 Migrations concluídas com sucesso!
```

## 🚨 Checklist Pós-Deploy

- [ ] Serviço está "Active" no dashboard
- [ ] Build foi bem-sucedido (sem erros)
- [ ] Todas as variáveis de ambiente foram adicionadas
- [ ] URL da API é acessível
- [ ] Endpoint `/api/health` responde
- [ ] Teste de recuperação de senha funciona

## 📞 Se Precisar de Ajuda

Envie:
1. Screenshot do dashboard do Render
2. URL gerada pelo Render
3. Logs de erro (se houver)

---
**⚡ Depois do deploy, atualize a URL no script de teste!**
