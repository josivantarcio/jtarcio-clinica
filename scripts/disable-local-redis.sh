#!/bin/bash

# EO Clínica - Disable Local Redis Script
# This script disables local Redis to avoid conflicts with Docker

echo "🔧 EO Clínica - Disabling Local Redis Services"
echo "============================================="

echo "📋 Current Redis processes:"
ps aux | grep redis | grep -v grep || echo "No Redis processes found"

echo ""
echo "🔧 Disabling Redis systemd services..."

# Try different possible Redis service names
services=("redis-server" "redis" "redis.service" "redis-server.service")

for service in "${services[@]}"; do
    if systemctl is-enabled "$service" >/dev/null 2>&1; then
        echo "📦 Found service: $service"
        echo "🛑 Stopping $service..."
        sudo systemctl stop "$service" 2>/dev/null || true
        echo "🚫 Disabling $service..."
        sudo systemctl disable "$service" 2>/dev/null || true
        echo "✅ $service disabled"
    fi
done

echo ""
echo "🔍 Checking remaining Redis processes..."
if pgrep -f "redis-server" > /dev/null; then
    echo "⚠️  Redis processes still running. Manual intervention may be needed."
    echo "🔧 To manually stop Redis:"
    echo "   sudo pkill -f redis-server"
    echo "   OR"  
    echo "   sudo service redis-server stop"
else
    echo "✅ No Redis processes detected"
fi

echo ""
echo "📊 Current port usage:"
echo "Port 6379 (local Redis): $(ss -tlnp | grep :6379 | wc -l) connections"
echo "Port 6380 (Docker Redis): $(ss -tlnp | grep :6380 | wc -l) connections"

echo ""
echo "✅ Local Redis disabling process completed!"
echo "🐳 Docker Redis is running on port 6380"
echo "📚 Check docker-compose ps to verify Docker services"