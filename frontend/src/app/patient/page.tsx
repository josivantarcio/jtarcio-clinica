'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Calendar, Clock, User, Phone, Mail, FileText } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Patient, Appointment } from '@/types'

export default function PatientPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

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
    if (user && user.role !== 'PATIENT') {
      router.push('/dashboard')
      return
    }

    if (user && isAuthenticated) {
      loadPatientData()
    }
  }, [user, isAuthenticated])

  const loadPatientData = async () => {
    setLoading(true)
    try {
      // Load patient profile and appointments
      const [appointmentsResponse] = await Promise.all([
        apiClient.getAppointments({ patientId: user?.id })
      ])

      if (appointmentsResponse.success) {
        setAppointments(appointmentsResponse.data || [])
      }
    } catch (error) {
      console.error('Error loading patient data:', error)
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
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED'
  )

  const pastAppointments = appointments.filter(apt => 
    apt.status === 'COMPLETED' || apt.status === 'CANCELLED'
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Meus Agendamentos
            </h1>
            <p className="text-muted-foreground">
              Gerencie suas consultas e histórico médico
            </p>
          </div>
          <Button onClick={() => router.push('/appointments/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Consulta
          </Button>
        </div>

        {/* Patient Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Meus Dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user?.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{user?.name}</span>
              </div>
              {/* We'll add more patient details when we have the backend API ready */}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-8 w-8 text-primary" />
                <div>
                  <h3 className="font-semibold">Agendar Consulta</h3>
                  <p className="text-sm text-muted-foreground">
                    Reserve uma nova consulta
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold">Histórico Médico</h3>
                  <p className="text-sm text-muted-foreground">
                    Veja suas consultas anteriores
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Phone className="h-8 w-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold">Suporte</h3>
                  <p className="text-sm text-muted-foreground">
                    Fale conosco
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments */}
        <Card>
          <CardHeader>
            <CardTitle>Próximas Consultas</CardTitle>
            <CardDescription>
              Suas consultas agendadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Você não tem consultas agendadas
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => router.push('/appointments/new')}
                >
                  Agendar Primeira Consulta
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
                      <div>
                        <h4 className="font-semibold">
                          {appointment.specialty?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Dr. {appointment.doctor?.user?.name}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock className="h-4 w-4 mr-1" />
                          {new Date(appointment.scheduledAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        Reagendar
                      </Button>
                      <Button variant="destructive" size="sm">
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Consultas</CardTitle>
              <CardDescription>
                Suas consultas anteriores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pastAppointments.slice(0, 5).map((appointment) => (
                  <div 
                    key={appointment.id}
                    className="flex items-center justify-between p-4 border rounded-lg opacity-75"
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
                      <div>
                        <h4 className="font-semibold">
                          {appointment.specialty?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Dr. {appointment.doctor?.user?.name}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${
                          appointment.status === 'COMPLETED' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {appointment.status === 'COMPLETED' ? 'Concluída' : 'Cancelada'}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ver Detalhes
                    </Button>
                  </div>
                ))}
                {pastAppointments.length > 5 && (
                  <div className="text-center">
                    <Button variant="outline">
                      Ver Mais
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  )
}