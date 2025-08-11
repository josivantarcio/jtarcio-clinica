import { create } from 'zustand'
import { Appointment, AppointmentBooking } from '@/types'
import { apiClient } from '@/lib/api'

interface AppointmentsState {
  appointments: Appointment[]
  currentAppointment: Appointment | null
  isLoading: boolean
  error: string | null
  
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
}

export const useAppointmentsStore = create<AppointmentsState>((set, get) => ({
  appointments: [],
  currentAppointment: null,
  isLoading: false,
  error: null,
  filters: {},

  loadAppointments: async (params = {}) => {
    set({ isLoading: true, error: null })
    
    try {
      const { filters } = get()
      const response = await apiClient.getAppointments({ ...filters, ...params })
      
      if (response.success && response.data) {
        set({
          appointments: response.data.appointments || response.data,
          isLoading: false
        })
      } else {
        set({
          error: response.error?.message || 'Failed to load appointments',
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

  createAppointment: async (data: AppointmentBooking) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.createAppointment(data)
      
      if (response.success && response.data) {
        // Reload appointments to get updated list
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
        
        // Reload appointments
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
        // Reload appointments
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
        
        // Reload appointments
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
  }
}))