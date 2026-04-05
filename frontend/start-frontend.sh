#!/bin/bash
# Script para iniciar Frontend com limpeza automática de porta

PORT=${1:-4200}

show_help() {
    cat << EOF
📱 Frontend Start Script (Bash)

Uso:
    ./start-frontend.sh              # Usa porta padrão 4200
    ./start-frontend.sh 4201         # Usa porta 4201
    ./start-frontend.sh --help       # Mostra esta mensagem

Descrição:
    Inicia o servidor Angular após limpar a porta.
    Mata automaticamente qualquer processo usando a porta alvo.

EOF
}

if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

echo "🔍 Verificando porta $PORT..."

# Verificar se porta está em uso (macOS/Linux)
PID=$(lsof -ti:$PORT)

if [ ! -z "$PID" ]; then
    echo "⚠️  Porta $PORT já está em uso (PID: $PID)"
    echo "🔪 Matando processo..."
    
    if kill -9 $PID 2>/dev/null; then
        echo "✅ Processo finalizado com sucesso"
        sleep 1
    else
        echo "❌ Erro ao finalizar processo"
        exit 1
    fi
fi

echo "✅ Porta $PORT está livre"
echo "🚀 Iniciando Frontend na porta $PORT..."
echo ""

# Iniciar o frontend
if [ "$PORT" -eq 4200 ]; then
    ng serve
else
    ng serve --port $PORT
fi
