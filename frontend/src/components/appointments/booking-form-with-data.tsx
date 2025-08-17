'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import { Loader2, CheckCircle, Clock, User, Stethoscope, Calendar as CalendarIcon } from 'lucide-react'
import { useDoctorsStore } from '@/store/doctors'
import { useAppointmentsStore } from '@/store/appointments'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { validateCPF, formatCPF, cleanCPF } from '@/lib/cpf-validation'
import { formatDateForAPI } from '@/lib/date-utils'
import { apiClient } from '@/lib/api'

const bookingSchema = z.object({
  specialtyId: z.string().min(1, 'Selecione uma especialidade'),
  doctorId: z.string().min(1, 'Selecione um médico'),
  type: z.enum(['CONSULTATION', 'FOLLOW_UP'], { required_error: 'Selecione o tipo de consulta' }),
  notes: z.string().optional()
})

const patientSchema = z.object({
  firstName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
  cpf: z.string().min(11, 'CPF inválido'),
  dateOfBirth: z.string().min(1, 'Data de nascimento é obrigatória'),
  gender: z.string().min(1, 'Selecione o gênero')
})

type BookingFormData = z.infer<typeof bookingSchema>

interface BookingFormWithDataProps {
  initialSpecialties: any[]
}

export function BookingFormWithData({ initialSpecialties }: BookingFormWithDataProps) {
  // Custom scrollbar styles
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .custom-scrollbar::-webkit-scrollbar {
        width: 6px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: rgb(241 245 249 / 0.3);
        border-radius: 10px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, rgb(34 197 94), rgb(22 163 74));
        border-radius: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, rgb(22 163 74), rgb(21 128 61));
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])

  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [patientData, setPatientData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    cpf: '',
    dateOfBirth: '',
    gender: ''
  })
  const [needsPatientRegistration, setNeedsPatientRegistration] = useState(false) // Default to using existing patient
  const [existingPatients, setExistingPatients] = useState<any[]>([])
  const [loadingPatients, setLoadingPatients] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  
  // Use as especialidades passadas como props ao invés de buscar
  const [specialties] = useState(initialSpecialties)
  const [loadingSpecialties] = useState(false)
  
  const { doctors, isLoading: loadingDoctors, loadDoctors } = useDoctorsStore()
  const { createAppointment, isLoading: bookingAppointment } = useAppointmentsStore()
  
  // Função para buscar pacientes existentes
  const loadExistingPatients = useCallback(async () => {
    setLoadingPatients(true)
    try {
      const response = await apiClient.request({
        method: 'GET',
        url: '/api/v1/users?role=PATIENT&limit=50'
      })
      
      if (response.success && response.data) {
        setExistingPatients(response.data.users || [])
      }
    } catch (error) {
      console.error('Error loading patients:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao carregar pacientes existentes',
        variant: 'destructive'
      })
    } finally {
      setLoadingPatients(false)
    }
  }, [])
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema)
  })

  const selectedSpecialtyId = watch('specialtyId')
  const selectedDoctorId = watch('doctorId')
  
  useEffect(() => {
    if (selectedSpecialtyId) {
      loadDoctors(selectedSpecialtyId)
    }
  }, [selectedSpecialtyId, loadDoctors])
  
  useEffect(() => {
    if (selectedDoctorId && selectedDate) {
      loadAvailableSlots()
    }
  }, [selectedDoctorId, selectedDate])

  useEffect(() => {
    if (!needsPatientRegistration) {
      loadExistingPatients()
    }
  }, [needsPatientRegistration, loadExistingPatients])

  // Load patients on mount since default is to use existing patient
  useEffect(() => {
    loadExistingPatients()
  }, [])

  const createPatient = async () => {
    try {
      // Validate patient data
      const validatedPatient = patientSchema.parse(patientData)
      
      // Validate CPF
      if (!validateCPF(validatedPatient.cpf)) {
        toast({
          title: 'Erro',
          description: 'CPF inválido',
          variant: 'destructive'
        })
        return null
      }

      const patientPayload = {
        firstName: validatedPatient.firstName,
        lastName: validatedPatient.lastName,
        fullName: `${validatedPatient.firstName} ${validatedPatient.lastName}`.trim(),
        email: validatedPatient.email,
        phone: validatedPatient.phone,
        cpf: cleanCPF(validatedPatient.cpf),
        dateOfBirth: formatDateForAPI(validatedPatient.dateOfBirth),
        gender: validatedPatient.gender,
        role: 'PATIENT',
        allergies: [],
        medications: []
      }

      const response = await apiClient.request({
        method: 'POST',
        url: '/api/v1/users',
        data: patientPayload
      })

      if (response.success && response.data) {
        return response.data.id
      } else {
        throw new Error('Falha ao criar paciente')
      }
    } catch (error: any) {
      console.error('Error creating patient:', error)
      
      if (error.name === 'ZodError') {
        const firstError = error.errors[0]
        toast({
          title: 'Erro de validação',
          description: firstError.message,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível cadastrar o paciente',
          variant: 'destructive'
        })
      }
      return null
    }
  }
  
  const loadAvailableSlots = async () => {
    if (!selectedDoctorId || !selectedDate) return
    
    setIsLoadingSlots(true)
    try {
      // Mock available slots - in real app, this would be an API call
      const slots = [
        '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
        '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
      ]
      
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000))
      setAvailableSlots(slots)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os horários disponíveis',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingSlots(false)
    }
  }
  
  const onSubmit = async (data: BookingFormData) => {
    console.log('=== INÍCIO DO AGENDAMENTO ===')
    console.log('Data do formulário:', data)
    console.log('Data selecionada:', selectedDate)
    console.log('Horário selecionado:', selectedTime)
    console.log('Precisa cadastrar paciente:', needsPatientRegistration)
    
    if (!selectedDate || !selectedTime) {
      console.log('❌ Erro: Data ou horário não selecionados')
      toast({
        title: 'Erro',
        description: 'Selecione data e horário',
        variant: 'destructive'
      })
      return
    }
    
    // Validate required fields manually since we're combining external state
    if (!data.specialtyId || !data.doctorId || !data.type) {
      console.log('❌ Erro: Campos obrigatórios não preenchidos', {
        specialtyId: data.specialtyId,
        doctorId: data.doctorId, 
        type: data.type
      })
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive'
      })
      return
    }
    
    try {
      let patientId = ''
      
      // If patient registration is needed, create patient first
      if (needsPatientRegistration) {
        console.log('📝 Criando novo paciente...')
        const newPatientId = await createPatient()
        if (!newPatientId) {
          console.log('❌ Falha ao criar paciente')
          return // Error handled in createPatient function
        }
        patientId = newPatientId
        console.log('✅ Paciente criado com ID:', patientId)
      } else {
        // Use existing patient
        if (!selectedPatientId) {
          toast({
            title: 'Erro',
            description: 'Selecione um paciente existente',
            variant: 'destructive'
          })
          return
        }
        patientId = selectedPatientId
        console.log('✅ Usando paciente existente com ID:', patientId)
      }
      
      const [hours, minutes] = selectedTime.split(':').map(Number)
      const scheduledAt = new Date(selectedDate)
      scheduledAt.setHours(hours, minutes)
      
      const bookingData = {
        ...data,
        patientId,
        scheduledAt
      }
      
      console.log('📤 Enviando dados do agendamento:', bookingData)
      
      const success = await createAppointment(bookingData)
      
      console.log('📥 Resposta da API:', success)
      
      if (success) {
        console.log('✅ Agendamento realizado com sucesso!')
        toast({
          title: 'Sucesso!',
          description: needsPatientRegistration 
            ? 'Paciente cadastrado e consulta agendada com sucesso!' 
            : 'Consulta agendada com sucesso!'
        })
        reset()
        setStep(1)
        setSelectedDate(undefined)
        setSelectedTime('')
        setPatientData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          cpf: '',
          dateOfBirth: '',
          gender: ''
        })
        // Redirect para appointments após sucesso
        window.location.href = '/appointments'
      } else {
        console.log('❌ Falha no agendamento')
        toast({
          title: 'Erro',
          description: 'Não foi possível agendar a consulta',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('💥 Erro durante agendamento:', error)
      toast({
        title: 'Erro',
        description: 'Erro interno. Tente novamente.',
        variant: 'destructive'
      })
    }
  }
  
  const selectedSpecialty = specialties.find(s => s.id === selectedSpecialtyId)
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId)
  
  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 relative overflow-hidden">
      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${
                s === step 
                  ? 'bg-primary text-primary-foreground'
                  : s < step 
                  ? 'bg-green-500 text-white'
                  : 'bg-muted text-muted-foreground'
              }
            `}>
              {s < step ? <CheckCircle className="h-4 w-4" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-12 h-0.5 mx-2 ${
                s < step ? 'bg-green-500' : 'bg-muted'
              }`} />
            )}
          </div>
        ))}
      </div>
      
      {/* Step 1: Specialty Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5" />
              Escolha a Especialidade
            </CardTitle>
            <CardDescription>
              Especialidades disponíveis com médicos ativos ({specialties.length} encontrada(s))
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSpecialties ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : specialties.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Stethoscope className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Nenhuma especialidade disponível</h3>
                <p className="text-muted-foreground mb-4">
                  No momento, não há especialidades com médicos ativos disponíveis para agendamento.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {specialties.map((specialty) => (
                  <label key={specialty.id} className="cursor-pointer">
                    <input
                      type="radio"
                      {...register('specialtyId')}
                      value={specialty.id}
                      className="sr-only peer"
                    />
                    <div className="p-6 border-2 border-gray-200 rounded-xl peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary hover:border-primary/50 hover:bg-primary/10 hover:shadow-md transition-all duration-200 h-full">
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <Stethoscope className="h-6 w-6 text-primary" />
                            </div>
                            {specialty.price ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 peer-checked:bg-primary/20 peer-checked:text-primary peer-checked:border-primary/30">
                                {formatCurrency(specialty.price)}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-500 peer-checked:bg-primary/20 peer-checked:text-primary peer-checked:border-primary/30">
                                Consulte
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mb-2">{specialty.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {specialty.description}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3 peer-checked:border-primary/30">
                          <div className="flex items-center gap-1 peer-checked:text-primary/80">
                            <Clock className="h-3 w-3" />
                            <span>{specialty.duration} minutos</span>
                          </div>
                          <span className="peer-checked:text-primary peer-checked:font-semibold">
                            ✓ Selecionado
                          </span>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {errors.specialtyId && (
              <p className="text-sm text-destructive mt-2">{errors.specialtyId.message}</p>
            )}
            
            <div className="flex justify-end mt-6">
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={!selectedSpecialtyId}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: Doctor Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Escolha o Médico
            </CardTitle>
            <CardDescription>
              Selecione o profissional de sua preferência
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDoctors ? (
              <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-muted animate-pulse rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-muted animate-pulse rounded w-40" />
                      <div className="h-3 bg-muted animate-pulse rounded w-60" />
                    </div>
                  </div>
                ))}
              </div>
            ) : doctors.length > 0 ? (
              <div className="grid gap-4">
                {doctors.map((doctor) => (
                  <label key={doctor.id} className="cursor-pointer">
                    <input
                      type="radio"
                      {...register('doctorId')}
                      value={doctor.userId}
                      className="sr-only peer"
                    />
                    <div className="p-4 border rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="font-semibold text-primary">
                            {doctor.user?.name?.charAt(0) || 'DR'}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">Dr. {doctor.user?.name || 'Nome não informado'}</h3>
                          <p className="text-sm text-muted-foreground">
                            CRM: {doctor.crm}
                          </p>
                          {doctor.bio && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {doctor.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-6">
                Nenhum médico disponível para esta especialidade
              </p>
            )}
            
            {errors.doctorId && (
              <p className="text-sm text-destructive mt-2">{errors.doctorId.message}</p>
            )}
            
            <div className="flex justify-between mt-6">
              <Button type="button" variant="outline" onClick={prevStep}>
                Voltar
              </Button>
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={!selectedDoctorId}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 3: Date & Time Selection */}
      {step === 3 && (
        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Escolha Data e Horário
            </CardTitle>
            <CardDescription>
              Selecione o dia e horário de sua preferência para a consulta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selected Specialty & Doctor Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedSpecialty?.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Dr. {selectedDoctor?.user?.name} • {selectedSpecialty?.duration} minutos
                  </p>
                </div>
                {selectedSpecialty?.price && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {formatCurrency(selectedSpecialty.price)}
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Date Selection */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Selecione a Data</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Escolha um dia disponível (seg-sex)
                  </p>
                </div>
                
                <div className="flex justify-center overflow-hidden">
                  <div className="relative">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => 
                        date < new Date() || 
                        date.getDay() === 0 || // Sunday
                        date.getDay() === 6    // Saturday
                      }
                      formatters={{
                        formatCaption: (date: Date) => {
                          const months = [
                            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
                          ];
                          return `${months[date.getMonth()]} ${date.getFullYear()}`;
                        }
                      }}
                      className="rounded-2xl border-0 shadow-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white max-w-full overflow-hidden backdrop-blur-sm"
                      classNames={{
                        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                        month: "space-y-4 p-4",
                        caption: "flex justify-center pt-2 pb-4 relative items-center",
                        caption_label: "text-white font-bold text-lg tracking-wide drop-shadow-sm",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-8 w-8 bg-slate-700/50 hover:bg-slate-600/70 border-slate-500/30 text-white/90 hover:text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 backdrop-blur-sm",
                        nav_button_previous: "absolute left-2",
                        nav_button_next: "absolute right-2",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex mb-2",
                        head_cell: "text-slate-300 font-semibold text-xs uppercase tracking-wider w-10 h-8 flex items-center justify-center",
                        row: "flex w-full mt-1",
                        cell: "h-10 w-10 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
                        day: "h-10 w-10 p-0 font-medium text-white/90 hover:text-white rounded-xl transition-all duration-200 hover:bg-slate-600/50 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400/50 focus:ring-offset-2 focus:ring-offset-slate-800",
                        day_selected: "bg-gradient-to-br from-green-500 to-green-600 text-white font-bold shadow-xl ring-2 ring-green-400/30 ring-offset-2 ring-offset-slate-800 hover:from-green-400 hover:to-green-500 transform scale-110",
                        day_today: "bg-gradient-to-br from-blue-500/30 to-blue-600/30 text-white font-bold ring-1 ring-blue-400/50 shadow-lg",
                        day_disabled: "text-slate-500 opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100",
                        day_outside: "text-slate-600 opacity-40 hover:text-slate-500"
                      }}
                      components={{
                        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4 drop-shadow-sm" />,
                        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4 drop-shadow-sm" />,
                      }}
                    />
                    {/* Glassmorphism overlay effect */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                  </div>
                </div>
                
                {selectedDate && (
                  <div className="text-center mt-4">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl shadow-lg">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-sm font-semibold text-green-700">
                        {selectedDate.toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Time Selection */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Horários Disponíveis</h3>
                  {selectedDate ? (
                    <p className="text-sm text-muted-foreground mb-4">
                      Selecione o melhor horário para você
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-4">
                      Primeiro selecione uma data
                    </p>
                  )}
                </div>
                
                {!selectedDate ? (
                  <div className="text-center py-8 lg:py-12 border-2 border-dashed border-muted rounded-lg">
                    <Clock className="h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground mx-auto mb-3 lg:mb-4" />
                    <h4 className="font-medium text-muted-foreground mb-2">Aguardando seleção de data</h4>
                    <p className="text-sm text-muted-foreground px-2">
                      Escolha uma data no calendário <span className="lg:hidden">acima</span><span className="hidden lg:inline">ao lado</span> para ver os horários
                    </p>
                  </div>
                ) : isLoadingSlots ? (
                  <div className="space-y-3">
                    <div className="text-center py-4">
                      <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando horários disponíveis...
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                      ))}
                    </div>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {availableSlots.map((slot) => (
                        <label key={slot} className="cursor-pointer group">
                          <input
                            type="radio"
                            value={slot}
                            checked={selectedTime === slot}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="sr-only peer"
                          />
                          <div className="relative p-3 text-center border-2 border-slate-200/30 rounded-xl peer-checked:border-green-400 peer-checked:bg-gradient-to-br peer-checked:from-green-50 peer-checked:to-green-100 peer-checked:text-green-700 peer-checked:shadow-lg peer-checked:shadow-green-200/50 hover:border-slate-300 hover:bg-slate-50/80 hover:shadow-lg hover:shadow-slate-200/30 hover:scale-[1.02] transition-all duration-300 focus-within:ring-2 focus-within:ring-green-400/30 min-w-0 backdrop-blur-sm">
                            <span className="text-sm font-semibold block truncate peer-checked:font-bold">{slot}</span>
                            {/* Selected indicator */}
                            <div className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200 shadow-sm"></div>
                            {/* Hover glow effect */}
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 peer-checked:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                          </div>
                        </label>
                      ))}'
                    </div>
                    
                    {selectedTime && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl shadow-lg">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <p className="text-sm font-semibold text-green-700">
                            Horário selecionado: {selectedTime}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg">
                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="font-medium text-muted-foreground mb-2">Nenhum horário disponível</h4>
                    <p className="text-sm text-muted-foreground">
                      Não há horários disponíveis para esta data.<br />
                      Tente selecionar outro dia.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {errors.scheduledAt && (
              <p className="text-sm text-destructive mt-4">{errors.scheduledAt.message}</p>
            )}

            <div className="flex justify-between mt-8">
              <Button type="button" variant="outline" onClick={prevStep}>
                Voltar
              </Button>
              <Button 
                type="button" 
                onClick={nextStep}
                disabled={!selectedDate || !selectedTime}
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Confirmar Agendamento
            </CardTitle>
            <CardDescription>
              Revise os dados e confirme seu agendamento da consulta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Appointment Summary */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Resumo do Agendamento</h3>
                  <p className="text-sm text-muted-foreground">Confirme os dados abaixo</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <Stethoscope className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Especialidade</p>
                      <p className="font-semibold text-gray-900 truncate">{selectedSpecialty?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Duração: {selectedSpecialty?.duration} minutos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Médico</p>
                      <p className="font-semibold text-gray-900 truncate">Dr. {selectedDoctor?.user?.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        CRM: {selectedDoctor?.crm}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Data</p>
                      <p className="font-semibold text-gray-900 break-words">
                        {selectedDate?.toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-white/50 rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-0.5 shrink-0">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Horário</p>
                      <p className="font-semibold text-gray-900">{selectedTime}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedSpecialty?.price && (
                <div className="mt-6 pt-4 border-t border-white/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Valor da consulta:</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(selectedSpecialty.price)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Patient Registration Section */}
            {needsPatientRegistration && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Dados do Paciente</h3>
                      <p className="text-sm text-muted-foreground">Informações necessárias para o agendamento</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="useExistingPatient"
                      checked={!needsPatientRegistration}
                      onChange={(e) => setNeedsPatientRegistration(!e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="useExistingPatient" className="text-sm font-medium">
                      Usar paciente existente
                    </Label>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientFirstName" className="text-sm font-medium">Nome *</Label>
                    <Input
                      id="patientFirstName"
                      value={patientData.firstName}
                      onChange={(e) => setPatientData(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Digite o nome"
                      className="bg-white w-full"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientLastName" className="text-sm font-medium">Sobrenome *</Label>
                    <Input
                      id="patientLastName"
                      value={patientData.lastName}
                      onChange={(e) => setPatientData(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Digite o sobrenome"
                      className="bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientEmail" className="text-sm font-medium">Email *</Label>
                    <Input
                      id="patientEmail"
                      type="email"
                      value={patientData.email}
                      onChange={(e) => setPatientData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@exemplo.com"
                      className="bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientPhone" className="text-sm font-medium">Telefone *</Label>
                    <Input
                      id="patientPhone"
                      value={patientData.phone}
                      onChange={(e) => setPatientData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="(11) 99999-9999"
                      className="bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientCpf" className="text-sm font-medium">CPF *</Label>
                    <Input
                      id="patientCpf"
                      value={patientData.cpf}
                      onChange={(e) => setPatientData(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                      placeholder="000.000.000-00"
                      className="bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="patientDateOfBirth" className="text-sm font-medium">Data de Nascimento *</Label>
                    <Input
                      id="patientDateOfBirth"
                      type="date"
                      value={patientData.dateOfBirth}
                      onChange={(e) => setPatientData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                      className="bg-white"
                      required
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="patientGender" className="text-sm font-medium">Gênero *</Label>
                    <select
                      id="patientGender"
                      value={patientData.gender}
                      onChange={(e) => setPatientData(prev => ({ ...prev, gender: e.target.value }))}
                      className="w-full p-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      required
                    >
                      <option value="">Selecione o gênero</option>
                      <option value="MALE">Masculino</option>
                      <option value="FEMALE">Feminino</option>
                      <option value="OTHER">Outro</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Patient Selection */}
            {!needsPatientRegistration && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Selecionar Paciente</h3>
                      <p className="text-sm text-muted-foreground">Escolha um paciente existente</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="createNewPatient"
                      checked={needsPatientRegistration}
                      onChange={(e) => setNeedsPatientRegistration(e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="createNewPatient" className="text-sm font-medium">
                      Cadastrar novo paciente
                    </Label>
                  </div>
                </div>
                
                {loadingPatients ? (
                  <div className="grid gap-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="h-10 w-10 bg-muted animate-pulse rounded-full" />
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted animate-pulse rounded w-40" />
                          <div className="h-3 bg-muted animate-pulse rounded w-60" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : existingPatients.length > 0 ? (
                  <div className="grid gap-3 max-h-60 overflow-y-auto">
                    {existingPatients.map((patient) => (
                      <label key={patient.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="existingPatient"
                          value={patient.id}
                          checked={selectedPatientId === patient.id}
                          onChange={(e) => setSelectedPatientId(e.target.value)}
                          className="sr-only peer"
                        />
                        <div className="p-4 border rounded-lg peer-checked:border-primary peer-checked:bg-primary/5 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="font-semibold text-primary">
                                {patient.firstName?.charAt(0) || 'P'}
                              </span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold">{patient.fullName || `${patient.firstName} ${patient.lastName}`}</h3>
                              <p className="text-sm text-muted-foreground">
                                Email: {patient.email}
                              </p>
                              {patient.phone && (
                                <p className="text-sm text-muted-foreground">
                                  Telefone: {patient.phone}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">
                    Nenhum paciente encontrado
                  </p>
                )}
              </div>
            )}

            {/* Consultation Type */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Tipo de Consulta</h3>
                <p className="text-sm text-muted-foreground">Selecione o tipo de atendimento</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="cursor-pointer">
                  <input
                    type="radio"
                    {...register('type')}
                    value="CONSULTATION"
                    className="sr-only peer"
                  />
                  <div className="p-4 border-2 border-gray-200 rounded-xl peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Stethoscope className="h-4 w-4 text-blue-600" />
                      </div>
                      <h4 className="font-semibold">Consulta</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Primeira consulta ou consulta de rotina
                    </p>
                  </div>
                </label>

                <label className="cursor-pointer">
                  <input
                    type="radio"
                    {...register('type')}
                    value="FOLLOW_UP"
                    className="sr-only peer"
                  />
                  <div className="p-4 border-2 border-gray-200 rounded-xl peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Clock className="h-4 w-4 text-green-600" />
                      </div>
                      <h4 className="font-semibold">Retorno</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Consulta de acompanhamento ou retorno
                    </p>
                  </div>
                </label>
              </div>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="notes" className="text-lg font-semibold">Observações</Label>
                <p className="text-sm text-muted-foreground mt-1">Informações adicionais sobre a consulta (opcional)</p>
              </div>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Descreva sintomas, motivo da consulta ou outras informações relevantes..."
                rows={4}
                className="resize-none"
              />
            </div>

            <Separator />

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-4">
              <Button type="button" variant="outline" onClick={prevStep} className="w-full sm:w-auto">
                Voltar
              </Button>
              <Button 
                type="submit" 
                disabled={
                  bookingAppointment || 
                  (needsPatientRegistration && (
                    !patientData.firstName || 
                    !patientData.lastName || 
                    !patientData.email || 
                    !patientData.phone || 
                    !patientData.cpf || 
                    !patientData.dateOfBirth || 
                    !patientData.gender
                  )) ||
                  (!needsPatientRegistration && !selectedPatientId)
                }
                className="w-full sm:w-auto sm:min-w-48 h-12 text-base font-semibold"
              >
                {bookingAppointment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {needsPatientRegistration ? 'Cadastrando Paciente...' : 'Agendando Consulta...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {needsPatientRegistration ? 'Cadastrar e Agendar' : 'Confirmar Agendamento'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}