'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Stethoscope,
  Clock,
  Star,
  MapPin,
  Eye,
  Edit,
  Trash2,
  Download,
  GraduationCap,
  Award,
  Users
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Doctor, Specialty } from '@/types'

interface DoctorWithStats extends Doctor {
  totalPatients: number
  totalAppointments: number
  rating: number
  reviewsCount: number
  nextAppointment?: Date
  status: 'active' | 'inactive' | 'vacation'
  specialtyNames: string[]
}

export default function DoctorsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [doctors, setDoctors] = useState<DoctorWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSpecialty, setFilterSpecialty] = useState('all')

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
      // Check if user has permission to access doctors page
      if (!['ADMIN', 'RECEPTIONIST'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      loadDoctors()
    }
  }, [user, isAuthenticated])

  const loadDoctors = async () => {
    setLoading(true)
    try {
      const response = await apiClient.getDoctors()
      if (response.success) {
        // Transform API data to doctors with mock stats (following the model's data structure)
        const doctorsData: DoctorWithStats[] = [
          {
            id: '1',
            userId: '1',
            user: {
              id: '1',
              email: 'dr.silva@eoclinica.com.br',
              name: 'Dr. João Silva',
              role: 'DOCTOR',
              avatar: '',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            crm: 'CRM-SP 123456',
            specialties: [],
            bio: 'Cardiologista com 15 anos de experiência em medicina preventiva e tratamento de doenças cardiovasculares.',
            experience: '15 anos',
            education: 'USP - Medicina, Especialização em Cardiologia',
            phone: '(11) 99999-1111',
            totalPatients: 87,
            totalAppointments: 156,
            rating: 4.9,
            reviewsCount: 52,
            nextAppointment: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
            status: 'active',
            specialtyNames: ['Cardiologia']
          },
          {
            id: '2',
            userId: '2', 
            user: {
              id: '2',
              email: 'dra.santos@eoclinica.com.br',
              name: 'Dra. Maria Santos',
              role: 'DOCTOR',
              avatar: '',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            crm: 'CRM-SP 654321',
            specialties: [],
            bio: 'Dermatologista especializada em dermatologia clínica e estética, com foco em tratamentos inovadores.',
            experience: '12 anos',
            education: 'UNIFESP - Medicina, Residência em Dermatologia',
            phone: '(11) 99999-2222',
            totalPatients: 134,
            totalAppointments: 298,
            rating: 4.8,
            reviewsCount: 89,
            nextAppointment: new Date(Date.now() + 4 * 60 * 60 * 1000),
            status: 'active',
            specialtyNames: ['Dermatologia']
          },
          {
            id: '3',
            userId: '3',
            user: {
              id: '3',
              email: 'dr.oliveira@eoclinica.com.br',
              name: 'Dr. Carlos Oliveira',
              role: 'DOCTOR',
              avatar: '',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            crm: 'CRM-SP 789123',
            specialties: [],
            bio: 'Ortopedista especializado em cirurgia de joelho e medicina esportiva.',
            experience: '20 anos',
            education: 'FMUSP - Medicina, Fellowship em Medicina Esportiva',
            phone: '(11) 99999-3333',
            totalPatients: 95,
            totalAppointments: 203,
            rating: 4.7,
            reviewsCount: 67,
            status: 'vacation',
            specialtyNames: ['Ortopedia']
          },
          {
            id: '4',
            userId: '4',
            user: {
              id: '4',
              email: 'dra.lima@eoclinica.com.br',
              name: 'Dra. Ana Lima',
              role: 'DOCTOR',
              avatar: '',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            crm: 'CRM-SP 456789',
            specialties: [],
            bio: 'Pediatra com especialização em neonatologia e desenvolvimento infantil.',
            experience: '8 anos',
            education: 'UNICAMP - Medicina, Residência em Pediatria',
            phone: '(11) 99999-4444',
            totalPatients: 156,
            totalAppointments: 402,
            rating: 4.9,
            reviewsCount: 123,
            nextAppointment: new Date(Date.now() + 1 * 60 * 60 * 1000),
            status: 'active',
            specialtyNames: ['Pediatria']
          }
        ]
        setDoctors(doctorsData)
      }
    } catch (error) {
      console.error('Error loading doctors:', error)
      // Set mock data if API fails
      setDoctors([])
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
          <p className="mt-2 text-muted-foreground">Carregando médicos...</p>
        </div>
      </div>
    )
  }

  // Filter doctors
  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = !searchTerm || 
      doctor.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doctor.crm.includes(searchTerm) ||
      doctor.specialtyNames.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesStatus = filterStatus === 'all' || doctor.status === filterStatus
    const matchesSpecialty = filterSpecialty === 'all' || 
      doctor.specialtyNames.some(spec => spec.toLowerCase().includes(filterSpecialty.toLowerCase()))

    return matchesSearch && matchesStatus && matchesSpecialty
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
      inactive: { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
      vacation: { color: 'bg-blue-100 text-blue-800', label: 'Férias' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active

    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  // Statistics cards following the model's design
  const statsCards = [
    {
      title: 'Total de Médicos',
      value: doctors.length,
      subtitle: `+2 este mês`,
      icon: Stethoscope,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Médicos Ativos',
      value: doctors.filter(d => d.status === 'active').length,
      subtitle: `${Math.round((doctors.filter(d => d.status === 'active').length / doctors.length) * 100)}% do total`,
      icon: User,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Consultas Hoje',
      value: doctors.reduce((sum, doctor) => {
        return sum + (doctor.nextAppointment && 
          doctor.nextAppointment.toDateString() === new Date().toDateString() ? 1 : 0)
      }, 0),
      subtitle: '8 pendentes',
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Avaliação Média',
      value: '4.8',
      subtitle: 'Base: 331 avaliações',
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    }
  ]

  const renderRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Gerenciar Médicos
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'ADMIN' ? 'Administração completa da equipe médica' : 'Cadastro e gestão de médicos'}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Médico
            </Button>
          </div>
        </div>

        {/* Statistics Cards - Following the exact model design */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statsCards.map((stat, index) => (
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
                    <p className="text-xs text-muted-foreground">
                      {stat.subtitle}
                    </p>
                  </div>
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
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
                    placeholder="Buscar médicos, especialidades..."
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
                  <option value="vacation">Férias</option>
                </select>
                <select
                  value={filterSpecialty}
                  onChange={(e) => setFilterSpecialty(e.target.value)}
                  className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Todas Especialidades</option>
                  <option value="cardiologia">Cardiologia</option>
                  <option value="dermatologia">Dermatologia</option>
                  <option value="ortopedia">Ortopedia</option>
                  <option value="pediatria">Pediatria</option>
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Doctors List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Stethoscope className="h-5 w-5 mr-2" />
              Equipe Médica ({filteredDoctors.length})
            </CardTitle>
            <CardDescription>
              Profissionais cadastrados e suas especialidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredDoctors.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
                  <Stethoscope className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'Nenhum médico encontrado' : 'Nenhum médico cadastrado'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca'
                    : 'Cadastre o primeiro médico da equipe'
                  }
                </p>
                {!searchTerm && (
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Primeiro Médico
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredDoctors.map((doctor) => (
                  <div 
                    key={doctor.id}
                    className="flex items-start justify-between p-6 border rounded-lg hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-start space-x-4 flex-1">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={doctor.user.avatar} />
                        <AvatarFallback className="text-lg font-semibold">
                          {doctor.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 space-y-3">
                        {/* Header with name and status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-xl font-semibold">
                              {doctor.user.name}
                            </h3>
                            {getStatusBadge(doctor.status)}
                          </div>
                          <div className="flex items-center space-x-1">
                            {renderRatingStars(doctor.rating)}
                            <span className="ml-2 text-sm text-muted-foreground">
                              {doctor.rating} ({doctor.reviewsCount})
                            </span>
                          </div>
                        </div>

                        {/* Specialties and CRM */}
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <Award className="h-4 w-4 text-blue-600" />
                            <span className="font-medium text-blue-600">
                              {doctor.specialtyNames.join(', ')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {doctor.crm}
                            </span>
                          </div>
                        </div>

                        {/* Contact info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4" />
                            <span>{doctor.user.email}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4" />
                            <span>{doctor.phone}</span>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="flex items-center space-x-1">
                            <Users className="h-4 w-4 text-blue-600" />
                            <span className="font-medium">{doctor.totalPatients}</span>
                            <span className="text-muted-foreground">pacientes</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-green-600" />
                            <span className="font-medium">{doctor.totalAppointments}</span>
                            <span className="text-muted-foreground">consultas</span>
                          </div>
                          {doctor.nextAppointment && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span className="text-muted-foreground">
                                Próxima: {doctor.nextAppointment.toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Bio */}
                        {doctor.bio && (
                          <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
                            {doctor.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <Button variant="ghost" size="sm" title="Ver perfil">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" title="Editar">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => router.push('/schedule?doctorId=' + doctor.id)}
                        title="Ver agenda"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer with Copyright - Following the pattern */}
        <footer className="text-center text-sm text-muted-foreground py-4">
          <p>&copy; 2025 Jtarcio Desenvolvimento. Todos os direitos reservados.</p>
        </footer>
      </div>
    </AppLayout>
  )
}