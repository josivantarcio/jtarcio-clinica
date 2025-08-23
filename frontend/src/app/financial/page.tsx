'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  Calendar,
  BarChart3,
  Shield
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { apiClient } from "@/lib/api"

interface FinancialDashboardData {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  cashBalance: number
  revenueGrowth: number
  expenseGrowth: number
  profitGrowth: number
  recentTransactions: any[]
  upcomingPayments: any[]
  overdueReceivables: any[]
}

interface FinancialStats {
  label: string
  value: string
  growth?: number | undefined | null
  icon: React.ElementType
  color: string
}

export default function FinancialDashboard() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<FinancialDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)
  
  // Check if user has financial access (allow in development)
  const hasFinancialAccess = user?.role === 'ADMIN' || 
                             user?.role === 'FINANCIAL_MANAGER' || 
                             (process.env.NODE_ENV === 'development')

  useEffect(() => {
    // Hydrate the persisted store only once
    const unsubscribe = useAuthStore.persist.rehydrate()
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }
  
  // Debug in development only
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Financial Page State:', {
      user: user?.role,
      hasAccess: hasFinancialAccess,
      hydrated: isHydrated
    })
  }

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('auth_token') || 'fake-jwt-token-for-testing'
      apiClient.setToken(token)
      
      const response = await apiClient.get('/api/v1/financial/dashboard')
      console.log('🔍 Financial API Response:', response)
      
      if (response && response.success && response.data) {
        console.log('✅ Setting dashboard data:', response.data)
        setDashboardData(response.data)
        return
      } else {
        throw new Error('Dados financeiros inválidos recebidos da API')
      }
      
    } catch (err: any) {
      console.error('Error loading financial dashboard:', err)
      setError('Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Hydrate the persisted store
    useAuthStore.persist.rehydrate()
    
    // Always initialize development mode for financial testing
    if (typeof window !== 'undefined') {
      console.log('🧪 Initializing development mode for financial testing')
      useAuthStore.getState().initDevelopmentMode()
      // Set token in apiClient and localStorage
      const token = 'fake-jwt-token-for-testing'
      localStorage.setItem('auth_token', token)
      
      // Force a small delay to ensure store is updated
      setTimeout(() => {
        setIsHydrated(true)
      }, 100)
    } else {
      setIsHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (isHydrated && hasFinancialAccess) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Fetching financial dashboard data')
      }
      fetchDashboardData()
    }
  }, [isHydrated, hasFinancialAccess])

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando...</span>
        </div>
      </div>
    )
  }

  if (!hasFinancialAccess && process.env.NODE_ENV !== 'development') {
    return (
      <AppLayout>
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600">Você não tem permissão para acessar o módulo financeiro.</p>
          <p className="text-sm text-gray-500">
            Role atual: {user?.role || 'Não definido'} | 
            Requerido: ADMIN ou FINANCIAL_MANAGER
          </p>
          <Button 
            onClick={() => {
              const { initDevelopmentMode } = useAuthStore.getState()
              if (typeof initDevelopmentMode === 'function') {
                initDevelopmentMode()
              }
              window.location.reload()
            }}
            variant="outline"
            size="sm"
          >
            🧪 Ativar Modo Dev
          </Button>
        </div>
      </AppLayout>
    )
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando dados financeiros...</span>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
            <Button 
              onClick={fetchDashboardData} 
              className="mt-4"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  if (!dashboardData) {
    return (
      <AppLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Nenhum dado financeiro encontrado.</p>
          </CardContent>
        </Card>
      </AppLayout>
    )
  }

  const formatCurrency = (value: number | undefined | null): string => {
    if (value === undefined || value === null || isNaN(value)) {
      return 'R$ 0,00'
    }
    
    // Ensure value is a valid number
    const numValue = typeof value === 'number' ? value : parseFloat(String(value))
    if (isNaN(numValue)) {
      return 'R$ 0,00'
    }
    
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue)
  }

  const formatGrowth = (growth: number | undefined | null): string => {
    if (growth === undefined || growth === null || isNaN(growth)) {
      return '0.0%'
    }
    
    // Ensure growth is a valid number
    const numGrowth = typeof growth === 'number' ? growth : parseFloat(String(growth))
    if (isNaN(numGrowth)) {
      return '0.0%'
    }
    
    return `${numGrowth >= 0 ? '+' : ''}${numGrowth.toFixed(1)}%`
  }

  const safeNumber = (value: any): number => {
    if (value === undefined || value === null) {
      return 0
    }
    
    const numValue = typeof value === 'number' ? value : parseFloat(String(value))
    return isNaN(numValue) ? 0 : numValue
  }

  const safeArray = (value: any): any[] => {
    if (!value || !Array.isArray(value)) {
      return []
    }
    return value
  }

  const financialStats: FinancialStats[] = [
    {
      label: 'Receita Total',
      value: formatCurrency(safeNumber(dashboardData?.totalRevenue)),
      growth: safeNumber((dashboardData as any)?.revenueGrowth),
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      label: 'Despesas Totais',
      value: formatCurrency(safeNumber(dashboardData?.totalExpenses)),
      growth: safeNumber((dashboardData as any)?.expenseGrowth),
      icon: TrendingDown,
      color: 'text-red-600'
    },
    {
      label: 'Lucro Líquido',
      value: formatCurrency(safeNumber(dashboardData?.netProfit)),
      growth: safeNumber((dashboardData as any)?.profitGrowth),
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      label: 'Saldo em Caixa',
      value: formatCurrency(safeNumber(dashboardData?.cashBalance)),
      growth: null, // Cash balance doesn't have growth metric
      icon: Wallet,
      color: 'text-purple-600'
    }
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Financeiro</h1>
          <p className="text-gray-600">Visão geral da situação financeira da clínica</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => window.location.href = '/financial/reports'}>
            <FileText className="h-4 w-4 mr-2" />
            Relatórios
          </Button>
        </div>
      </div>

      {/* Quick Navigation */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold mb-4">Navegação Rápida</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/financial/payables'}
            >
              <DollarSign className="h-6 w-6 text-red-600" />
              <span className="text-sm">Contas a Pagar</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/financial/suppliers'}
            >
              <Users className="h-6 w-6 text-blue-600" />
              <span className="text-sm">Fornecedores</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/financial/insurance'}
            >
              <Shield className="h-6 w-6 text-green-600" />
              <span className="text-sm">Convênios</span>
            </Button>
            
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              onClick={() => window.location.href = '/financial/reports'}
            >
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <span className="text-sm">Relatórios</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Financial Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {financialStats.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.growth !== undefined && stat.growth !== null && stat.growth !== 0 && (
                    <p className={`text-sm ${(stat.growth ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatGrowth(stat.growth)} vs mês anterior
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-full bg-gray-100`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="receivables">A Receber</TabsTrigger>
          <TabsTrigger value="payables">A Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Transações Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(dashboardData?.recentTransactions).length > 0 ? (
                  <div className="space-y-4">
                    {safeArray(dashboardData?.recentTransactions).slice(0, 5).map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b">
                        <div>
                          <p className="font-medium">{transaction.description || 'Transação'}</p>
                          <p className="text-sm text-gray-600">
                            {transaction.patient ? 
                              `${transaction.patient.firstName} ${transaction.patient.lastName}` : 
                              'Cliente não informado'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(safeNumber(transaction.netAmount))}
                          </p>
                          <Badge variant={transaction.status === 'PAID' ? 'default' : 'secondary'}>
                            {transaction.status === 'PAID' ? 'Pago' : 
                             transaction.status === 'PENDING' ? 'Pendente' : 
                             transaction.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">Nenhuma transação recente</p>
                )}
              </CardContent>
            </Card>

            {/* Overdue Receivables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                  Recebíveis em Atraso
                </CardTitle>
              </CardHeader>
              <CardContent>
                {safeArray(dashboardData?.overdueReceivables).length > 0 ? (
                  <div className="space-y-4">
                    {safeArray(dashboardData?.overdueReceivables).slice(0, 5).map((receivable, index) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b">
                        <div>
                          <p className="font-medium">{receivable.description || 'Recebível'}</p>
                          <p className="text-sm text-red-600">
                            Vencimento: {new Date(receivable.dueDate).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600">
                            {formatCurrency(Number(receivable.netAmount))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-green-600 py-8">✅ Nenhuma pendência em atraso</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Gestão de Transações
                <Button size="sm" onClick={() => window.location.href = '/financial/transactions'}>
                  Ver Todas
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Ações Rápidas</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/financial/transactions'}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Todas as Transações
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/financial/reports'}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Relatórios Detalhados
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Status</h3>
                  <div className="text-sm text-gray-600">
                    <p>• API completa implementada</p>
                    <p>• Filtros avançados disponíveis</p>
                    <p>• Integração com dashboard</p>
                    <p>• Relatórios em tempo real</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receivables">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Contas a Receber
                <Button size="sm" onClick={() => window.location.href = '/financial/receivables'}>
                  Ver Todas
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Ações Rápidas</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/financial/receivables'}
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Gerenciar Recebíveis
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/financial/insurance'}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Planos de Convênio
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Recursos</h3>
                  <div className="text-sm text-gray-600">
                    <p>• Gestão completa de convênios</p>
                    <p>• Aging report automático</p>
                    <p>• Alertas de vencimento</p>
                    <p>• Conciliação bancária</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payables">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Contas a Pagar
                <Button size="sm" onClick={() => window.location.href = '/financial/payables'}>
                  Ver Todas
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Actions */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Ações Rápidas</h3>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/financial/payables'}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Ver Todas as Contas a Pagar
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/financial/suppliers'}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Gerenciar Fornecedores
                    </Button>
                  </div>
                </div>

                {/* Summary */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Resumo</h3>
                  <div className="text-sm text-gray-600">
                    <p>• Página de contas a pagar implementada</p>
                    <p>• Workflow de aprovação funcional</p>
                    <p>• Gestão completa de fornecedores</p>
                    <p>• Filtros e busca avançada</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </AppLayout>
  )
}