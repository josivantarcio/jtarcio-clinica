#!/bin/bash

# 🚀 GitHub Actions Status Checker
# Este script verifica o status dos workflows do GitHub Actions

echo "🔄 Verificando GitHub Actions..."
echo "======================================"

# Definir cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para verificar se gh está instalado
check_gh_cli() {
    if ! command -v gh &> /dev/null; then
        echo -e "${YELLOW}⚠️  GitHub CLI não encontrado. Instalando...${NC}"
        
        # Instalar GitHub CLI
        curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
        sudo apt update
        sudo apt install gh -y
        
        echo -e "${GREEN}✅ GitHub CLI instalado com sucesso!${NC}"
    fi
}

# Função para verificar workflows
check_workflows() {
    echo "📊 Status dos Workflows Recentes:"
    echo "--------------------------------"
    
    if command -v gh &> /dev/null; then
        # Verificar se está autenticado
        if gh auth status &> /dev/null; then
            gh run list --limit 10 --json status,conclusion,name,createdAt,url
        else
            echo -e "${YELLOW}⚠️  GitHub CLI não está autenticado${NC}"
            echo "Execute: gh auth login"
        fi
    else
        echo -e "${RED}❌ GitHub CLI não está disponível${NC}"
        echo "Verificação manual necessária em: https://github.com/josivantarcio/jtarcio-clinica/actions"
    fi
}

# Função para verificar arquivos de workflow
check_workflow_files() {
    echo ""
    echo "📁 Verificando arquivos de workflow:"
    echo "-----------------------------------"
    
    if [ -d ".github/workflows" ]; then
        echo -e "${GREEN}✅ Pasta .github/workflows encontrada${NC}"
        
        for file in .github/workflows/*.yml .github/workflows/*.yaml; do
            if [ -f "$file" ]; then
                echo -e "${GREEN}✅ $(basename "$file")${NC}"
            fi
        done
    else
        echo -e "${RED}❌ Pasta .github/workflows não encontrada${NC}"
    fi
}

# Função principal
main() {
    echo "🚀 WhatsApp AI Integration - GitHub Actions Checker"
    echo "=================================================="
    echo ""
    
    check_workflow_files
    echo ""
    check_gh_cli
    echo ""
    check_workflows
    
    echo ""
    echo "🔗 Links Úteis:"
    echo "- GitHub Actions: https://github.com/josivantarcio/jtarcio-clinica/actions"
    echo "- Último commit: https://github.com/josivantarcio/jtarcio-clinica/commit/$(git rev-parse HEAD)"
    echo ""
    echo -e "${GREEN}✅ Verificação concluída!${NC}"
}

# Executar
main