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
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('thisMonth')
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
      // Simulate API call with realistic medical clinic data
      const mockData: ReportData = {
        financial: {
          totalRevenue: 156480.50,
          monthlyRevenue: 45600.00,
          averageTicket: 185.50,
          pendingPayments: 12800.00,
          revenueGrowth: 12.5,
          monthlyComparison: [38000, 42000, 35000, 48000, 45600, 52000] // Last 6 months
        },
        appointments: {
          totalAppointments: 1247,
          completedAppointments: 1089,
          cancelledAppointments: 98,
          noShowRate: 4.8,
          appointmentGrowth: 15.3,
          dailyAppointments: [12, 15, 18, 14, 16, 22, 8] // Last 7 days
        },
        patients: {
          totalPatients: 756,
          newPatients: 89,
          returningPatients: 187,
          patientRetention: 78.5,
          patientSatisfaction: 4.6,
          patientGrowth: [650, 678, 701, 728, 745, 756] // Last 6 months
        },
        doctors: {
          totalDoctors: 8,
          averageRating: 4.7,
          mostBookedDoctor: 'Dr. João Silva',
          doctorEfficiency: 92.3,
          doctorPerformance: [
            { name: 'Dr. João Silva', appointments: 156, rating: 4.9, revenue: 28950 },
            { name: 'Dra. Maria Santos', appointments: 142, rating: 4.8, revenue: 26340 },
            { name: 'Dr. Carlos Oliveira', appointments: 128, rating: 4.6, revenue: 23760 },
            { name: 'Dra. Ana Lima', appointments: 134, rating: 4.7, revenue: 24890 }
          ]
        }
      }

      // Simulate loading delay
      await new Promise(resolve => setTimeout(resolve, 800))
      setReportData(mockData)
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    loadReportData()
  }

  const exportReport = (format: 'pdf' | 'excel' | 'csv') => {
    // Simulate export functionality
    console.log(`Exporting report as ${format}`)
    // In real implementation, this would trigger download
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
      growth: 8.3, // Patient growth percentage
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Satisfação',
      value: `${reportData.patients.patientSatisfaction}/5.0`,
      subtitle: `Base: 428 avaliações`,
      growth: 2.1,
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
              <option value="thisWeek">Esta Semana</option>
              <option value="thisMonth">Este Mês</option>
              <option value="thisQuarter">Este Trimestre</option>
              <option value="thisYear">Este Ano</option>
              <option value="custom">Personalizado</option>
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

        {/* Main Statistics Cards - Exact replication of the model */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {mainStats.map((stat, index) => (
            <Card key={index} className="relative overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-3xl font-bold">
                      {stat.value}
                    </p>
                    <div className="flex items-center space-x-2">
                      <div className={`flex items-center space-x-1 ${getGrowthColor(stat.growth)}`}>
                        {getGrowthIcon(stat.growth)}
                        <span className="text-sm font-medium">
                          {formatPercentage(stat.growth)}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        vs mês anterior
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div className={`flex items-center justify-center w-14 h-14 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-7 w-7 ${stat.color}`} />
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
              {/* Revenue Trend */}
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
                <CardContent>
                  <div className="space-y-4">
                    {/* Mock chart representation */}
                    <div className="h-64 bg-gradient-to-t from-green-50 to-transparent rounded-lg flex items-end justify-around p-4">
                      {reportData.financial.monthlyComparison.map((value, index) => (
                        <div key={index} className="flex flex-col items-center space-y-2">
                          <div 
                            className="bg-green-500 rounded-t"
                            style={{ 
                              height: `${(value / Math.max(...reportData.financial.monthlyComparison)) * 200}px`,
                              width: '30px'
                            }}
                          ></div>
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(value / 1000)}k
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
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
                      <ArrowUp className="h-3 w-3" />
                      <span className="text-xs">+5.2% vs mês anterior</span>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-blue-600">
                      {reportData.patients.patientRetention}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa de Retenção</div>
                    <div className="flex items-center justify-center space-x-1 text-blue-600">
                      <ArrowUp className="h-3 w-3" />
                      <span className="text-xs">+2.1% vs mês anterior</span>
                    </div>
                  </div>
                  
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-yellow-600">
                      {reportData.appointments.noShowRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">Taxa de No-Show</div>
                    <div className="flex items-center justify-center space-x-1 text-red-600">
                      <ArrowDown className="h-3 w-3" />
                      <span className="text-xs">-1.3% vs mês anterior</span>
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
                    <span className="font-semibold">{formatCurrency(reportData.financial.totalRevenue * 0.85)}</span>
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
                    {[
                      { specialty: 'Cardiologia', revenue: 45680, percentage: 29.2, color: 'bg-blue-500' },
                      { specialty: 'Dermatologia', revenue: 38920, percentage: 24.9, color: 'bg-green-500' },
                      { specialty: 'Ortopedia', revenue: 32150, percentage: 20.5, color: 'bg-purple-500' },
                      { specialty: 'Pediatria', revenue: 28430, percentage: 18.2, color: 'bg-yellow-500' },
                      { specialty: 'Outros', revenue: 11300, percentage: 7.2, color: 'bg-gray-500' }
                    ].map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{item.specialty}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(item.revenue)} ({item.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${item.color}`}
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
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