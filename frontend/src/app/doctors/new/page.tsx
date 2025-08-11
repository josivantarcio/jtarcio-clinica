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
import { ArrowLeft, Save, User, Stethoscope, GraduationCap, Phone, Mail, FileText } from 'lucide-react'
import { apiClient } from '@/lib/api'
import { toast } from '@/hooks/use-toast'

const newDoctorSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  crm: z.string().min(5, 'CRM é obrigatório'),
  phone: z.string().min(10, 'Telefone inválido'),
  specialty: z.string().min(1, 'Especialidade é obrigatória'),
  experience: z.string().optional(),
  education: z.string().optional(),
  bio: z.string().optional()
})

type NewDoctorForm = z.infer<typeof newDoctorSchema>

const specialties = [
  'Cardiologia',
  'Dermatologia', 
  'Ortopedia',
  'Pediatria',
  'Neurologia',
  'Ginecologia',
  'Psiquiatria',
  'Oftalmologia',
  'Otorrinolaringologia',
  'Urologia',
  'Endocrinologia',
  'Gastroenterologia',
  'Pneumologia',
  'Reumatologia',
  'Oncologia',
  'Clínico Geral'
]

export default function NewDoctorPage() {
  const { user, isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

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
          name: data.name,
          email: data.email,
          password: data.password,
          role: 'DOCTOR'
        },
        crm: data.crm,
        phone: data.phone,
        specialties: [data.specialty],
        experience: data.experience || '',
        education: data.education || '',
        bio: data.bio || ''
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
                      <Label htmlFor="name">Nome Completo *</Label>
                      <Input
                        id="name"
                        placeholder="Dr(a). Nome Sobrenome"
                        {...register('name')}
                        className={errors.name ? 'border-red-500' : ''}
                      />
                      {errors.name && (
                        <p className="text-sm text-red-500">{errors.name.message}</p>
                      )}
                    </div>

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
                      <Label htmlFor="specialty">Especialidade Principal *</Label>
                      <Select onValueChange={(value) => setValue('specialty', value)}>
                        <SelectTrigger className={errors.specialty ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecione a especialidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {specialties.map((specialty) => (
                            <SelectItem key={specialty} value={specialty}>
                              {specialty}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.specialty && (
                        <p className="text-sm text-red-500">{errors.specialty.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="experience">Experiência</Label>
                    <Input
                      id="experience"
                      placeholder="Ex: 10 anos"
                      {...register('experience')}
                    />
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
                  <h4 className="font-medium mb-2">Configurações</h4>
                  <p className="text-muted-foreground">
                    O médico poderá configurar horários de atendimento, 
                    especialidades adicionais e perfil após o primeiro acesso.
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