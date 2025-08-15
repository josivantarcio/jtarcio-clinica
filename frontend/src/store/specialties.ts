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
    set({ isLoading: true, error: null })
    
    try {
      const response = await apiClient.getSpecialties({
        isActive: true,
        ...params
      })
      
      if (response.success && response.data) {
        let specialties = response.data
        
        // Se withActiveDoctors for true, filtrar apenas especialidades com médicos ativos
        if (params.withActiveDoctors) {
          console.log('🔍 Aplicando filtro withActiveDoctors no frontend')
          
          // Buscar médicos ativos
          const doctorsResponse = await apiClient.getUsers({ role: 'DOCTOR' })
          
          if (doctorsResponse.success && doctorsResponse.data) {
            // Filtrar médicos que têm perfil de doctor preenchido e estão ativos
            const activeDoctors = doctorsResponse.data.filter((user: any) => 
              user.doctorProfile && 
              user.status === 'ACTIVE' &&
              user.doctorProfile.isActive &&
              user.doctorProfile.specialty &&
              user.doctorProfile.specialty.id
            )
            
            console.log('👨‍⚕️ Médicos ativos encontrados:', activeDoctors.length)
            
            // Obter IDs das especialidades dos médicos ativos
            const activeSpecialtyIds = new Set(
              activeDoctors.map((doctor: any) => doctor.doctorProfile.specialty.id)
            )
            
            console.log('🏥 Especialidades com médicos ativos:', Array.from(activeSpecialtyIds))
            
            // Filtrar especialidades
            specialties = specialties.filter((specialty: any) => 
              activeSpecialtyIds.has(specialty.id)
            )
            
            console.log('✅ Especialidades filtradas:', specialties.length)
          }
        }
        
        set({
          specialties,
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