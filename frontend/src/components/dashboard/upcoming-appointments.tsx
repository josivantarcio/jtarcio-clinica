'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Appointment } from '@/types'
import { formatDateTime, formatTime } from '@/lib/utils'
import { useAppointmentsStore } from '@/store/appointments'
import { useAuthStore } from '@/store/auth'
import { Skeleton } from '@/components/ui/skeleton'

export function UpcomingAppointments() {
  const { appointments, isLoading, loadAppointments } = useAppointmentsStore()
  const { user } = useAuthStore()
  const router = useRouter()
  
  const loadUpcomingAppointments = useCallback(() => {
    loadAppointments({ status: 'SCHEDULED,CONFIRMED', limit: 5 })
  }, [loadAppointments])
  
  useEffect(() => {
    loadUpcomingAppointments()
  }, [loadUpcomingAppointments])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'info'
      case 'CONFIRMED': return 'success'
      case 'IN_PROGRESS': return 'warning'
      default: return 'default'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Agendada'
      case 'CONFIRMED': return 'Confirmada'
      case 'IN_PROGRESS': return 'Em Andamento'
      default: return status
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Próximas Consultas
        </CardTitle>
        <CardDescription>
          Suas próximas consultas agendadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-4">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    {user?.role === 'PATIENT' ? (
                      <User className="h-6 w-6 text-primary" />
                    ) : (
                      <span className="font-semibold text-primary">
                        {appointment.patient?.fullName?.charAt(0) || 'P'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium">
                      {user?.role === 'PATIENT' 
                        ? `Dr. ${appointment.doctor?.fullName || 'Nome não informado'}`
                        : appointment.patient?.fullName || 'Nome não informado'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.specialty?.name || 'Especialidade não informada'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(appointment.scheduledAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusColor(appointment.status) as any}>
                    {getStatusLabel(appointment.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              Nenhuma consulta agendada
            </p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => router.push('/appointments/new')}
            >
              Agendar Consulta
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}