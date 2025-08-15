'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowLeft,
  Save,
  User,
  Stethoscope,
  Calendar
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { calculateExperience, formatExperience, formatDateForInput, formatDateForAPI } from '@/lib/date-utils'

export default function EditDoctorPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notFound, setNotFound] = useState(false)
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    crm: '',
    specialtyId: '',
    graduationDate: '',
    crmRegistrationDate: '',
    biography: '',
    consultationFee: '',
    consultationDuration: 30,
    acceptsNewPatients: true
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
    if (user && isAuthenticated && params.id) {
      // Check if user has permission to edit doctor profiles
      if (!['ADMIN', 'RECEPTIONIST'].includes(user.role)) {
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
        const doctorsData = response.data.filter((user: any) => user.doctorProfile)
        const foundDoctor = doctorsData.find((d: any) => 
          d.doctorProfile.id === doctorId || d.id === doctorId
        )
        
        if (foundDoctor) {
          const doctor = foundDoctor.doctorProfile
          setFormData({
            firstName: foundDoctor.firstName || '',
            lastName: foundDoctor.lastName || '',
            email: foundDoctor.email || '',
            phone: foundDoctor.phone || '',
            crm: doctor.crm || '',
            specialtyId: doctor.specialtyId || '',
            graduationDate: formatDateForInput(doctor.graduationDate),
            crmRegistrationDate: formatDateForInput(doctor.crmRegistrationDate),
            biography: doctor.biography || '',
            consultationFee: doctor.consultationFee?.toString() || '',
            consultationDuration: doctor.consultationDuration || 30,
            acceptsNewPatients: doctor.acceptsNewPatients ?? true
          })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Here you would implement the actual update logic
      // For now, just simulate a save
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      alert('Perfil do médico atualizado com sucesso!')
      router.push(`/doctors/${params.id}`)
    } catch (error) {
      console.error('Error saving doctor:', error)
      alert('Erro ao salvar o perfil do médico')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Show loading while checking auth
  if (isLoading || !isAuthenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando dados do médico...</p>
        </div>
      </div>
    )
  }

  if (notFound) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted mx-auto mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Médico não encontrado</h3>
            <p className="text-muted-foreground mb-4">
              O médico que você está tentando editar não existe ou foi removido.
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

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push(`/doctors/${params.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Editar Médico
            </h1>
            <p className="text-muted-foreground">
              Atualize as informações do profissional
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informações Pessoais
                </CardTitle>
                <CardDescription>
                  Dados básicos do médico
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Professional Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Stethoscope className="h-5 w-5 mr-2" />
                  Informações Profissionais
                </CardTitle>
                <CardDescription>
                  Dados médicos e especialização
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="crm">CRM</Label>
                  <Input
                    id="crm"
                    type="text"
                    value={formData.crm}
                    onChange={(e) => handleInputChange('crm', e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="graduationDate">Data de Formatura</Label>
                  <Input
                    id="graduationDate"
                    type="date"
                    value={formData.graduationDate}
                    onChange={(e) => handleInputChange('graduationDate', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="crmRegistrationDate">Data de Registro CRM</Label>
                  <Input
                    id="crmRegistrationDate"
                    type="date"
                    value={formData.crmRegistrationDate}
                    onChange={(e) => handleInputChange('crmRegistrationDate', e.target.value)}
                  />
                </div>

                {(formData.graduationDate || formData.crmRegistrationDate) && (
                  <div className="p-4 bg-muted rounded-lg">
                    <Label className="text-sm font-medium">Experiência Calculada</Label>
                    <p className="text-lg font-semibold text-primary mt-1">
                      {formatExperience(
                        calculateExperience(formData.graduationDate, formData.crmRegistrationDate)
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Calculado automaticamente com base na data mais recente
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="consultationFee">Valor da Consulta (R$)</Label>
                    <Input
                      id="consultationFee"
                      type="number"
                      step="0.01"
                      value={formData.consultationFee}
                      onChange={(e) => handleInputChange('consultationFee', e.target.value)}
                      placeholder="150.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="consultationDuration">Duração (minutos)</Label>
                    <Input
                      id="consultationDuration"
                      type="number"
                      value={formData.consultationDuration}
                      onChange={(e) => handleInputChange('consultationDuration', parseInt(e.target.value))}
                      min="15"
                      max="120"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Biography */}
          <Card>
            <CardHeader>
              <CardTitle>Biografia</CardTitle>
              <CardDescription>
                Informações sobre a formação e experiência do médico
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.biography}
                onChange={(e) => handleInputChange('biography', e.target.value)}
                placeholder="Descreva a formação, especialidades, experiência e outras informações relevantes..."
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.push(`/doctors/${params.id}`)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}