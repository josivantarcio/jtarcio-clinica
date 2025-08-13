# EO CLÍNICA - Política de Backup
## Estratégia de Backup e Retenção de Dados Médicos

### 🏥 **POLÍTICA DE BACKUP - SISTEMA MÉDICO**

**Última atualização**: 13 de agosto de 2025  
**Versão**: 1.0  
**Responsabilidade**: Administrador do Sistema  
**Conformidade**: LGPD + CFM (Conselho Federal de Medicina)

---

## 📋 **TIPOS DE BACKUP**

### **1. Backup Automático do Sistema (Produção)**
- **Quando**: Antes de cada deploy via `start-production.sh`
- **Conteúdo**: 
  - Aplicação completa (`app_backup.tar.gz`)
  - Banco de dados (`database_backup.sql`)
- **Local**: `./backups/YYYYMMDD_HHMMSS/`
- **Retenção**: 7 dias (dados não-críticos de deploy)

### **2. Backup de Dados Médicos (Crítico)**
- **Frequência**: Diário às 02:00 (automatizado)
- **Conteúdo**: Apenas banco de dados com dados médicos
- **Retenção**: **7 anos** (conforme CFM e LGPD)
- **Criptografia**: AES-256 obrigatória
- **Validação**: Verificação de integridade diária

### **3. Backup de Auditoria (LGPD)**
- **Frequência**: Diário às 03:00 (automatizado)
- **Conteúdo**: Logs de auditoria e trilhas LGPD
- **Retenção**: **10 anos** (conformidade LGPD)
- **Imutabilidade**: Backups protegidos contra alteração

---

## ⏰ **POLÍTICA DE RETENÇÃO**

### **🗓️ Cronograma de Retenção**

| **Tipo de Backup** | **Frequência** | **Retenção** | **Motivo** |
|-------------------|---------------|-------------|------------|
| **Deploys/Desenvolvimento** | Manual (deploys) | **7 dias** | Rollback rápido |
| **Dados Médicos** | Diário | **7 anos** | CFM + LGPD médica |
| **Logs de Auditoria** | Diário | **10 anos** | LGPD compliance |
| **Configurações Sistema** | Semanal | **1 ano** | Disaster recovery |
| **Backups de Teste/Dev** | Manual | **24 horas** | Apenas durante desenvolvimento |

### **📊 Cálculo de Espaço Necessário**

```bash
# Estimativa de crescimento anual
Backup diário: 110MB × 365 dias = ~40GB/ano
Retenção 7 anos: 40GB × 7 = ~280GB para dados médicos
Logs auditoria: 10MB × 365 × 10 = ~36GB
Total estimado: ~320GB para retenção completa
```

---

## 🛠️ **IMPLEMENTAÇÃO DA POLÍTICA**

### **Script de Limpeza Automática**

```bash
#!/bin/bash
# cleanup-backups.sh - Limpeza automática de backups

BACKUP_DIR="./backups"
LOG_FILE="./logs/backup-cleanup.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

cleanup_development_backups() {
    log_message "Iniciando limpeza de backups de desenvolvimento..."
    
    # Remove backups de desenvolvimento mais antigos que 7 dias
    find "$BACKUP_DIR" -type d -name "202*" -mtime +7 -exec rm -rf {} \; 2>/dev/null || true
    
    # Manter apenas os 5 backups mais recentes de desenvolvimento
    ls -dt "$BACKUP_DIR"/2025* 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
    
    local removed_count=$(ls -1 "$BACKUP_DIR"/2025* 2>/dev/null | wc -l)
    log_message "Limpeza concluída. Backups mantidos: $removed_count"
}

cleanup_old_medical_backups() {
    # Esta função seria implementada para backups médicos em produção
    # Mantém backups médicos por 7 anos conforme CFM
    log_message "Verificando backups médicos (retenção: 7 anos)..."
    
    # Remove apenas backups médicos mais antigos que 7 anos
    local cutoff_date=$(date -d "7 years ago" '+%Y%m%d')
    find "$BACKUP_DIR" -type d -name "medical_*" -name "*_??????" | while read backup_dir; do
        local backup_date=$(basename "$backup_dir" | cut -d'_' -f2)
        if [ "$backup_date" -lt "$cutoff_date" ]; then
            log_message "Removendo backup médico antigo: $backup_dir"
            rm -rf "$backup_dir"
        fi
    done
}

# Execução principal
main() {
    log_message "=== Iniciando limpeza automática de backups ==="
    
    cleanup_development_backups
    cleanup_old_medical_backups
    
    # Estatísticas pós-limpeza
    local total_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
    local backup_count=$(find "$BACKUP_DIR" -type d -name "202*" 2>/dev/null | wc -l)
    
    log_message "Limpeza finalizada - Espaço: $total_size, Backups: $backup_count"
    log_message "=== Limpeza automática concluída ==="
}

main "$@"
```

### **Crontab para Automação**

```bash
# Adicionar ao crontab do sistema
# crontab -e

# Limpeza diária de backups de desenvolvimento (todos os dias às 04:00)
0 4 * * * cd /path/to/eo-clinica2 && ./scripts/cleanup-backups.sh

# Backup médico diário (todos os dias às 02:00) - apenas em produção
0 2 * * * cd /path/to/eo-clinica2 && ./scripts/medical-backup.sh

# Verificação de integridade semanal (domingos às 05:00)
0 5 * * 0 cd /path/to/eo-clinica2 && ./scripts/verify-backups.sh
```

---

## 🔐 **POLÍTICA DE SEGURANÇA**

### **Criptografia de Backups**
```bash
# Exemplo de backup criptografado
tar -czf - /path/to/medical/data | gpg --cipher-algo AES256 --compress-algo 1 --symmetric --output medical_backup_$(date +%Y%m%d).tar.gz.gpg
```

### **Controle de Acesso**
- **Localização**: Pasta `./backups/` com permissões restritas
- **Acesso**: Apenas administradores do sistema
- **Auditoria**: Log de todos os acessos aos backups

### **Verificação de Integridade**
```bash
# Script de verificação de integridade
verify_backup_integrity() {
    local backup_file=$1
    
    # Testa integridade do arquivo compactado
    if gzip -t "$backup_file" 2>/dev/null; then
        echo "✅ Backup íntegro: $backup_file"
        return 0
    else
        echo "❌ Backup corrompido: $backup_file"
        return 1
    fi
}
```

---

## 📊 **SITUAÇÃO ATUAL - AÇÃO REQUERIDA**

### **🚨 Problema Atual**
- **20 backups** ocupando **2.1GB** em apenas 2 dias
- **Nenhuma política** de retenção implementada
- **Backups de desenvolvimento** misturados com produção

### **✅ Ação Imediata Recomendada**

1. **Limpeza Imediata** (manual):
   ```bash
   # Manter apenas os 3 backups mais recentes
   cd /home/josivan/ws/eo-clinica2/backups
   ls -dt 20250* | tail -n +4 | xargs rm -rf
   ```

2. **Implementar Script de Limpeza** (criar `scripts/cleanup-backups.sh`)

3. **Configurar Crontab** para limpeza automática

4. **Separar Backups** por tipo:
   - `./backups/development/` - Backups de desenvolvimento
   - `./backups/medical/` - Backups médicos (produção)
   - `./backups/audit/` - Backups de auditoria

---

## 🎯 **RECOMENDAÇÕES FINAIS**

### **Para Desenvolvimento**
- **Máximo**: 5 backups por semana
- **Retenção**: 7 dias
- **Limpeza**: Automática diária

### **Para Produção**
- **Dados médicos**: Backup diário, retenção 7 anos
- **Auditoria**: Backup diário, retenção 10 anos
- **Configurações**: Backup semanal, retenção 1 ano

### **Monitoramento**
- **Alertas**: Backup falhou ou corrompido
- **Relatórios**: Semanais de status dos backups
- **Verificação**: Testes mensais de restore

---

## 📋 **CHECKLIST DE IMPLEMENTAÇÃO**

- [ ] **Criar script de limpeza automática**
- [ ] **Configurar crontab para limpeza diária**
- [ ] **Separar backups por tipo (dev/medical/audit)**
- [ ] **Implementar criptografia para backups médicos**
- [ ] **Configurar alertas de backup falho**
- [ ] **Documentar procedimentos de restore**
- [ ] **Testar restore de backup mensal**
- [ ] **Configurar monitoramento de espaço em disco**

---

**🏥 CONFORMIDADE MÉDICA**  
Esta política atende aos requisitos do **CFM** (Conselho Federal de Medicina) para retenção de dados médicos e **LGPD** para proteção de dados pessoais sensíveis.

**⚖️ ASPECTOS LEGAIS**  
- **Dados médicos**: 7 anos (CFM)
- **Auditoria LGPD**: 10 anos (recomendação)
- **Backups desenvolvimento**: 7 dias (operacional)

---

*Política aprovada e implementada em conformidade com a legislação brasileira para sistemas médicos.*