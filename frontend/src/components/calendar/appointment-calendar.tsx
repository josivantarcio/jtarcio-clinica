'use client'

import { useState, useEffect } from 'react'
import { Calendar, momentLocalizer, Event, View } from 'react-big-calendar'
import moment from 'moment'
import 'moment/locale/pt-br'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  User, 
  Calendar as CalendarIcon,
  Filter,
  Eye
} from 'lucide-react'
import { Appointment, AppointmentStatus } from '@/types'
import { cn } from '@/lib/utils'

// Configurar moment em português
moment.locale('pt-br')
const localizer = momentLocalizer(moment)

interface AppointmentEvent extends Event {
  id: string
  appointment: Appointment
  resource?: any
}

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onAppointmentSelect?: (appointment: Appointment) => void
  onSlotSelect?: (slotInfo: { start: Date; end: Date }) => void
  view?: View
  onViewChange?: (view: View) => void
  className?: string
}

const statusColors = {
  SCHEDULED: {
    bg: 'bg-blue-100 border-blue-200',
    text: 'text-blue-800',
    dot: 'bg-blue-500'
  },
  CONFIRMED: {
    bg: 'bg-green-100 border-green-200',
    text: 'text-green-800',
    dot: 'bg-green-500'
  },
  IN_PROGRESS: {
    bg: 'bg-yellow-100 border-yellow-200',
    text: 'text-yellow-800',
    dot: 'bg-yellow-500'
  },
  COMPLETED: {
    bg: 'bg-emerald-100 border-emerald-200',
    text: 'text-emerald-800',
    dot: 'bg-emerald-500'
  },
  CANCELLED: {
    bg: 'bg-red-100 border-red-200',
    text: 'text-red-800',
    dot: 'bg-red-500'
  },
  NO_SHOW: {
    bg: 'bg-gray-100 border-gray-200',
    text: 'text-gray-800',
    dot: 'bg-gray-500'
  },
  RESCHEDULED: {
    bg: 'bg-orange-100 border-orange-200',
    text: 'text-orange-800',
    dot: 'bg-orange-500'
  }
}

export function AppointmentCalendar({
  appointments,
  onAppointmentSelect,
  onSlotSelect,
  view = 'week',
  onViewChange,
  className
}: AppointmentCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<View>(view)

  // Converter appointments para eventos do calendário
  const events: AppointmentEvent[] = appointments.map(appointment => ({
    id: appointment.id,
    title: `${appointment.specialty?.name} - ${appointment.patient?.user?.name || 'Paciente'}`,
    start: new Date(appointment.scheduledAt),
    end: new Date(new Date(appointment.scheduledAt).getTime() + (appointment.duration * 60000)),
    appointment,
    resource: {
      status: appointment.status,
      doctorName: appointment.doctor?.user?.name,
      patientName: appointment.patient?.user?.name
    }
  }))

  // Componente customizado para renderizar eventos
  const EventComponent = ({ event }: { event: AppointmentEvent }) => {
    const status = event.appointment.status as AppointmentStatus
    const colors = statusColors[status] || statusColors.SCHEDULED

    return (
      <div className={cn(
        'p-1 rounded text-xs border-l-2 h-full flex flex-col justify-between',
        colors.bg,
        colors.text
      )}>
        <div className="flex items-center justify-between">
          <div className={cn('w-2 h-2 rounded-full', colors.dot)} />
          <span className="text-xs opacity-75">
            {moment(event.start).format('HH:mm')}
          </span>
        </div>
        <div className="font-medium text-xs leading-tight">
          {event.appointment.specialty?.name}
        </div>
        <div className="text-xs opacity-75 truncate">
          {event.appointment.patient?.user?.name}
        </div>
      </div>
    )
  }

  // Toolbar customizada
  const CustomToolbar = ({ date, view, onNavigate, onView, localizer }: any) => {
    const navigate = (action: 'PREV' | 'NEXT' | 'TODAY') => {
      onNavigate(action)
    }

    const viewNamesMap = {
      month: 'Mês',
      week: 'Semana',
      day: 'Dia',
      agenda: 'Agenda'
    }

    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('PREV')}
            className="p-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('TODAY')}
          >
            Hoje
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('NEXT')}
            className="p-2"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex justify-center">
          <h2 className="text-xl font-semibold">
            {localizer.format(date, view === 'month' ? 'MMMM YYYY' : 'MMMM YYYY')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {(['month', 'week', 'day'] as View[]).map((viewName) => (
            <Button
              key={viewName}
              variant={view === viewName ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                onView(viewName)
                setCurrentView(viewName)
              }}
            >
              {viewNamesMap[viewName]}
            </Button>
          ))}
        </div>
      </div>
    )
  }

  // Mensagens customizadas em português
  const messages = {
    allDay: 'Todo o dia',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Não há consultas neste período',
    showMore: (total: number) => `+ Ver mais (${total})`
  }

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Calendário de Consultas
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
            
            <Button
              size="sm"
              className="flex items-center gap-2"
              onClick={() => onSlotSelect && onSlotSelect({ 
                start: new Date(), 
                end: new Date(Date.now() + 30 * 60000) 
              })}
            >
              <Plus className="h-4 w-4" />
              Nova Consulta
            </Button>
          </div>
        </div>

        {/* Legenda de status */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(statusColors).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded-full', colors.dot)} />
              <span className="text-xs text-muted-foreground">
                {status === 'SCHEDULED' && 'Agendada'}
                {status === 'CONFIRMED' && 'Confirmada'}
                {status === 'IN_PROGRESS' && 'Em Andamento'}
                {status === 'COMPLETED' && 'Concluída'}
                {status === 'CANCELLED' && 'Cancelada'}
                {status === 'NO_SHOW' && 'Faltou'}
                {status === 'RESCHEDULED' && 'Reagendada'}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="h-[600px] p-4">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={currentView}
            onView={(view) => {
              setCurrentView(view)
              onViewChange?.(view)
            }}
            date={currentDate}
            onNavigate={setCurrentDate}
            onSelectEvent={(event) => {
              onAppointmentSelect?.(event.appointment)
            }}
            onSelectSlot={(slotInfo) => {
              onSlotSelect?.(slotInfo)
            }}
            selectable
            popup
            components={{
              toolbar: CustomToolbar,
              event: EventComponent,
              eventWrapper: ({ children }) => (
                <div className="h-full cursor-pointer hover:opacity-80 transition-opacity">
                  {children}
                </div>
              )
            }}
            messages={messages}
            formats={{
              timeGutterFormat: 'HH:mm',
              eventTimeRangeFormat: ({ start, end }, culture, localizer) => {
                return localizer?.format(start, 'HH:mm', culture) + ' - ' + localizer?.format(end, 'HH:mm', culture)
              },
              dayFormat: 'DD/MM',
              dateFormat: 'DD',
              dayHeaderFormat: 'dddd DD/MM',
              monthHeaderFormat: 'MMMM YYYY',
              dayRangeHeaderFormat: ({ start, end }, culture, localizer) => {
                return localizer?.format(start, 'DD/MM', culture) + ' - ' + localizer?.format(end, 'DD/MM', culture)
              }
            }}
            min={moment('07:00', 'HH:mm').toDate()}
            max={moment('19:00', 'HH:mm').toDate()}
            step={30}
            timeslots={2}
            className="custom-calendar"
            style={{
              height: '100%'
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}