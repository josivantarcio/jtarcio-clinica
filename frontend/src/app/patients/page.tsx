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
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin,
  FileText,
  Clock,
  Heart,
  AlertTriangle,
  Eye,
  Edit,
  Trash2,
  Download
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Patient, Appointment } from '@/types'

interface PatientWithStats extends Patient {
  totalAppointments: number
  lastAppointment?: Date
  nextAppointment?: Date
  status: 'active' | 'inactive' | 'pending'
}

export default function PatientsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [patients, setPatients] = useState<PatientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedPatient, setSelectedPatient] = useState<PatientWithStats | null>(null)

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
      // Check if user has permission to access patients page
      if (!['DOCTOR', 'ADMIN', 'RECEPTIONIST'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      loadPatients()
    }
  }, [user, isAuthenticated])

  const loadPatients = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getUsers({ role: 'PATIENT' })
      if (response.success) {
        // Transform users to patients with mock stats
        const patientsData: PatientWithStats[] = (response.data || []).map((userData: any, index: number) => ({
          id: userData.id,
          userId: userData.id,
          user: userData,
          cpf: '000.000.000-00', // Mock data - would come from API
          phone: '(11) 99999-9999',
          birthDate: new Date('1990-01-01'),
          address: 'São Paulo, SP',
          emergencyContact: 'Contato de emergência',
          medicalHistory: 'Histórico médico do paciente',
          insurance: 'Plano de saúde',
          totalAppointments: Math.floor(Math.random() * 20) + 1,
          lastAppointment: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          nextAppointment: Math.random() > 0.5 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
          status: index % 3 === 0 ? 'active' : index % 3 === 1 ? 'inactive' : 'pending'
        }))
        setPatients(patientsData)
      }
    } catch (error) {
      console.error('Error loading patients:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando pacientes...</p>
        </div>
      </div>
    )
  }

  // Filter patients
  const filteredPatients = patients.filter(patient => {
    const matchesSearch = !searchTerm || 
      patient.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.cpf.includes(searchTerm) ||
      patient.phone.includes(searchTerm)

    const matchesStatus = filterStatus === 'all' || patient.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active

    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const statsCards = [
    {
      title: 'Total de Pacientes',
      value: patients.length,
      icon: User,
      color: 'text-blue-600'
    },
    {
      title: 'Pacientes Ativos',
      value: patients.filter(p => p.status === 'active').length,
      icon: Heart,
      color: 'text-green-600'
    },
    {
      title: 'Novos este Mês',
      value: patients.filter(p => {
        const createdAt = new Date(p.user.createdAt)
        const thisMonth = new Date()
        return createdAt.getMonth() === thisMonth.getMonth() && 
               createdAt.getFullYear() === thisMonth.getFullYear()
      }).length,
      icon: Calendar,
      color: 'text-purple-600'
    },
    {
      title: 'Pendentes',
      value: patients.filter(p => p.status === 'pending').length,
      icon: AlertTriangle,
      color: 'text-yellow-600'
    }
  ]

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gerenciar Pacientes
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'DOCTOR' && 'Seus pacientes e histórico médico'}
              {user?.role === 'ADMIN' && 'Todos os pacientes da clínica'}
              {user?.role === 'RECEPTIONIST' && 'Cadastro e atendimento de pacientes'}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Paciente
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Pesquisar por nome, email, CPF ou telefone..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                  <option value="pending">Pendentes</option>
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Mais Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patients List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pacientes ({filteredPatients.length})
            </CardTitle>
            <CardDescription>
              Lista de todos os pacientes cadastrados no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPatients.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm 
                    ? 'Nenhum paciente encontrado com os filtros aplicados' 
                    : 'Nenhum paciente cadastrado ainda'}
                </p>
                {!searchTerm && (
                  <Button className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Paciente
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPatients.map((patient) => (
                  <div 
                    key={patient.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-center space-x-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={patient.user.avatar} />
                        <AvatarFallback>
                          {patient.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-semibold text-lg">
                            {patient.user.name}
                          </h4>
                          {getStatusBadge(patient.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {patient.user.email}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-1" />
                            {patient.phone}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            {patient.address}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {patient.totalAppointments} consultas
                          </div>
                          {patient.lastAppointment && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Última: {patient.lastAppointment.toLocaleDateString('pt-BR')}
                            </div>
                          )}
                          {patient.nextAppointment && (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-green-600" />
                              Próxima: {patient.nextAppointment.toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/appointments/new?patientId=' + patient.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Pagination */}
                {filteredPatients.length > 10 && (
                  <div className="flex justify-center mt-6">
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Anterior
                      </Button>
                      <Button variant="outline" size="sm" className="bg-primary text-white">
                        1
                      </Button>
                      <Button variant="outline" size="sm">
                        2
                      </Button>
                      <Button variant="outline" size="sm">
                        3
                      </Button>
                      <Button variant="outline" size="sm">
                        Próximo
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                  <Plus className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Novo Paciente</h3>
                  <p className="text-sm text-muted-foreground">
                    Cadastrar novo paciente
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Relatório</h3>
                  <p className="text-sm text-muted-foreground">
                    Gerar relatório de pacientes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-100">
                  <Download className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold">Exportar</h3>
                  <p className="text-sm text-muted-foreground">
                    Exportar lista de pacientes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}