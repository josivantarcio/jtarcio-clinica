'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Clock, 
  User, 
  Calendar, 
  MapPin, 
  Phone, 
  Mail,
  FileText,
  Edit3,
  X,
  CheckCircle,
  AlertCircle,
  MoreVertical
} from 'lucide-react'
import { Appointment } from '@/types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface AppointmentModalProps {
  appointment: Appointment | null
  open: boolean
  onClose: () => void
  onEdit?: (appointment: Appointment) => void
  onCancel?: (appointment: Appointment) => void
  onConfirm?: (appointment: Appointment) => void
  onComplete?: (appointment: Appointment) => void
  onReschedule?: (appointment: Appointment) => void
}

const statusConfig = {
  SCHEDULED: { 
    color: 'bg-blue-100 text-blue-800 border-blue-200', 
    label: 'Agendada',
    icon: Clock
  },
  CONFIRMED: { 
    color: 'bg-green-100 text-green-800 border-green-200', 
    label: 'Confirmada',
    icon: CheckCircle
  },
  IN_PROGRESS: { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    label: 'Em Andamento',
    icon: AlertCircle
  },
  COMPLETED: { 
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200', 
    label: 'Concluída',
    icon: CheckCircle
  },
  CANCELLED: { 
    color: 'bg-red-100 text-red-800 border-red-200', 
    label: 'Cancelada',
    icon: X
  },
  NO_SHOW: { 
    color: 'bg-gray-100 text-gray-800 border-gray-200', 
    label: 'Faltou',
    icon: X
  },
  RESCHEDULED: { 
    color: 'bg-orange-100 text-orange-800 border-orange-200', 
    label: 'Reagendada',
    icon: Calendar
  }
}

export function AppointmentModal({
  appointment,
  open,
  onClose,
  onEdit,
  onCancel,
  onConfirm,
  onComplete,
  onReschedule
}: AppointmentModalProps) {
  const [loading, setLoading] = useState(false)

  if (!appointment) return null

  const status = statusConfig[appointment.status] || statusConfig.SCHEDULED
  const StatusIcon = status.icon

  const handleAction = async (action: () => void) => {
    setLoading(true)
    try {
      await action()
      onClose()
    } catch (error) {
      console.error('Error performing action:', error)
    } finally {
      setLoading(false)
    }
  }

  const canConfirm = appointment.status === 'SCHEDULED'
  const canComplete = appointment.status === 'CONFIRMED' || appointment.status === 'IN_PROGRESS'
  const canCancel = !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(appointment.status)
  const canReschedule = !['COMPLETED', 'CANCELLED'].includes(appointment.status)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <DialogTitle className="text-xl">
                Consulta - {appointment.specialty?.name}
              </DialogTitle>
              <DialogDescription>
                {format(new Date(appointment.scheduledAt), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge className={cn('border', status.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={() => onEdit(appointment)}>
                      <Edit3 className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                  )}
                  
                  {canConfirm && onConfirm && (
                    <DropdownMenuItem onClick={() => handleAction(() => onConfirm(appointment))}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar
                    </DropdownMenuItem>
                  )}
                  
                  {canReschedule && onReschedule && (
                    <DropdownMenuItem onClick={() => onReschedule(appointment)}>
                      <Calendar className="h-4 w-4 mr-2" />
                      Reagendar
                    </DropdownMenuItem>
                  )}
                  
                  {canComplete && onComplete && (
                    <DropdownMenuItem onClick={() => handleAction(() => onComplete(appointment))}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Concluir
                    </DropdownMenuItem>
                  )}
                  
                  {canCancel && onCancel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleAction(() => onCancel(appointment))}
                        className="text-red-600 focus:text-red-600"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancelar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Data
              </div>
              <p className="text-sm">
                {format(new Date(appointment.scheduledAt), "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="h-4 w-4" />
                Horário
              </div>
              <p className="text-sm">
                {format(new Date(appointment.scheduledAt), "HH:mm", { locale: ptBR })} - {' '}
                {format(
                  new Date(new Date(appointment.scheduledAt).getTime() + appointment.duration * 60000), 
                  "HH:mm", 
                  { locale: ptBR }
                )}
                <span className="text-muted-foreground ml-2">({appointment.duration} min)</span>
              </p>
            </div>
          </div>

          <Separator />

          {/* Paciente */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Paciente
            </div>
            
            <div className="pl-6 space-y-2">
              <div className="font-medium">{appointment.patient?.user?.name}</div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                {appointment.patient?.user?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    {appointment.patient.user.email}
                  </div>
                )}
                
                {appointment.patient?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    {appointment.patient.phone}
                  </div>
                )}
              </div>
              
              {appointment.patient?.cpf && (
                <div className="text-sm text-muted-foreground">
                  CPF: {appointment.patient.cpf}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Médico */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Médico
            </div>
            
            <div className="pl-6 space-y-2">
              <div className="font-medium">Dr. {appointment.doctor?.user?.name}</div>
              
              <div className="text-sm text-muted-foreground">
                {appointment.specialty?.name}
              </div>
              
              {appointment.doctor?.crm && (
                <div className="text-sm text-muted-foreground">
                  CRM: {appointment.doctor.crm}
                </div>
              )}
            </div>
          </div>

          {/* Observações */}
          {appointment.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  Observações
                </div>
                
                <div className="pl-6 text-sm text-muted-foreground">
                  {appointment.notes}
                </div>
              </div>
            </>
          )}

          {/* Motivo de cancelamento */}
          {appointment.status === 'CANCELLED' && appointment.cancellationReason && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600">
                  <X className="h-4 w-4" />
                  Motivo do cancelamento
                </div>
                
                <div className="pl-6 text-sm text-muted-foreground">
                  {appointment.cancellationReason}
                </div>
              </div>
            </>
          )}

          {/* Informações adicionais */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Criado em:</span><br />
                {format(new Date(appointment.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
              
              <div>
                <span className="font-medium">Última atualização:</span><br />
                {format(new Date(appointment.updatedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          
          {canConfirm && onConfirm && (
            <Button 
              onClick={() => handleAction(() => onConfirm(appointment))}
              disabled={loading}
            >
              {loading ? 'Confirmando...' : 'Confirmar Consulta'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}