'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Download, 
  FileText, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  PieChart,
  FileSpreadsheet,
  Eye
} from "lucide-react"
import { useAuthStore } from "@/store/auth"
import { api } from "@/lib/api"

interface ReportData {
  cashFlowReport: {
    inflows: Array<{
      date: string
      amount: number
      category: string
    }>
    outflows: Array<{
      date: string
      amount: number
      category: string
    }>
    netFlow: number
    totalInflow: number
    totalOutflow: number
  }
  incomeStatement: {
    revenue: {
      consultations: number
      procedures: number
      insurance: number
      other: number
      total: number
    }
    expenses: {
      suppliers: number
      salaries: number
      utilities: number
      equipment: number
      other: number
      total: number
    }
    netIncome: number
    profitMargin: number
  }
  agingReport: {
    current: number        // 0-30 days
    overdue30: number     // 31-60 days  
    overdue60: number     // 61-90 days
    overdue90: number     // 90+ days
    totalReceivables: number
  }
  profitabilityAnalysis: {
    byDoctor: Array<{
      doctorId: string
      doctorName: string
      revenue: number
      expenses: number
      profit: number
      margin: number
    }>
    bySpecialty: Array<{
      specialtyName: string
      revenue: number
      expenses: number
      profit: number
      margin: number
    }>
    byMonth: Array<{
      month: string
      revenue: number
      expenses: number
      profit: number
    }>
  }
}

interface ReportFilters {
  startDate: string
  endDate: string
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom'
  doctorId?: string
  specialtyId?: string
}

export default function ReportsPage() {
  const { user } = useAuthStore()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReportFilters>({
    period: 'month',
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })

  // Check if user has financial access
  const hasFinancialAccess = user?.role === 'ADMIN' || user?.role === 'FINANCIAL_MANAGER'

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value.toString())
        }
      })

      const response = await api.get(`/financial/reports?${queryParams.toString()}`)
      
      if (response.data.success) {
        setReportData(response.data.data)
      } else {
        throw new Error('Failed to load reports')
      }
    } catch (err: any) {
      console.error('Error loading reports:', err)
      setError(err.response?.data?.error || 'Erro ao carregar relatórios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasFinancialAccess) {
      fetchReports()
    }
  }, [filters, hasFinancialAccess])

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`
  }

  const exportReport = async (reportType: string, format: 'pdf' | 'excel') => {
    try {
      const response = await api.get(`/financial/reports/export/${reportType}?format=${format}&${new URLSearchParams(filters as any).toString()}`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportType}_${new Date().toISOString().split('T')[0]}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error exporting report:', err)
      setError('Erro ao exportar relatório')
    }
  }

  if (!hasFinancialAccess) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acesso Restrito</h1>
          <p className="text-gray-600">Você não tem permissão para acessar os relatórios financeiros.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relatórios Financeiros</h1>
          <p className="text-gray-600">Análises avançadas e relatórios gerenciais</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={fetchReports} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <select 
              className="px-3 py-2 border rounded-md"
              value={filters.period}
              onChange={(e) => {
                const period = e.target.value as ReportFilters['period']
                const now = new Date()
                let startDate: Date
                
                switch (period) {
                  case 'week':
                    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
                    break
                  case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1)
                    break
                  case 'quarter':
                    const quarter = Math.floor(now.getMonth() / 3)
                    startDate = new Date(now.getFullYear(), quarter * 3, 1)
                    break
                  case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1)
                    break
                  default:
                    startDate = new Date(filters.startDate)
                }

                setFilters({
                  ...filters,
                  period,
                  startDate: startDate.toISOString().split('T')[0],
                  endDate: now.toISOString().split('T')[0]
                })
              }}
            >
              <option value="week">Última Semana</option>
              <option value="month">Este Mês</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Ano</option>
              <option value="custom">Período Personalizado</option>
            </select>

            {filters.period === 'custom' && (
              <>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                  />
                  <span>até</span>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                  />
                </div>
              </>
            )}

            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="cash-flow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cash-flow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="income-statement">DRE</TabsTrigger>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="profitability">Rentabilidade</TabsTrigger>
        </TabsList>

        {/* Cash Flow Report */}
        <TabsContent value="cash-flow" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Relatório de Fluxo de Caixa</h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('cash-flow', 'pdf')}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('cash-flow', 'excel')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Carregando relatório...</span>
                </div>
              </CardContent>
            </Card>
          ) : error ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center py-12">
                  <p className="text-red-600">{error}</p>
                  <Button onClick={fetchReports} className="mt-4">
                    Tentar Novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : reportData ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Cards */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total de Entradas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(reportData.cashFlowReport.totalInflow)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total de Saídas</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(reportData.cashFlowReport.totalOutflow)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Fluxo Líquido</p>
                      <p className={`text-2xl font-bold ${
                        reportData.cashFlowReport.netFlow >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(reportData.cashFlowReport.netFlow)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        {/* Income Statement (DRE) */}
        <TabsContent value="income-statement" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Demonstração do Resultado do Exercício (DRE)</h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('income-statement', 'pdf')}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('income-statement', 'excel')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          {reportData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-600">Receitas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Consultas</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.revenue.consultations)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Procedimentos</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.revenue.procedures)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Convênios</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.revenue.insurance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outros</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.revenue.other)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t font-bold text-green-600">
                    <span>Total de Receitas</span>
                    <span>{formatCurrency(reportData.incomeStatement.revenue.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-red-600">Despesas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Fornecedores</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.expenses.suppliers)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Salários</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.expenses.salaries)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utilidades</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.expenses.utilities)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equipamentos</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.expenses.equipment)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Outros</span>
                    <span className="font-medium">
                      {formatCurrency(reportData.incomeStatement.expenses.other)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-3 border-t font-bold text-red-600">
                    <span>Total de Despesas</span>
                    <span>{formatCurrency(reportData.incomeStatement.expenses.total)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Net Income */}
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex items-center">
                      <div className={`p-3 rounded-lg ${
                        reportData.incomeStatement.netIncome >= 0 ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <DollarSign className={`h-8 w-8 ${
                          reportData.incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Lucro Líquido</p>
                        <p className={`text-3xl font-bold ${
                          reportData.incomeStatement.netIncome >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(reportData.incomeStatement.netIncome)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <BarChart3 className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Margem de Lucro</p>
                        <p className="text-3xl font-bold text-blue-600">
                          {formatPercentage(reportData.incomeStatement.profitMargin)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Aging Report */}
        <TabsContent value="aging" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Relatório de Inadimplência (Aging Report)</h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('aging', 'pdf')}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('aging', 'excel')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          {reportData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="p-3 bg-green-100 rounded-lg mx-auto w-fit mb-3">
                      <Calendar className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Em Dia (0-30 dias)</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(reportData.agingReport.current)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="p-3 bg-yellow-100 rounded-lg mx-auto w-fit mb-3">
                      <Calendar className="h-6 w-6 text-yellow-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">31-60 dias</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {formatCurrency(reportData.agingReport.overdue30)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="p-3 bg-orange-100 rounded-lg mx-auto w-fit mb-3">
                      <Calendar className="h-6 w-6 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">61-90 dias</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(reportData.agingReport.overdue60)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="p-3 bg-red-100 rounded-lg mx-auto w-fit mb-3">
                      <Calendar className="h-6 w-6 text-red-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">90+ dias</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(reportData.agingReport.overdue90)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Total Receivables */}
              <Card className="md:col-span-2 lg:col-span-4">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="p-3 bg-blue-100 rounded-lg mx-auto w-fit mb-3">
                      <DollarSign className="h-8 w-8 text-blue-600" />
                    </div>
                    <p className="text-lg font-medium text-gray-600">Total de Recebíveis</p>
                    <p className="text-4xl font-bold text-blue-600">
                      {formatCurrency(reportData.agingReport.totalReceivables)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Profitability Analysis */}
        <TabsContent value="profitability" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Análise de Rentabilidade</h2>
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('profitability', 'pdf')}
              >
                <FileText className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => exportReport('profitability', 'excel')}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>

          {reportData && (
            <div className="space-y-6">
              {/* By Doctor */}
              {reportData.profitabilityAnalysis.byDoctor.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rentabilidade por Médico</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Médico</th>
                            <th className="text-left py-3 px-4">Receita</th>
                            <th className="text-left py-3 px-4">Despesas</th>
                            <th className="text-left py-3 px-4">Lucro</th>
                            <th className="text-left py-3 px-4">Margem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.profitabilityAnalysis.byDoctor.map((doctor, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-3 px-4 font-medium">{doctor.doctorName}</td>
                              <td className="py-3 px-4 text-green-600">
                                {formatCurrency(doctor.revenue)}
                              </td>
                              <td className="py-3 px-4 text-red-600">
                                {formatCurrency(doctor.expenses)}
                              </td>
                              <td className="py-3 px-4 font-medium">
                                {formatCurrency(doctor.profit)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`font-medium ${
                                  doctor.margin >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatPercentage(doctor.margin)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By Specialty */}
              {reportData.profitabilityAnalysis.bySpecialty.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rentabilidade por Especialidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4">Especialidade</th>
                            <th className="text-left py-3 px-4">Receita</th>
                            <th className="text-left py-3 px-4">Despesas</th>
                            <th className="text-left py-3 px-4">Lucro</th>
                            <th className="text-left py-3 px-4">Margem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.profitabilityAnalysis.bySpecialty.map((specialty, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-3 px-4 font-medium">{specialty.specialtyName}</td>
                              <td className="py-3 px-4 text-green-600">
                                {formatCurrency(specialty.revenue)}
                              </td>
                              <td className="py-3 px-4 text-red-600">
                                {formatCurrency(specialty.expenses)}
                              </td>
                              <td className="py-3 px-4 font-medium">
                                {formatCurrency(specialty.profit)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`font-medium ${
                                  specialty.margin >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatPercentage(specialty.margin)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}