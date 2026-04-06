#!/usr/bin/env pwsh
# Script para iniciar Backend (Docker) com verificação de porta

param(
    [switch]$Help,
    [switch]$Build
)

if ($Help) {
    Write-Host @"
🐳 Backend Start Script (Docker)

Uso:
    .\start-backend.ps1              # Inicia serviços
    .\start-backend.ps1 -Build       # Reconstrói imagens
    .\start-backend.ps1 -Help        # Mostra esta mensagem

Descrição:
    Inicia Backend (Node.js) + PostgreSQL via Docker Compose
    Matando containers antigos se necessário

Portas:
    - Backend:     3001
    - PostgreSQL:  5432

"@
    exit 0
}

Write-Host "🐳 Backend Docker Manager" -ForegroundColor Cyan
Write-Host ""

$buildFlag = if ($Build) { "--build" } else { "" }

Write-Host "🔍 Verificando Docker..." -ForegroundColor Cyan
docker --version | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker não instalado ou não está rodando" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Docker OK" -ForegroundColor Green
Write-Host ""

Write-Host "📍 Indo para diretório backend..." -ForegroundColor Cyan
Push-Location backend

Write-Host "⬇️  Derrubando containers antigos..." -ForegroundColor Yellow
docker-compose down 2>$null
Write-Host "✅ Containers antigos removidos" -ForegroundColor Green
Write-Host ""

Write-Host "🚀 Iniciando serviços..." -ForegroundColor Cyan
if ($Build) {
    Write-Host "🔨 Reconstruindo imagens..." -ForegroundColor Yellow
    docker-compose up --build
} else {
    docker-compose up
}

Pop-Location
