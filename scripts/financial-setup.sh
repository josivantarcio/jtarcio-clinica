#!/bin/bash

# 💰 EO Clínica - Financial Module Setup Script
# Automated setup for financial module development
# Usage: ./scripts/financial-setup.sh [phase]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}🏗️  EO Clínica Financial Module Setup${NC}"
echo "=================================================="

# Function to create directory if it doesn't exist
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}✅ Created directory: $1${NC}"
    else
        echo -e "${YELLOW}📁 Directory exists: $1${NC}"
    fi
}

# Function to create file with content if it doesn't exist
create_file() {
    local file_path="$1"
    local content="$2"
    
    if [ ! -f "$file_path" ]; then
        echo "$content" > "$file_path"
        echo -e "${GREEN}✅ Created file: $file_path${NC}"
    else
        echo -e "${YELLOW}📄 File exists: $file_path${NC}"
    fi
}

# Phase 1: Foundation Setup
setup_phase1() {
    echo -e "${BLUE}🏗️  Setting up Phase 1: Foundation${NC}"
    
    # Create directory structure
    echo -e "${BLUE}📁 Creating directory structure...${NC}"
    create_dir "src/database/migrations/financial"
    create_dir "src/repositories/financial"
    create_dir "src/services/financial"
    create_dir "src/routes/financial"
    create_dir "src/middleware/financial"
    create_dir "src/guards/financial"
    create_dir "src/types/financial"
    create_dir "tests/financial"
    create_dir "frontend/src/app/financial"
    create_dir "frontend/src/components/financial"
    
    # Create financial types file
    create_file "src/types/financial/index.ts" "// Financial Module Types
export interface FinancialTransaction {
  id: string
  appointment_id?: string
  patient_id: string
  doctor_id?: string
  transaction_type: TransactionType
  category_id?: string
  
  // Amounts
  gross_amount: number
  discount_amount?: number
  tax_amount?: number
  net_amount: number
  
  // Payment
  payment_method?: PaymentMethod
  payment_date?: Date
  due_date?: Date
  installments?: number
  installment_number?: number
  
  // Status
  status: FinancialStatus
  description?: string
  notes?: string
  
  // Audit
  created_by?: string
  created_at: Date
  updated_at: Date
}

export type TransactionType = 'RECEIPT' | 'PAYMENT' | 'TRANSFER' | 'ADJUSTMENT'
export type FinancialStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'PARTIAL' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED'
export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'PIX' | 'BANK_TRANSFER' | 'CHECK' | 'INSURANCE'

export interface InsurancePlan {
  id: string
  name: string
  code?: string
  category: InsuranceCategory
  contact_info?: any
  default_discount_percentage?: number
  payment_terms?: number
  requires_authorization?: boolean
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export type InsuranceCategory = 'PUBLIC' | 'PRIVATE' | 'CORPORATE'

export interface Supplier {
  id: string
  name: string
  document?: string
  category?: SupplierCategory
  email?: string
  phone?: string
  address?: any
  payment_terms?: number
  credit_limit?: number
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export type SupplierCategory = 'MEDICAL_SUPPLIES' | 'EQUIPMENT' | 'SERVICES' | 'PHARMACEUTICALS' | 'OFFICE_SUPPLIES' | 'UTILITIES' | 'OTHER'

export interface AccountsPayable {
  id: string
  supplier_id?: string
  category_id?: string
  document_number?: string
  description: string
  gross_amount: number
  discount_amount?: number
  tax_amount?: number
  net_amount: number
  issue_date: Date
  due_date: Date
  payment_date?: Date
  status: PayableStatus
  payment_method?: PaymentMethod
  created_by?: string
  created_at: Date
  updated_at: Date
}

export type PayableStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED'

export interface FinancialCategory {
  id: string
  name: string
  type: CategoryType
  parent_id?: string
  color?: string
  icon?: string
  is_active: boolean
  created_at: Date
}

export type CategoryType = 'INCOME' | 'EXPENSE' | 'INVESTMENT'
"
    
    # Create basic financial service
    create_file "src/services/financial/financial.service.ts" "import { PrismaClient } from '@prisma/client'
import { FinancialTransaction, AccountsPayable } from '@/types/financial'

export class FinancialService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  // Dashboard KPIs
  async getDashboardData(userId: string, userRole: string) {
    // TODO: Implement dashboard data aggregation
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      cashBalance: 0,
      recentTransactions: [],
      upcomingPayments: []
    }
  }

  // Financial transactions
  async getTransactions(filters: any) {
    // TODO: Implement transaction listing with filters
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 10
    }
  }

  async createTransaction(data: Partial<FinancialTransaction>) {
    // TODO: Implement transaction creation
    throw new Error('Not implemented')
  }

  async updateTransaction(id: string, data: Partial<FinancialTransaction>) {
    // TODO: Implement transaction update
    throw new Error('Not implemented')
  }

  // Receivables
  async getReceivables(filters: any) {
    // TODO: Implement receivables listing
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 10
    }
  }

  async recordPayment(transactionId: string, paymentData: any) {
    // TODO: Implement payment recording
    throw new Error('Not implemented')
  }

  // Payables
  async getPayables(filters: any) {
    // TODO: Implement payables listing
    return {
      data: [],
      total: 0,
      page: 1,
      limit: 10
    }
  }

  async createPayable(data: Partial<AccountsPayable>) {
    // TODO: Implement payable creation
    throw new Error('Not implemented')
  }
}
"

    # Create basic financial middleware
    create_file "src/middleware/financial/auth.middleware.ts" "import { FastifyRequest, FastifyReply } from 'fastify'

// Financial access control middleware
export const requireFinancialAccess = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user
  
  if (!user) {
    return reply.status(401).send({ error: 'Authentication required' })
  }

  const allowedRoles = ['ADMIN', 'FINANCIAL_MANAGER']
  
  if (!allowedRoles.includes(user.role)) {
    return reply.status(403).send({ 
      error: 'Insufficient permissions for financial operations' 
    })
  }
}

export const requireFinancialManager = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user
  
  if (!user) {
    return reply.status(401).send({ error: 'Authentication required' })
  }

  const allowedRoles = ['ADMIN', 'FINANCIAL_MANAGER']
  
  if (!allowedRoles.includes(user.role)) {
    return reply.status(403).send({ 
      error: 'Financial manager permissions required' 
    })
  }
}

export const requireFinancialAdmin = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const user = request.user
  
  if (!user || user.role !== 'ADMIN') {
    return reply.status(403).send({ 
      error: 'Admin permissions required for this financial operation' 
    })
  }
}
"

    # Create basic financial routes
    create_file "src/routes/financial/index.ts" "import { FastifyInstance } from 'fastify'
import { requireFinancialAccess } from '@/middleware/financial/auth.middleware'

export default async function financialRoutes(fastify: FastifyInstance) {
  // Add authentication middleware to all financial routes
  fastify.addHook('preHandler', requireFinancialAccess)

  // Health check
  fastify.get('/health', async (request, reply) => {
    return { status: 'ok', module: 'financial', timestamp: new Date() }
  })

  // Dashboard
  fastify.get('/dashboard', async (request, reply) => {
    // TODO: Implement dashboard endpoint
    return { 
      message: 'Financial dashboard endpoint - TODO: Implement',
      user: request.user?.role
    }
  })

  // Register sub-routes
  await fastify.register(import('./transactions'), { prefix: '/transactions' })
  await fastify.register(import('./receivables'), { prefix: '/receivables' })
  await fastify.register(import('./payables'), { prefix: '/payables' })
  await fastify.register(import('./insurance'), { prefix: '/insurance' })
  await fastify.register(import('./suppliers'), { prefix: '/suppliers' })
  await fastify.register(import('./reports'), { prefix: '/reports' })
}
"

    # Create placeholder route files
    local routes=("transactions" "receivables" "payables" "insurance" "suppliers" "reports")
    for route in "${routes[@]}"; do
        create_file "src/routes/financial/${route}.ts" "import { FastifyInstance } from 'fastify'

export default async function ${route}Routes(fastify: FastifyInstance) {
  // GET /${route}
  fastify.get('/', async (request, reply) => {
    return { 
      message: '${route^} endpoint - TODO: Implement',
      endpoint: '${route}',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  })

  // TODO: Implement CRUD operations for ${route}
  // POST /${route}
  // GET /${route}/:id
  // PUT /${route}/:id
  // DELETE /${route}/:id
}
"
    done

    # Create basic Prisma schema additions (as comment file)
    create_file "src/database/migrations/financial/schema-additions.sql" "-- Financial Module Schema Additions
-- Add these to your Prisma schema and generate migration

-- Add FINANCIAL_MANAGER to user_role enum
-- ALTER TYPE user_role ADD VALUE 'FINANCIAL_MANAGER';

-- Financial transaction types
-- CREATE TYPE transaction_type AS ENUM ('RECEIPT', 'PAYMENT', 'TRANSFER', 'ADJUSTMENT');
-- CREATE TYPE financial_status AS ENUM ('PENDING', 'CONFIRMED', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED', 'REFUNDED');
-- CREATE TYPE payment_method AS ENUM ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'PIX', 'BANK_TRANSFER', 'CHECK', 'INSURANCE');
-- CREATE TYPE insurance_category AS ENUM ('PUBLIC', 'PRIVATE', 'CORPORATE');
-- CREATE TYPE category_type AS ENUM ('INCOME', 'EXPENSE', 'INVESTMENT');
-- CREATE TYPE supplier_category AS ENUM ('MEDICAL_SUPPLIES', 'EQUIPMENT', 'SERVICES', 'PHARMACEUTICALS', 'OFFICE_SUPPLIES', 'UTILITIES', 'OTHER');
-- CREATE TYPE payable_status AS ENUM ('PENDING', 'APPROVED', 'PAID', 'CANCELLED');

-- TODO: Add table creation SQL here
-- See FINANCIAL_MODULE_CHECKLIST.md for complete schema
"

    echo -e "${GREEN}✅ Phase 1 foundation setup completed!${NC}"
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Add financial routes to main router in src/routes/index.ts"
    echo "2. Update Prisma schema with financial models"
    echo "3. Generate and run database migrations"
    echo "4. Install additional dependencies: npm install date-fns decimal.js"
    echo "5. Start implementing the endpoints marked as TODO"
}

# Phase 2: Frontend Setup
setup_phase2() {
    echo -e "${BLUE}🎨 Setting up Phase 2: Frontend Foundation${NC}"
    
    # Create frontend directory structure
    create_dir "frontend/src/app/financial"
    create_dir "frontend/src/app/financial/receivables" 
    create_dir "frontend/src/app/financial/payables"
    create_dir "frontend/src/app/financial/reports"
    create_dir "frontend/src/app/financial/insurance"
    create_dir "frontend/src/app/financial/suppliers"
    create_dir "frontend/src/app/financial/settings"
    create_dir "frontend/src/components/financial"
    create_dir "frontend/src/components/financial/dashboard"
    create_dir "frontend/src/components/financial/tables"
    create_dir "frontend/src/components/financial/forms"
    create_dir "frontend/src/components/financial/charts"
    
    # Create main financial page
    create_file "frontend/src/app/financial/page.tsx" "'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react'

interface DashboardData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  cashBalance: number
  recentTransactions: any[]
  upcomingPayments: any[]
}

export default function FinancialPage() {
  const { user, isAuthenticated } = useAuthStore()
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    cashBalance: 0,
    recentTransactions: [],
    upcomingPayments: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData()
    }
  }, [isAuthenticated, user])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // TODO: Implement API call to financial dashboard
      const response = await fetch('/api/v1/financial/dashboard', {
        headers: {
          'Authorization': \`Bearer \${localStorage.getItem('accessToken')}\`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data)
      }
    } catch (error) {
      console.error('Error loading financial dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isAuthenticated || !['ADMIN', 'FINANCIAL_MANAGER'].includes(user?.role || '')) {
    return (
      <AppLayout>
        <div className=\"flex items-center justify-center min-h-[400px]\">
          <div className=\"text-center\">
            <h2 className=\"text-2xl font-bold text-gray-900\">Acesso Negado</h2>
            <p className=\"text-gray-600 mt-2\">Você não tem permissão para acessar o módulo financeiro.</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className=\"space-y-6\">
        {/* Header */}
        <div className=\"flex flex-col sm:flex-row sm:items-center sm:justify-between\">
          <div>
            <h1 className=\"text-2xl font-bold text-gray-900\">Financeiro</h1>
            <p className=\"text-gray-600\">Controle financeiro da clínica</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6\">
          <Card>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Receita Total</CardTitle>
              <TrendingUp className=\"h-4 w-4 text-green-600\" />
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">
                {loading ? '...' : \`R$ \${dashboardData.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`}
              </div>
              <p className=\"text-xs text-muted-foreground\">Recebimentos do mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Despesas</CardTitle>
              <TrendingDown className=\"h-4 w-4 text-red-600\" />
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">
                {loading ? '...' : \`R$ \${dashboardData.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`}
              </div>
              <p className=\"text-xs text-muted-foreground\">Gastos do mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Lucro Líquido</CardTitle>
              <DollarSign className=\"h-4 w-4 text-blue-600\" />
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">
                {loading ? '...' : \`R$ \${dashboardData.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`}
              </div>
              <p className=\"text-xs text-muted-foreground\">Resultado do mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
              <CardTitle className=\"text-sm font-medium\">Saldo em Caixa</CardTitle>
              <CreditCard className=\"h-4 w-4 text-purple-600\" />
            </CardHeader>
            <CardContent>
              <div className=\"text-2xl font-bold\">
                {loading ? '...' : \`R$ \${dashboardData.cashBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`}
              </div>
              <p className=\"text-xs text-muted-foreground\">Disponível hoje</p>
            </CardContent>
          </Card>
        </div>

        {/* TODO: Add charts and tables */}
        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6\">
          <Card>
            <CardHeader>
              <CardTitle>Transações Recentes</CardTitle>
              <CardDescription>Últimas movimentações financeiras</CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"text-center py-8 text-gray-500\">
                TODO: Implementar lista de transações recentes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contas a Vencer</CardTitle>
              <CardDescription>Próximos pagamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className=\"text-center py-8 text-gray-500\">
                TODO: Implementar lista de contas a vencer
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
"

    # Create basic financial components
    create_file "frontend/src/components/financial/dashboard/FinancialOverviewCard.tsx" "import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface FinancialOverviewCardProps {
  title: string
  value: number
  description: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  format?: 'currency' | 'number' | 'percentage'
}

export function FinancialOverviewCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  format = 'currency'
}: FinancialOverviewCardProps) {
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return \`R$ \${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`
      case 'percentage':
        return \`\${val.toFixed(1)}%\`
      default:
        return val.toLocaleString('pt-BR')
    }
  }

  return (
    <Card>
      <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
        <CardTitle className=\"text-sm font-medium\">{title}</CardTitle>
        <Icon className=\"h-4 w-4 text-muted-foreground\" />
      </CardHeader>
      <CardContent>
        <div className=\"text-2xl font-bold\">{formatValue(value)}</div>
        <div className=\"flex items-center justify-between mt-1\">
          <p className=\"text-xs text-muted-foreground\">{description}</p>
          {trend && (
            <span className={\`text-xs font-medium \${trend.isPositive ? 'text-green-600' : 'text-red-600'}\`}>
              {trend.isPositive ? '+' : ''}{trend.value.toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
"

    echo -e "${GREEN}✅ Phase 2 frontend foundation setup completed!${NC}"
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "1. Add financial route to navigation sidebar"
    echo "2. Install chart library: npm install recharts"
    echo "3. Implement dashboard API integration"
    echo "4. Create additional financial components"
}

# Main execution
case "${1:-}" in
    "1"|"phase1"|"foundation")
        setup_phase1
        ;;
    "2"|"phase2"|"frontend")
        setup_phase2
        ;;
    "all")
        setup_phase1
        setup_phase2
        ;;
    *)
        echo "Usage: $0 {1|phase1|foundation|2|phase2|frontend|all}"
        echo ""
        echo "Available commands:"
        echo "  1, phase1, foundation  - Set up Phase 1: Backend foundation"
        echo "  2, phase2, frontend    - Set up Phase 2: Frontend foundation"  
        echo "  all                    - Set up all phases"
        echo ""
        echo "Examples:"
        echo "  $0 1              # Setup backend foundation"
        echo "  $0 frontend       # Setup frontend foundation"
        echo "  $0 all            # Setup everything"
        exit 1
        ;;
esac

echo -e "${GREEN}🎉 Setup completed successfully!${NC}"
echo -e "${BLUE}📋 Check the FINANCIAL_MODULE_CHECKLIST.md for detailed progress tracking${NC}"