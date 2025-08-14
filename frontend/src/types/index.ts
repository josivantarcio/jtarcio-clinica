export interface User {
  id: string
  email: string
  name: string
  role: 'PATIENT' | 'DOCTOR' | 'ADMIN' | 'RECEPTIONIST'
  avatar?: string
  createdAt: Date
  updatedAt: Date
}

export interface Patient {
  id: string
  userId: string
  user: User
  cpf: string
  phone: string
  birthDate: Date
  address?: string
  emergencyContact?: string
  medicalHistory?: string
  insurance?: string
}

export interface Doctor {
  id: string
  userId: string
  user: User
  crm: string
  specialtyId: string
  specialty?: Specialty
  subSpecialties: string[]
  biography?: string
  experience?: number
  consultationFee?: number
  consultationDuration: number
  isActive: boolean
  acceptsNewPatients: boolean
  phone?: string
  createdAt: string | Date
  updatedAt: string | Date
}

export interface Specialty {
  id: string
  name: string
  description?: string
  duration: number // minutes
  price: number
}

export interface Appointment {
  id: string
  patientId: string
  patient?: {
    id: string
    fullName: string
    email: string
    phone: string
    cpf: string
    user?: User
  }
  doctorId: string
  doctor?: {
    id: string
    crm: string
    user: {
      fullName: string
      name?: string
      email: string
    }
    specialty?: {
      name: string
    }
  }
  specialtyId: string
  specialty?: Specialty
  scheduledAt: string | Date
  duration: number
  endTime: string | Date
  status: AppointmentStatus
  type?: AppointmentType
  reason?: string
  notes?: string
  cancellationReason?: string
  cancelledAt?: string | Date
  completedAt?: string | Date
  createdAt: string | Date
  updatedAt: string | Date
}

export type AppointmentStatus = 
  | 'SCHEDULED' 
  | 'CONFIRMED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'NO_SHOW'
  | 'RESCHEDULED'

export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'EMERGENCY' | 'PROCEDURE'

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  doctorId?: string
}

export interface ChatMessage {
  id: string
  content: string
  sender: 'user' | 'assistant' | 'system'
  timestamp: Date
  metadata?: {
    intent?: string
    entities?: any[]
    confidence?: number
    actions?: string[]
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  meta?: any
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AppointmentBooking {
  specialtyId: string
  doctorId: string
  scheduledAt: Date
  type: AppointmentType
  notes?: string
  patientInfo?: {
    name: string
    email: string
    cpf: string
    phone: string
    birthDate: Date
  }
}

export interface DashboardStats {
  totalAppointments: number
  todayAppointments: number
  pendingAppointments: number
  completedAppointments: number
  cancelledAppointments: number
  revenue: number
  patientGrowth: number
  satisfactionScore: number
}

export interface NotificationSettings {
  email: boolean
  sms: boolean
  whatsapp: boolean
  push: boolean
  reminderTiming: number // hours before appointment
}

export interface ClinicSettings {
  name: string
  address: string
  phone: string
  email: string
  logo?: string
  workingHours: {
    [key: string]: {
      start: string
      end: string
      active: boolean
    }
  }
  appointmentDuration: number
  advanceBookingLimit: number // days
  cancellationPolicy: string
  notifications: NotificationSettings
}