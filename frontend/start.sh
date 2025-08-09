#!/bin/bash

# Frontend startup script for EO Clinica

echo "🎨 Starting EO Clinica Frontend"
echo "==============================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the frontend directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🚀 Starting Next.js development server..."
echo "🌐 Frontend will be available at: http://localhost:3001"
echo "🔗 API backend should be running at: http://localhost:3000"
echo ""

npm run dev
