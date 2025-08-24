'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { UserAvatar } from '@/components/ui/user-avatar'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Edit,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Heart,
  Shield,
  AlertTriangle,
  Clock,
  Activity
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { formatDateForDisplay, parseDateFromAPI } from '@/lib/date-utils'

interface PatientData {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone?: string
  cpf?: string
  dateOfBirth?: string
  gender?: string
  status: string
  createdAt: string
  patientProfile?: {
    emergencyContactName?: string
    emergencyContactPhone?: string
    allergies: string[]
    medications: string[]
    address?: any
  }
  appointments?: Array<{
    id: string
    status: string
    scheduledAt: string
    specialty?: {
      name: string
    }
    doctor?: {
      user: {
        fullName: string
      }
    }
  }>
}

export default function PatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [patient, setPatient] = useState<PatientData | null>(null)
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
    if (user && isAuthenticated) {
      // Check if user has permission to access patients page
      if (!['DOCTOR', 'ADMIN', 'RECEPTIONIST'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      loadPatient()
    }
  }, [user, isAuthenticated, id])

  const loadPatient = async () => {
    setLoading(true)
    try {
      const response = await apiClient.request({
        method: 'GET',
        url: `/api/v1/users/${id}`
      })
      
      if (response.success && response.data) {
        setPatient(response.data)
      } else {
        toast.error('Paciente não encontrado')
        router.push('/patients')
      }
    } catch (error) {
      console.error('Error loading patient:', error)
      toast.error('Erro ao carregar dados do paciente')
      router.push('/patients')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Ativo' },
      INACTIVE: { color: 'bg-gray-100 text-gray-800', label: 'Inativo' },
      SUSPENDED: { color: 'bg-red-100 text-red-800', label: 'Suspenso' },
      PENDING_VERIFICATION: { color: 'bg-yellow-100 text-yellow-800', label: 'Pendente' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ACTIVE

    return (
      <Badge className={`${config.color} border-0`}>
        {config.label}
      </Badge>
    )
  }

  const getAppointmentStatusBadge = (status: string) => {
    const statusConfig = {
      SCHEDULED: { color: 'bg-blue-100 text-blue-800', label: 'Agendada' },
      CONFIRMED: { color: 'bg-green-100 text-green-800', label: 'Confirmada' },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-800', label: 'Em Andamento' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Concluída' },
      CANCELLED: { color: 'bg-red-100 text-red-800', label: 'Cancelada' },
      NO_SHOW: { color: 'bg-red-100 text-red-800', label: 'Faltou' },
      RESCHEDULED: { color: 'bg-orange-100 text-orange-800', label: 'Reagendada' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.SCHEDULED

    return (
      <Badge className={`${config.color} border-0 text-xs`}>
        {config.label}
      </Badge>
    )
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = parseDateFromAPI(birthDate)
    if (!birth) return 0
    
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  // Show loading while checking auth or loading patient
  if (isLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">
            {loading ? 'Carregando dados do paciente...' : 'Carregando...'}
          </p>
        </div>
      </div>
    )
  }

  if (!patient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold">Paciente não encontrado</h2>
          <p className="text-muted-foreground mb-4">O paciente solicitado não foi encontrado.</p>
          <Button onClick={() => router.push('/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Pacientes
          </Button>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/patients')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{patient.fullName}</h1>
              <p className="text-muted-foreground">
                Paciente desde {new Date(patient.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(patient.status)}
            <Button onClick={() => router.push(`/patients/${patient.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informações Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <UserAvatar 
                    src={""} 
                    name={patient.fullName}
                    className="h-16 w-16"
                    fallbackClassName="text-lg"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{patient.fullName}</h3>
                    <p className="text-muted-foreground">{patient.email}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{patient.phone || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{patient.cpf || 'CPF não informado'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {patient.dateOfBirth 
                        ? `${calculateAge(patient.dateOfBirth)} anos (${formatDateForDisplay(patient.dateOfBirth)})`
                        : 'Data não informada'
                      }
                    </span>
                  </div>
                  {patient.gender && (
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="capitalize">{patient.gender}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            {(patient.patientProfile?.emergencyContactName || patient.patientProfile?.emergencyContactPhone) && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Contato de Emergência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {patient.patientProfile?.emergencyContactName && (
                    <div className="flex items-center text-sm">
                      <User className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{patient.patientProfile.emergencyContactName}</span>
                    </div>
                  )}
                  {patient.patientProfile?.emergencyContactPhone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{patient.patientProfile.emergencyContactPhone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Patient Details */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="appointments" className="space-y-4">
              <TabsList>
                <TabsTrigger value="appointments">Consultas</TabsTrigger>
                <TabsTrigger value="medical">Informações Médicas</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>

              {/* Appointments Tab */}
              <TabsContent value="appointments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Consultas
                    </CardTitle>
                    <CardDescription>
                      Histórico de consultas do paciente
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {patient.appointments && patient.appointments.length > 0 ? (
                      <div className="space-y-4">
                        {patient.appointments.slice(0, 10).map((appointment) => (
                          <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                                <Calendar className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <p className="font-medium">
                                  {appointment.specialty?.name || 'Especialidade não informada'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {appointment.doctor?.user.fullName || 'Médico não informado'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(appointment.scheduledAt).toLocaleString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            {getAppointmentStatusBadge(appointment.status)}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">Nenhuma consulta encontrada</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Medical Information Tab */}
              <TabsContent value="medical" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Allergies */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                        Alergias
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patient.patientProfile?.allergies && patient.patientProfile.allergies.length > 0 ? (
                        <div className="space-y-2">
                          {patient.patientProfile.allergies.map((allergy, index) => (
                            <Badge key={index} variant="destructive" className="mr-2">
                              {allergy}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Nenhuma alergia registrada</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Medications */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-lg">
                        <Heart className="h-5 w-5 mr-2 text-green-500" />
                        Medicamentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patient.patientProfile?.medications && patient.patientProfile.medications.length > 0 ? (
                        <div className="space-y-2">
                          {patient.patientProfile.medications.map((medication, index) => (
                            <Badge key={index} variant="secondary" className="mr-2">
                              {medication}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Nenhum medicamento registrado</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* History Tab */}
              <TabsContent value="history" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Activity className="h-5 w-5 mr-2" />
                      Histórico de Atividades
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-3 p-3 border-l-4 border-blue-500 bg-blue-50">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <div>
                          <p className="text-sm font-medium">Paciente cadastrado</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(patient.createdAt).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      
                      {patient.appointments && patient.appointments.length > 0 && (
                        <div className="flex items-center space-x-3 p-3 border-l-4 border-green-500 bg-green-50">
                          <Calendar className="h-4 w-4 text-green-600" />
                          <div>
                            <p className="text-sm font-medium">Primeira consulta</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(patient.appointments[patient.appointments.length - 1].scheduledAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}