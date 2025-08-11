import { create } from 'zustand'
import { Doctor } from '@/types'
import { apiClient } from '@/lib/api'

interface DoctorsState {
  doctors: Doctor[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadDoctors: (specialtyId?: string) => Promise<void>
  clearError: () => void
}

export const useDoctorsStore = create<DoctorsState>((set) => ({
  doctors: [],
  isLoading: false,
  error: null,

  loadDoctors: async (specialtyId?: string) => {
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getDoctors({ specialtyId })
      
      if (response.success && response.data) {
        set({
          doctors: response.data,
          isLoading: false
        })
      } else {
        set({
          error: response.error?.message || 'Failed to load doctors',
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