'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Save,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  FileText,
  Heart,
  Shield,
  AlertTriangle
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'
import { validateCPF, formatCPF, cleanCPF } from '@/lib/cpf-validation'

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
  patientProfile?: {
    emergencyContactName?: string
    emergencyContactPhone?: string
    allergies: string[]
    medications: string[]
    address?: any
  }
}

export default function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [patient, setPatient] = useState<PatientData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [cpfError, setCpfError] = useState('')
  const [checkingCpf, setCheckingCpf] = useState(false)
  const [cpfLocked, setCpfLocked] = useState(false)
  const [originalCpf, setOriginalCpf] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cpf: '',
    dateOfBirth: '',
    gender: '',
    status: 'ACTIVE',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    medications: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: ''
    }
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
        const patientData = response.data
        setPatient(patientData)
        
        // Store original CPF and check if should be locked
        const currentCpf = patientData.cpf || ''
        setOriginalCpf(currentCpf)
        setCpfLocked(!!currentCpf) // Lock CPF if it already exists

        // Populate form with patient data
        setFormData({
          firstName: patientData.firstName || '',
          lastName: patientData.lastName || '',
          email: patientData.email || '',
          phone: patientData.phone || '',
          cpf: currentCpf,
          dateOfBirth: patientData.dateOfBirth ? patientData.dateOfBirth.split('T')[0] : '','
          gender: patientData.gender || '',
          status: patientData.status || 'ACTIVE',
          emergencyContactName: patientData.patientProfile?.emergencyContactName || '',
          emergencyContactPhone: patientData.patientProfile?.emergencyContactPhone || '',
          allergies: patientData.patientProfile?.allergies?.join(', ') || '',
          medications: patientData.patientProfile?.medications?.join(', ') || '',
          address: {
            street: patientData.patientProfile?.address?.street || '',
            number: patientData.patientProfile?.address?.number || '',
            complement: patientData.patientProfile?.address?.complement || '',
            neighborhood: patientData.patientProfile?.address?.neighborhood || '',
            city: patientData.patientProfile?.address?.city || '',
            state: patientData.patientProfile?.address?.state || '',
            zipCode: patientData.patientProfile?.address?.zipCode || ''
          }
        })
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

  const handleSave = async () => {
    // Validar CPF antes de salvar
    if (formData.cpf && !validateCPF(formData.cpf)) {
      setCpfError('CPF inválido')
      toast.error('CPF informado é inválido')
      return
    }

    // Verificar se há erro de CPF antes de salvar
    if (cpfError) {
      toast.error('Corrija os erros antes de salvar')
      return
    }

    setSaving(true)
    try {
      // Update user data including patient profile data
      const userUpdateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
        cpf: formData.cpf ? cleanCPF(formData.cpf) : null,
        dateOfBirth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString() : null,
        gender: formData.gender,
        status: formData.status,
        // Adicionar dados do perfil de paciente
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        allergies: formData.allergies,
        medications: formData.medications,
        address: {
          street: formData.address.street,
          number: formData.address.number,
          complement: formData.address.complement,
          neighborhood: formData.address.neighborhood,
          city: formData.address.city,
          state: formData.address.state,
          zipCode: formData.address.zipCode
        }
      }

      const response = await apiClient.request({
        method: 'PATCH',
        url: `/api/v1/users/${id}`,
        data: userUpdateData
      })

      if (response.success) {
        toast.success('Paciente atualizado com sucesso!')
        // Lock CPF after successful save if it wasn't already locked
        if (formData.cpf && !cpfLocked) {
          setCpfLocked(true)
          setOriginalCpf(formData.cpf)
        }
        router.push('/patients')
      } else {
        throw new Error(response.error?.message || 'Erro ao atualizar paciente')
      }
    } catch (error) {
      console.error('Error saving patient:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar paciente')
    } finally {
      setSaving(false)
    }
  }

  const checkCpfDuplicate = async (cpf: string) => {
    if (!cpf) {
      setCpfError('')
      return
    }

    const cleanedCpf = cleanCPF(cpf)
    if (cleanedCpf.length < 11) {
      setCpfError('')
      return
    }

    // First validate CPF format
    if (!validateCPF(cleanedCpf)) {
      setCpfError('CPF inválido')
      return
    }

    setCheckingCpf(true)
    setCpfError('')
    
    try {
      const response = await apiClient.request({
        method: 'GET',
        url: `/api/v1/users/check-cpf/${cleanedCpf}`
      })
      
      if (response.success && response.data.exists) {
        const existingUser = response.data.user
        // Só mostrar erro se for um usuário diferente do atual
        if (existingUser.id !== id) {
          setCpfError(`CPF já cadastrado para: ${existingUser.fullName} (${existingUser.email})`)
        }
      }
    } catch (error) {
      console.error('Error checking CPF:', error)
    } finally {
      setCheckingCpf(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '')
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))

      // Verificar CPF duplicado quando o campo CPF for alterado
      if (field === 'cpf') {
        // Format CPF as user types
        const formattedCpf = formatCPF(value)
        setFormData(prev => ({
          ...prev,
          cpf: formattedCpf
        }))
        
        // Debounce the CPF check
        const timeoutId = setTimeout(() => {
          checkCpfDuplicate(formattedCpf)
        }, 500)
        
        // Clear previous timeout
        return () => clearTimeout(timeoutId)
      }
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
              <h1 className="text-2xl font-bold tracking-tight">Editar Paciente</h1>
              <p className="text-muted-foreground">
                Editando dados de {patient.fullName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(patient.status)}
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Informações Básicas
                </CardTitle>
                <CardDescription>
                  Dados pessoais do paciente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nome</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Nome do paciente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Sobrenome</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Sobrenome do paciente"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      value={formData.cpf}
                      onChange={(e) => !cpfLocked && handleInputChange('cpf', e.target.value)}
                      placeholder="000.000.000-00"
                      className={cpfError ? 'border-red-500' : cpfLocked ? 'bg-gray-100' : ''}
                      disabled={cpfLocked}
                    />
                    {cpfLocked && (
                      <p className="text-xs text-blue-600 mt-1 flex items-center">
                        <Shield className="h-3 w-3 mr-1" />
                        CPF bloqueado para edição
                      </p>
                    )}
                    {checkingCpf && (
                      <p className="text-sm text-blue-600 mt-1">Verificando CPF...</p>
                    )}
                    {cpfError && (
                      <p className="text-sm text-red-600 mt-1">{cpfError}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="dateOfBirth">Data de Nascimento</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="gender">Gênero</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => handleInputChange('gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Ativo</SelectItem>
                      <SelectItem value="INACTIVE">Inativo</SelectItem>
                      <SelectItem value="SUSPENDED">Suspenso</SelectItem>
                      <SelectItem value="PENDING_VERIFICATION">Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Phone className="h-5 w-5 mr-2" />
                  Contato de Emergência
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyContactName">Nome</Label>
                    <Input
                      id="emergencyContactName"
                      value={formData.emergencyContactName}
                      onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                      placeholder="Nome do contato de emergência"
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyContactPhone">Telefone</Label>
                    <Input
                      id="emergencyContactPhone"
                      value={formData.emergencyContactPhone}
                      onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Medical Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Heart className="h-5 w-5 mr-2" />
                  Informações Médicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="allergies">Alergias</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => handleInputChange('allergies', e.target.value)}
                    placeholder="Lista de alergias separadas por vírgula"
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="medications">Medicamentos</Label>
                  <Textarea
                    id="medications"
                    value={formData.medications}
                    onChange={(e) => handleInputChange('medications', e.target.value)}
                    placeholder="Lista de medicamentos separados por vírgula"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2" />
                  Endereço
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="street">Rua/Logradouro</Label>
                    <Input
                      id="street"
                      value={formData.address.street}
                      onChange={(e) => handleInputChange('address.street', e.target.value)}
                      placeholder="Ex: Rua das Flores, 123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="number">Número</Label>
                    <Input
                      id="number"
                      value={formData.address.number}
                      onChange={(e) => handleInputChange('address.number', e.target.value)}
                      placeholder="Ex: 123"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="complement">Complemento</Label>
                    <Input
                      id="complement"
                      value={formData.address.complement}
                      onChange={(e) => handleInputChange('address.complement', e.target.value)}
                      placeholder="Ex: Apto 101, Bloco B"
                    />
                  </div>
                  <div>
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input
                      id="neighborhood"
                      value={formData.address.neighborhood}
                      onChange={(e) => handleInputChange('address.neighborhood', e.target.value)}
                      placeholder="Ex: Centro"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade</Label>
                    <Input
                      id="city"
                      value={formData.address.city}
                      onChange={(e) => handleInputChange('address.city', e.target.value)}
                      placeholder="Ex: São Paulo"
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">Estado</Label>
                    <Select 
                      value={formData.address.state} 
                      onValueChange={(value) => handleInputChange('address.state', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AC">Acre</SelectItem>
                        <SelectItem value="AL">Alagoas</SelectItem>
                        <SelectItem value="AP">Amapá</SelectItem>
                        <SelectItem value="AM">Amazonas</SelectItem>
                        <SelectItem value="BA">Bahia</SelectItem>
                        <SelectItem value="CE">Ceará</SelectItem>
                        <SelectItem value="DF">Distrito Federal</SelectItem>
                        <SelectItem value="ES">Espírito Santo</SelectItem>
                        <SelectItem value="GO">Goiás</SelectItem>
                        <SelectItem value="MA">Maranhão</SelectItem>
                        <SelectItem value="MT">Mato Grosso</SelectItem>
                        <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                        <SelectItem value="MG">Minas Gerais</SelectItem>
                        <SelectItem value="PA">Pará</SelectItem>
                        <SelectItem value="PB">Paraíba</SelectItem>
                        <SelectItem value="PR">Paraná</SelectItem>
                        <SelectItem value="PE">Pernambuco</SelectItem>
                        <SelectItem value="PI">Piauí</SelectItem>
                        <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                        <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                        <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                        <SelectItem value="RO">Rondônia</SelectItem>
                        <SelectItem value="RR">Roraima</SelectItem>
                        <SelectItem value="SC">Santa Catarina</SelectItem>
                        <SelectItem value="SP">São Paulo</SelectItem>
                        <SelectItem value="SE">Sergipe</SelectItem>
                        <SelectItem value="TO">Tocantins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="zipCode">CEP</Label>
                    <Input
                      id="zipCode"
                      value={formData.address.zipCode}
                      onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                      placeholder="Ex: 01000-000"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Patient Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Paciente</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{patient.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{patient.email}</p>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{patient.phone || 'Não informado'}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {patient.dateOfBirth 
                        ? new Date(patient.dateOfBirth + 'T00:00:00').toLocaleDateString('pt-BR')
                        : 'Data não informada'
                      }
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>{getStatusBadge(patient.status)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => router.push(`/patients/${patient.id}`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Histórico
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Nova Consulta
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}