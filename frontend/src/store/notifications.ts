import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'appointment' | 'ai_booking' | 'reminder' | 'system' | 'urgent'
  title: string
  message: string
  timestamp: Date
  read: boolean
  priority: 'low' | 'medium' | 'high' | 'urgent'
  metadata?: {
    appointmentId?: string
    patientName?: string
    doctorName?: string
    scheduledAt?: string
    aiGenerated?: boolean
    source?: 'manual' | 'ai_chat' | 'system' | 'reminder'
  }
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  isLoading: boolean
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  loadNotifications: () => Promise<void>
  
  // Specific notification creators
  addAppointmentNotification: (data: {
    patientName: string
    doctorName: string
    scheduledAt: string
    appointmentId: string
    source?: 'manual' | 'ai_chat'
  }) => void
  
  addAIBookingNotification: (data: {
    patientName: string
    doctorName: string
    scheduledAt: string
    appointmentId: string
    chatId: string
  }) => void
  
  addReminderNotification: (data: {
    patientName: string
    scheduledAt: string
    appointmentId: string
    reminderType: 'upcoming' | 'today' | 'overdue'
  }) => void
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  addNotification: (notificationData) => {
    const notification: Notification = {
      ...notificationData,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false
    }
    
    set(state => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1
    }))
  },

  markAsRead: (id) => {
    set(state => ({
      notifications: state.notifications.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      ),
      unreadCount: Math.max(0, state.unreadCount - 1)
    }))
  },

  markAllAsRead: () => {
    set(state => ({
      notifications: state.notifications.map(notif => ({ ...notif, read: true })),
      unreadCount: 0
    }))
  },

  removeNotification: (id) => {
    set(state => {
      const notification = state.notifications.find(n => n.id === id)
      const wasUnread = notification && !notification.read
      
      return {
        notifications: state.notifications.filter(notif => notif.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
      }
    })
  },

  clearAll: () => {
    set({ notifications: [], unreadCount: 0 })
  },

  loadNotifications: async () => {
    set({ isLoading: true })
    
    try {
      // TODO: Implementar chamada à API
      // const response = await apiClient.getNotifications()
      // if (response.success && response.data) {
      //   const notifications = response.data
      //   const unreadCount = notifications.filter(n => !n.read).length
      //   set({ notifications, unreadCount, isLoading: false })
      // }
      
      // Mock data for now
      setTimeout(() => {
        set({ isLoading: false })
      }, 500)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      set({ isLoading: false })
    }
  },

  // Specific notification creators
  addAppointmentNotification: ({ patientName, doctorName, scheduledAt, appointmentId, source = 'manual' }) => {
    const { addNotification } = get()
    
    addNotification({
      type: 'appointment',
      title: '🎉 Novo Agendamento Confirmado',
      message: `✨ Consulta de ${patientName} com ${doctorName} foi agendada para ${scheduledAt}`,
      priority: 'medium',
      metadata: {
        appointmentId,
        patientName,
        doctorName,
        scheduledAt,
        source,
        aiGenerated: source === 'ai_chat'
      }
    })
  },

  addAIBookingNotification: ({ patientName, doctorName, scheduledAt, appointmentId, chatId }) => {
    const { addNotification } = get()
    
    addNotification({
      type: 'ai_booking',
      title: '🤖✨ Agendamento Inteligente Realizado',
      message: `🎯 Nossa IA agendou automaticamente a consulta de ${patientName} com ${doctorName} para ${scheduledAt}`,
      priority: 'high',
      metadata: {
        appointmentId,
        patientName,
        doctorName,
        scheduledAt,
        aiGenerated: true,
        source: 'ai_chat'
      }
    })
  },

  addReminderNotification: ({ patientName, scheduledAt, appointmentId, reminderType }) => {
    const { addNotification } = get()
    
    const titles = {
      upcoming: '📅✨ Consulta se Aproximando',
      today: '🕐🎯 Consulta Hoje',
      overdue: '⚠️❗ Consulta em Atraso'
    }
    
    const messages = {
      upcoming: `🔔 Lembrete importante: ${patientName} tem consulta agendada para ${scheduledAt}`,
      today: `📍 Atenção! ${patientName} tem consulta hoje às ${scheduledAt}`,
      overdue: `🚨 ${patientName} não compareceu à consulta marcada para ${scheduledAt}`
    }
    
    addNotification({
      type: 'reminder',
      title: titles[reminderType],
      message: messages[reminderType],
      priority: reminderType === 'overdue' ? 'urgent' : 'medium',
      metadata: {
        appointmentId,
        patientName,
        scheduledAt,
        source: 'system'
      }
    })
  }
}))

// Initialize with some mock notifications for demonstration
if (typeof window !== 'undefined') {
  const store = useNotificationsStore.getState()
  
  // Add some sample notifications with improved visual appeal
  setTimeout(() => {
    store.addAppointmentNotification({
      patientName: 'Maria Silva',
      doctorName: 'Dr. João Santos',
      scheduledAt: 'segunda-feira, 20 de agosto às 14:30',
      appointmentId: 'apt_123',
      source: 'manual'
    })
    
    store.addAIBookingNotification({
      patientName: 'Carlos Oliveira',
      doctorName: 'Dra. Ana Costa',
      scheduledAt: 'terça-feira, 21 de agosto às 09:15',
      appointmentId: 'apt_124',
      chatId: 'chat_456'
    })
    
    store.addReminderNotification({
      patientName: 'José Ferreira',
      scheduledAt: 'hoje às 16:00',
      appointmentId: 'apt_125',
      reminderType: 'today'
    })
  }, 1000)
}