#!/bin/bash

# Consolidated Docker Deployment Script for EO Clínica
# Handles deployment of the unified docker-compose configuration

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DEFAULT_COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="$PROJECT_ROOT/backups/$(date +%Y%m%d-%H%M%S)"

# Default values
COMPOSE_FILE="$DEFAULT_COMPOSE_FILE"
ENVIRONMENT="production"
SKIP_BACKUP=false
FORCE_RECREATE=false
BUILD_IMAGES=false
VERBOSE=false

# Logging functions
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

verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

# Check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE="docker-compose"
    elif command -v docker compose &> /dev/null; then
        DOCKER_COMPOSE="docker compose"
    else
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    # Check compose file exists
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Validate compose file
validate_compose_file() {
    log "📋 Validating compose file: $COMPOSE_FILE"
    
    if ! $DOCKER_COMPOSE -f "$COMPOSE_FILE" config --quiet; then
        error "Invalid compose file: $COMPOSE_FILE"
        exit 1
    fi
    
    success "Compose file validation passed"
}

# Create backup
create_backup() {
    if [ "$SKIP_BACKUP" = true ]; then
        log "⏩ Skipping backup as requested"
        return 0
    fi
    
    log "💾 Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database if running
    if $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps postgres | grep -q "Up"; then
        log "🗄️ Backing up PostgreSQL database..."
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" exec -T postgres pg_dump -U clinic_user eo_clinica_db > "$BACKUP_DIR/database.sql" || {
            warning "Database backup failed, but continuing..."
        }
    fi
    
    # Backup volumes
    log "📦 Backing up Docker volumes..."
    docker volume ls --format "{{.Name}}" | grep -E "(eo-clinica|clinic)" | head -10 | while read -r volume; do
        verbose "Backing up volume: $volume"
        docker run --rm -v "$volume":/data -v "$BACKUP_DIR":/backup alpine tar czf "/backup/$volume.tar.gz" /data 2>/dev/null || true
    done
    
    # Backup configuration files
    log "⚙️ Backing up configuration files..."
    cp "$COMPOSE_FILE" "$BACKUP_DIR/" 2>/dev/null || true
    cp .env "$BACKUP_DIR/" 2>/dev/null || true
    cp -r nginx "$BACKUP_DIR/" 2>/dev/null || true
    cp -r docker "$BACKUP_DIR/" 2>/dev/null || true
    
    success "Backup created at: $BACKUP_DIR"
}

# Stop existing services
stop_services() {
    log "⏹️ Stopping existing services..."
    
    # Try to stop gracefully first
    if $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps --services &>/dev/null; then
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" stop --timeout 30
    fi
    
    # Force remove if recreate is requested
    if [ "$FORCE_RECREATE" = true ]; then
        log "🔄 Force recreating containers..."
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" down --remove-orphans
    fi
    
    success "Services stopped"
}

# Build images if needed
build_images() {
    if [ "$BUILD_IMAGES" = false ]; then
        return 0
    fi
    
    log "🏗️ Building images..."
    
    # Build backend
    if grep -q "build: \." "$COMPOSE_FILE"; then
        log "Building backend image..."
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" build app --no-cache
    fi
    
    # Build frontend
    if grep -q "context: ./frontend" "$COMPOSE_FILE"; then
        log "Building frontend image..."
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" build frontend --no-cache
    fi
    
    success "Images built successfully"
}

# Deploy services
deploy_services() {
    log "🚀 Deploying services..."
    
    local compose_args=""
    
    if [ "$FORCE_RECREATE" = true ]; then
        compose_args="--force-recreate"
    fi
    
    # Start core services first (database, cache)
    log "📊 Starting core services (database, cache)..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d postgres redis chromadb clickhouse
    
    # Wait for core services to be ready
    log "⏳ Waiting for core services to be ready..."
    sleep 10
    
    # Start remaining services
    log "🔧 Starting application services..."
    $DOCKER_COMPOSE -f "$COMPOSE_FILE" up -d $compose_args
    
    success "Services deployed"
}

# Health check
perform_health_check() {
    log "🏥 Performing health check..."
    
    if [ -f "$SCRIPT_DIR/docker-health-check.sh" ]; then
        "$SCRIPT_DIR/docker-health-check.sh" -f "$COMPOSE_FILE"
    else
        warning "Health check script not found, performing basic check..."
        
        # Basic service status check
        $DOCKER_COMPOSE -f "$COMPOSE_FILE" ps
        
        # Try to access key endpoints
        local endpoints=(
            "http://localhost:3000/health:Backend API"
            "http://localhost:3001:Frontend"
            "http://localhost:8000/api/v1/heartbeat:ChromaDB"
        )
        
        for endpoint_info in "${endpoints[@]}"; do
            IFS=':' read -r url name <<< "$endpoint_info"
            if curl -sf "$url" > /dev/null 2>&1; then
                success "✅ $name is responding"
            else
                warning "⚠️ $name is not responding yet"
            fi
        done
    fi
}

# Show deployment summary
show_summary() {
    echo ""
    success "🎉 Deployment completed successfully!"
    
    log "📊 Deployment Summary:"
    echo "   • Compose file: $COMPOSE_FILE"
    echo "   • Environment: $ENVIRONMENT"
    echo "   • Backup location: $BACKUP_DIR"
    
    echo ""
    log "🔗 Service URLs:"
    echo "   • Frontend:  http://localhost:3001"
    echo "   • Backend:   http://localhost:3000"
    echo "   • N8N:       http://localhost:5678"
    echo "   • WAHA:      http://localhost:3002"
    echo "   • ChromaDB:  http://localhost:8000"
    echo "   • PgAdmin:   http://localhost:5050 (dev only)"
    
    echo ""
    log "🛠️ Management Commands:"
    echo "   • Status:    $DOCKER_COMPOSE -f $COMPOSE_FILE ps"
    echo "   • Logs:      $DOCKER_COMPOSE -f $COMPOSE_FILE logs -f"
    echo "   • Stop:      $DOCKER_COMPOSE -f $COMPOSE_FILE stop"
    echo "   • Restart:   $DOCKER_COMPOSE -f $COMPOSE_FILE restart"
    echo "   • Health:    $SCRIPT_DIR/docker-health-check.sh"
}

# Cleanup on error
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        error "Deployment failed with exit code: $exit_code"
        
        if [ -d "$BACKUP_DIR" ] && [ "$SKIP_BACKUP" = false ]; then
            log "💡 To restore from backup:"
            echo "   • Database: $DOCKER_COMPOSE -f $COMPOSE_FILE exec -T postgres psql -U clinic_user -d eo_clinica_db < $BACKUP_DIR/database.sql"
            echo "   • Full rollback: $DOCKER_COMPOSE -f $COMPOSE_FILE down && cp $BACKUP_DIR/$COMPOSE_FILE . && $DOCKER_COMPOSE -f $COMPOSE_FILE up -d"
        fi
    fi
}

# Main deployment function
main() {
    log "🚀 EO Clínica Consolidated Docker Deployment"
    log "=============================================="
    
    trap cleanup EXIT
    
    # Change to project root
    cd "$PROJECT_ROOT"
    
    # Run deployment steps
    check_prerequisites
    validate_compose_file
    create_backup
    stop_services
    build_images
    deploy_services
    
    # Wait a bit for services to stabilize
    log "⏳ Waiting for services to stabilize..."
    sleep 15
    
    perform_health_check
    show_summary
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --dev)
            COMPOSE_FILE="docker-compose.dev.yml"
            ENVIRONMENT="development"
            shift
            ;;
        --prod)
            COMPOSE_FILE="docker-compose.prod.yml"
            ENVIRONMENT="production"
            shift
            ;;
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --force-recreate)
            FORCE_RECREATE=true
            shift
            ;;
        --build)
            BUILD_IMAGES=true
            shift
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            cat << EOF
EO Clínica Consolidated Docker Deployment

Usage: $0 [OPTIONS]

Options:
    -f, --file FILE         Docker compose file to use (default: docker-compose.yml)
    -e, --environment ENV   Environment name (default: production)
    --dev                   Use development configuration (docker-compose.dev.yml)
    --prod                  Use production configuration (docker-compose.prod.yml)
    --skip-backup           Skip creating backup before deployment
    --force-recreate        Force recreate all containers
    --build                 Build images before deployment
    -v, --verbose           Enable verbose output
    -h, --help              Show this help message

Examples:
    $0                      # Deploy with default configuration
    $0 --dev                # Deploy development environment
    $0 --prod --build       # Deploy production with image rebuild
    $0 --skip-backup        # Deploy without creating backup

EOF
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main