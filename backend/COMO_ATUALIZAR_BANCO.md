# 🔄 Como Atualizar o Banco de Dados Local

## 📋 Instruções para a Equipe

Quando você fizer `git pull` e houver mudanças no banco de dados, siga estes passos:

### 🚀 Método Rápido (Recomendado)

```bash
# 1. Entrar na pasta backend
cd backend

# 2. Instalar dependências (se necessário)
npm install

# 3. Atualizar o banco de dados
npm run update-db
```

### 🔍 Verificar se Funcionou

```bash
# Verificar status das migrações
npm run check-migrations
```

### 📊 Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run update-db` | Aplica todas as migrações pendentes |
| `npm run check-migrations` | Mostra status das migrações |
| `npm run migrate:dev:rollback` | Desfaz a última migração (cuidado!) |

## 🐳 Se Estiver Usando Docker

```bash
# 1. Fazer pull do código
git pull origin develop

# 2. Reconstruir containers (aplica migrações automaticamente)
cd backend
docker-compose down
docker-compose up --build
```

## ❗ Problemas Comuns

### Erro de Conexão com o Banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no `.env` ou use as padrões:
  - Host: `localhost`
  - Porta: `5432`
  - Database: `prontuario`
  - User: `postgres`
  - Password: `postgres`

### Migration Já Aplicada
Se aparecer a mensagem "Already up to date", significa que seu banco já está atualizado.

### Erro de Tabela Não Existe
Execute primeiro:
```bash
npm run migrate:dev
```

## 🆘 Em Caso de Emergência

Se nada funcionar, execute o script manual:
```bash
node aplicar-migracoes.js
```

## 📞 Suporte

Se tiver problemas, contate o responsável pelo projeto com:
- Mensagem de erro completa
- Sistema operacional
- Versão do Node.js (`node --version`)

---

**Última atualização:** Agosto 2025
**Responsável:** [Seu Nome]
