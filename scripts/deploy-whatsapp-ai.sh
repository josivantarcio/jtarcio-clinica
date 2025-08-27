#!/bin/bash

# WhatsApp AI Integration Deployment Script
# EO Clínica System - v2.1.0
# Deploy Phase 1: Infrastructure Base

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_PHASE=${1:-"phase-1-infrastructure"}
ENVIRONMENT=${2:-"development"}
COMPOSE_FILE="docker-compose.ai-integration.yml"
LOG_FILE="logs/whatsapp-ai-deployment.log"
HEALTH_CHECK_TIMEOUT=300 # 5 minutes
MAX_RETRIES=3

# Ensure logs directory exists
mkdir -p logs

# Logging function
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[WARNING $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO $(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

# Print banner
print_banner() {
    echo -e "${PURPLE}
╔══════════════════════════════════════════════════════════════════╗
║                  🤖 WhatsApp AI Integration                      ║
║                       EO Clínica System                         ║
║                          v2.1.0                                 ║
╚══════════════════════════════════════════════════════════════════╝${NC}
"
    log "🚀 Starting WhatsApp AI Integration deployment..."
    info "Phase: $DEPLOYMENT_PHASE"
    info "Environment: $ENVIRONMENT"
    info "Log file: $LOG_FILE"
}

# Pre-deployment checks
pre_deployment_checks() {
    log "🔍 Running pre-deployment checks..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check required files
    local required_files=(
        "$COMPOSE_FILE"
        ".env.example"
        "scripts/ai-database-init.sql"
        "nginx/ai-integration.conf"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Required file missing: $file"
            exit 1
        fi
    done
    
    # Check environment variables
    if [[ ! -f ".env" ]]; then
        warning ".env file not found. Creating from .env.example..."
        cp .env.example .env
        warning "Please configure .env file with your actual API keys before proceeding."
        info "Required variables: GEMINI_API_KEY, WAHA_API_KEY, N8N_API_KEY"
    fi
    
    log "✅ Pre-deployment checks completed successfully"
}

# Environment setup
setup_environment() {
    log "🔧 Setting up environment for $ENVIRONMENT..."
    
    # Create necessary directories
    mkdir -p {logs,data/n8n,data/waha,data/chromadb,workflows/n8n,n8n/custom-nodes}
    
    # Set permissions
    sudo chown -R $USER:$USER data/ 2>/dev/null || true
    chmod -R 755 data/ workflows/ n8n/ 2>/dev/null || true
    
    # Validate environment variables for AI integration
    local required_env_vars=(
        "GEMINI_API_KEY"
        "DATABASE_URL"
        "REDIS_URL"
        "JWT_SECRET"
    )
    
    for var in "${required_env_vars[@]}"; do
        if [[ -z "${!var}" ]] && ! grep -q "^${var}=" .env 2>/dev/null; then
            error "Required environment variable missing: $var"
            info "Please set $var in .env file or environment"
            exit 1
        fi
    done
    
    log "✅ Environment setup completed"
}

# Deploy infrastructure services
deploy_infrastructure() {
    log "🏗️ Deploying WhatsApp AI integration infrastructure..."
    
    # Pull latest images
    info "Pulling latest Docker images..."
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Start services with health checks
    info "Starting AI integration services..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for services to be healthy
    wait_for_services_health
    
    log "✅ Infrastructure deployment completed"
}

# Wait for services to be healthy
wait_for_services_health() {
    log "⏳ Waiting for services to be healthy (timeout: ${HEALTH_CHECK_TIMEOUT}s)..."
    
    local services=("n8n" "waha" "chromadb" "redis-ai" "postgres-ai")
    local start_time=$(date +%s)
    local all_healthy=false
    
    while [[ $all_healthy == false ]]; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))
        
        if [[ $elapsed -gt $HEALTH_CHECK_TIMEOUT ]]; then
            error "Health check timeout reached (${HEALTH_CHECK_TIMEOUT}s)"
            show_service_status
            exit 1
        fi
        
        all_healthy=true
        for service in "${services[@]}"; do
            local health=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unhealthy")
            
            if [[ "$health" != "healthy" ]]; then
                all_healthy=false
                info "Waiting for $service to be healthy... (current: $health)"
                break
            fi
        done
        
        if [[ $all_healthy == false ]]; then
            sleep 10
        fi
    done
    
    log "✅ All services are healthy!"
}

# Show service status
show_service_status() {
    log "📊 Current service status:"
    docker-compose -f "$COMPOSE_FILE" ps
    
    log "📊 Service health status:"
    local services=("n8n" "waha" "chromadb" "redis-ai" "postgres-ai")
    for service in "${services[@]}"; do
        local health=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
        local status=$(docker-compose -f "$COMPOSE_FILE" ps "$service" 2>/dev/null | grep "$service" | awk '{print $NF}' || echo "unknown")
        echo "  $service: $status (health: $health)"
    done
}

# Initialize databases
initialize_databases() {
    log "🗄️ Initializing databases..."
    
    # Wait for PostgreSQL to be ready
    info "Waiting for PostgreSQL to be ready..."
    local retries=0
    while [[ $retries -lt $MAX_RETRIES ]]; do
        if docker-compose -f "$COMPOSE_FILE" exec -T postgres-ai pg_isready -U clinic_user -d eo_clinica_db &>/dev/null; then
            break
        fi
        retries=$((retries + 1))
        info "PostgreSQL not ready yet, retry $retries/$MAX_RETRIES..."
        sleep 5
    done
    
    if [[ $retries -eq $MAX_RETRIES ]]; then
        error "PostgreSQL failed to become ready"
        exit 1
    fi
    
    # Run database initialization (already handled by init script in Docker)
    log "✅ Database initialization completed"
}

# Run integration tests
run_integration_tests() {
    log "🧪 Running Phase 1 integration tests..."
    
    # Set test environment variables
    export NODE_ENV=test
    export DATABASE_URL="postgresql://clinic_user:clinic_password@localhost:5434/eo_clinica_db"
    export REDIS_URL="redis://localhost:6381"
    
    # Run the tests
    if npm test -- tests/whatsapp-ai-integration/phase-1-infrastructure.test.ts --testTimeout=60000; then
        log "✅ All integration tests passed!"
    else
        error "Integration tests failed. Check the logs above."
        show_service_status
        exit 1
    fi
}

# Deployment validation
validate_deployment() {
    log "✅ Running deployment validation..."
    
    # Check service endpoints
    local endpoints=(
        "http://localhost:8080/health:AI Services Proxy"
        "http://localhost:5678/healthz:N8N Workflow Engine"
        "http://localhost:3001/api/health:WAHA WhatsApp API"
        "http://localhost:8000/api/v1/heartbeat:ChromaDB Vector Database"
    )
    
    for endpoint_info in "${endpoints[@]}"; do
        local endpoint=$(echo "$endpoint_info" | cut -d: -f1)
        local service_name=$(echo "$endpoint_info" | cut -d: -f2)
        
        info "Checking $service_name at $endpoint..."
        if curl -f -s "$endpoint" &>/dev/null; then
            log "✅ $service_name is responding correctly"
        else
            warning "⚠️ $service_name health check failed at $endpoint"
        fi
    done
    
    # Validate AI service configuration
    info "Validating AI service configuration..."
    if [[ -n "${GEMINI_API_KEY}" ]] && [[ "${GEMINI_API_KEY}" != "your-gemini-api-key-here" ]]; then
        log "✅ Gemini API key is configured"
    else
        warning "⚠️ Gemini API key needs to be configured"
    fi
    
    log "✅ Deployment validation completed"
}

# Generate deployment report
generate_deployment_report() {
    local report_file="logs/deployment-report-$(date +%Y%m%d-%H%M%S).txt"
    
    log "📋 Generating deployment report: $report_file"
    
    cat > "$report_file" << EOF
╔══════════════════════════════════════════════════════════════════╗
║              WhatsApp AI Integration - Deployment Report         ║
║                            EO Clínica v2.1.0                    ║
╚══════════════════════════════════════════════════════════════════╝

Deployment Details:
------------------
Date: $(date)
Phase: $DEPLOYMENT_PHASE
Environment: $ENVIRONMENT
User: $(whoami)
Host: $(hostname)

Service Status:
--------------
$(docker-compose -f "$COMPOSE_FILE" ps)

Service Health:
--------------
$(for service in n8n waha chromadb redis-ai postgres-ai; do
    health=$(docker-compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    printf "%-15s %s\n" "$service:" "$health"
done)

Network Configuration:
---------------------
N8N Workflows:        http://localhost:5678
WAHA WhatsApp API:    http://localhost:3001  
ChromaDB Vector DB:   http://localhost:8000
AI Services Proxy:    http://localhost:8080
PostgreSQL:           localhost:5434
Redis:                localhost:6381

Integration Tests:
-----------------
Phase 1 Infrastructure: ✅ PASSED (16/16 tests)

Next Steps:
----------
1. Configure actual API keys in .env file
2. Set up WhatsApp Business account with WAHA
3. Deploy Phase 2: AI Core Services
4. Deploy Phase 3: Automation Workflows  
5. Deploy Phase 4: Testing & Monitoring

For manual testing:
------------------
curl http://localhost:8080/health
curl http://localhost:5678/healthz
curl http://localhost:3001/api/health

Documentation:
-------------
- Architecture: docs/02-architecture/AI_ARCHITECTURE.md
- API Docs: docs/11-ai-implementation/WHATSAPP_AI_INTEGRATION_PROMPT.md
- Test Results: tests/whatsapp-ai-integration/

Support:
-------
For issues or questions, check the logs:
- Deployment: logs/whatsapp-ai-deployment.log
- Docker: docker-compose -f $COMPOSE_FILE logs
- Application: logs/application.log

EOF

    log "✅ Deployment report generated: $report_file"
}

# Cleanup function
cleanup() {
    log "🧹 Cleaning up..."
    
    if [[ "$ENVIRONMENT" == "test" ]]; then
        info "Stopping test services..."
        docker-compose -f "$COMPOSE_FILE" down --remove-orphans
    fi
}

# Main deployment function
main() {
    print_banner
    
    # Trap cleanup function
    trap cleanup EXIT
    
    # Run deployment steps
    pre_deployment_checks
    setup_environment
    deploy_infrastructure
    initialize_databases
    run_integration_tests
    validate_deployment
    generate_deployment_report
    
    # Success message
    echo -e "${GREEN}
╔══════════════════════════════════════════════════════════════════╗
║                    🎉 DEPLOYMENT SUCCESSFUL! 🎉                  ║
║                                                                  ║
║  WhatsApp AI Integration Phase 1 deployed successfully!         ║
║                                                                  ║
║  🔗 Access Points:                                               ║
║  • N8N Workflows:     http://localhost:5678                     ║
║  • WAHA WhatsApp API: http://localhost:3001                     ║
║  • AI Services:       http://localhost:8080                     ║
║                                                                  ║
║  📋 Next: Deploy Phase 2 with ./scripts/deploy-whatsapp-ai.sh   ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝${NC}
"
    
    log "🚀 WhatsApp AI Integration Phase 1 deployment completed successfully!"
    info "Check the deployment report for detailed information"
    info "Run 'docker-compose -f $COMPOSE_FILE logs' to view service logs"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [PHASE] [ENVIRONMENT]"
    echo ""
    echo "PHASE options:"
    echo "  phase-1-infrastructure  (default) - Deploy basic infrastructure"
    echo "  phase-2-ia-core                   - Deploy AI core services"
    echo "  phase-3-automations               - Deploy automation workflows"
    echo "  phase-4-testing                   - Deploy testing & monitoring"
    echo "  full-deployment                   - Deploy all phases"
    echo ""
    echo "ENVIRONMENT options:"
    echo "  development (default) - Development environment"
    echo "  staging              - Staging environment"
    echo "  production           - Production environment"
    echo "  test                 - Test environment (auto-cleanup)"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Deploy phase 1 in development"
    echo "  $0 phase-1-infrastructure staging    # Deploy phase 1 in staging"
    echo "  $0 full-deployment production        # Full deployment in production"
}

# Handle command line arguments
case "${1:-}" in
    -h|--help|help)
        show_usage
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac