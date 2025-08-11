#!/bin/bash

# EO Clínica - Fix Redis Port Conflict Script
# This script resolves the common Redis port 6379 conflict

echo "🔧 EO Clínica - Fixing Redis Port Conflict..."
echo "================================================"

# Check if Redis is running locally
echo "📋 Checking local Redis service..."
if pgrep -f "redis-server" > /dev/null; then
    echo "⚠️  Local Redis server found running on port 6379"
    
    # Show Redis processes
    echo "📊 Current Redis processes:"
    ps aux | grep redis | grep -v grep
    
    echo ""
    echo "🔧 To fix this issue, you have several options:"
    echo ""
    echo "Option 1 (RECOMMENDED): Stop local Redis temporarily"
    echo "sudo systemctl stop redis-server"
    echo "sudo service redis stop"
    echo ""
    echo "Option 2: Change Docker Redis port in docker-compose.yml"
    echo "Change ports from '6379:6379' to '6380:6379' for Redis service"
    echo ""
    echo "Option 3: Kill Redis process (may affect other applications)"
    echo "sudo kill -9 $(pgrep -f 'redis-server')"
    echo ""
    echo "After choosing an option, run:"
    echo "docker-compose down --volumes --remove-orphans"
    echo "docker-compose up -d"
    echo ""
    echo "⚡ Quick fix command (stops local Redis and restarts Docker):"
    echo "sudo systemctl stop redis-server 2>/dev/null || sudo service redis stop 2>/dev/null"
    echo "docker-compose down --volumes --remove-orphans"
    echo "docker-compose up -d"
    
else
    echo "✅ No local Redis service conflicts detected"
    echo "🔧 Checking Docker containers..."
    
    # Check Docker containers
    if docker-compose ps | grep -q "redis"; then
        echo "✅ Redis container is running in Docker"
    else
        echo "⚠️  Redis container not running. Starting services..."
        docker-compose down --volumes --remove-orphans
        docker-compose up -d
    fi
fi

echo ""
echo "📋 Current port usage on 6379:"
ss -tlnp | grep :6379 || echo "Port 6379 is free"

echo ""
echo "🏥 EO Clínica Redis Port Check Complete"