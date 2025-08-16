#!/bin/bash

# Script para rodar o backend de forma estável (sem hot reload)

echo "🏗️  Compilando TypeScript..."
npx tsc

echo "🚀 Iniciando servidor estável (sem hot reload)..."
node dist/index-simple.js