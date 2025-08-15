'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
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
import { Loader2, CheckCircle, Clock, User, Stethoscope } from 'lucide-react'
import { useSpecialtiesStore } from '@/store/specialties'
import { useDoctorsStore } from '@/store/doctors'
import { useAppointmentsStore } from '@/store/appointments'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

const bookingSchema = z.object({
  specialtyId: z.string().min(1, 'Selecione uma especialidade'),
  doctorId: z.string().min(1, 'Selecione um médico'),
  scheduledAt: z.date({ required_error: 'Selecione data e horário' }),
  type: z.enum(['CONSULTATION', 'FOLLOW_UP'], { required_error: 'Selecione o tipo de consulta' }),
  notes: z.string().optional()
})

type BookingFormData = z.infer<typeof bookingSchema>

interface AppointmentBookingFormProps {
  onSuccess?: () => void
}

export function AppointmentBookingForm({ onSuccess }: AppointmentBookingFormProps) {
  const [step, setStep] = useState(1)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>()
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  
  const { specialties, isLoading: loadingSpecialties, loadSpecialties } = useSpecialtiesStore()
  const { doctors, isLoading: loadingDoctors, loadDoctors } = useDoctorsStore()
  const { createAppointment, isLoading: bookingAppointment } = useAppointmentsStore()
  
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
    loadSpecialties()
  }, [])
  
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
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Erro',
        description: 'Selecione data e horário',
        variant: 'destructive'
      })
      return
    }
    
    const [hours, minutes] = selectedTime.split(':').map(Number)
    const scheduledAt = new Date(selectedDate)
    scheduledAt.setHours(hours, minutes)
    
    const bookingData = {
      ...data,
      scheduledAt
    }
    
    const success = await createAppointment(bookingData)
    
    if (success) {
      toast({
        title: 'Sucesso!',
        description: 'Consulta agendada com sucesso'
      })
      reset()
      setStep(1)
      setSelectedDate(undefined)
      setSelectedTime('')
      onSuccess?.()
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível agendar a consulta',
        variant: 'destructive'
      })
    }
  }
  
  const selectedSpecialty = specialties.find(s => s.id === selectedSpecialtyId)
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId)
  
  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              Selecione a área médica para sua consulta
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSpecialties ? (
              <div className="grid gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                ))}
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
                      value={doctor.id}
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
      
      {/* Step 3: Date and Time Selection */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Escolha Data e Horário
            </CardTitle>
            <CardDescription>
              Selecione a data e horário de sua preferência
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Calendar */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Selecione a Data</Label>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border"
                />
              </div>
              
              {/* Time Slots */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Horários Disponíveis</Label>
                {!selectedDate ? (
                  <p className="text-muted-foreground">Selecione uma data primeiro</p>
                ) : isLoadingSlots ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="h-10 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={`
                          p-2 text-sm border rounded transition-colors
                          ${
                            selectedTime === slot
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input hover:bg-muted'
                          }
                        `}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Nenhum horário disponível</p>
                )}
              </div>
            </div>
            
            <div className="flex justify-between">
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
            <CardTitle>Confirmar Agendamento</CardTitle>
            <CardDescription>
              Revise os dados e confirme sua consulta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Appointment Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Especialidade:</span>
                <span className="font-medium">{selectedSpecialty?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Médico:</span>
                <span className="font-medium">Dr. {selectedDoctor?.user?.name || 'Nome não informado'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data e Horário:</span>
                <span className="font-medium">
                  {selectedDate && selectedTime && 
                    formatDateTime(new Date(
                      selectedDate.getFullYear(),
                      selectedDate.getMonth(),
                      selectedDate.getDate(),
                      parseInt(selectedTime.split(':')[0]),
                      parseInt(selectedTime.split(':')[1])
                    ))
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-medium">{formatCurrency(selectedSpecialty?.price || 0)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(selectedSpecialty?.price || 0)}</span>
              </div>
            </div>
            
            {/* Additional Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo de Consulta</Label>
                <select 
                  {...register('type')}
                  className="w-full mt-1 p-2 border rounded-md"
                >
                  <option value="">Selecione o tipo</option>
                  <option value="CONSULTATION">Consulta</option>
                  <option value="FOLLOW_UP">Retorno</option>
                </select>
                {errors.type && (
                  <p className="text-sm text-destructive">{errors.type.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="notes">Observações (Opcional)</Label>
                <Textarea
                  {...register('notes')}
                  placeholder="Descreva sintomas ou informações importantes..."
                  className="mt-1"
                />
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={prevStep}>
                Voltar
              </Button>
              <Button type="submit" disabled={bookingAppointment}>
                {bookingAppointment ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  'Confirmar Agendamento'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}