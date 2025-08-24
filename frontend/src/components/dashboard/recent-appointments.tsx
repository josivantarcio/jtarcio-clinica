'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { History, Clock, User, FileText } from 'lucide-react'
import { useEffect, useCallback } from 'react'
import { formatDateTime } from '@/lib/utils'
import { useAppointmentsStore } from '@/store/appointments'
import { useAuthStore } from '@/store/auth'
import { Skeleton } from '@/components/ui/skeleton'

export function RecentAppointments() {
  const { appointments, isLoading, loadAppointments } = useAppointmentsStore()
  const { user } = useAuthStore()
  
  const loadRecentAppointments = useCallback(() => {
    loadAppointments({ status: 'COMPLETED', limit: 5, orderBy: 'completedAt:desc' })
  }, [loadAppointments])
  
  useEffect(() => {
    loadRecentAppointments()
  }, [loadRecentAppointments])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-4 w-4" />
          Consultas Recentes
        </CardTitle>
        <CardDescription>
          Histórico de consultas realizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        ) : appointments.length > 0 ? (
          <div className="space-y-3">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                    {user?.role === 'PATIENT' ? (
                      <User className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        {appointment.patient?.fullName?.charAt(0) || 'P'}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {user?.role === 'PATIENT' 
                        ? `Dr. ${appointment.doctor?.fullName || 'Nome não informado'}`
                        : appointment.patient?.fullName || 'Nome não informado'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.specialty?.name || 'Especialidade não informada'}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(appointment.completedAt || appointment.scheduledAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success">
                    Realizada
                  </Badge>
                  <Button variant="ghost" size="sm">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              Nenhuma consulta realizada ainda
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}