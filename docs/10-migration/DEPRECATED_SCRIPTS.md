# 📄 Scripts Descontinuados - Arquivo Histórico

> **Registro de scripts que foram substituídos por versões melhoradas**

---

## 📋 **Resumo**

Este documento registra scripts que foram descontinuados em favor de versões mais robustas e completas.

**Data de arquivamento:** 20 de Agosto de 2025  
**Razão:** Consolidação e simplificação do processo de deploy

---

## 🗃️ **Scripts Removidos**

### **production-deploy.sh** (DESCONTINUADO)
- **Localização original:** `scripts/production-deploy.sh`
- **Tamanho:** 138 linhas
- **Funcionalidade:** Deploy básico em produção
- **Substituído por:** `scripts/start-production.sh` (798 linhas)

#### **Comparação de Funcionalidades**

| Funcionalidade | production-deploy.sh | start-production.sh |
|----------------|---------------------|-------------------|
| **Limpeza de ambiente** | ✅ Básica | ✅ Completa com retry |
| **Health checks** | ✅ Simples | ✅ Avançados com timeout |
| **Error handling** | ✅ Básico | ✅ Robusto com rollback |
| **Logging** | ❌ Console apenas | ✅ Colorido e estruturado |
| **Backup automático** | ❌ Não | ✅ Backup antes do deploy |
| **Rollback automático** | ❌ Não | ✅ Rollback em caso de falha |
| **Monitoramento** | ❌ Não | ✅ Status de serviços |
| **Configuração produção** | ✅ Básica | ✅ Ambiente completo |
| **Zero-downtime** | ❌ Não | ✅ Deploy sem interrupção |
| **Gerenciamento de PIDs** | ❌ Não | ✅ Controle de processos |

#### **Razões para Descontinuação**

1. **Funcionalidade Limitada**
   - Não possui backup automático
   - Não tem rollback em caso de falha
   - Health checks simplificados

2. **Error Handling Insuficiente**
   - Não trata falhas de containers
   - Não verifica dependências
   - Não valida estado do sistema

3. **Manutenibilidade**
   - Código duplicado com start-production.sh
   - Manutenção de dois scripts similares
   - Confusão sobre qual script usar

4. **Robustez**
   - start-production.sh é 5x mais completo
   - Inclui todas as funcionalidades do antigo script
   - Adiciona muitas funcionalidades enterprise

#### **Conteúdo Arquivado**

O script `production-deploy.sh` foi removido em 20/08/2025. Seu conteúdo original está disponível no histórico do Git.

**Para recuperar o script (se necessário):**
```bash
git log --oneline --follow scripts/production-deploy.sh
git show <commit-hash>:scripts/production-deploy.sh
```

---

## 🔄 **Scripts Ativos**

### **start-production.sh** (ATIVO)
- **Localização:** `scripts/start-production.sh`
- **Tamanho:** 798 linhas
- **Funcionalidade:** Deploy completo enterprise-grade
- **Características:**
  - ✅ Deploy zero-downtime
  - ✅ Backup automático
  - ✅ Rollback automático
  - ✅ Health checks avançados
  - ✅ Logging colorido e estruturado
  - ✅ Gerenciamento de processos
  - ✅ Configuração de ambiente completa
  - ✅ Error handling robusto

### **Outros Scripts Mantidos**
- **clean-all-data.sh** - Limpeza completa de dados
- **cleanup-backups.sh** - Limpeza de backups antigos

---

## 📚 **Documentação Relacionada**

- **[Guia de Deploy](../04-deployment/PRODUCTION_DEPLOYMENT.md)** - Como usar o script atual
- **[Backup Policy](../04-deployment/BACKUP_POLICY.md)** - Política de backups
- **[Troubleshooting](../08-troubleshooting/COMMON_ISSUES.md)** - Problemas comuns

---

## 📝 **Log de Mudanças**

### **20/08/2025**
- ✅ Removido `production-deploy.sh`
- ✅ Consolidado funcionalidades no `start-production.sh`
- ✅ Documentação atualizada
- ✅ Processo simplificado para uma única entrada

### **Vantagens da Consolidação**
1. **Menos Confusão** - Um único script de deploy
2. **Manutenção Mais Fácil** - Código centralizado
3. **Funcionalidades Completas** - Todas as features em um lugar
4. **Melhor Documentação** - Foco em um script robusto

---

**Nota:** Se você estava usando o `production-deploy.sh`, migre para o `start-production.sh`. Todas as funcionalidades foram preservadas e melhoradas.

```bash
# Comando antigo (descontinuado)
./scripts/production-deploy.sh

# Comando atual (recomendado)
./scripts/start-production.sh
```

---

*Este documento serve como registro histórico e não deve ser removido.*