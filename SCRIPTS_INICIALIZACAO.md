# 🚀 Scripts de Inicialização

Para facilitar o desenvolvimento, criei scripts que automaticamente resolvem conflitos de portas e inicializam serviços corretamente.

---

## 📋 Frontend

### PowerShell (Windows)

```powershell
# Usar porta padrão (4200)
cd frontend
.\start-frontend.ps1

# Usar porta customizada
.\start-frontend.ps1 -Port 4201

# Ver ajuda
.\start-frontend.ps1 -Help
```

### Bash (macOS/Linux)

```bash
# Usar porta padrão (4200)
cd frontend
chmod +x start-frontend.sh
./start-frontend.sh

# Usar porta customizada
./start-frontend.sh 4201

# Ver ajuda
./start-frontend.sh --help
```

**O que faz:**
- ✅ Verifica se porta 4200 está em uso
- ✅ Mata processo antigo (se existir)
- ✅ Inicia novo servidor Angular
- ✅ Mostra logs em tempo real

---

## 🐳 Backend (Docker)

### PowerShell (Windows)

```powershell
# Iniciar serviços normalmente
cd backend
.\start-backend.ps1

# Forçar reconstrução de imagens
.\start-backend.ps1 -Build

# Ver ajuda
.\start-backend.ps1 -Help
```

**O que faz:**
- ✅ Verifica Docker está instalado
- ✅ Deruba containers antigos
- ✅ Inicia PostgreSQL + Node.js
- ✅ Aplica migrações automaticamente

---

## 🎯 Inicialização Completa do Sistema

### Opção 1: Sequencial (Recomendado)

**Terminal 1 - Backend:**
```powershell
cd backend
.\start-backend.ps1
# Aguarde até ver: "🚀 Servidor rodando na porta 3001"
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
.\start-frontend.ps1
# Aguarde até ver: "Application bundle generation complete"
```

**Terminal 3 - Testes (opcional):**
```powershell
# Monitoring, testes, etc
```

### Opção 2: Paralelo (Mais Rápido)

Abra 2 terminais separados e rode simultaneamente:

```powershell
# Terminal 1
cd backend && .\start-backend.ps1

# Terminal 2 (em paralelo)
cd frontend && .\start-frontend.ps1
```

---

## ⚡ Troubleshooting

### Porta já está em uso

**Frontend:**
```powershell
.\start-frontend.ps1 -Port 4201
```

Abre em: http://localhost:4201

**Backend Docker:**
Modifique `backend/docker-compose.yml`:
```yaml
ports:
  - "3002:3001"  # Muda porta externa para 3002
```

### Docker não inicia

```powershell
# Verificar status Docker
docker ps

# Reiniciar Docker
docker system prune -a
docker-compose down -v
.\start-backend.ps1 -Build
```

### Processo não mata

```powershell
# Ver todos os njsprocessos Node rodando
Get-Process node

# Matar manualmente
Stop-Process -Name node -Force

# Ou matar por porta específica
$proc = Get-NetTCPConnection -LocalPort 4200
Stop-Process -Id $proc.OwningProcess -Force
```

---

## 📊 Monitorar Status

### Ver logs Backend em tempo real

```powershell
docker-compose logs -f backend
```

### Ver logs Frontend

Veja no terminal onde `npm start` está rodando

### Verificar portas em uso

```powershell
# Windows
netstat -ano | findstr ":4200"
netstat -ano | findstr ":3001"

# macOS/Linux
lsof -i :4200
lsof -i :3001
```

---

## 🔄 Ciclo Completo de Desenvolvimento

```powershell
# 1. Iniciar backend
cd backend
.\start-backend.ps1

# 2. Em outro terminal, iniciar frontend
cd frontend
.\start-frontend.ps1

# 3. Abrir browser
Start-Process "http://localhost:4200"

# 4. Fazer alterações no código
# - Frontend: Hot reload automático
# - Backend: Restart automático via nodemon

# 5. Quando terminar, derrubar tudo
# No terminal backend: Ctrl+C
# docker-compose down

# No terminal frontend: Ctrl+C
```

---

## 🎨 Alias Úteis (Opcional)

Se quiser criar atalhos, adicione ao perfil PowerShell (`$PROFILE`):

```powershell
# Abrir perfil
notepad $PROFILE

# Adicionar:
function Start-Backend { cd backend; .\start-backend.ps1 }
function Start-Frontend { cd frontend; .\start-frontend.ps1 }
function Kill-Port4200 {
    $proc = Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue
    if ($proc) { Stop-Process -Id $proc.OwningProcess -Force }
}

# Salvar e carregar
. $PROFILE
```

Aí você pode usar:
```powershell
Start-Backend
Start-Frontend
Kill-Port4200
```

---

## 📝 Logs Importantes

### Sucesso Backend
```
✅ RealtimeManager inicializado com sucesso
🚀 Servidor rodando na porta 3001
```

### Sucesso Frontend
```
Application bundle generation complete
Watch mode enabled
```

### Sucesso Conexão
```
✅ Conectado ao servidor WebSocket: ...
Realtime service connected to module: triagem
```

---

**Agora é só rodar os scripts! 🚀**
