'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Users,
  X,
  Save
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
  const [showSpecialtiesModal, setShowSpecialtiesModal] = useState(false)
  const [specialties, setSpecialties] = useState<Specialty[]>([])
  const [newSpecialty, setNewSpecialty] = useState({
    name: '',
    description: '',
    duration: 30,
    price: ''
  })
  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null)

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
      if (response.success && response.data) {
        // Transform API data to doctors with calculated stats
        const doctorsData: DoctorWithStats[] = response.data.map((doctor: any) => ({
          ...doctor,
          totalPatients: 0, // Will be calculated from actual appointments
          totalAppointments: 0, // Will be calculated from actual appointments  
          rating: 5.0, // Default rating for new doctors
          reviewsCount: 0, // Will be implemented later
          nextAppointment: undefined, // Will be calculated from actual appointments
          status: 'active', // Default status
          specialtyNames: doctor.specialties?.map((s: any) => s.name) || []
        }))
        setDoctors(doctorsData)
      } else {
        // No doctors found - clean state
        setDoctors([])
      }
    } catch (error) {
      console.error('Error loading doctors:', error)
      // Clean state if API fails
      setDoctors([])
    } finally {
      setLoading(false)
    }
  }

  const loadSpecialties = async () => {
    try {
      const response = await apiClient.getSpecialties()
      if (response.success && response.data) {
        setSpecialties(response.data)
      }
    } catch (error) {
      console.error('Error loading specialties:', error)
    }
  }

  const handleCreateSpecialty = async () => {
    try {
      const priceValue = newSpecialty.price ? parseFloat(newSpecialty.price) : null
      const response = await fetch('/api/v1/specialties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newSpecialty.name,
          description: newSpecialty.description,
          duration: newSpecialty.duration,
          price: priceValue
        })
      })
      
      if (response.ok) {
        await loadSpecialties()
        setNewSpecialty({ name: '', description: '', duration: 30, price: '' })
      }
    } catch (error) {
      console.error('Error creating specialty:', error)
    }
  }

  const handleUpdateSpecialty = async (id: string, updateData: any) => {
    try {
      const response = await fetch(`/api/v1/specialties/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })
      
      if (response.ok) {
        await loadSpecialties()
        setEditingSpecialty(null)
      }
    } catch (error) {
      console.error('Error updating specialty:', error)
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

  // Statistics cards with real data
  const totalDoctors = doctors.length
  const activeDoctors = doctors.filter(d => d.status === 'active').length
  const todayAppointments = doctors.reduce((sum, doctor) => {
    return sum + (doctor.nextAppointment && 
      doctor.nextAppointment.toDateString() === new Date().toDateString() ? 1 : 0)
  }, 0)
  const avgRating = doctors.length > 0 
    ? (doctors.reduce((sum, d) => sum + d.rating, 0) / doctors.length).toFixed(1)
    : '0.0'
  const totalReviews = doctors.reduce((sum, d) => sum + d.reviewsCount, 0)

  const statsCards = [
    {
      title: 'Total de Médicos',
      value: totalDoctors,
      subtitle: totalDoctors === 0 ? 'Nenhum cadastrado' : `${activeDoctors} ativos`,
      icon: Stethoscope,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Médicos Ativos',
      value: activeDoctors,
      subtitle: totalDoctors > 0 
        ? `${Math.round((activeDoctors / totalDoctors) * 100)}% do total`
        : 'Aguardando cadastros',
      icon: User,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Consultas Hoje',
      value: todayAppointments,
      subtitle: todayAppointments === 0 ? 'Nenhuma agendada' : `${todayAppointments} pendentes`,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Avaliação Média',
      value: avgRating,
      subtitle: totalReviews === 0 ? 'Sem avaliações' : `Base: ${totalReviews} avaliações`,
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
            <Button 
              variant="outline"
              onClick={() => {
                setShowSpecialtiesModal(true)
                loadSpecialties()
              }}
            >
              <Stethoscope className="h-4 w-4 mr-2" />
              Gerenciar Especialidades
            </Button>
            <Button onClick={() => router.push('/doctors/new')}>
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
                  <Button onClick={() => router.push('/doctors/new')}>
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

        {/* Specialties Management Modal */}
        <Dialog open={showSpecialtiesModal} onOpenChange={setShowSpecialtiesModal}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Gerenciar Especialidades
              </DialogTitle>
              <DialogDescription>
                Cadastre e gerencie as especialidades médicas e seus valores
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Add New Specialty Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Nova Especialidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome da Especialidade</Label>
                      <Input
                        id="name"
                        value={newSpecialty.name}
                        onChange={(e) => setNewSpecialty({...newSpecialty, name: e.target.value})}
                        placeholder="Ex: Cardiologia"
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Preço da Consulta (R$)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={newSpecialty.price}
                        onChange={(e) => setNewSpecialty({...newSpecialty, price: e.target.value})}
                        placeholder="150.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="duration">Duração (minutos)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={newSpecialty.duration}
                        onChange={(e) => setNewSpecialty({...newSpecialty, duration: parseInt(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={newSpecialty.description}
                      onChange={(e) => setNewSpecialty({...newSpecialty, description: e.target.value})}
                      placeholder="Descrição da especialidade..."
                      className="min-h-[100px]"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateSpecialty}
                    disabled={!newSpecialty.name}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Cadastrar Especialidade
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Specialties List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Especialidades Cadastradas</CardTitle>
                </CardHeader>
                <CardContent>
                  {specialties.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Stethoscope className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma especialidade cadastrada ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {specialties.map((specialty) => (
                        <div
                          key={specialty.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          {editingSpecialty?.id === specialty.id ? (
                            <div className="flex-1 grid grid-cols-3 gap-4">
                              <Input
                                value={editingSpecialty.name}
                                onChange={(e) => setEditingSpecialty({...editingSpecialty, name: e.target.value})}
                              />
                              <Input
                                type="number"
                                step="0.01"
                                value={editingSpecialty.price || ''}
                                onChange={(e) => setEditingSpecialty({...editingSpecialty, price: parseFloat(e.target.value) || 0})}
                                placeholder="Preço"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdateSpecialty(editingSpecialty.id, {
                                    name: editingSpecialty.name,
                                    price: editingSpecialty.price
                                  })}
                                >
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingSpecialty(null)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex-1">
                                <h4 className="font-semibold">{specialty.name}</h4>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span>
                                    {specialty.price ? `R$ ${specialty.price.toFixed(2)}` : 'Preço não definido'}
                                  </span>
                                  <span>{specialty.duration} min</span>
                                </div>
                                {specialty.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {specialty.description}
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingSpecialty(specialty)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        {/* Footer with Copyright - Following the pattern */}
        <footer className="text-center text-sm text-muted-foreground py-4">
          <p>&copy; 2025 Jtarcio Desenvolvimento. Todos os direitos reservados.</p>
        </footer>
      </div>
    </AppLayout>
  )
}