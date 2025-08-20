#!/bin/bash

# 📋 EO Clínica - Financial Module Task Manager  
# Interactive task management for financial module implementation
# Usage: ./scripts/financial-task-manager.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKLIST_FILE="$PROJECT_ROOT/docs/FINANCIAL_MODULE_CHECKLIST.md"

echo -e "${BLUE}📋 EO Clínica - Financial Module Task Manager${NC}"
echo "=================================================="

show_menu() {
    echo ""
    echo -e "${CYAN}Available Commands:${NC}"
    echo "1. 📊 Check Progress"
    echo "2. 🏗️  Setup Phase 1 (Foundation)"  
    echo "3. 🎨 Setup Phase 2 (Frontend)"
    echo "4. 📋 View Checklist"
    echo "5. 🔍 Find Next Task"
    echo "6. ✅ Mark Task Complete"
    echo "7. 🚀 Quick Start Guide"
    echo "8. 📚 View Documentation"
    echo "9. 🧪 Run Tests"
    echo "0. ❌ Exit"
    echo ""
    echo -n -e "${YELLOW}Choose an option (0-9): ${NC}"
}

check_progress() {
    echo -e "${BLUE}📊 Checking Progress...${NC}"
    if [ -f "$PROJECT_ROOT/scripts/check-financial-progress.js" ]; then
        node "$PROJECT_ROOT/scripts/check-financial-progress.js"
    else
        echo -e "${RED}❌ Progress checker not found${NC}"
    fi
}

setup_phase1() {
    echo -e "${BLUE}🏗️  Setting up Phase 1: Foundation${NC}"
    if [ -f "$PROJECT_ROOT/scripts/financial-setup.sh" ]; then
        "$PROJECT_ROOT/scripts/financial-setup.sh" 1
    else
        echo -e "${RED}❌ Setup script not found${NC}"
    fi
}

setup_phase2() {
    echo -e "${BLUE}🎨 Setting up Phase 2: Frontend${NC}"
    if [ -f "$PROJECT_ROOT/scripts/financial-setup.sh" ]; then
        "$PROJECT_ROOT/scripts/financial-setup.sh" 2
    else
        echo -e "${RED}❌ Setup script not found${NC}"
    fi
}

view_checklist() {
    echo -e "${BLUE}📋 Opening Financial Module Checklist...${NC}"
    if [ -f "$CHECKLIST_FILE" ]; then
        if command -v less >/dev/null 2>&1; then
            less "$CHECKLIST_FILE"
        elif command -v more >/dev/null 2>&1; then
            more "$CHECKLIST_FILE"
        else
            cat "$CHECKLIST_FILE"
        fi
    else
        echo -e "${RED}❌ Checklist file not found at $CHECKLIST_FILE${NC}"
    fi
}

find_next_task() {
    echo -e "${BLUE}🔍 Finding Next Task...${NC}"
    
    # List of critical tasks in order
    TASKS=(
        "src/types/financial/index.ts|Create financial TypeScript types"
        "src/services/financial/financial.service.ts|Create core financial service"
        "src/middleware/financial/auth.middleware.ts|Create financial authentication middleware"
        "src/routes/financial/index.ts|Create financial API routes"
        "frontend/src/app/financial/page.tsx|Create financial dashboard page"
        "frontend/src/components/financial|Create financial components directory"
    )
    
    for task in "${TASKS[@]}"; do
        IFS="|" read -r file_path description <<< "$task"
        full_path="$PROJECT_ROOT/$file_path"
        
        if [ ! -e "$full_path" ]; then
            echo -e "${YELLOW}🚀 Next Task Found:${NC}"
            echo -e "${GREEN}Description:${NC} $description"
            echo -e "${GREEN}File/Path:${NC} $file_path"
            echo -e "${GREEN}Full Path:${NC} $full_path"
            echo ""
            echo -e "${CYAN}To create this file/directory, you can:${NC}"
            if [[ "$file_path" == *"/"* ]]; then
                directory=$(dirname "$file_path")
                echo "1. Create directory: mkdir -p $PROJECT_ROOT/$directory"
                if [[ "$file_path" == *.ts || "$file_path" == *.tsx ]]; then
                    echo "2. Create file: touch $full_path"
                    echo "3. Edit file: code $full_path"
                fi
            fi
            return 0
        fi
    done
    
    echo -e "${GREEN}🎉 All critical foundation tasks are complete!${NC}"
    echo -e "${YELLOW}Check the full checklist for remaining tasks.${NC}"
}

mark_task_complete() {
    echo -e "${BLUE}✅ Mark Task Complete${NC}"
    echo -e "${YELLOW}Note: Task completion is tracked by file/directory existence.${NC}"
    echo -e "${YELLOW}Once you create the required files, run 'Check Progress' to see updates.${NC}"
    echo ""
    echo -e "${CYAN}Quick commands to mark common tasks as complete:${NC}"
    echo "• Create a file: touch path/to/file.ts"
    echo "• Create a directory: mkdir -p path/to/directory"  
    echo "• Copy template: cp template.ts new-file.ts"
}

quick_start() {
    echo -e "${BLUE}🚀 Quick Start Guide${NC}"
    echo "==================="
    echo ""
    echo -e "${GREEN}Step 1: Check Current Status${NC}"
    echo "   Run: 📊 Check Progress"
    echo ""
    echo -e "${GREEN}Step 2: Set Up Foundation${NC}"
    echo "   Run: 🏗️ Setup Phase 1 (Foundation)"
    echo ""
    echo -e "${GREEN}Step 3: Update Main Router${NC}"
    echo "   Add financial routes to src/routes/index.ts:"
    echo "   ${CYAN}await fastify.register(import('./financial'), { prefix: '/api/v1/financial' })${NC}"
    echo ""
    echo -e "${GREEN}Step 4: Update Prisma Schema${NC}"
    echo "   Add financial models to prisma/schema.prisma"
    echo "   Run: npm run db:generate"
    echo ""
    echo -e "${GREEN}Step 5: Create Database Migration${NC}"
    echo "   Run: npm run db:migrate"
    echo ""
    echo -e "${GREEN}Step 6: Test Foundation${NC}"
    echo "   Start server and test: GET /api/v1/financial/health"
    echo ""
    echo -e "${GREEN}Step 7: Set Up Frontend${NC}"
    echo "   Run: 🎨 Setup Phase 2 (Frontend)"
    echo ""
    echo -e "${GREEN}Step 8: Update Navigation${NC}"
    echo "   Add financial menu item to frontend sidebar"
    echo ""
    echo -e "${YELLOW}For detailed steps, check the full checklist!${NC}"
}

view_documentation() {
    echo -e "${BLUE}📚 Financial Module Documentation${NC}"
    echo "=================================="
    echo ""
    echo -e "${CYAN}Available Documentation:${NC}"
    
    docs=(
        "docs/FINANCIAL_MODULE_CHECKLIST.md|Implementation Checklist"
        "docs/DATABASE_SCHEMA.md|Current Database Schema"
        "docs/API_DOCUMENTATION.md|API Reference"
        "docs/ARCHITECTURE.md|System Architecture"
        "docs/SECURITY_GUIDE.md|Security Guidelines"
    )
    
    for doc in "${docs[@]}"; do
        IFS="|" read -r file_path description <<< "$doc"
        full_path="$PROJECT_ROOT/$file_path"
        
        if [ -f "$full_path" ]; then
            echo -e "${GREEN}✅ $description${NC} - $file_path"
        else
            echo -e "${YELLOW}📄 $description${NC} - $file_path (not found)"
        fi
    done
    
    echo ""
    echo -e "${CYAN}To view a document:${NC}"
    echo "• less docs/FINANCIAL_MODULE_CHECKLIST.md"
    echo "• code docs/FINANCIAL_MODULE_CHECKLIST.md"
}

run_tests() {
    echo -e "${BLUE}🧪 Running Financial Module Tests${NC}"
    
    # Check if we're in development phase
    if [ ! -d "$PROJECT_ROOT/src/routes/financial" ]; then
        echo -e "${YELLOW}⚠️  Financial module not yet implemented${NC}"
        echo -e "${YELLOW}Run setup first, then come back to test${NC}"
        return
    fi
    
    # Basic health check
    echo -e "${CYAN}Testing API health...${NC}"
    if command -v curl >/dev/null 2>&1; then
        # This will fail until the server is running, but that's expected
        curl -f http://localhost:3000/api/v1/financial/health 2>/dev/null && echo -e "${GREEN}✅ API Health OK${NC}" || echo -e "${YELLOW}⚠️  Server not running or route not implemented${NC}"
    else
        echo -e "${YELLOW}⚠️  curl not available for testing${NC}"
    fi
    
    # Check file structure
    echo -e "${CYAN}Checking file structure...${NC}"
    if [ -f "$PROJECT_ROOT/src/routes/financial/index.ts" ]; then
        echo -e "${GREEN}✅ Financial routes exist${NC}"
    else
        echo -e "${RED}❌ Financial routes missing${NC}"
    fi
    
    # Run actual tests if they exist
    if [ -f "$PROJECT_ROOT/package.json" ] && grep -q "test.*financial" "$PROJECT_ROOT/package.json" 2>/dev/null; then
        echo -e "${CYAN}Running npm test for financial module...${NC}"
        cd "$PROJECT_ROOT"
        npm run test:financial 2>/dev/null || echo -e "${YELLOW}⚠️  Financial tests not configured yet${NC}"
    else
        echo -e "${YELLOW}⚠️  Financial tests not configured in package.json${NC}"
    fi
}

# Main loop
while true; do
    show_menu
    read -r choice
    
    case $choice in
        1)
            check_progress
            ;;
        2)
            setup_phase1
            ;;
        3) 
            setup_phase2
            ;;
        4)
            view_checklist
            ;;
        5)
            find_next_task
            ;;
        6)
            mark_task_complete
            ;;
        7)
            quick_start
            ;;
        8)
            view_documentation
            ;;
        9)
            run_tests
            ;;
        0)
            echo -e "${GREEN}👋 Happy coding! Financial module implementation awaits!${NC}"
            exit 0
            ;;
        *)
            echo -e "${RED}❌ Invalid option. Please choose 0-9.${NC}"
            ;;
    esac
    
    echo ""
    echo -n -e "${CYAN}Press Enter to continue...${NC}"
    read -r
    clear
done