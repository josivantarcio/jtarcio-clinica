'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, Phone, Mail, Calendar, MapPin, Heart, AlertTriangle } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from '@/hooks/use-toast'
import { validateCPF, formatCPF, cleanCPF } from '@/lib/cpf-validation'

interface PatientForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  cpf: string
  dateOfBirth: string
  gender: string
  emergencyContactName: string
  emergencyContactPhone: string
  allergies: string
  medications: string
  address: {
    street: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
}

const initialForm: PatientForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  cpf: '',
  dateOfBirth: '',
  gender: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  allergies: '',
  medications: '',
  address: {
    street: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: ''
  }
}

export default function NewPatientPage() {
  const { user, isAuthenticated } = useAuthStore()
  const router = useRouter()
  const [form, setForm] = useState<PatientForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [cpfError, setCpfError] = useState('')
  const [checkingCpf, setCheckingCpf] = useState(false)

  if (!isAuthenticated) {
    router.push('/auth/login')
    return null
  }

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.split('.')[1]
      setForm(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }))
    } else if (field === 'cpf') {
      // Format CPF and validate
      const formattedCpf = formatCPF(value)
      setForm(prev => ({
        ...prev,
        cpf: formattedCpf
      }))
      
      // Debounce CPF validation
      const timeoutId = setTimeout(() => {
        checkCpfDuplicate(formattedCpf)
      }, 500)
      
      return () => clearTimeout(timeoutId)
    } else {
      setForm(prev => ({
        ...prev,
        [field]: value
      }))
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
        setCpfError(`CPF já cadastrado para: ${existingUser.fullName} (${existingUser.email})`)
      }
    } catch (error) {
      console.error('Error checking CPF:', error)
    } finally {
      setCheckingCpf(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate CPF before submitting
    if (form.cpf && !validateCPF(form.cpf)) {
      setCpfError('CPF inválido')
      toast({
        title: "Erro",
        description: "CPF informado é inválido.",
        variant: "destructive"
      })
      return
    }

    // Check for CPF errors
    if (cpfError) {
      toast({
        title: "Erro",
        description: "Corrija os erros antes de continuar.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const patientData = {
        ...form,
        cpf: form.cpf ? cleanCPF(form.cpf) : '',
        role: 'PATIENT',
        password: 'TempPassword123!', // Temporary password - should be changed on first login
        allergies: form.allergies ? form.allergies.split(',').map(a => a.trim()) : [],
        medications: form.medications ? form.medications.split(',').map(m => m.trim()) : []
      }

      const response = await apiClient.post('/api/v1/users', patientData)
      
      if (!response.success) {
        throw new Error(response.error?.message || 'Erro ao criar paciente')
      }
      
      toast({
        title: "Sucesso!",
        description: "Paciente cadastrado com sucesso.",
      })
      
      router.push('/patients')
    } catch (error: any) {
      console.error('Error creating patient:', error)
      toast({
        title: "Erro",
        description: error.response?.data?.message || "Erro ao cadastrar paciente.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Novo Paciente</h1>
              <p className="text-muted-foreground">
                Cadastre um novo paciente no sistema
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Informações Pessoais
              </CardTitle>
              <CardDescription>
                Dados básicos do paciente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome *</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Digite o nome"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome *</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Digite o sobrenome"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="exemplo@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={form.cpf}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    className={cpfError ? 'border-red-500' : ''}
                    required
                  />
                  {checkingCpf && (
                    <p className="text-sm text-blue-600 mt-1">Verificando CPF...</p>
                  )}
                  {cpfError && (
                    <p className="text-sm text-red-600 mt-1">{cpfError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Data de Nascimento *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo *</Label>
                  <Select onValueChange={(value) => handleInputChange('gender', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                      <SelectItem value="O">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Nome do Contato</Label>
                  <Input
                    id="emergencyContactName"
                    value={form.emergencyContactName}
                    onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Telefone do Contato</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={form.emergencyContactPhone}
                    onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Rua/Avenida</Label>
                <Input
                  id="street"
                  value={form.address.street}
                  onChange={(e) => handleInputChange('address.street', e.target.value)}
                  placeholder="Rua das Flores, 123"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input
                    id="neighborhood"
                    value={form.address.neighborhood}
                    onChange={(e) => handleInputChange('address.neighborhood', e.target.value)}
                    placeholder="Centro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={form.address.city}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input
                    id="state"
                    value={form.address.state}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    placeholder="SP"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  value={form.address.zipCode}
                  onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                  placeholder="01234-567"
                />
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
              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias</Label>
                <Textarea
                  id="allergies"
                  value={form.allergies}
                  onChange={(e) => handleInputChange('allergies', e.target.value)}
                  placeholder="Digite as alergias separadas por vírgula (ex: Penicilina, Dipirona)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medications">Medicamentos em Uso</Label>
                <Textarea
                  id="medications"
                  value={form.medications}
                  onChange={(e) => handleInputChange('medications', e.target.value)}
                  placeholder="Digite os medicamentos separados por vírgula (ex: Losartana 50mg, Metformina 500mg)"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Cadastrar Paciente
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}