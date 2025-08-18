'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { apiClient } from '@/lib/api'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Clock,
  FileText,
  Download,
  Filter,
  RefreshCw,
  PieChart,
  Activity,
  Target,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  Eye,
  Printer,
  LineChart,
  Brain,
  Zap,
  Layers,
  Globe
} from 'lucide-react'

interface AnalyticsData {
  overview: {
    totalRevenue: number
    totalAppointments: number
    totalPatients: number
    averageRating: number
    revenueGrowth: number
    appointmentGrowth: number
    patientGrowth: number
    satisfactionGrowth: number
  }
  advanced: {
    conversionRate: number
    churnRate: number
    customerLifetimeValue: number
    averageSessionTime: number
    bounceRate: number
    retentionRate: number
    npsScore: number
    operationalEfficiency: number
  }
  predictions: {
    nextMonthRevenue: number
    nextMonthAppointments: number
    capacity: number
    demandForecast: string
    seasonalTrends: string[]
  }
  realTime: {
    activeUsers: number
    todayBookings: number
    systemLoad: number
    responseTime: number
  }
}

export default function AnalyticsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)),
    end: new Date()
  })

  useEffect(() => {
    useAuthStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user && isAuthenticated) {
      if (user.role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      loadAnalyticsData()
    }
  }, [user, isAuthenticated, selectedPeriod])

  const loadAnalyticsData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await apiClient.getAnalytics({
        period: selectedPeriod as 'today' | 'week' | 'month' | 'quarter' | 'year'
      })

      if (response.success && response.data) {
        setAnalyticsData(response.data)
      } else {
        setError(response.error?.message || 'Erro ao carregar dados de analytics')
      }
    } catch (error: any) {
      console.error('Error loading analytics:', error)
      setError('Erro de conexão ao carregar analytics')
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    loadAnalyticsData()
  }

  if (isLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando analytics avançados...</p>
        </div>
      </div>
    )
  }

  if (error || (!analyticsData && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground mb-4">
            {error || 'Não foi possível carregar os dados analíticos'}
          </p>
          <Button onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowUp className="h-4 w-4 text-green-600" />
    if (growth < 0) return <ArrowDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-600" />
  }

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  // Main Statistics Cards com dados da API real
  const mainStats = analyticsData ? [
    {
      title: 'Receita Total',
      value: formatCurrency(analyticsData.overview?.totalRevenue || 0),
      subtitle: `${formatCurrency(analyticsData.financial?.monthlyRevenue || 0)} este mês`,
      growth: analyticsData.overview?.revenueGrowth || 0,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Consultas',
      value: (analyticsData.overview?.totalAppointments || 0).toLocaleString(),
      subtitle: `${analyticsData.appointments?.completed || 0} concluídas`,
      growth: analyticsData.overview?.appointmentGrowth || 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pacientes Únicos',
      value: (analyticsData.overview?.totalPatients || 0).toLocaleString(),
      subtitle: `${analyticsData.patients?.newPatients || 0} novos este mês`,
      growth: analyticsData.overview?.patientGrowth || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'NPS Score',
      value: `${analyticsData.advanced?.npsScore || 0}`,
      subtitle: `Base: ${analyticsData.patients?.totalReviews || 0} avaliações`,
      growth: analyticsData.overview?.satisfactionGrowth || 0,
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ] : []

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Analytics Avançados
            </h1>
            <p className="text-muted-foreground">
              Análises preditivas e inteligência de negócios da clínica
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="today">Hoje</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="quarter">Este Trimestre</option>
              <option value="year">Este Ano</option>
            </select>
            
            <Button variant="outline" onClick={refreshData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Main Statistics Cards - Layout responsivo e corrigido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mainStats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      {stat.title}
                    </p>
                    <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${stat.color}`} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-2xl sm:text-3xl font-bold truncate" title={stat.value}>
                      {stat.value}
                    </p>
                    
                    <div className="flex items-center space-x-2 flex-wrap">
                      <div className={`flex items-center space-x-1 ${getGrowthColor(stat.growth)}`}>
                        {getGrowthIcon(stat.growth)}
                        <span className="text-sm font-medium">
                          {formatPercentage(stat.growth)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        vs anterior
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate" title={stat.subtitle}>
                      {stat.subtitle}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Advanced Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Predições IA
            </TabsTrigger>
            <TabsTrigger value="realtime" className="flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Tempo Real
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Análise de Receita
                  </CardTitle>
                  <CardDescription>
                    Performance financeira e tendências de crescimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Real revenue chart */}
                    <div className="h-64 bg-gradient-to-t from-green-50 to-transparent rounded-lg flex items-end justify-around p-4">
                      {(analyticsData.financial?.monthlyData || []).map((value, index) => {
                        const maxValue = Math.max(...(analyticsData.financial?.monthlyData || [1]))
                        return (
                          <div key={index} className="flex flex-col items-center space-y-2">
                            <div 
                              className="bg-green-500 rounded-t transition-all hover:bg-green-600 min-h-[8px]"
                              style={{ 
                                height: `${maxValue > 0 ? (value / maxValue) * 200 : 8}px`,
                                width: '35px'
                              }}
                              title={formatCurrency(value)}
                            ></div>
                            <span className="text-xs text-muted-foreground">
                              {value > 1000 ? `${(value / 1000).toFixed(0)}k` : value.toString()}
                            </span>
                          </div>
                        )
                      })}
                      {(analyticsData.financial?.monthlyData || []).length === 0 && (
                        <div className="text-center text-muted-foreground py-16">
                          <p className="text-sm">Nenhum dado de receita disponível para o período</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      {(() => {
                        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
                        const currentMonth = new Date().getMonth()
                        const startMonth = Math.max(0, currentMonth - 5)
                        
                        return Array.from({ length: 6 }, (_, index) => {
                          const monthIndex = (startMonth + index) % 12
                          const isCurrentMonth = monthIndex === currentMonth
                          
                          return (
                            <span 
                              key={index}
                              className={
                                isCurrentMonth 
                                  ? "font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-md" 
                                  : "text-muted-foreground hover:text-gray-700 transition-colors"
                              }
                            >
                              {monthNames[monthIndex]}
                            </span>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Patient Flow Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-blue-600" />
                    Fluxo de Pacientes
                  </CardTitle>
                  <CardDescription>
                    Análise de conversão e retenção
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Real funnel visualization */}
                    <div className="space-y-3">
                      <div className="bg-blue-500 text-white p-3 rounded text-center">
                        <div className="font-bold">{analyticsData.patients?.totalVisitors || 0}</div>
                        <div className="text-sm opacity-90">Visitantes Site</div>
                      </div>
                      <div className="bg-blue-400 text-white p-3 rounded text-center mx-4">
                        <div className="font-bold">{analyticsData.patients?.interested || 0}</div>
                        <div className="text-sm opacity-90">Interessados</div>
                      </div>
                      <div className="bg-blue-300 text-white p-3 rounded text-center mx-8">
                        <div className="font-bold">{analyticsData.appointments?.scheduled || 0}</div>
                        <div className="text-sm opacity-90">Agendaram</div>
                      </div>
                      <div className="bg-blue-200 text-blue-900 p-3 rounded text-center mx-12">
                        <div className="font-bold">{analyticsData.appointments?.attended || 0}</div>
                        <div className="text-sm">Compareceram</div>
                      </div>
                    </div>
                    
                    <div className="border-t pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Taxa de Conversão:</span>
                        <span className="font-medium text-green-600">{analyticsData.advanced?.conversionRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* KPI Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-600" />
                  KPIs Principais
                </CardTitle>
                <CardDescription>
                  Indicadores chave de performance da clínica
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(analyticsData.advanced?.customerLifetimeValue || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Valor Vida Cliente</div>
                    <div className="flex items-center justify-center space-x-1 text-green-600">
                      {(analyticsData.advanced.customerLifetimeValueGrowth || 0) > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="text-xs">{formatPercentage(analyticsData.advanced.customerLifetimeValueGrowth || 0)} vs mês anterior</span>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-blue-600">
                      {analyticsData.advanced?.retentionRate || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa Retenção</div>
                    <div className="flex items-center justify-center space-x-1 text-blue-600">
                      {(analyticsData.advanced.retentionRateGrowth || 0) > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="text-xs">{formatPercentage(analyticsData.advanced.retentionRateGrowth || 0)} vs mês anterior</span>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-yellow-600">
                      {analyticsData.advanced?.churnRate || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa Churn</div>
                    <div className="flex items-center justify-center space-x-1 text-red-600">
                      {(analyticsData.advanced.churnRateGrowth || 0) > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="text-xs">{formatPercentage(analyticsData.advanced.churnRateGrowth || 0)} vs mês anterior</span>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-purple-600">
                      {analyticsData.advanced?.operationalEfficiency || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Eficiência Operacional</div>
                    <div className="flex items-center justify-center space-x-1 text-green-600">
                      {(analyticsData.advanced.operationalEfficiencyGrowth || 0) > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="text-xs">{formatPercentage(analyticsData.advanced.operationalEfficiencyGrowth || 0)} vs mês anterior</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Performance</CardTitle>
                  <CardDescription>Indicadores operacionais chave</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Tempo Médio de Sessão</span>
                    <span className="font-semibold">{analyticsData.advanced?.averageSessionTime || 0} min</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Taxa de Rejeição</span>
                    <span className="font-semibold text-red-600">{analyticsData.advanced?.bounceRate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Taxa de Conversão</span>
                    <span className="font-semibold text-green-600">{analyticsData.advanced?.conversionRate || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t">
                    <span className="text-muted-foreground">Eficiência Operacional</span>
                    <span className="font-semibold">{analyticsData.advanced?.operationalEfficiency || 0}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Satisfação do Cliente</CardTitle>
                  <CardDescription>Net Promoter Score e feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {analyticsData.advanced?.npsScore || 0}
                      </div>
                      <div className="text-sm text-muted-foreground mb-4">Net Promoter Score</div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-green-500 h-3 rounded-full"
                          style={{ width: `${analyticsData.advanced?.npsScore || 0}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{analyticsData.advanced.npsPromoters || 0}%</div>
                        <div className="text-xs text-muted-foreground">Promotores</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-yellow-600">{analyticsData.advanced.npsNeutrals || 0}%</div>
                        <div className="text-xs text-muted-foreground">Neutros</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">{analyticsData.advanced.npsDetractors || 0}%</div>
                        <div className="text-xs text-muted-foreground">Detratores</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2 text-purple-600" />
                  Predições com IA
                </CardTitle>
                <CardDescription>
                  Análises preditivas baseadas em machine learning
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-purple-50 rounded-lg">
                    <DollarSign className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(analyticsData.predictions?.nextMonthRevenue || 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">Receita Prevista Próximo Mês</div>
                    <div className="text-xs text-green-600 mt-1">{formatPercentage(analyticsData.predictions.revenueGrowthPrediction || 0)} vs este mês</div>
                  </div>
                  
                  <div className="text-center p-6 bg-blue-50 rounded-lg">
                    <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-blue-600">
                      {analyticsData.predictions?.nextMonthAppointments || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Consultas Previstas</div>
                    <div className="text-xs text-green-600 mt-1">{formatPercentage(analyticsData.predictions.appointmentGrowthPrediction || 0)} vs este mês</div>
                  </div>
                  
                  <div className="text-center p-6 bg-yellow-50 rounded-lg">
                    <Activity className="h-8 w-8 text-yellow-600 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-yellow-600">
                      {analyticsData.predictions?.capacity || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Capacidade Prevista</div>
                    <div className="text-xs text-yellow-600 mt-1">Demanda: {analyticsData.predictions.demandForecast || 'Não disponível'}</div>
                  </div>
                </div>

                <div className="mt-8">
                  <h4 className="text-lg font-semibold mb-4">Tendências Sazonais</h4>
                  <div className="space-y-2">
                    {(analyticsData.predictions?.seasonalTrends || []).map((trend, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded">
                        <span className="text-sm">{trend}</span>
                        <Badge variant="outline">{trend.includes('+') ? 'Crescimento' : 'Declínio'}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Real Time Tab */}
          <TabsContent value="realtime" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-orange-600" />
                  Métricas em Tempo Real
                </CardTitle>
                <CardDescription>
                  Dados atualizados em tempo real do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-orange-50 rounded-lg">
                    <Globe className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-orange-600">{analyticsData.realTime?.activeUsers || 0}</div>
                    <div className="text-sm text-muted-foreground">Usuários Online</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Calendar className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{analyticsData.realTime?.todayBookings || 0}</div>
                    <div className="text-sm text-muted-foreground">Agendamentos Hoje</div>
                  </div>
                  
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{analyticsData.realTime?.systemLoad || 0}%</div>
                    <div className="text-sm text-muted-foreground">Carga do Sistema</div>
                  </div>
                  
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">{analyticsData.realTime?.responseTime || 0}ms</div>
                    <div className="text-sm text-muted-foreground">Tempo Resposta</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer with Copyright */}
        <footer className="text-center text-sm text-muted-foreground py-4">
          <p>&copy; 2025 Jtarcio Desenvolvimento. Todos os direitos reservados.</p>
        </footer>
      </div>
    </AppLayout>
  )
}