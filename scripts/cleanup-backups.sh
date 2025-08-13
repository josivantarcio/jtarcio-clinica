#!/bin/bash

# EO Clínica - Script de Limpeza Automática de Backups
# © 2025 Jtarcio Desenvolvimento
# Implementa política de retenção de backups conforme LGPD e CFM

set -e

# Configurações
BACKUP_DIR="./backups"
LOG_FILE="./logs/backup-cleanup.log"
DEVELOPMENT_RETENTION_DAYS=7
MAX_RECENT_BACKUPS=5

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log_message() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo -e "${BLUE}📋 $message${NC}"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || echo "$message"
}

log_success() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ✅ $1"
    echo -e "${GREEN}$message${NC}"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || echo "$message"
}

log_warning() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ⚠️  $1"
    echo -e "${YELLOW}$message${NC}"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || echo "$message"
}

log_error() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $1"
    echo -e "${RED}$message${NC}"
    echo "$message" >> "$LOG_FILE" 2>/dev/null || echo "$message"
}

# Create logs directory if it doesn't exist
create_log_dir() {
    if [ ! -d "./logs" ]; then
        mkdir -p "./logs"
    fi
}

# Check if we're in the correct directory
check_environment() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_error "Diretório de backup '$BACKUP_DIR' não encontrado!"
        log_error "Execute este script na raiz do projeto EO Clínica"
        exit 1
    fi
    
    if [ ! -f "package.json" ] || [ ! -d "frontend" ]; then
        log_error "Execute este script na raiz do projeto EO Clínica"
        exit 1
    fi
    
    log_success "Ambiente verificado - diretório correto"
}

# Get backup statistics before cleanup
get_backup_stats() {
    local backup_count=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "202*" 2>/dev/null | wc -l)
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
    
    echo "$backup_count|$total_size"
}

# Clean development backups (older than retention period)
cleanup_old_development_backups() {
    log_message "Limpando backups de desenvolvimento antigos (>${DEVELOPMENT_RETENTION_DAYS} dias)..."
    
    local removed_count=0
    local cutoff_date=$(date -d "${DEVELOPMENT_RETENTION_DAYS} days ago" '+%Y%m%d_%H%M%S')
    
    # Find and remove old development backups
    find "$BACKUP_DIR" -maxdepth 1 -type d -name "202*" 2>/dev/null | while read backup_dir; do
        local backup_name=$(basename "$backup_dir")
        
        # Compare with cutoff date
        if [[ "$backup_name" < "$cutoff_date" ]]; then
            log_message "Removendo backup antigo: $backup_name"
            rm -rf "$backup_dir" 2>/dev/null || {
                log_warning "Falha ao remover: $backup_dir"
            }
            removed_count=$((removed_count + 1))
        fi
    done
    
    if [ $removed_count -gt 0 ]; then
        log_success "Removidos $removed_count backups antigos de desenvolvimento"
    else
        log_message "Nenhum backup antigo encontrado para remoção"
    fi
}

# Keep only the most recent development backups
cleanup_excess_recent_backups() {
    log_message "Mantendo apenas os $MAX_RECENT_BACKUPS backups mais recentes..."
    
    local recent_backups=$(find "$BACKUP_DIR" -maxdepth 1 -type d -name "202*" 2>/dev/null | sort -r)
    local backup_count=$(echo "$recent_backups" | wc -l)
    
    if [ $backup_count -gt $MAX_RECENT_BACKUPS ]; then
        local excess_count=$((backup_count - MAX_RECENT_BACKUPS))
        
        echo "$recent_backups" | tail -n $excess_count | while read excess_backup; do
            if [ -n "$excess_backup" ] && [ -d "$excess_backup" ]; then
                local backup_name=$(basename "$excess_backup")
                log_message "Removendo backup excedente: $backup_name"
                rm -rf "$excess_backup" 2>/dev/null || {
                    log_warning "Falha ao remover backup excedente: $excess_backup"
                }
            fi
        done
        
        log_success "Removidos $excess_count backups excedentes"
    else
        log_message "Quantidade de backups ($backup_count) dentro do limite ($MAX_RECENT_BACKUPS)"
    fi
}

# Clean empty backup directories
cleanup_empty_directories() {
    log_message "Removendo diretórios vazios..."
    
    find "$BACKUP_DIR" -type d -empty 2>/dev/null | while read empty_dir; do
        if [ "$empty_dir" != "$BACKUP_DIR" ]; then
            log_message "Removendo diretório vazio: $(basename "$empty_dir")"
            rmdir "$empty_dir" 2>/dev/null || true
        fi
    done
}

# Verify backup integrity for remaining backups
verify_backup_integrity() {
    log_message "Verificando integridade dos backups restantes..."
    
    local corrupted_count=0
    local verified_count=0
    
    find "$BACKUP_DIR" -name "app_backup.tar.gz" 2>/dev/null | while read backup_file; do
        local backup_dir=$(dirname "$backup_file")
        local backup_name=$(basename "$backup_dir")
        
        if gzip -t "$backup_file" 2>/dev/null; then
            log_message "✅ Backup íntegro: $backup_name"
            verified_count=$((verified_count + 1))
        else
            log_warning "❌ Backup corrompido detectado: $backup_name"
            log_warning "Considere remover o backup corrompido: $backup_dir"
            corrupted_count=$((corrupted_count + 1))
        fi
    done
    
    if [ $corrupted_count -eq 0 ]; then
        log_success "Todos os backups verificados estão íntegros"
    else
        log_warning "Encontrados $corrupted_count backups corrompidos"
    fi
}

# Generate cleanup report
generate_cleanup_report() {
    local stats_before=$1
    local stats_after=$(get_backup_stats)
    
    local before_count=$(echo "$stats_before" | cut -d'|' -f1)
    local before_size=$(echo "$stats_before" | cut -d'|' -f2)
    local after_count=$(echo "$stats_after" | cut -d'|' -f1)
    local after_size=$(echo "$stats_after" | cut -d'|' -f2)
    
    log_message "=== RELATÓRIO DE LIMPEZA ==="
    log_message "Backups antes: $before_count ($before_size)"
    log_message "Backups depois: $after_count ($after_size)"
    
    if [ $before_count -gt $after_count ]; then
        local removed_count=$((before_count - after_count))
        log_success "Limpeza bem-sucedida: $removed_count backups removidos"
        log_success "Espaço liberado: $before_size → $after_size"
    else
        log_message "Nenhuma limpeza necessária - sistema já otimizado"
    fi
    
    log_message "=== RELATÓRIO CONCLUÍDO ==="
}

# Main cleanup function
main() {
    echo -e "${BLUE}🧹 EO CLÍNICA - LIMPEZA AUTOMÁTICA DE BACKUPS${NC}"
    echo -e "${BLUE}© 2025 Jtarcio Desenvolvimento${NC}"
    echo ""
    
    # Setup
    create_log_dir
    check_environment
    
    # Get initial stats
    local stats_before=$(get_backup_stats)
    
    log_message "=== INICIANDO LIMPEZA AUTOMÁTICA DE BACKUPS ==="
    log_message "Política: Manter $MAX_RECENT_BACKUPS backups mais recentes"
    log_message "Retenção: $DEVELOPMENT_RETENTION_DAYS dias para desenvolvimento"
    
    # Perform cleanup operations
    cleanup_old_development_backups
    cleanup_excess_recent_backups
    cleanup_empty_directories
    
    # Verify integrity of remaining backups
    verify_backup_integrity
    
    # Generate report
    generate_cleanup_report "$stats_before"
    
    log_success "Limpeza automática concluída com sucesso! 🎉"
    
    # Show remaining backups
    echo ""
    echo -e "${GREEN}📊 BACKUPS MANTIDOS:${NC}"
    ls -la "$BACKUP_DIR"/ 2>/dev/null | grep ^d | grep -E "202[0-9]" | while read line; do
        echo "   $(echo "$line" | awk '{print $9}') - $(echo "$line" | awk '{print $6, $7, $8}')"
    done || echo "   Nenhum backup encontrado"
}

# Execute main function with all arguments
main "$@"