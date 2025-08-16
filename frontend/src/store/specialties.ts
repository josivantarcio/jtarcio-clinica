import { create } from 'zustand'
import { Specialty } from '@/types'
import { apiClient } from '@/lib/api'

interface SpecialtiesState {
  specialties: Specialty[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadSpecialties: (params?: { withActiveDoctors?: boolean }) => Promise<void>
  clearError: () => void
}

export const useSpecialtiesStore = create<SpecialtiesState>((set) => ({
  specialties: [],
  isLoading: false,
  error: null,

  loadSpecialties: async (params = {}) => {
    console.log('🔍 LoadSpecialties chamado com params:', params)
    set({ isLoading: true, error: null })
    
    try {
      console.log('📡 Fazendo chamada API para especialidades...')
      const response = await apiClient.getSpecialties({
        isActive: true,
        ...params
      })
      
      console.log('📥 Resposta da API especialidades:', response)
      
      if (response.success && response.data) {
        console.log('✅ Especialidades carregadas:', response.data.length, 'itens')
        set({
          specialties: response.data,
          isLoading: false
        })
      } else {
        console.log('❌ Erro na resposta:', response.error)
        set({
          error: response.error?.message || 'Failed to load specialties',
          isLoading: false
        })
      }
    } catch (error) {
      console.error('💥 Erro de rede ao carregar especialidades:', error)
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