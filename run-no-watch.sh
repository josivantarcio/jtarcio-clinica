#!/bin/bash

# Script para rodar com TSX mas sem file watching (mais estável)

echo "🚀 Iniciando servidor com TSX (sem file watching)..."
echo "📝 Para parar: Ctrl+C uma vez e aguarde"

# tsx sem watch, apenas executa uma vez
npx tsx --no-watch src/index-simple.ts