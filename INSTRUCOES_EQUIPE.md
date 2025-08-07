# 🏥 Prontuário Eletrônico - Instruções para Desenvolvedores

## 🚀 Setup Inicial (Para Novos Desenvolvedores)

### 1. Clonar o Repositório
```bash
git clone [url-do-repo]
cd protuario-eletronico
```

### 2. Setup Automático
```bash
cd backend
node setup-dev.js
```

### 3. Setup Manual (se o automático não funcionar)
```bash
cd backend

# Instalar dependências
npm install

# Configurar banco de dados
npm run update-db

# Iniciar desenvolvimento
npm run dev
```

## 🔄 Atualizando Código da Equipe

**Sempre que fizer git pull:**

```bash
cd backend
npm run update-db
```

**Isso irá aplicar automaticamente todas as novas migrações do banco.**

## 📊 Comandos Úteis

| Comando | Descrição |
|---------|-----------|
| `npm run update-db` | Aplica migrações pendentes |
| `npm run check-migrations` | Verifica status das migrações |
| `npm run dev` | Inicia servidor em modo desenvolvimento |
| `npm start` | Inicia servidor em modo produção |

## 🐳 Usando Docker (Alternativa)

```bash
# Primeira vez
cd backend
docker-compose up --build

# Atualizações
git pull
docker-compose down
docker-compose up --build
```

## 📋 Estrutura de Migrações

- **migrations/**: Contém todos os arquivos de migração
- **20250806000000_add_triagem_fields.js**: Migração atual (triagem)

## ❗ Problemas Comuns

### "Migration already applied"
✅ Normal! Significa que seu banco já está atualizado.

### Erro de conexão com banco
1. Verifique se PostgreSQL está rodando
2. Confirme credenciais (padrão: postgres/postgres)
3. Certifique-se que database "prontuario" existe

### Erro em migrações
```bash
# Verificar status
npm run check-migrations

# Aplicar manualmente
node aplicar-migracoes.js
```

## 📞 Suporte

- Leia `backend/COMO_ATUALIZAR_BANCO.md` para instruções detalhadas
- Em caso de problemas, compartilhe mensagem de erro completa

---

**Dica:** Sempre rode `npm run update-db` após fazer pull! 🎯
