'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft,
  Mail, 
  Phone, 
  Calendar,
  Stethoscope,
  Clock,
  Star,
  User,
  GraduationCap,
  Award,
  Users,
  Edit,
  MapPin
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { Doctor } from '@/types'

interface DoctorWithStats extends Doctor {
  totalPatients: number
  totalAppointments: number
  rating: number
  reviewsCount: number
  status: 'active' | 'inactive' | 'vacation'
  specialtyNames: string[]
}

export default function DoctorProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const [doctor, setDoctor] = useState<DoctorWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
    if (user && isAuthenticated && params.id) {
      // Check if user has permission to view doctor profiles
      if (!['ADMIN', 'RECEPTIONIST', 'DOCTOR'].includes(user.role)) {
        router.push('/dashboard')
        return
      }
      loadDoctor(params.id as string)
    }
  }, [user, isAuthenticated, params.id])

  const loadDoctor = async (doctorId: string) => {
    setLoading(true)
    try {
      const response = await apiClient.getDoctors()
      if (response.success && response.data) {
        // Find the doctor by ID
        const doctorsData = response.data
          .filter((user: any) => user.doctorProfile) 
          .map((user: any) => {
            const doctorProfile = user.doctorProfile
            return {
              id: doctorProfile.id,
              userId: user.id,
              user: {
                id: user.id,
                email: user.email,
                name: user.fullName,
                role: user.role,
                avatar: user.avatar,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt
              },
              crm: doctorProfile.crm,
              specialtyId: doctorProfile.specialty?.id || '',
              specialty: doctorProfile.specialty,
              subSpecialties: doctorProfile.subSpecialties || [],
              biography: doctorProfile.biography,
              experience: doctorProfile.experience,
              consultationFee: doctorProfile.consultationFee,
              consultationDuration: doctorProfile.consultationDuration || 30,
              isActive: doctorProfile.isActive,
              acceptsNewPatients: doctorProfile.acceptsNewPatients,
              phone: user.phone,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              totalPatients: 0,
              totalAppointments: 0,
              rating: 0, // Start with 0 stars instead of 5
              reviewsCount: 0,
              status: doctorProfile.isActive ? 'active' : 'inactive',
              specialtyNames: doctorProfile.specialty ? [doctorProfile.specialty.name] : []
            }
          })

        const foundDoctor = doctorsData.find((d: any) => d.id === doctorId || d.userId === doctorId)
        
        if (foundDoctor) {
          setDoctor(foundDoctor)
          setNotFound(false)
        } else {
          setNotFound(true)
        }
      } else {
        setNotFound(true)
      }
    } catch (error) {
      console.error('Error loading doctor:', error)
      setNotFound(true)
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
          <p className="mt-2 text-muted-foreground">Carregando perfil do médico...</p>
        </div>
      </div>
    )
  }

  if (notFound || !doctor) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Médico não encontrado</h3>
            <p className="text-muted-foreground mb-4">
              O médico que você está procurando não existe ou foi removido.
            </p>
            <Button onClick={() => router.push('/doctors')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Médicos
            </Button>
          </div>
        </div>
      </AppLayout>
    )
  }

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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => router.push('/doctors')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Perfil do Médico
              </h1>
              <p className="text-muted-foreground">
                Informações detalhadas do profissional
              </p>
            </div>
          </div>
          <Button onClick={() => router.push(`/doctors/${params.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Perfil
          </Button>
        </div>

        {/* Doctor Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={doctor.user.avatar} />
                    <AvatarFallback className="text-2xl font-semibold">
                      {(() => {
                        const names = (doctor.user.name || '').trim().split(' ').filter(n => n.length > 0)
                        if (names.length >= 2) {
                          return (names[0][0] + names[names.length - 1][0]).toUpperCase()
                        }
                        return names[0] ? names[0][0].toUpperCase() : 'DR'
                      })()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold">{doctor.user.name}</h2>
                      {getStatusBadge(doctor.status)}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <Award className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-600">
                          {doctor.specialty?.name || 'Especialidade não definida'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          CRM: {doctor.crm}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      {renderRatingStars(doctor.rating)}
                      <span className="ml-2 text-sm text-muted-foreground">
                        {doctor.rating.toFixed(1)} ({doctor.reviewsCount} avaliações)
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {doctor.biography && (
                  <div>
                    <h3 className="font-semibold mb-2">Sobre o Médico</h3>
                    <p className="text-muted-foreground">{doctor.biography}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{doctor.user.email}</span>
                  </div>
                  {doctor.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{doctor.phone}</span>
                    </div>
                  )}
                  {doctor.experience && (
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Experiência: {doctor.experience}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">Pacientes</span>
                  </div>
                  <span className="font-medium">{doctor.totalPatients}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-green-600" />
                    <span className="text-sm">Consultas</span>
                  </div>
                  <span className="font-medium">{doctor.totalAppointments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Duração</span>
                  </div>
                  <span className="font-medium">{doctor.consultationDuration} min</span>
                </div>
                {doctor.consultationFee && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">💰 Valor</span>
                    </div>
                    <span className="font-medium">R$ {doctor.consultationFee}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" onClick={() => router.push(`/schedule?doctorId=${doctor.id}`)}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Ver Agenda
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/appointments/new')}>
                  <Calendar className="h-4 w-4 mr-2" />
                  Nova Consulta
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push(`/doctors/${params.id}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Perfil
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}