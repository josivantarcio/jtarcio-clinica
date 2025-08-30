#!/bin/bash

# Script de teste para start-production.sh com execução local
# Testa apenas as funções locais sem todo o processo completo

set -e

# Importar funções do script principal
source scripts/start-production.sh

# Testar função de backend
echo "🔧 Testando função start_backend_service..."
if start_backend_service; then
    echo "✅ Backend function test PASSED"
    
    # Testar se backend está realmente respondendo
    sleep 5
    if curl -s http://localhost:3000/health > /dev/null; then
        echo "✅ Backend está respondendo na porta 3000"
    else
        echo "❌ Backend não está respondendo"
    fi
else
    echo "❌ Backend function test FAILED"
fi

echo ""
echo "🌐 Testando função start_frontend_service..."
if start_frontend_service; then
    echo "✅ Frontend function test PASSED"
    
    # Testar se frontend está respondendo
    sleep 10
    if curl -s http://localhost:3001 > /dev/null; then
        echo "✅ Frontend está respondendo na porta 3001"
    else
        echo "❌ Frontend não está respondendo"
    fi
else
    echo "❌ Frontend function test FAILED"
fi

echo ""
echo "📊 Status dos processos:"
ps aux | grep -E "(node|npm|tsx)" | grep -E "(3000|3001)" | head -5

echo ""
echo "🔧 PIDs salvos:"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "⚠️  Para parar os serviços:"
echo "kill $BACKEND_PID $FRONTEND_PID"
echo "pkill -f \"node.*300[01]\""