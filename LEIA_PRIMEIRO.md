# 📝 INSTRUÇÕES PARA A EQUIPE - ATUALIZAÇÃO DO BANCO DE DADOS

## ⚡ TL;DR (Para Pressa)

Depois de fazer `git pull`:
```bash
cd backend
npm run update-db
```

## 🔧 Setup Completo (Novos Desenvolvedores)

```bash
# 1. Clonar repo
git clone [url]
cd protuario-eletronico/backend

# 2. Setup automático
npm run setup

# 3. Testar se funcionou
npm run test-setup
```

## 📋 Comandos Principais

| Comando | O que faz |
|---------|-----------|
| `npm run update-db` | 🔄 Atualiza banco com novas mudanças |
| `npm run check-migrations` | 📊 Mostra status do banco |
| `npm run setup` | 🚀 Setup completo para novos devs |
| `npm run test-setup` | 🧪 Testa se tudo está funcionando |

## 🎯 Fluxo de Trabalho Diário

1. **Começar o dia:**
   ```bash
   git pull origin develop
   cd backend
   npm run update-db
   npm run dev
   ```

2. **Se der erro:** `npm run test-setup`

## 🆘 Problemas Comuns

- **"Already up to date"**: ✅ Normal, banco já está atualizado
- **Erro de conexão**: Verifique se PostgreSQL está rodando
- **Tabela não existe**: Execute `npm run update-db`

## 📞 Ajuda

- Leia: `backend/COMO_ATUALIZAR_BANCO.md`
- Execute: `npm run test-setup`
- Contate: [Responsável pelo projeto]

---

**🎉 Com essas configurações, vocês só precisam rodar `npm run update-db` sempre que fizerem pull!**
