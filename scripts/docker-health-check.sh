#!/bin/bash

# Docker Health Check Script for EO Clínica
# Monitors all services and provides comprehensive health status

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.yml"
MAX_RETRIES=3
RETRY_DELAY=5

# Log function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if docker-compose is available
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif command -v docker compose &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        error "Docker Compose not found. Please install Docker Compose."
        exit 1
    fi
}

# Get service status
get_service_status() {
    local service=$1
    local status=$($DOCKER_COMPOSE -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null || echo "not found")
    echo "$status"
}

# Get service health
get_service_health() {
    local service=$1
    local health=$($DOCKER_COMPOSE -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "no health check")
    echo "$health"
}

# Check HTTP endpoint
check_http_endpoint() {
    local url=$1
    local timeout=${2:-10}
    local expected_code=${3:-200}
    
    local response_code
    response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$timeout" "$url" 2>/dev/null || echo "000")
    
    if [ "$response_code" = "$expected_code" ]; then
        return 0
    else
        return 1
    fi
}

# Check specific service health
check_service_health() {
    local service=$1
    local status
    local health
    
    status=$(get_service_status "$service")
    health=$(get_service_health "$service")
    
    case "$service" in
        "app")
            if check_http_endpoint "http://localhost:3000/health" 5; then
                success "✅ $service: $status (API responding)"
            else
                error "❌ $service: $status (API not responding)"
                return 1
            fi
            ;;
        "frontend")
            if check_http_endpoint "http://localhost:3001" 5; then
                success "✅ $service: $status (Frontend responding)"
            else
                error "❌ $service: $status (Frontend not responding)"
                return 1
            fi
            ;;
        "postgres")
            if [ "$health" = "healthy" ] || $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T "$service" pg_isready -U clinic_user -d eo_clinica_db &>/dev/null; then
                success "✅ $service: $status (Database ready)"
            else
                error "❌ $service: $status (Database not ready)"
                return 1
            fi
            ;;
        "redis")
            if [ "$health" = "healthy" ] || $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T "$service" redis-cli ping &>/dev/null; then
                success "✅ $service: $status (Cache ready)"
            else
                error "❌ $service: $status (Cache not ready)"
                return 1
            fi
            ;;
        "n8n")
            if check_http_endpoint "http://localhost:5678/healthz" 5; then
                success "✅ $service: $status (N8N responding)"
            else
                error "❌ $service: $status (N8N not responding)"
                return 1
            fi
            ;;
        "waha")
            if check_http_endpoint "http://localhost:3002/api/health" 5; then
                success "✅ $service: $status (WAHA responding)"
            else
                warning "⚠️  $service: $status (WAHA not responding - may be starting)"
            fi
            ;;
        "chromadb")
            if check_http_endpoint "http://localhost:8000/api/v1/heartbeat" 5; then
                success "✅ $service: $status (ChromaDB responding)"
            else
                error "❌ $service: $status (ChromaDB not responding)"
                return 1
            fi
            ;;
        "clickhouse")
            if check_http_endpoint "http://localhost:8123/ping" 5; then
                success "✅ $service: $status (ClickHouse responding)"
            else
                error "❌ $service: $status (ClickHouse not responding)"
                return 1
            fi
            ;;
        "nginx")
            if check_http_endpoint "http://localhost/health" 5; then
                success "✅ $service: $status (Nginx responding)"
            else
                warning "⚠️  $service: $status (Nginx not responding)"
            fi
            ;;
        *)
            if [ "$status" = "running" ]; then
                success "✅ $service: $status"
            else
                error "❌ $service: $status"
                return 1
            fi
            ;;
    esac
    
    return 0
}

# Main health check
main_health_check() {
    local failed_services=()
    local services
    
    log "🔍 EO Clínica Docker Health Check"
    log "Using compose file: $COMPOSE_FILE"
    echo ""
    
    # Get list of services
    services=$($DOCKER_COMPOSE -f "$COMPOSE_FILE" config --services 2>/dev/null)
    
    if [ -z "$services" ]; then
        error "No services found in $COMPOSE_FILE"
        exit 1
    fi
    
    log "📊 Checking services: $(echo $services | tr '\n' ' ')"
    echo ""
    
    # Check each service
    for service in $services; do
        if ! check_service_health "$service"; then
            failed_services+=("$service")
        fi
    done
    
    echo ""
    log "📈 Resource Usage:"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null | head -10 || warning "Could not get container stats"
    
    echo ""
    if [ ${#failed_services[@]} -eq 0 ]; then
        success "🎉 All services are healthy!"
        log "System is ready for use."
        
        echo ""
        log "🔗 Service URLs:"
        echo "   • Frontend:  http://localhost:3001"
        echo "   • Backend:   http://localhost:3000"
        echo "   • N8N:       http://localhost:5678"
        echo "   • WAHA:      http://localhost:3002"
        echo "   • ChromaDB:  http://localhost:8000"
        echo "   • PgAdmin:   http://localhost:5050"
        
        exit 0
    else
        error "💥 Failed services: ${failed_services[*]}"
        
        echo ""
        log "🔧 Troubleshooting commands:"
        for service in "${failed_services[@]}"; do
            echo "   • $service logs: $DOCKER_COMPOSE -f $COMPOSE_FILE logs $service"
        done
        echo "   • Restart all:   $DOCKER_COMPOSE -f $COMPOSE_FILE restart"
        echo "   • Full restart:  $DOCKER_COMPOSE -f $COMPOSE_FILE down && $DOCKER_COMPOSE -f $COMPOSE_FILE up -d"
        
        exit 1
    fi
}

# Parse command line options
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -r|--retries)
            MAX_RETRIES="$2"
            shift 2
            ;;
        --dev)
            COMPOSE_FILE="docker-compose.dev.yml"
            shift
            ;;
        --prod)
            COMPOSE_FILE="docker-compose.prod.yml"
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -f, --file FILE     Specify docker-compose file (default: docker-compose.yml)"
            echo "  -r, --retries NUM   Number of retries for failed checks (default: 3)"
            echo "  --dev               Use development compose file"
            echo "  --prod              Use production compose file"
            echo "  -h, --help          Show this help message"
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check prerequisites
check_docker_compose

# Verify compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    error "Compose file not found: $COMPOSE_FILE"
    exit 1
fi

# Run main health check
main_health_check