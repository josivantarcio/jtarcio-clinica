import { create } from 'zustand'
import { Specialty } from '@/types'
import { apiClient } from '@/lib/api'

interface SpecialtiesState {
  specialties: Specialty[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadSpecialties: () => Promise<void>
  clearError: () => void
}

export const useSpecialtiesStore = create<SpecialtiesState>((set) => ({
  specialties: [],
  isLoading: false,
  error: null,

  loadSpecialties: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getSpecialties()
      
      if (response.success && response.data) {
        set({
          specialties: response.data,
          isLoading: false
        })
      } else {
        set({
          error: response.error?.message || 'Failed to load specialties',
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

  clearError: () => {
    set({ error: null })
  }
}))