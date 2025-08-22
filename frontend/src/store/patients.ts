import { create } from 'zustand'
import { apiClient } from '@/lib/api'
import { Patient } from '@/types'
import { parseDateFromAPI } from '@/lib/date-utils'

interface PatientWithStats extends Patient {
  totalAppointments: number
  lastAppointment?: Date
  nextAppointment?: Date
  status: 'active' | 'inactive' | 'pending'
}

interface PatientsState {
  patients: PatientWithStats[]
  isLoading: boolean
  error: string | null
  
  // Cache
  cache: {
    timestamp: number
    ttl: number
    data: PatientWithStats[] | null
  } | null
  
  // Pending request to avoid duplicates
  pendingRequest: Promise<any> | null
  
  // Actions
  loadPatients: () => Promise<void>
  updatePatientStatus: (patientId: string, status: string) => Promise<boolean>
  clearCache: () => void
  clearError: () => void
}

export const usePatientsStore = create<PatientsState>((set, get) => ({
  patients: [],
  isLoading: false,
  error: null,
  cache: null,
  pendingRequest: null,

  loadPatients: async () => {
    const { cache, pendingRequest } = get()
    const CACHE_TTL = 3 * 60 * 1000 // 3 minutos para pacientes (dados menos dinâmicos)
    
    // Verificar cache válido
    if (cache && Date.now() - cache.timestamp < cache.ttl) {
      set({
        patients: cache.data || [],
        isLoading: false,
        error: null
      })
      return
    }
    
    // Verificar se já existe uma requisição pendente
    if (pendingRequest) {
      return pendingRequest
    }
    
    set({ isLoading: true, error: null })
    
    // Criar e armazenar a Promise pendente
    const requestPromise = (async () => {
      try {
        const response = await apiClient.getPatients()
        
        if (response.success && response.data) {
          // Transform users to patients with real data
          const patientsData: PatientWithStats[] = (response.data || []).map((userData: any) => {
            // Calculate real stats from appointments
            const appointments = userData.appointments || []
            const totalAppointments = appointments.length
            
            // Find last appointment
            const lastAppointment = appointments.length > 0 
              ? new Date(appointments[0].scheduledAt)
              : undefined
            
            // Find next appointment (future appointments)
            const futureAppointments = appointments.filter((apt: any) => new Date(apt.scheduledAt) > new Date())
            const nextAppointment = futureAppointments.length > 0
              ? new Date(futureAppointments[futureAppointments.length - 1].scheduledAt)
              : undefined

            // Map status from backend enum to frontend enum
            const statusMap: { [key: string]: 'active' | 'inactive' | 'pending' } = {
              'ACTIVE': 'active',
              'INACTIVE': 'inactive',
              'SUSPENDED': 'inactive',
              'PENDING_VERIFICATION': 'pending'
            }

            return {
              id: userData.id,
              userId: userData.id,
              user: {
                ...userData,
                name: userData.fullName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim()
              },
              cpf: userData.cpf || 'Não informado',
              phone: userData.phone || 'Não informado',
              birthDate: parseDateFromAPI(userData.dateOfBirth),
              address: userData.patientProfile?.address 
                ? `${userData.patientProfile.address.city || ''}, ${userData.patientProfile.address.state || ''}`.trim().replace(/^,\s*|,\s*$/g, '') || 'Não informado'
                : 'Não informado',
              emergencyContact: userData.patientProfile?.emergencyContactName || 'Não informado',
              medicalHistory: userData.patientProfile?.allergies?.length > 0 || userData.patientProfile?.medications?.length > 0 
                ? 'Possui histórico médico' 
                : 'Nenhum histórico médico',
              insurance: 'Não informado',
              totalAppointments,
              lastAppointment,
              nextAppointment,
              status: statusMap[userData.status] || 'pending'
            }
          })
          
          // Atualizar cache e dados
          set({
            patients: patientsData,
            isLoading: false,
            cache: {
              data: patientsData,
              timestamp: Date.now(),
              ttl: CACHE_TTL
            },
            pendingRequest: null
          })
          
          return patientsData
        } else {
          set({
            error: response.error?.message || 'Failed to load patients',
            isLoading: false,
            pendingRequest: null
          })
          throw new Error(response.error?.message || 'Failed to load patients')
        }
      } catch (error) {
        set({
          error: 'Network error',
          isLoading: false,
          pendingRequest: null
        })
        throw error
      }
    })()
    
    // Armazenar requisição pendente
    set({ pendingRequest: requestPromise })
    
    return requestPromise
  },

  updatePatientStatus: async (patientId: string, newStatus: string) => {
    try {
      const response = await apiClient.updateUser(patientId, { status: newStatus })
      
      if (response.success) {
        // Update patient in the local state
        set(state => ({
          patients: state.patients.map(patient => 
            patient.id === patientId 
              ? { ...patient, status: newStatus === 'ACTIVE' ? 'active' : 'inactive' }
              : patient
          )
        }))
        
        // Invalidar cache para próxima carga
        get().clearCache()
        
        return true
      } else {
        throw new Error(response.error?.message || 'Failed to update patient status')
      }
    } catch (error) {
      console.error('Error updating patient status:', error)
      throw error
    }
  },

  clearCache: () => {
    set({ cache: null })
  },

  clearError: () => {
    set({ error: null })
  }
}))