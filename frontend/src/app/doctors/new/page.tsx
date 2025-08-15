'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Save, User, Stethoscope, GraduationCap, Phone, Mail, FileText, X, Plus } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

const newDoctorSchema = z.object({
  firstName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  crm: z.string().min(5, 'CRM é obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().optional().refine(
    (cpf) => {
      if (!cpf) return true; // CPF é opcional
      // Remove formatação
      const cleanCpf = cpf.replace(/\D/g, '');
      return cleanCpf.length === 11;
    },
    { message: 'CPF deve ter 11 dígitos' }
  ),
  specialtyId: z.string().min(1, 'Especialidade principal é obrigatória'),
  subSpecialties: z.array(z.string()).optional(),
  graduationDate: z.string().min(1, 'Data de graduação é obrigatória'),
  crmRegistrationDate: z.string().optional(),
  education: z.string().optional(),
  bio: z.string().optional(),
  consultationFee: z.string().optional()
})

type NewDoctorForm = z.infer<typeof newDoctorSchema>

// Componente para seleção de especialidades
function SpecialtySelect({ onValueChange, error }: { onValueChange: (value: string) => void, error?: any }) {
  const [specialties, setSpecialties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await apiClient.getSpecialties()
        if (response.success && response.data) {
          setSpecialties(response.data)
        }
      } catch (error) {
        console.error('Error loading specialties:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSpecialties()
  }, [])

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Carregando especialidades..." />
        </SelectTrigger>
      </Select>
    )
  }

  return (
    <Select onValueChange={onValueChange}>
      <SelectTrigger className={error ? 'border-red-500' : ''}>
        <SelectValue placeholder="Selecione a especialidade" />
      </SelectTrigger>
      <SelectContent>
        {specialties.map((specialty) => (
          <SelectItem key={specialty.id} value={specialty.id}>
            {specialty.name} - {specialty.duration}min - R$ {specialty.price?.toFixed(2)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// Componente para seleção múltipla de subespecialidades
function SubSpecialtiesSelect({ 
  selectedSubSpecialties, 
  onSubSpecialtiesChange, 
  mainSpecialtyId 
}: { 
  selectedSubSpecialties: string[], 
  onSubSpecialtiesChange: (subs: string[]) => void,
  mainSpecialtyId?: string
}) {
  const [specialties, setSpecialties] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const response = await apiClient.getSpecialties()
        if (response.success && response.data) {
          // Filtra para excluir a especialidade principal
          const filteredSpecialties = response.data.filter(
            (specialty: any) => specialty.id !== mainSpecialtyId
          )
          setSpecialties(filteredSpecialties)
        }
      } catch (error) {
        console.error('Error loading specialties:', error)
      } finally {
        setLoading(false)
      }
    }
    loadSpecialties()
  }, [mainSpecialtyId])

  const addSubSpecialty = (specialtyId: string) => {
    if (!selectedSubSpecialties.includes(specialtyId)) {
      onSubSpecialtiesChange([...selectedSubSpecialties, specialtyId])
    }
  }

  const removeSubSpecialty = (specialtyId: string) => {
    onSubSpecialtiesChange(selectedSubSpecialties.filter(id => id !== specialtyId))
  }

  const availableSpecialties = specialties.filter(
    specialty => !selectedSubSpecialties.includes(specialty.id)
  )

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando subespecialidades...</div>
  }

  return (
    <div className="space-y-3">
      {/* Especialidades selecionadas */}
      {selectedSubSpecialties.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Subespecializações Selecionadas:</div>
          <div className="flex flex-wrap gap-2">
            {selectedSubSpecialties.map(specialtyId => {
              const specialty = specialties.find(s => s.id === specialtyId)
              return (
                <div
                  key={specialtyId}
                  className="flex items-center bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm border border-green-200"
                >
                  <span>{specialty?.name || 'Especialidade'}</span>
                  <button
                    type="button"
                    onClick={() => removeSubSpecialty(specialtyId)}
                    className="ml-2 hover:text-green-900 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Seletor para adicionar nova subespecialização */}
      {availableSpecialties.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Adicionar Subespecialização:</div>
          <Select onValueChange={addSubSpecialty}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma subespecialização adicional" />
            </SelectTrigger>
            <SelectContent>
              {availableSpecialties.map((specialty) => (
                <SelectItem key={specialty.id} value={specialty.id}>
                  <div className="flex items-center space-x-2">
                    <Plus className="h-3 w-3 text-green-600" />
                    <span>{specialty.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({specialty.duration}min - R$ {specialty.price?.toFixed(2)})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {selectedSubSpecialties.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Nenhuma subespecialização selecionada. Você pode adicionar especialidades complementares.
        </div>
      )}
    </div>
  )
}

export default function NewDoctorPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('')
  const [selectedSubSpecialties, setSelectedSubSpecialties] = useState<string[]>([])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset
  } = useForm<NewDoctorForm>({
    resolver: zodResolver(newDoctorSchema)
  })

  useEffect(() => {
    useAuthStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (user && isAuthenticated) {
      // Check if user has permission to add doctors
      if (!['ADMIN'].includes(user.role)) {
        router.push('/doctors')
        return
      }
    }
  }, [user, isAuthenticated, router])

  const onSubmit = async (data: NewDoctorForm) => {
    setSaving(true)
    try {
      const response = await apiClient.createDoctor({
        user: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: data.password,
          role: 'DOCTOR'
        },
        crm: data.crm,
        phone: data.phone,
        cpf: data.cpf,
        specialtyId: data.specialtyId,
        subSpecialties: selectedSubSpecialties,
        graduationDate: data.graduationDate,
        education: data.education || '',
        bio: data.bio || '',
        consultationFee: data.consultationFee
      })

      if (response.success) {
        toast({
          title: "Sucesso!",
          description: "Médico cadastrado com sucesso.",
        })
        router.push('/doctors')
      } else {
        toast({
          title: "Erro",
          description: response.error?.message || "Erro ao cadastrar médico.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error creating doctor:', error)
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Show loading while checking auth
  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/doctors')}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Novo Médico
            </h1>
            <p className="text-muted-foreground">
              Cadastre um novo profissional na equipe médica
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nome *</Label>
                      <Input
                        id="firstName"
                        placeholder="Nome"
                        {...register('firstName')}
                        className={errors.firstName ? 'border-red-500' : ''}
                      />
                      {errors.firstName && (
                        <p className="text-sm text-red-500">{errors.firstName.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Sobrenome *</Label>
                      <Input
                        id="lastName"
                        placeholder="Sobrenome"
                        {...register('lastName')}
                        className={errors.lastName ? 'border-red-500' : ''}
                      />
                      {errors.lastName && (
                        <p className="text-sm text-red-500">{errors.lastName.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="medico@eoclinica.com.br"
                        {...register('email')}
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-500">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Senha Temporária *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Senha de primeiro acesso"
                        {...register('password')}
                        className={errors.password ? 'border-red-500' : ''}
                      />
                      {errors.password && (
                        <p className="text-sm text-red-500">{errors.password.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        O médico poderá alterar a senha no primeiro login
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        placeholder="(11) 99999-9999"
                        {...register('phone')}
                        className={errors.phone ? 'border-red-500' : ''}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-500">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        placeholder="000.000.000-00"
                        {...register('cpf')}
                      />
                    </div>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="crm">CRM *</Label>
                      <Input
                        id="crm"
                        placeholder="CRM-SP 123456"
                        {...register('crm')}
                        className={errors.crm ? 'border-red-500' : ''}
                      />
                      {errors.crm && (
                        <p className="text-sm text-red-500">{errors.crm.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="consultationFee">Valor da Consulta (R$)</Label>
                      <Input
                        id="consultationFee"
                        type="number"
                        step="0.01"
                        placeholder="150.00"
                        {...register('consultationFee')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialtyId">Especialidade Principal *</Label>
                    <SpecialtySelect 
                      onValueChange={(value) => {
                        setValue('specialtyId', value)
                        setSelectedSpecialtyId(value)
                        // Remove especialidade principal das subespecializações se estiver lá
                        setSelectedSubSpecialties(prev => prev.filter(id => id !== value))
                      }}
                      error={errors.specialtyId}
                    />
                    {errors.specialtyId && (
                      <p className="text-sm text-red-500">{errors.specialtyId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Subespecializações (Opcionais)</Label>
                    <div className="p-4 border rounded-lg bg-gray-50/50">
                      <SubSpecialtiesSelect
                        selectedSubSpecialties={selectedSubSpecialties}
                        onSubSpecialtiesChange={setSelectedSubSpecialties}
                        mainSpecialtyId={selectedSpecialtyId}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Adicione especialidades complementares que o médico também atende
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="graduationDate">Data de Graduação *</Label>
                    <Input
                      id="graduationDate"
                      type="date"
                      {...register('graduationDate')}
                      className={errors.graduationDate ? 'border-red-500' : ''}
                    />
                    {errors.graduationDate && (
                      <p className="text-sm text-red-500">{errors.graduationDate.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      A partir desta data será calculado automaticamente o tempo de experiência
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="education">Formação</Label>
                    <Input
                      id="education"
                      placeholder="Ex: USP - Medicina, Especialização em Cardiologia"
                      {...register('education')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografia Profissional</Label>
                    <Textarea
                      id="bio"
                      placeholder="Breve descrição do perfil profissional do médico..."
                      className="min-h-[100px]"
                      {...register('bio')}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Form Actions */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/doctors')}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Cadastrar Médico
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>

          {/* Sidebar with Info */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <FileText className="h-5 w-5 mr-2" />
                  Informações Importantes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Acesso ao Sistema</h4>
                  <p className="text-muted-foreground">
                    Após o cadastro, o médico receberá as credenciais por email e poderá 
                    acessar o sistema com perfil médico.
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Permissões</h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Gerenciar agenda pessoal</li>
                    <li>• Visualizar pacientes</li>
                    <li>• Registrar consultas</li>
                    <li>• Acessar relatórios próprios</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Especialidades</h4>
                  <ul className="text-muted-foreground space-y-1 text-sm">
                    <li>• <strong>Principal:</strong> Especialidade obrigatória do médico</li>
                    <li>• <strong>Subespecializações:</strong> Áreas complementares (opcionais)</li>
                    <li>• Todas aparecerão no agendamento online</li>
                    <li>• Podem ser alteradas após cadastro</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Configurações</h4>
                  <p className="text-muted-foreground">
                    O médico poderá configurar horários de atendimento e 
                    perfil após o primeiro acesso.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground py-4">
          <p>&copy; 2025 Jtarcio Desenvolvimento. Todos os direitos reservados.</p>
        </footer>
      </div>
    </AppLayout>
  )
}