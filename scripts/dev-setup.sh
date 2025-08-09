#!/bin/bash

# EO Clinica - Development Setup Script
# This script sets up the complete development environment

set -e

echo "🏥 EO Clinica Development Setup"
echo "==============================="

# Function to kill processes using specific ports
kill_port() {
    local port=$1
    echo "🔍 Checking port $port..."
    
    # Try multiple methods to find and kill processes
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ ! -z "$pids" ]; then
        echo "🔄 Found processes on port $port: $pids"
        echo "   Terminating processes..."
        kill -TERM $pids 2>/dev/null || true
        sleep 2
        
        # Check if still running and force kill
        pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ ! -z "$pids" ]; then
            echo "   Force killing processes..."
            kill -9 $pids 2>/dev/null || true
            sleep 1
        fi
    fi
    
    # Also try ss method (modern replacement for netstat)
    local ss_pids=$(ss -tulpn | grep ":$port " | sed 's/.*users:((//g' | sed 's/)).*//g' | grep -o 'pid=[0-9]*' | cut -d'=' -f2 || true)
    if [ ! -z "$ss_pids" ]; then
        echo "🔄 Found additional processes via ss on port $port: $ss_pids"
        for pid in $ss_pids; do
            echo "   Killing PID $pid..."
            kill -TERM $pid 2>/dev/null || true
            sleep 1
            kill -9 $pid 2>/dev/null || true
        done
        sleep 1
    fi
    
    # Final check
    local final_check=$(lsof -ti:$port 2>/dev/null || true)
    if [ -z "$final_check" ]; then
        echo "✅ Port $port is now free"
    else
        echo "⚠️  Port $port still has processes: $final_check"
        echo "   Attempting final cleanup..."
        kill -9 $final_check 2>/dev/null || true
        sleep 2
    fi
}

# Function to check and clean ports
clean_ports() {
    echo "🧹 Cleaning up ports..."
    local ports=(3000 3001 5432 6379 8000 5678 5050)
    
    for port in "${ports[@]}"; do
        kill_port $port
    done
    
    echo "✅ Ports cleaned successfully"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Clean ports before starting
clean_ports

# Clean up any existing Docker resources
echo "🧹 Cleaning up existing Docker resources..."
docker-compose down --volumes --remove-orphans 2>/dev/null || true

# Remove any orphaned containers and networks
echo "🗑️  Removing orphaned containers and networks..."
docker container prune -f 2>/dev/null || true
docker network prune -f 2>/dev/null || true

# Wait a moment for cleanup to complete
sleep 5

# Clean ports again after Docker cleanup
echo "🔄 Final port cleanup..."
clean_ports

# Give a final moment for system to release ports
echo "⏳ Waiting for ports to be fully released..."
sleep 3

# Check if .env exists
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📝 Creating .env file from template..."
        cp .env.example .env
        echo "✅ .env file created from .env.example"
        echo "⚠️  You may want to edit .env file with your specific configuration."
        echo "   Current configuration should work for development."
        echo "   Press Enter to continue..."
        read -r
    else
        echo "❌ Neither .env nor .env.example found. Please create .env file first."
        exit 1
    fi
else
    echo "✅ .env file already exists"
fi

echo "🐳 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 15

# Wait for PostgreSQL to be ready
echo "🔍 Waiting for PostgreSQL..."
until docker-compose exec -T postgres pg_isready -U clinic_user -d eo_clinica_db; do
    echo "   PostgreSQL is unavailable - sleeping..."
    sleep 2
done

echo "📦 Installing dependencies..."
npm install

echo "🔧 Generating Prisma client..."
docker-compose exec app npm run db:generate

echo "🗄️  Running database migrations..."
docker-compose exec app npm run db:migrate

echo "🌱 Seeding database..."
docker-compose exec app npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Start the development server:"
echo "   npm run dev"
echo ""
echo "🔗 Available services:"
echo "   • API: http://localhost:3000"
echo "   • API Docs: http://localhost:3000/documentation"
echo "   • Frontend: http://localhost:3001 (run: cd frontend && npm run dev)"
echo "   • N8N: http://localhost:5678 (admin/admin123)"
echo "   • PgAdmin: http://localhost:5050 (admin@clinic.com/admin123)"
echo ""
echo "🚀 To start the frontend:"
echo "   cd frontend && npm install && npm run dev"
echo ""
echo "👥 Default users (password: Admin123!):"
echo "   • Admin: admin@eoclinica.com.br"
echo "   • Doctor: dr.silva@eoclinica.com.br"
echo "   • Receptionist: recepcao@eoclinica.com.br"
echo "   • Patient: paciente@example.com"
echo ""
echo "🎉 Happy coding!"