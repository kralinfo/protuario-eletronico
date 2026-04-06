#!/usr/bin/env pwsh
# Script para iniciar Frontend com limpeza automática de porta

param(
    [int]$Port = 4200,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
📱 Frontend Start Script

Uso:
    .\start-frontend.ps1              # Usa porta padrão 4200
    .\start-frontend.ps1 -Port 4201   # Usa porta 4201
    .\start-frontend.ps1 -Help        # Mostra esta mensagem

Descrição:
    Inicia o servidor Angular após limpar a porta.
    Mata automaticamente qualquer processo usando a porta alvo.

"@
    exit 0
}

Write-Host "🔍 Verificando porta $Port..." -ForegroundColor Cyan

# Verificar se porta está em uso
$process = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue

if ($process) {
    Write-Host "⚠️  Porta $Port já está em uso (PID: $($process.OwningProcess))" -ForegroundColor Yellow
    Write-Host "🔪 Matando processo..." -ForegroundColor Yellow
    
    try {
        Stop-Process -Id $process.OwningProcess -Force -ErrorAction Stop
        Write-Host "✅ Processo finalizado com sucesso" -ForegroundColor Green
        Start-Sleep -Seconds 1
    } catch {
        Write-Host "❌ Erro ao finalizar processo: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Porta $Port está livre" -ForegroundColor Green
Write-Host "🚀 Iniciando Frontend na porta $Port..." -ForegroundColor Green
Write-Host ""

# Iniciar o frontend
if ($Port -eq 4200) {
    # Usar configuração padrão
    ng serve
} else {
    # Usar porta customizada
    ng serve --port $Port
}
