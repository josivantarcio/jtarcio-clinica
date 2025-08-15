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
        // Transform API data to expected Doctor structure
        const transformedDoctors: Doctor[] = response.data
          .filter((userData: any) => userData.doctorProfile) // Only users with doctor profile
          .map((userData: any) => ({
            id: userData.doctorProfile.id || userData.id,
            userId: userData.id,
            user: {
              id: userData.id,
              email: userData.email,
              name: userData.fullName || `${userData.firstName} ${userData.lastName}`.trim() || 'Nome não informado',
              role: userData.role,
              avatar: userData.avatar,
              createdAt: userData.createdAt,
              updatedAt: userData.updatedAt
            },
            crm: userData.doctorProfile.crm,
            specialtyId: userData.doctorProfile.specialtyId,
            specialty: userData.doctorProfile.specialty,
            subSpecialties: userData.doctorProfile.subSpecialties || [],
            biography: userData.doctorProfile.biography,
            experience: userData.doctorProfile.experience,
            consultationFee: userData.doctorProfile.consultationFee,
            consultationDuration: userData.doctorProfile.consultationDuration || 30,
            isActive: userData.doctorProfile.isActive,
            acceptsNewPatients: userData.doctorProfile.acceptsNewPatients,
            phone: userData.phone,
            createdAt: userData.createdAt,
            updatedAt: userData.updatedAt
          }))

        set({
          doctors: transformedDoctors,
          isLoading: false
        })
      } else {
        set({
          error: response.error?.message || 'Failed to load doctors',
          isLoading: false
        })
      }
    } catch (error) {
      console.error('Error loading doctors:', error)
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