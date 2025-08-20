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
  initDevelopmentMode: () => void
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
        
        // Skip authentication in development if backend is not running
        if (process.env.NODE_ENV === 'development' && token === 'fake-jwt-token-for-testing') {
          console.log('🧪 Development mode: Skipping user profile loading')
          set({
            user: {
              id: 'dev-user-1',
              firstName: 'Admin',
              lastName: 'Developer',
              email: 'admin@dev.local',
              role: 'ADMIN',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            isAuthenticated: true,
            isLoading: false
          })
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
        } catch (error) {
          console.error('Error loading user:', error)
          // In development, don't logout on API errors - backend might be down
          if (process.env.NODE_ENV === 'development') {
            console.warn('🧪 Development mode: API error ignored, staying logged in')
            set({
              user: {
                id: 'dev-user-1',
                firstName: 'Admin',
                lastName: 'Developer', 
                email: 'admin@dev.local',
                role: 'ADMIN',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              isAuthenticated: true,
              isLoading: false
            })
          } else {
            get().logout()
          }
        } finally {
          set({ isLoading: false })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      // Development helper: initialize with fake user if needed
      initDevelopmentMode: () => {
        if (process.env.NODE_ENV === 'development') {
          const { token } = get()
          if (!token) {
            console.log('🧪 Development mode: Auto-initializing with fake token')
            set({
              token: 'fake-jwt-token-for-testing',
              user: {
                id: 'dev-user-1',
                firstName: 'Admin',
                lastName: 'Developer',
                email: 'admin@dev.local',
                role: 'ADMIN',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              },
              isAuthenticated: true
            })
          }
        }
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