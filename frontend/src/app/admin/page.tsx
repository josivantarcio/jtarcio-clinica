'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Shield,
  Users,
  Activity,
  Database,
  Settings,
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Plus,
  Search,
  Filter,
  Server,
  HardDrive,
  Cpu,
  MemoryStick,
  Clock,
  Lock,
  Key,
  UserCheck,
  UserX,
  LogOut,
  MoreVertical
} from 'lucide-react'

interface AdminData {
  system: {
    totalUsers: number
    activeUsers: number
    totalAppointments: number
    systemHealth: number
    userGrowth: number
    appointmentGrowth: number
    activeGrowth: number
    healthGrowth: number
  }
  users: Array<{
    id: string
    name: string
    email: string
    role: string
    status: 'active' | 'inactive' | 'suspended'
    lastLogin: Date
    createdAt: Date
    avatar?: string
  }>
  logs: Array<{
    id: string
    userId: string
    userName: string
    action: string
    resource: string
    timestamp: Date
    ip: string
    success: boolean
  }>
  systemStats: {
    cpuUsage: number
    memoryUsage: number
    diskUsage: number
    uptime: number
    activeConnections: number
    requestsPerMinute: number
  }
}

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('users')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')

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
      // Verificar se o usuário é ADMIN
      if (user.role !== 'ADMIN') {
        router.push('/dashboard')
        return
      }
      loadAdminData()
    }
  }, [user, isAuthenticated])

  const loadAdminData = async () => {
    setLoading(true)
    try {
      // Mock data administrativo - em produção viria da API
      const mockData: AdminData = {
        system: {
          totalUsers: 1247,
          activeUsers: 890,
          totalAppointments: 5420,
          systemHealth: 98.5,
          userGrowth: 12.8,
          appointmentGrowth: 18.3,
          activeGrowth: 8.7,
          healthGrowth: 2.1
        },
        users: [
          {
            id: '1',
            name: 'Dr. João Silva',
            email: 'dr.silva@eoclinica.com',
            role: 'DOCTOR',
            status: 'active',
            lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
            createdAt: new Date('2024-01-15')
          },
          {
            id: '2',
            name: 'Maria Santos',
            email: 'maria@email.com',
            role: 'PATIENT',
            status: 'active',
            lastLogin: new Date(Date.now() - 5 * 60 * 60 * 1000),
            createdAt: new Date('2024-03-20')
          },
          {
            id: '3',
            name: 'Ana Costa',
            email: 'ana.costa@eoclinica.com',
            role: 'RECEPTIONIST',
            status: 'inactive',
            lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
            createdAt: new Date('2024-02-10')
          },
          {
            id: '4',
            name: 'Carlos Admin',
            email: 'carlos@eoclinica.com',
            role: 'ADMIN',
            status: 'active',
            lastLogin: new Date(Date.now() - 30 * 60 * 1000),
            createdAt: new Date('2023-12-01')
          }
        ],
        logs: [
          {
            id: '1',
            userId: '1',
            userName: 'Dr. João Silva',
            action: 'LOGIN',
            resource: 'AUTH',
            timestamp: new Date(Date.now() - 10 * 60 * 1000),
            ip: '192.168.1.100',
            success: true
          },
          {
            id: '2',
            userId: '2',
            userName: 'Maria Santos',
            action: 'CREATE_APPOINTMENT',
            resource: 'APPOINTMENTS',
            timestamp: new Date(Date.now() - 25 * 60 * 1000),
            ip: '192.168.1.105',
            success: true
          },
          {
            id: '3',
            userId: '3',
            userName: 'Ana Costa',
            action: 'FAILED_LOGIN',
            resource: 'AUTH',
            timestamp: new Date(Date.now() - 45 * 60 * 1000),
            ip: '192.168.1.120',
            success: false
          }
        ],
        systemStats: {
          cpuUsage: 45.2,
          memoryUsage: 67.8,
          diskUsage: 34.1,
          uptime: 2457600, // seconds
          activeConnections: 234,
          requestsPerMinute: 1450
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000))
      setAdminData(mockData)
    } catch (error) {
      console.error('Error loading admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    loadAdminData()
  }

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando painel administrativo...</p>
        </div>
      </div>
    )
  }

  if (!adminData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Erro ao carregar dados</h3>
          <p className="text-muted-foreground mb-4">
            Não foi possível carregar os dados administrativos
          </p>
          <Button onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    )
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    return `${days}d ${hours}h`
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

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
      suspended: { color: 'bg-red-100 text-red-800', label: 'Suspenso' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active

    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      ADMIN: { color: 'bg-purple-100 text-purple-800', label: 'Admin' },
      DOCTOR: { color: 'bg-blue-100 text-blue-800', label: 'Médico' },
      PATIENT: { color: 'bg-green-100 text-green-800', label: 'Paciente' },
      RECEPTIONIST: { color: 'bg-yellow-100 text-yellow-800', label: 'Recepcionista' }
    }

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.PATIENT

    return (
      <Badge className={`${config.color} border-0 text-xs`}>
        {config.label}
      </Badge>
    )
  }

  // Main Statistics Cards seguindo exatamente o modelo da imagem
  const mainStats = [
    {
      title: 'Total de Usuários',
      value: adminData.system.totalUsers.toLocaleString(),
      subtitle: `${adminData.system.activeUsers} usuários ativos`,
      growth: adminData.system.userGrowth,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Usuários Ativos',
      value: adminData.system.activeUsers.toLocaleString(),
      subtitle: `${Math.round((adminData.system.activeUsers / adminData.system.totalUsers) * 100)}% do total`,
      growth: adminData.system.activeGrowth,
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Total Consultas',
      value: adminData.system.totalAppointments.toLocaleString(),
      subtitle: `${Math.floor(adminData.system.totalAppointments * 0.15)} este mês`,
      growth: adminData.system.appointmentGrowth,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Saúde do Sistema',
      value: `${adminData.system.systemHealth}%`,
      subtitle: 'Todos os serviços online',
      growth: adminData.system.healthGrowth,
      icon: Shield,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ]

  // Filter users
  const filteredUsers = adminData.users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = filterRole === 'all' || user.role === filterRole

    return matchesSearch && matchesRole
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">
              Gestão completa do sistema, usuários e configurações
            </p>
          </div>
          <div className="flex items-center space-x-2">
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

        {/* Main Statistics Cards - Exata replicação do modelo */}
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

        {/* Administrative Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center">
              <Server className="h-4 w-4 mr-2" />
              Sistema
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Logs
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              Manutenção
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Gestão de Usuários ({filteredUsers.length})
                    </CardTitle>
                    <CardDescription>
                      Administre usuários, permissões e acessos do sistema
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Usuário
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Buscar usuários..."
                        className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">Todas as Funções</option>
                      <option value="ADMIN">Admin</option>
                      <option value="DOCTOR">Médico</option>
                      <option value="PATIENT">Paciente</option>
                      <option value="RECEPTIONIST">Recepcionista</option>
                    </select>
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filtros
                    </Button>
                  </div>
                </div>

                {/* Users Table */}
                <div className="space-y-4">
                  {filteredUsers.map((userData) => (
                    <div key={userData.id} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={userData.avatar} />
                          <AvatarFallback className="font-semibold">
                            {userData.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-semibold">{userData.name}</h4>
                            {getRoleBadge(userData.role)}
                            {getStatusBadge(userData.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">{userData.email}</p>
                          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                            <span>Último acesso: {formatDate(userData.lastLogin)}</span>
                            <span>•</span>
                            <span>Cadastrado em: {formatDate(userData.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" title="Ver detalhes">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Editar usuário">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" title="Suspender usuário">
                          <UserX className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Server className="h-5 w-5 mr-2 text-blue-600" />
                    Performance do Sistema
                  </CardTitle>
                  <CardDescription>
                    Métricas em tempo real do servidor
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* CPU Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">CPU</span>
                      <span className="text-sm text-muted-foreground">{adminData.systemStats.cpuUsage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${adminData.systemStats.cpuUsage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Memory Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Memória</span>
                      <span className="text-sm text-muted-foreground">{adminData.systemStats.memoryUsage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${adminData.systemStats.memoryUsage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Disk Usage */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">Disco</span>
                      <span className="text-sm text-muted-foreground">{adminData.systemStats.diskUsage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${adminData.systemStats.diskUsage}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Uptime:</span>
                        <span className="ml-2 font-medium">{formatUptime(adminData.systemStats.uptime)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conexões:</span>
                        <span className="ml-2 font-medium">{adminData.systemStats.activeConnections}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* System Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="h-5 w-5 mr-2 text-purple-600" />
                    Configurações
                  </CardTitle>
                  <CardDescription>
                    Configurações gerais do sistema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Manutenção Programada</p>
                        <p className="text-sm text-muted-foreground">Sistema em modo de manutenção</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Registros de Debug</p>
                        <p className="text-sm text-muted-foreground">Ativar logs detalhados</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Backup Automático</p>
                        <p className="text-sm text-muted-foreground">Backup diário às 3:00</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Backup Manual
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reiniciar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-green-600" />
                  Logs de Auditoria ({adminData.logs.length})
                </CardTitle>
                <CardDescription>
                  Histórico de ações dos usuários no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {adminData.logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${log.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{log.userName}</span>
                            <Badge variant="outline" className="text-xs">
                              {log.action}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {log.resource} • {log.ip} • {formatDate(log.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {log.success ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="h-5 w-5 mr-2 text-orange-600" />
                  Ferramentas de Manutenção
                </CardTitle>
                <CardDescription>
                  Utilitários para manutenção e otimização do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Database className="h-6 w-6 text-blue-600" />
                      <div>
                        <h4 className="font-semibold">Limpeza do Banco</h4>
                        <p className="text-sm text-muted-foreground">Remove dados temporários e logs antigos</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Executar Limpeza
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <HardDrive className="h-6 w-6 text-green-600" />
                      <div>
                        <h4 className="font-semibold">Backup Completo</h4>
                        <p className="text-sm text-muted-foreground">Cria backup de todos os dados</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Iniciar Backup
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Activity className="h-6 w-6 text-purple-600" />
                      <div>
                        <h4 className="font-semibold">Otimização</h4>
                        <p className="text-sm text-muted-foreground">Otimiza índices e performance</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Otimizar Sistema
                    </Button>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center space-x-3 mb-3">
                      <Shield className="h-6 w-6 text-red-600" />
                      <div>
                        <h4 className="font-semibold">Verificação Segurança</h4>
                        <p className="text-sm text-muted-foreground">Analisa vulnerabilidades</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      Verificar Segurança
                    </Button>
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