'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
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
  Printer
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface ReportData {
  financial: {
    totalRevenue: number
    monthlyRevenue: number
    averageTicket: number
    pendingPayments: number
    revenueGrowth: number
    monthlyComparison: number[]
  }
  appointments: {
    totalAppointments: number
    completedAppointments: number
    cancelledAppointments: number
    noShowRate: number
    appointmentGrowth: number
    dailyAppointments: number[]
  }
  patients: {
    totalPatients: number
    newPatients: number
    returningPatients: number
    patientRetention: number
    patientSatisfaction: number
    patientGrowth: number[]
  }
  doctors: {
    totalDoctors: number
    averageRating: number
    mostBookedDoctor: string
    doctorEfficiency: number
    doctorPerformance: Array<{
      name: string
      appointments: number
      rating: number
      revenue: number
    }>
  }
}

export default function ReportsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedReportType, setSelectedReportType] = useState('overview')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)), // First day of current month
    end: new Date() // Today
  })

  useEffect(() => {
    // Hydrate the persisted store
    useAuthStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user && isAuthenticated) {
      // Check if user has permission to access reports page
      if (!['DOCTOR', 'ADMIN'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      loadReportData()
    }
  }, [user, isAuthenticated, selectedPeriod])

  const loadReportData = async () => {
    setLoading(true)
    try {
      // Fetch real analytics data from the API
      const analyticsResponse = await apiClient.getAnalytics({
        period: selectedPeriod as 'today' | 'week' | 'month' | 'quarter' | 'year'
      })

      if (analyticsResponse.success && analyticsResponse.data) {
        const analytics = analyticsResponse.data
        setAnalyticsData(analytics)
        
        // Convert analytics data to report format
        const realReportData: ReportData = {
          financial: {
            totalRevenue: analytics.overview.totalRevenue,
            monthlyRevenue: analytics.financial?.monthlyRevenue || analytics.overview.totalRevenue,
            averageTicket: analytics.overview.totalRevenue / (analytics.overview.totalAppointments || 1),
            pendingPayments: analytics.financial?.pendingPayments || 0,
            revenueGrowth: analytics.overview.revenueGrowth,
            monthlyComparison: analytics.financial?.monthlyData || [0, 0, 0, 0, 0, 0]
          },
          appointments: {
            totalAppointments: analytics.overview.totalAppointments,
            completedAppointments: analytics.appointments?.completed || 0,
            cancelledAppointments: analytics.appointments?.cancelled || 0,
            noShowRate: analytics.appointments?.noShowRate || 0,
            appointmentGrowth: analytics.overview.appointmentGrowth,
            dailyAppointments: analytics.appointments?.dailyData || [0, 0, 0, 0, 0, 0, 0]
          },
          patients: {
            totalPatients: analytics.overview.totalPatients,
            newPatients: analytics.patients?.newPatients || 0,
            returningPatients: analytics.patients?.returningPatients || analytics.overview.totalPatients,
            patientRetention: analytics.advanced.retentionRate || 0,
            patientSatisfaction: analytics.overview.averageRating,
            patientGrowth: analytics.patients?.growthData || [0, 0, 0, 0, 0, 0]
          },
          doctors: {
            totalDoctors: analytics.doctors?.totalDoctors || 0,
            averageRating: analytics.overview.averageRating,
            mostBookedDoctor: analytics.doctors?.mostBookedDoctor || 'Não disponível',
            doctorEfficiency: analytics.advanced.operationalEfficiency || 0,
            doctorPerformance: analytics.doctors?.performance || []
          }
        }
        
        setReportData(realReportData)
      } else {
        // No data available - create empty report
        const emptyReport: ReportData = {
          financial: {
            totalRevenue: 0,
            monthlyRevenue: 0,
            averageTicket: 0,
            pendingPayments: 0,
            revenueGrowth: 0,
            monthlyComparison: [0, 0, 0, 0, 0, 0]
          },
          appointments: {
            totalAppointments: 0,
            completedAppointments: 0,
            cancelledAppointments: 0,
            noShowRate: 0,
            appointmentGrowth: 0,
            dailyAppointments: [0, 0, 0, 0, 0, 0, 0]
          },
          patients: {
            totalPatients: 0,
            newPatients: 0,
            returningPatients: 0,
            patientRetention: 0,
            patientSatisfaction: 0,
            patientGrowth: [0, 0, 0, 0, 0, 0]
          },
          doctors: {
            totalDoctors: 0,
            averageRating: 0,
            mostBookedDoctor: 'Nenhum médico',
            doctorEfficiency: 0,
            doctorPerformance: []
          }
        }
        setReportData(emptyReport)
      }
    } catch (error) {
      console.error('Error loading report data:', error)
      // Set empty report on error
      const emptyReport: ReportData = {
        financial: { totalRevenue: 0, monthlyRevenue: 0, averageTicket: 0, pendingPayments: 0, revenueGrowth: 0, monthlyComparison: [0, 0, 0, 0, 0, 0] },
        appointments: { totalAppointments: 0, completedAppointments: 0, cancelledAppointments: 0, noShowRate: 0, appointmentGrowth: 0, dailyAppointments: [0, 0, 0, 0, 0, 0, 0] },
        patients: { totalPatients: 0, newPatients: 0, returningPatients: 0, patientRetention: 0, patientSatisfaction: 0, patientGrowth: [0, 0, 0, 0, 0, 0] },
        doctors: { totalDoctors: 0, averageRating: 0, mostBookedDoctor: 'Nenhum médico', doctorEfficiency: 0, doctorPerformance: [] }
      }
      setReportData(emptyReport)
    } finally {
      setLoading(false)
    }
  }


  const refreshData = () => {
    loadReportData()
  }

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // TODO: Implement real export functionality
    alert(`Funcionalidade de exportação em ${format.toUpperCase()} será implementada em versão futura`)
  }

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando relatórios...</p>
        </div>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar os dados dos relatórios
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

  // Main Statistics Cards (following the model's design exactly)
  const mainStats = [
    {
      title: 'Receita Total',
      value: formatCurrency(reportData.financial.totalRevenue),
      subtitle: `${formatCurrency(reportData.financial.monthlyRevenue)} este mês`,
      growth: reportData.financial.revenueGrowth,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total de Consultas',
      value: reportData.appointments.totalAppointments.toLocaleString(),
      subtitle: `${reportData.appointments.completedAppointments} concluídas`,
      growth: reportData.appointments.appointmentGrowth,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Pacientes Ativos',
      value: reportData.patients.totalPatients.toLocaleString(),
      subtitle: `${reportData.patients.newPatients} novos este mês`,
      growth: analyticsData?.patients?.growthPercentage || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Satisfação',
      value: `${reportData.patients.patientSatisfaction}/5.0`,
      subtitle: `Base: ${analyticsData?.patients?.totalReviews || 0} avaliações`,
      growth: analyticsData?.patients?.satisfactionGrowth || 0,
      icon: Award,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Relatórios e Analytics
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'ADMIN' 
                ? 'Visão completa do desempenho da clínica' 
                : 'Relatórios da sua prática médica'
              }
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
            
            <div className="relative">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
              {/* Dropdown would be implemented with a proper dropdown component */}
            </div>
          </div>
        </div>

        {/* Main Statistics Cards - Fixed layout and responsiveness */}
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

        {/* Detailed Reports Tabs */}
        <Tabs value={selectedReportType} onValueChange={setSelectedReportType} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Financeiro
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Consultas
            </TabsTrigger>
            <TabsTrigger value="doctors" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Médicos
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend - Fixed layout */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                    Tendência de Receita
                  </CardTitle>
                  <CardDescription>
                    Evolução da receita nos últimos 6 meses
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Chart with proper spacing and responsiveness */}
                    <div className="h-48 sm:h-64 bg-gradient-to-t from-green-50 to-transparent rounded-lg flex items-end justify-center p-3 sm:p-4 overflow-hidden">
                      <div className="flex items-end justify-between w-full max-w-sm space-x-2">
                        {reportData.financial.monthlyComparison.map((value, index) => {
                          const maxValue = Math.max(...reportData.financial.monthlyComparison)
                          const heightPercentage = maxValue > 0 ? (value / maxValue) * 100 : 0
                          return (
                            <div key={index} className="flex flex-col items-center space-y-1 flex-1">
                              <div 
                                className="bg-green-500 rounded-t transition-all hover:bg-green-600 min-h-[4px]"
                                style={{ 
                                  height: `${Math.max(heightPercentage, 4)}%`,
                                  width: '100%',
                                  maxWidth: '24px'
                                }}
                                title={formatCurrency(value)}
                              ></div>
                              <span className="text-xs text-muted-foreground text-center">
                                {value > 1000 ? `${Math.round(value / 1000)}k` : value.toString()}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs sm:text-sm px-2">
                      <span className="text-muted-foreground">Jun</span>
                      <span className="text-muted-foreground">Jul</span>
                      <span className="text-muted-foreground">Ago</span>
                      <span className="text-muted-foreground">Set</span>
                      <span className="text-muted-foreground">Out</span>
                      <span className="font-medium text-primary">Nov</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Appointment Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2 text-blue-600" />
                    Distribuição de Consultas
                  </CardTitle>
                  <CardDescription>
                    Status das consultas este mês
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center h-48">
                      {/* Mock pie chart */}
                      <div className="relative w-40 h-40 rounded-full bg-gradient-conic from-green-500 via-blue-500 to-red-500">
                        <div className="absolute inset-6 bg-white rounded-full flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{reportData.appointments.totalAppointments}</div>
                            <div className="text-xs text-muted-foreground">Total</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm">Concluídas</span>
                        </div>
                        <div className="text-sm font-medium">
                          {reportData.appointments.completedAppointments} 
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((reportData.appointments.completedAppointments / reportData.appointments.totalAppointments) * 100)}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span className="text-sm">Canceladas</span>
                        </div>
                        <div className="text-sm font-medium">
                          {reportData.appointments.cancelledAppointments}
                          <span className="text-muted-foreground ml-1">
                            ({Math.round((reportData.appointments.cancelledAppointments / reportData.appointments.totalAppointments) * 100)}%)
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span className="text-sm">No-show</span>
                        </div>
                        <div className="text-sm font-medium">
                          {Math.round(reportData.appointments.totalAppointments * (reportData.appointments.noShowRate / 100))}
                          <span className="text-muted-foreground ml-1">
                            ({reportData.appointments.noShowRate}%)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-purple-600" />
                  Métricas Chave
                </CardTitle>
                <CardDescription>
                  Indicadores importantes de performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(reportData.financial.averageTicket)}
                    </div>
                    <div className="text-sm text-muted-foreground">Ticket Médio</div>
                    <div className="flex items-center justify-center space-x-1 text-green-600">
                      {(analyticsData?.financial?.ticketGrowth || 0) > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="text-xs">{formatPercentage(analyticsData?.financial?.ticketGrowth || 0)} vs mês anterior</span>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-blue-600">
                      {reportData.patients.patientRetention}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa de Retenção</div>
                    <div className="flex items-center justify-center space-x-1 text-blue-600">
                      {(analyticsData?.patients?.retentionGrowth || 0) > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="text-xs">{formatPercentage(analyticsData?.patients?.retentionGrowth || 0)} vs mês anterior</span>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-yellow-600">
                      {reportData.appointments.noShowRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa de No-Show</div>
                    <div className="flex items-center justify-center space-x-1 text-red-600">
                      {(analyticsData?.appointments?.noShowGrowth || 0) > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      <span className="text-xs">{formatPercentage(analyticsData?.appointments?.noShowGrowth || 0)} vs mês anterior</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumo Financeiro</CardTitle>
                  <CardDescription>Performance financeira do período selecionado</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Receita Bruta</span>
                    <span className="font-semibold">{formatCurrency(reportData.financial.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Receita Líquida</span>
                    <span className="font-semibold">{formatCurrency(analyticsData?.financial?.netRevenue || reportData.financial.totalRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Ticket Médio</span>
                    <span className="font-semibold">{formatCurrency(reportData.financial.averageTicket)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t">
                    <span className="text-red-600">Pendências</span>
                    <span className="font-semibold text-red-600">{formatCurrency(reportData.financial.pendingPayments)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Receita por Especialidade</CardTitle>
                  <CardDescription>Breakdown de receita por área médica</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(analyticsData?.specialties && analyticsData.specialties.length > 0) ? (
                      analyticsData.specialties.map((item, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">{item.name || item.specialty}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(item.revenue)} ({item.percentage?.toFixed(1) || 0}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${item.color || 'bg-blue-500'}`}
                              style={{ width: `${item.percentage || 0}%` }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground text-sm">
                          Nenhum dado de especialidade disponível para o período selecionado
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Análise de Consultas</CardTitle>
                <CardDescription>Dados detalhados sobre agendamentos e atendimentos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Calendar className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{reportData.appointments.totalAppointments}</div>
                    <div className="text-sm text-muted-foreground">Total de Consultas</div>
                  </div>
                  
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{reportData.appointments.completedAppointments}</div>
                    <div className="text-sm text-muted-foreground">Concluídas</div>
                  </div>
                  
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <XCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-red-600">{reportData.appointments.cancelledAppointments}</div>
                    <div className="text-sm text-muted-foreground">Canceladas</div>
                  </div>
                  
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <AlertCircle className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-yellow-600">{reportData.appointments.noShowRate}%</div>
                    <div className="text-sm text-muted-foreground">Taxa No-Show</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Doctors Tab */}
          <TabsContent value="doctors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance dos Médicos</CardTitle>
                <CardDescription>Análise individual de cada profissional</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reportData.doctors.doctorPerformance.map((doctor, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {doctor.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{doctor.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {doctor.appointments} consultas • ⭐ {doctor.rating}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatCurrency(doctor.revenue)}</div>
                        <div className="text-sm text-muted-foreground">Receita gerada</div>
                      </div>
                    </div>
                  ))}
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