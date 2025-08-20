'use client'

import React, { useState, useEffect } from 'react'
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
import { api } from "@/lib/api"

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
  growth: number
  icon: React.ElementType
  color: string
}

export default function FinancialDashboard() {
  const { user } = useAuthStore()
  const [dashboardData, setDashboardData] = useState<FinancialDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get('/financial/dashboard')
      if (response.data.success) {
        setDashboardData(response.data.data)
      } else {
        throw new Error('Failed to load financial data')
      }
    } catch (err: any) {
      console.error('Error loading financial dashboard:', err)
      setError(err.response?.data?.error || 'Erro ao carregar dados financeiros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Check if user has financial access
  const hasFinancialAccess = user?.role === 'ADMIN' || user?.role === 'FINANCIAL_MANAGER'

  if (!hasFinancialAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600">Você não tem permissão para acessar o módulo financeiro.</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Carregando dados financeiros...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
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
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Nenhum dado financeiro encontrado.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatGrowth = (growth: number): string => {
    return `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}%`
  }

  const financialStats: FinancialStats[] = [
    {
      label: 'Receita Total',
      value: formatCurrency(dashboardData.totalRevenue),
      growth: dashboardData.revenueGrowth,
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      label: 'Despesas Totais',
      value: formatCurrency(dashboardData.totalExpenses),
      growth: dashboardData.expenseGrowth,
      icon: TrendingDown,
      color: 'text-red-600'
    },
    {
      label: 'Lucro Líquido',
      value: formatCurrency(dashboardData.netProfit),
      growth: dashboardData.profitGrowth,
      icon: TrendingUp,
      color: 'text-blue-600'
    },
    {
      label: 'Saldo em Caixa',
      value: formatCurrency(dashboardData.cashBalance),
      growth: 0, // Cash balance doesn't have growth metric
      icon: Wallet,
      color: 'text-purple-600'
    }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
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
                  {stat.growth !== 0 && (
                    <p className={`text-sm ${stat.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                {dashboardData.recentTransactions.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.recentTransactions.slice(0, 5).map((transaction, index) => (
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
                            {formatCurrency(Number(transaction.netAmount))}
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
                {dashboardData.overdueReceivables.length > 0 ? (
                  <div className="space-y-4">
                    {dashboardData.overdueReceivables.slice(0, 5).map((receivable, index) => (
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
                      <BarChart className="h-4 w-4 mr-2" />
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
  )
}