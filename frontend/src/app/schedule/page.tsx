'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useAppointmentsStore } from '@/store/appointments'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Filter,
  User,
  MapPin,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  MoreVertical,
  CalendarDays,
  CalendarCheck,
  Users,
  Stethoscope
} from 'lucide-react'
import { apiClient } from '@/lib/api'

interface ScheduleAppointment {
  id: string
  patientName: string
  patientEmail: string
  patientPhone: string
  startTime: Date
  endTime: Date
  duration: number
  type: 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY' | 'ROUTINE_CHECKUP'
  status: 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  specialty: string
  notes?: string
  isFirstTime: boolean
}

interface DaySchedule {
  date: Date
  appointments: ScheduleAppointment[]
  availableSlots: number
  totalSlots: number
}

export default function SchedulePage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const { appointments, isLoading: appointmentsLoading, loadAppointments } = useAppointmentsStore()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [scheduleData, setScheduleData] = useState<DaySchedule[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')

  useEffect(() => {
    // Hydrate the persisted store only once
    const unsubscribe = useAuthStore.persist.rehydrate()
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  const loadScheduleDataForUser = useCallback(() => {
    if (user && isAuthenticated) {
      // Check if user has permission to access schedule page
      if (!['DOCTOR', 'ADMIN', 'RECEPTIONIST'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      
      // Calculate date range based on view mode
      const startDate = new Date(currentDate)
      const endDate = new Date(currentDate)
      
      if (viewMode === 'day') {
        // Just today
        endDate.setDate(startDate.getDate() + 1)
      } else if (viewMode === 'week') {
        // Week starting from Monday
        const dayOfWeek = startDate.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek // Handle Sunday
        startDate.setDate(startDate.getDate() + mondayOffset)
        endDate.setDate(startDate.getDate() + 7)
      } else {
        // Month view
        startDate.setDate(1)
        endDate.setMonth(startDate.getMonth() + 1)
        endDate.setDate(1)
      }

      // Use store with appropriate parameters
      const params: any = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
      
      if (selectedDoctor !== 'all') {
        params.doctorId = selectedDoctor
      }
      
      loadAppointments(params)
    }
  }, [user, isAuthenticated, currentDate, viewMode, selectedDoctor, loadAppointments, router])

  useEffect(() => {
    loadScheduleDataForUser()
  }, [loadScheduleDataForUser])

  // Update schedule data when appointments change
  useEffect(() => {
    if (appointments) {
      const startDate = new Date(currentDate)
      const endDate = new Date(currentDate)
      
      if (viewMode === 'day') {
        endDate.setDate(startDate.getDate() + 1)
      } else if (viewMode === 'week') {
        const dayOfWeek = startDate.getDay()
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
        startDate.setDate(startDate.getDate() + mondayOffset)
        endDate.setDate(startDate.getDate() + 7)
      } else {
        startDate.setDate(1)
        endDate.setMonth(startDate.getMonth() + 1)
        endDate.setDate(1)
      }

      const formattedSchedule = formatAppointmentsToSchedule(appointments, startDate, endDate, viewMode)
      setScheduleData(formattedSchedule)
    }
  }, [appointments, currentDate, viewMode])

  const formatAppointmentsToSchedule = (appointments: any[], startDate: Date, endDate: Date, viewMode: string): DaySchedule[] => {
    const schedule: DaySchedule[] = []
    const days = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30
    
    // Ensure appointments is always an array
    const safeAppointments = Array.isArray(appointments) ? appointments : []
    
    for (let i = 0; i < days; i++) {
      const currentDay = new Date(startDate)
      currentDay.setDate(startDate.getDate() + i)
      
      // Filter appointments for this day
      const dayAppointments = safeAppointments.filter(apt => {
        const aptDate = new Date(apt.scheduledAt)
        return aptDate.toDateString() === currentDay.toDateString()
      })
      
      // Convert API appointments to ScheduleAppointment format
      const formattedAppointments: ScheduleAppointment[] = dayAppointments.map(apt => ({
        id: apt.id,
        patientName: apt.patient?.user?.name || apt.patient?.user?.fullName || 'Nome não informado',
        patientEmail: apt.patient?.user?.email || '',
        patientPhone: apt.patient?.user?.phone || '',
        startTime: new Date(apt.scheduledAt),
        endTime: new Date(apt.endTime || new Date(new Date(apt.scheduledAt).getTime() + apt.duration * 60000)),
        duration: apt.duration || 30,
        type: apt.type || 'CONSULTATION',
        status: apt.status,
        specialty: apt.specialty?.name || 'Não informada',
        notes: apt.notes,
        isFirstTime: apt.isFirstTime || false
      }))
      
      // Calculate slots based on doctor availability (if selectedDoctor !== 'all')
      // For now, we'll use default working hours until API is implemented
      // TODO: Fetch actual doctor availability from API /availability/doctor/{doctorId}/settings
      const dayOfWeek = currentDay.getDay()
      
      let totalSlots = 0
      // Default working hours (should come from availability table)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        totalSlots = 20 // 8h-18h = 20 slots of 30 min each
      } else if (dayOfWeek === 6) { // Saturday
        totalSlots = 12 // 8h-14h = 12 slots of 30 min each
      } else { // Sunday
        totalSlots = 0 // Closed
      }
      
      const usedSlots = formattedAppointments.length
      const availableSlots = Math.max(0, totalSlots - usedSlots)
      
      schedule.push({
        date: currentDay,
        appointments: formattedAppointments.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
        availableSlots,
        totalSlots
      })
    }
    
    return schedule
  }

  const createEmptySchedule = (startDate: Date, endDate: Date, viewMode: string): DaySchedule[] => {
    const schedule: DaySchedule[] = []
    const days = viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30
    
    for (let i = 0; i < days; i++) {
      const currentDay = new Date(startDate)
      currentDay.setDate(startDate.getDate() + i)
      
      // Calculate slots based on doctor availability
      // TODO: Fetch actual doctor availability from API
      const dayOfWeek = currentDay.getDay()
      
      let totalSlots = 0
      // Default working hours (should come from availability table)
      if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
        totalSlots = 20 // 8h-18h = 20 slots of 30 min each
      } else if (dayOfWeek === 6) { // Saturday
        totalSlots = 12 // 8h-14h = 12 slots of 30 min each
      } else { // Sunday
        totalSlots = 0 // Closed
      }
      
      schedule.push({
        date: currentDay,
        appointments: [],
        availableSlots: totalSlots,
        totalSlots
      })
    }
    
    return schedule
  }

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || appointmentsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando agenda...</p>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: 'bg-blue-100 text-blue-800', label: 'Agendada', icon: Clock },
      CONFIRMED: { color: 'bg-green-100 text-green-800', label: 'Confirmada', icon: CheckCircle },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', label: 'Em Andamento', icon: AlertCircle },
      COMPLETED: { color: 'bg-emerald-100 text-emerald-800', label: 'Concluída', icon: CheckCircle },
      CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Cancelada', icon: XCircle }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SCHEDULED

    return (
      <Badge className={`${config.color} border-0 flex items-center`}>
        <config.icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const getTypeColor = (type: string) => {
    const colors = {
      CONSULTATION: 'border-l-blue-500 bg-blue-50',
      FOLLOW_UP: 'border-l-green-500 bg-green-50',
      EMERGENCY: 'border-l-red-500 bg-red-50',
      ROUTINE_CHECKUP: 'border-l-purple-500 bg-purple-50'
    }
    return colors[type as keyof typeof colors] || colors.CONSULTATION
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const formatDateRange = () => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    } else if (viewMode === 'week') {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(currentDate.getDate() + 6)
      return `${weekStart.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} - ${weekEnd.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`
    } else {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    }
  }

  // Statistics for the header cards - all based on real data
  const totalAppointments = scheduleData.reduce((sum, day) => sum + day.appointments.length, 0)
  const todayAppointments = scheduleData.find(day => 
    day.date.toDateString() === new Date().toDateString()
  )?.appointments.length || 0
  const confirmedAppointments = scheduleData.reduce((sum, day) => 
    sum + day.appointments.filter(apt => apt.status === 'CONFIRMED').length, 0
  )
  const pendingAppointments = scheduleData.reduce((sum, day) => 
    sum + day.appointments.filter(apt => apt.status === 'SCHEDULED').length, 0
  )
  
  // Calculate occupation rate based on real data
  const totalSlotsAvailable = scheduleData.reduce((sum, day) => sum + day.totalSlots, 0)
  const totalSlotsUsed = scheduleData.reduce((sum, day) => sum + day.appointments.length, 0)
  const occupationRate = totalSlotsAvailable > 0 ? Math.round((totalSlotsUsed / totalSlotsAvailable) * 100) : 0

  const statsCards = [
    {
      title: 'Total de Consultas',
      value: totalAppointments,
      subtitle: `${viewMode === 'day' ? 'hoje' : viewMode === 'week' ? 'esta semana' : 'este mês'}`,
      icon: CalendarDays,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Consultas Hoje',
      value: todayAppointments,
      subtitle: `${pendingAppointments} pendentes`,
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Confirmadas',
      value: confirmedAppointments,
      subtitle: `${Math.round((confirmedAppointments/totalAppointments)*100) || 0}% do total`,
      icon: CalendarCheck,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Taxa de Ocupação',
      value: `${occupationRate}%`,
      subtitle: viewMode === 'day' ? 'Hoje' : viewMode === 'week' ? 'Esta semana' : 'Este mês',
      icon: Users,
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
              {user?.role === 'DOCTOR' ? 'Minha Agenda' : 'Agenda Médica'}
            </h1>
            <p className="text-muted-foreground">
              {user?.role === 'DOCTOR' && 'Sua agenda de consultas e horários disponíveis'}
              {user?.role === 'ADMIN' && 'Visão geral da agenda de todos os médicos'}
              {user?.role === 'RECEPTIONIST' && 'Agendamento e gerenciamento de consultas'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button onClick={() => router.push('/appointments/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Consulta
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
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

        {/* Calendar Navigation and View Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-[200px] text-center">
                    <h3 className="font-semibold text-lg">
                      {formatDateRange()}
                    </h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Hoje
                </Button>
              </div>

              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as any)}>
                <TabsList>
                  <TabsTrigger value="day">Dia</TabsTrigger>
                  <TabsTrigger value="week">Semana</TabsTrigger>
                  <TabsTrigger value="month">Mês</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Schedule Content */}
        <div className="grid gap-6">
          {viewMode === 'day' ? (
            // Day View
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Agenda do Dia
                </CardTitle>
                <CardDescription>
                  {selectedDate.toLocaleDateString('pt-BR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scheduleData.length > 0 && scheduleData[0].appointments.length > 0 ? (
                  <div className="space-y-3">
                    {scheduleData[0].appointments.map((appointment) => (
                      <div 
                        key={appointment.id}
                        className={`p-4 border-l-4 rounded-r-lg ${getTypeColor(appointment.type)} hover:shadow-sm transition-shadow`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="font-semibold">
                                {appointment.startTime.toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                                {' - '}
                                {appointment.endTime.toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              {getStatusBadge(appointment.status)}
                              {appointment.isFirstTime && (
                                <Badge variant="secondary" className="text-xs">
                                  Primeira consulta
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center space-x-1">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{appointment.patientName}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Stethoscope className="h-4 w-4 text-muted-foreground" />
                                <span>{appointment.specialty}</span>
                              </div>
                            </div>

                            {appointment.notes && (
                              <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                                {appointment.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-2 ml-4">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Nenhuma consulta agendada</h3>
                    <p className="text-muted-foreground mb-4">
                      Você tem o dia livre ou é fim de semana
                    </p>
                    <Button onClick={() => router.push('/appointments/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Consulta
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            // Week/Month View
            <div className="grid gap-4">
              {scheduleData.map((daySchedule, index) => (
                <Card key={index} className={daySchedule.date.toDateString() === new Date().toDateString() ? 'ring-2 ring-primary' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {daySchedule.date.toLocaleDateString('pt-BR', { 
                            weekday: 'long', 
                            day: 'numeric',
                            month: 'short'
                          })}
                        </CardTitle>
                        <CardDescription>
                          {daySchedule.appointments.length} consulta{daySchedule.appointments.length !== 1 ? 's' : ''} • {daySchedule.availableSlots} horários livres
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right text-sm">
                          <div className="font-medium">
                            {Math.round((daySchedule.appointments.length / daySchedule.totalSlots) * 100) || 0}%
                          </div>
                          <div className="text-muted-foreground">ocupação</div>
                        </div>
                        <div className={`w-3 h-12 rounded-full ${
                          daySchedule.appointments.length === 0 ? 'bg-gray-200' :
                          daySchedule.appointments.length <= daySchedule.totalSlots * 0.5 ? 'bg-green-500' :
                          daySchedule.appointments.length <= daySchedule.totalSlots * 0.8 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}></div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  {daySchedule.appointments.length > 0 && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {daySchedule.appointments.slice(0, 3).map((appointment) => (
                          <div key={appointment.id} className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                {appointment.startTime.toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                              <span>{appointment.patientName}</span>
                            </div>
                            <div className="text-xs">
                              {getStatusBadge(appointment.status)}
                            </div>
                          </div>
                        ))}
                        
                        {daySchedule.appointments.length > 3 && (
                          <div className="text-center">
                            <Button variant="ghost" size="sm" className="text-xs">
                              +{daySchedule.appointments.length - 3} mais
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Copyright */}
        <footer className="text-center text-sm text-muted-foreground py-4">
          <p>&copy; 2025 Jtarcio Desenvolvimento. Todos os direitos reservados.</p>
        </footer>
      </div>
    </AppLayout>
  )
}