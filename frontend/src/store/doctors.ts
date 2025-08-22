import { create } from 'zustand'
import { Doctor } from '@/types'
import { apiClient } from '@/lib/api'

interface DoctorWithStats extends Doctor {
  totalPatients: number
  totalAppointments: number
  rating: number
  reviewsCount: number
  nextAppointment?: Date
  status: 'active' | 'inactive' | 'vacation'
  specialtyNames: string[]
}

interface DoctorsState {
  doctors: DoctorWithStats[]
  isLoading: boolean
  error: string | null
  
  // Cache
  cache: {
    [key: string]: {
      data: DoctorWithStats[]
      timestamp: number
      ttl: number
    }
  }
  
  // Pending requests to avoid duplicates
  pendingRequests: {
    [key: string]: Promise<any>
  }
  
  // Actions
  loadDoctors: (specialtyId?: string) => Promise<void>
  updateDoctorStatus: (doctorId: string, status: string) => Promise<boolean>
  clearCache: () => void
  clearError: () => void
}

export const useDoctorsStore = create<DoctorsState>((set, get) => ({
  doctors: [],
  isLoading: false,
  error: null,
  cache: {},
  pendingRequests: {},

  loadDoctors: async (specialtyId?: string) => {
    const { cache, pendingRequests } = get()
    const cacheKey = JSON.stringify({ specialtyId })
    const CACHE_TTL = 3 * 60 * 1000 // 3 minutos para médicos (dados menos dinâmicos)
    
    // Verificar cache válido
    const cachedData = cache[cacheKey]
    if (cachedData && Date.now() - cachedData.timestamp < cachedData.ttl) {
      set({
        doctors: cachedData.data,
        isLoading: false,
        error: null
      })
      return
    }
    
    // Verificar se já existe uma requisição pendente
    if (pendingRequests[cacheKey]) {
      return pendingRequests[cacheKey]
    }
    
    set({ isLoading: true, error: null })
    
    // Criar e armazenar a Promise pendente
    const requestPromise = (async () => {
      try {
        const response = await apiClient.getDoctors({ specialtyId })
        
        if (response.success && response.data) {
          // Transform API data to doctors with calculated stats
          const doctorsData: DoctorWithStats[] = response.data
            .filter((user: any) => user.doctorProfile) // Only users with doctor profile
            .map((user: any) => {
              const doctor = user.doctorProfile
              return {
                id: doctor.id,
                userId: user.id,
                user: {
                  id: user.id,
                  email: user.email,
                  name: user.fullName,
                  role: user.role,
                  avatar: user.avatar,
                  createdAt: user.createdAt,
                  updatedAt: user.updatedAt
                },
                crm: doctor.crm,
                specialtyId: doctor.specialty?.id || '',
                specialty: doctor.specialty,
                subSpecialties: doctor.subSpecialties || [],
                biography: doctor.biography,
                experience: doctor.experience,
                consultationFee: doctor.consultationFee,
                consultationDuration: doctor.consultationDuration || 30,
                isActive: doctor.isActive,
                acceptsNewPatients: doctor.acceptsNewPatients,
                phone: user.phone,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                // Stats (will be calculated from actual data later)
                totalPatients: 0,
                totalAppointments: 0,
                rating: 0,
                reviewsCount: 0,
                nextAppointment: undefined,
                status: doctor.isActive ? 'active' : 'inactive',
                specialtyNames: doctor.specialty ? [doctor.specialty.name] : []
              }
            })
          
          // Atualizar cache e dados
          set(state => ({
            doctors: doctorsData,
            isLoading: false,
            cache: {
              ...state.cache,
              [cacheKey]: {
                data: doctorsData,
                timestamp: Date.now(),
                ttl: CACHE_TTL
              }
            },
            pendingRequests: {
              ...state.pendingRequests,
              [cacheKey]: undefined // Remove da lista de pendentes
            }
          }))
          
          return doctorsData
        } else {
          // No doctors found - clean state
          set(state => ({
            doctors: [],
            isLoading: false,
            error: response.error?.message || 'Failed to load doctors',
            pendingRequests: {
              ...state.pendingRequests,
              [cacheKey]: undefined // Remove da lista de pendentes
            }
          }))
          return []
        }
      } catch (error) {
        console.error('Error loading doctors:', error)
        set(state => ({
          error: 'Network error',
          doctors: [],
          isLoading: false,
          pendingRequests: {
            ...state.pendingRequests,
            [cacheKey]: undefined // Remove da lista de pendentes
          }
        }))
        throw error
      }
    })()
    
    // Armazenar requisição pendente
    set(state => ({
      pendingRequests: {
        ...state.pendingRequests,
        [cacheKey]: requestPromise
      }
    }))
    
    return requestPromise
  },

  updateDoctorStatus: async (doctorId: string, newStatus: string) => {
    try {
      const response = await apiClient.updateUser(doctorId, { status: newStatus })
      
      if (response.success) {
        // Update doctor in the local state
        set(state => ({
          doctors: state.doctors.map(doctor => 
            doctor.id === doctorId 
              ? { ...doctor, status: newStatus === 'ACTIVE' ? 'active' : 'inactive' }
              : doctor
          )
        }))
        
        // Invalidar cache para próxima carga
        get().clearCache()
        
        return true
      } else {
        throw new Error(response.error?.message || 'Failed to update doctor status')
      }
    } catch (error) {
      console.error('Error updating doctor status:', error)
      throw error
    }
  },

  clearCache: () => {
    set({ cache: {} })
  },

  clearError: () => {
    set({ error: null })
  }
}))