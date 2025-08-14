'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppointmentCalendar } from '@/components/calendar/appointment-calendar'
import { AppointmentModal } from '@/components/appointments/appointment-modal'
import { 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Filter,
  Search,
  MoreVertical,
  CalendarDays
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Appointment } from '@/types'
import { View } from 'react-big-calendar'

export default function AppointmentsPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [calendarView, setCalendarView] = useState<View>('week')
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')

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
      loadAppointments()
    }
  }, [user, isAuthenticated])

  const loadAppointments = async () => {
    setLoading(true)
    try {
      // Definir parâmetros baseados no role do usuário
      const params: any = {}
      
      if (user?.role === 'PATIENT') {
        params.patientId = user.id
      } else if (user?.role === 'DOCTOR') {
        params.doctorId = user.id
      }
      // ADMIN e RECEPTIONIST veem todas as consultas
      
      const response = await apiClient.getAppointments(params)
      if (response.success) {
        setAppointments(response.data || [])
      } else {
        console.error('Error loading appointments:', response.error)
      }
    } catch (error) {
      console.error('Error loading appointments:', error)
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
          <p className="mt-2 text-muted-foreground">Carregando consultas...</p>
        </div>
      </div>
    )
  }

  // Filter appointments based on status and user role
  const filterAppointments = (status: string) => {
    let filtered = appointments

    // Filter by user role
    if (user?.role === 'PATIENT') {
      filtered = appointments.filter(apt => apt.patient?.user?.id === user.id)
    } else if (user?.role === 'DOCTOR') {
      filtered = appointments.filter(apt => apt.doctor?.user?.id === user.id)
    }

    // Filter by status
    if (status !== 'all') {
      filtered = filtered.filter(apt => apt.status === status.toUpperCase())
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(apt => 
        apt.patient?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.doctor?.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.specialty?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: 'bg-blue-100 text-blue-800', label: 'Agendada' },
      CONFIRMED: { color: 'bg-green-100 text-green-800', label: 'Confirmada' },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', label: 'Em Andamento' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Concluída' },
      CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Cancelada' },
      NO_SHOW: { color: 'bg-gray-100 text-gray-800', label: 'Faltou' },
      RESCHEDULED: { color: 'bg-orange-100 text-orange-800', label: 'Reagendada' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SCHEDULED

    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SCHEDULED':
      case 'CONFIRMED':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'CANCELLED':
      case 'NO_SHOW':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'IN_PROGRESS':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-blue-600" />
    }
  }

  const upcomingAppointments = filterAppointments('all').filter(apt => 
    ['SCHEDULED', 'CONFIRMED'].includes(apt.status) && 
    new Date(apt.scheduledAt) > new Date()
  )

  const pastAppointments = filterAppointments('all').filter(apt => 
    ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(apt.status) || 
    new Date(apt.scheduledAt) < new Date()
  )

  const todayAppointments = filterAppointments('all').filter(apt => {
    const appointmentDate = new Date(apt.scheduledAt)
    const today = new Date()
    return appointmentDate.toDateString() === today.toDateString()
  })

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {user?.role === 'PATIENT' ? 'Minhas Consultas' : 
               user?.role === 'DOCTOR' ? 'Minha Agenda' : 'Consultas'}
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'PATIENT' && 'Acompanhe seus agendamentos e histórico médico'}
              {user?.role === 'DOCTOR' && 'Gerencie sua agenda e consultas'}
              {user?.role === 'ADMIN' && 'Visão geral de todas as consultas da clínica'}
              {user?.role === 'RECEPTIONIST' && 'Gerencie agendamentos e atendimentos'}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8"
              >
                <User className="h-4 w-4 mr-1" />
                Lista
              </Button>
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="h-8"
              >
                <CalendarDays className="h-4 w-4 mr-1" />
                Calendário
              </Button>
            </div>
            
            <Button onClick={() => router.push('/appointments/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Consulta
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-bold">{todayAppointments.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Próximas</p>
                  <p className="text-2xl font-bold">{upcomingAppointments.length}</p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Concluídas</p>
                  <p className="text-2xl font-bold">
                    {appointments.filter(apt => apt.status === 'COMPLETED').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{appointments.length}</p>
                </div>
                <User className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
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
                    placeholder="Pesquisar por paciente, médico ou especialidade..."
                    className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <AppointmentCalendar
            appointments={appointments}
            onAppointmentSelect={setSelectedAppointment}
            onSlotSelect={(slotInfo) => {
              // Navigate to new appointment with pre-filled time
              const searchParams = new URLSearchParams({
                date: slotInfo.start.toISOString(),
                duration: '30'
              })
              router.push(`/appointments/new?${searchParams.toString()}`)
            }}
            view={calendarView}
            onViewChange={setCalendarView}
          />
        )}

        {/* List View - Appointments Tabs */}
        {viewMode === 'list' && (
        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Próximas ({upcomingAppointments.length})</TabsTrigger>
            <TabsTrigger value="today">Hoje ({todayAppointments.length})</TabsTrigger>
            <TabsTrigger value="history">Histórico ({pastAppointments.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Próximas Consultas</CardTitle>
                <CardDescription>
                  Suas consultas agendadas e confirmadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {upcomingAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhuma consulta próxima encontrada
                    </p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => router.push('/appointments/new')}
                    >
                      Agendar Nova Consulta
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingAppointments.map((appointment) => (
                      <div 
                        key={appointment.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex flex-col items-center">
                            <div className="text-lg font-semibold">
                              {new Date(appointment.scheduledAt).getDate()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(appointment.scheduledAt).toLocaleDateString('pt-BR', { 
                                month: 'short' 
                              })}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="font-semibold">
                                {appointment.specialty?.name}
                              </h4>
                              {getStatusBadge(appointment.status)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {user?.role === 'PATIENT' 
                                ? `Dr. ${appointment.doctor?.user?.name}`
                                : appointment.patient?.user?.name
                              }
                            </p>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <Clock className="h-4 w-4 mr-1" />
                              {new Date(appointment.scheduledAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                              <span className="mx-2">•</span>
                              <span>{appointment.duration} min</span>
                            </div>
                            {appointment.reason && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {appointment.reason}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(appointment.status)}
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
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Consultas de Hoje</CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {todayAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhuma consulta agendada para hoje
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {todayAppointments
                      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                      .map((appointment) => (
                        <div 
                          key={appointment.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                              <Clock className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold">
                                  {appointment.specialty?.name}
                                </h4>
                                {getStatusBadge(appointment.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {user?.role === 'PATIENT' 
                                  ? `Dr. ${appointment.doctor?.user?.name}`
                                  : appointment.patient?.user?.name
                                }
                              </p>
                              <div className="flex items-center text-sm text-muted-foreground mt-1">
                                <Clock className="h-4 w-4 mr-1" />
                                {new Date(appointment.scheduledAt).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                <span className="mx-2">•</span>
                                <span>{appointment.duration} min</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {appointment.status === 'SCHEDULED' && (
                              <Button size="sm" variant="outline">
                                Confirmar
                              </Button>
                            )}
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
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Consultas</CardTitle>
                <CardDescription>
                  Consultas anteriores e canceladas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pastAppointments.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhuma consulta no histórico
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pastAppointments
                      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
                      .slice(0, 10)
                      .map((appointment) => (
                        <div 
                          key={appointment.id}
                          className="flex items-center justify-between p-4 border rounded-lg opacity-75 hover:opacity-100 transition-opacity"
                        >
                          <div className="flex items-center space-x-4">
                            <div className="flex flex-col items-center">
                              <div className="text-lg font-semibold">
                                {new Date(appointment.scheduledAt).getDate()}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(appointment.scheduledAt).toLocaleDateString('pt-BR', { 
                                  month: 'short',
                                  year: '2-digit'
                                })}
                              </div>
                            </div>
                            <div>
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-semibold">
                                  {appointment.specialty?.name}
                                </h4>
                                {getStatusBadge(appointment.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {user?.role === 'PATIENT' 
                                  ? `Dr. ${appointment.doctor?.user?.name}`
                                  : appointment.patient?.user?.name
                                }
                              </p>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            Ver Detalhes
                          </Button>
                        </div>
                      ))}
                    {pastAppointments.length > 10 && (
                      <div className="text-center">
                        <Button variant="outline">
                          Ver Mais ({pastAppointments.length - 10} restantes)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}

        {/* Appointment Detail Modal */}
        <AppointmentModal
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onConfirm={async (appointment) => {
            try {
              await apiClient.updateAppointment(appointment.id, { status: 'CONFIRMED' })
              await loadAppointments() // Reload appointments
            } catch (error) {
              console.error('Error confirming appointment:', error)
            }
          }}
          onCancel={async (appointment) => {
            try {
              await apiClient.cancelAppointment(appointment.id, 'Cancelado pelo usuário')
              await loadAppointments() // Reload appointments
            } catch (error) {
              console.error('Error canceling appointment:', error)
            }
          }}
          onComplete={async (appointment) => {
            try {
              await apiClient.updateAppointment(appointment.id, { status: 'COMPLETED' })
              await loadAppointments() // Reload appointments
            } catch (error) {
              console.error('Error completing appointment:', error)
            }
          }}
          onReschedule={(appointment) => {
            router.push(`/appointments/new?reschedule=${appointment.id}`)
          }}
        />
      </div>
    </AppLayout>
  )
}