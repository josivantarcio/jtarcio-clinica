import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { User } from '@/types'
import { apiClient } from '@/lib/api'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  
  // Actions
  login: (email: string, password: string) => Promise<boolean>
  register: (userData: any) => Promise<boolean>
  logout: () => void
  loadUser: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await apiClient.login(email, password)
          
          if (response.success && response.data) {
            const { accessToken, user } = response.data
            
            set({
              user,
              token: accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            
            apiClient.setToken(accessToken)
            return true
          } else {
            set({
              error: response.error?.message || 'Login failed',
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

      register: async (userData: any) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await apiClient.register(userData)
          
          if (response.success && response.data) {
            const { accessToken, user } = response.data
            
            set({
              user,
              token: accessToken,
              isAuthenticated: true,
              isLoading: false,
              error: null
            })
            
            apiClient.setToken(accessToken)
            return true
          } else {
            set({
              error: response.error?.message || 'Registration failed',
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

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null
        })
        apiClient.clearToken()
      },

      loadUser: async () => {
        const { token } = get()
        
        if (!token) {
          set({ isAuthenticated: false, user: null })
          return
        }
        
        set({ isLoading: true })
        
        try {
          // Set the token in apiClient before making the request
          apiClient.setToken(token)
          const response = await apiClient.getProfile()
          
          if (response.success && response.data) {
            set({
              user: response.data,
              isAuthenticated: true,
              isLoading: false
            })
          } else {
            // Token might be invalid
            console.warn('Failed to load user profile, logging out')
            get().logout()
          }
        } catch (_error) {
          console.error('Error loading user:', error)
          get().logout()
        } finally {
          set({ isLoading: false })
        }
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated
      }),
      skipHydration: true,
    }
  )
)