import { create } from 'zustand'
import { Appointment, AppointmentBooking } from '@/types'
import { apiClient } from '@/lib/api'

interface AppointmentsState {
  appointments: Appointment[]
  currentAppointment: Appointment | null
  isLoading: boolean
  error: string | null
  
  // Cache
  cache: {
    [key: string]: {
      data: Appointment[]
      timestamp: number
      ttl: number
    }
  }
  
  // Pending requests to avoid duplicates
  pendingRequests: {
    [key: string]: Promise<any>
  }
  
  // Filters
  filters: {
    status?: string
    date?: string
    doctorId?: string
    patientId?: string
  }
  
  // Actions
  loadAppointments: (params?: any) => Promise<void>
  createAppointment: (data: AppointmentBooking) => Promise<boolean>
  getAppointment: (id: string) => Promise<void>
  rescheduleAppointment: (id: string, data: any) => Promise<boolean>
  cancelAppointment: (id: string, reason: string) => Promise<boolean>
  completeAppointment: (id: string, data: any) => Promise<boolean>
  setFilters: (filters: any) => void
  clearError: () => void
  clearCache: () => void
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  appointments: [],
  currentAppointment: null,
  isLoading: false,
  error: null,
  cache: {},
  pendingRequests: {},
  filters: {},

  loadAppointments: async (params = {}) => {
    const { filters, cache, pendingRequests } = get()
    const queryParams = { ...filters, ...params }
    const cacheKey = JSON.stringify(queryParams)
    const CACHE_TTL = 2 * 60 * 1000 // 2 minutos
    
    // Verificar cache válido
    const cachedData = cache[cacheKey]
    if (cachedData && Date.now() - cachedData.timestamp < cachedData.ttl) {
      set({
        appointments: cachedData.data,
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
        const response = await apiClient.getAppointments(queryParams)
        
        if (response.success && response.data) {
          const appointments = response.data.appointments || response.data
          
          // Atualizar cache
          set(state => ({
            appointments,
            isLoading: false,
            cache: {
              ...state.cache,
              [cacheKey]: {
                data: appointments,
                timestamp: Date.now(),
                ttl: CACHE_TTL
              }
            },
            pendingRequests: {
              ...state.pendingRequests,
              [cacheKey]: undefined // Remove da lista de pendentes
            }
          }))
          
          return appointments
        } else {
          set({
            error: response.error?.message || 'Failed to load appointments',
            isLoading: false
          })
          throw new Error(response.error?.message || 'Failed to load appointments')
        }
      } catch (error) {
        set(state => ({
          error: 'Network error',
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

  createAppointment: async (data: AppointmentBooking) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.createAppointment(data)
      
      if (response.success && response.data) {
        // Invalidar cache e recarregar
        get().clearCache()
        get().loadAppointments()
        set({ isLoading: false })
        return true
      } else {
        set({
          error: response.error?.message || 'Failed to create appointment',
          isLoading: false
        })
        return false
      }
    } catch (_error) {
      set({
        error: 'Network error',
        isLoading: false
      })
      return false
    }
  },

  getAppointment: async (id: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getAppointment(id)
      
      if (response.success && response.data) {
        set({
          currentAppointment: response.data,
          isLoading: false
        })
      } else {
        set({
          error: response.error?.message || 'Failed to load appointment',
          isLoading: false
        })
      }
    } catch (_error) {
      set({
        error: 'Network error',
        isLoading: false
      })
    }
  },

  rescheduleAppointment: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.rescheduleAppointment(id, data)
      
      if (response.success && response.data) {
        // Update current appointment if it matches
        const { currentAppointment } = get()
        if (currentAppointment?.id === id) {
          set({ currentAppointment: response.data })
        }
        
        // Invalidar cache e recarregar
        get().clearCache()
        get().loadAppointments()
        set({ isLoading: false })
        return true
      } else {
        set({
          error: response.error?.message || 'Failed to reschedule appointment',
          isLoading: false
        })
        return false
      }
    } catch (_error) {
      set({
        error: 'Network error',
        isLoading: false
      })
      return false
    }
  },

  cancelAppointment: async (id: string, reason: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.cancelAppointment(id, { reason })
      
      if (response.success) {
        // Invalidar cache e recarregar
        get().clearCache()
        get().loadAppointments()
        set({ isLoading: false })
        return true
      } else {
        set({
          error: response.error?.message || 'Failed to cancel appointment',
          isLoading: false
        })
        return false
      }
    } catch (_error) {
      set({
        error: 'Network error',
        isLoading: false
      })
      return false
    }
  },

  completeAppointment: async (id: string, data: any) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.completeAppointment(id, data)
      
      if (response.success && response.data) {
        // Update current appointment if it matches
        const { currentAppointment } = get()
        if (currentAppointment?.id === id) {
          set({ currentAppointment: response.data })
        }
        
        // Invalidar cache e recarregar
        get().clearCache()
        get().loadAppointments()
        set({ isLoading: false })
        return true
      } else {
        set({
          error: response.error?.message || 'Failed to complete appointment',
          isLoading: false
        })
        return false
      }
    } catch (_error) {
      set({
        error: 'Network error',
        isLoading: false
      })
      return false
    }
  },

  setFilters: (newFilters: any) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters }
    }))
  },

  clearError: () => {
    set({ error: null })
  },

  clearCache: () => {
    set({ cache: {} })
  }
}))