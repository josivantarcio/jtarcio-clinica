'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { AppLayout } from '@/components/layout/app-layout'
import { AppointmentBookingForm } from '@/components/appointments/appointment-booking-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User, Stethoscope } from 'lucide-react'

export default function NewAppointmentPage() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, router])

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Agendar Consulta</h1>
          <p className="text-muted-foreground">
            Escolha a especialidade, médico e horário de sua preferência
          </p>
        </div>

        {/* Process Steps */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Como funciona o agendamento
            </CardTitle>
            <CardDescription>
              Siga os passos abaixo para agendar sua consulta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Stethoscope className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">1. Especialidade</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha a especialidade médica
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">2. Médico</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione o profissional
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">3. Data e Hora</h3>
                <p className="text-sm text-muted-foreground">
                  Escolha o melhor horário
                </p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">4. Confirmação</h3>
                <p className="text-sm text-muted-foreground">
                  Revise e confirme
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Booking Form */}
        <AppointmentBookingForm onSuccess={() => router.push('/appointments')} />
      </div>
    </AppLayout>
  )
}