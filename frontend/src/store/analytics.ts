import { create } from 'zustand'
import { apiClient } from '@/lib/api'

interface AnalyticsData {
  overview?: {
    totalAppointments?: number
    totalRevenue?: number
    patientGrowth?: number
    averageRating?: number
  }
  realTime?: {
    todayBookings?: number
  }
}

interface AnalyticsState {
  analytics: AnalyticsData | null
  isLoading: boolean
  error: string | null
  
  // Cache
  cache: {
    timestamp: number
    ttl: number
    data: AnalyticsData | null
  } | null
  
  // Pending request to avoid duplicates
  pendingRequest: Promise<any> | null
  
  // Actions
  loadAnalytics: (period?: 'today' | 'week' | 'month' | 'quarter' | 'year') => Promise<void>
  clearCache: () => void
  clearError: () => void
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  analytics: null,
  isLoading: false,
  error: null,
  cache: null,
  pendingRequest: null,

  loadAnalytics: async (period: 'today' | 'week' | 'month' | 'quarter' | 'year' = 'month') => {
    const { cache, pendingRequest } = get()
    const CACHE_TTL = 3 * 60 * 1000 // 3 minutos para analytics (dados menos dinâmicos)
    
    // Verificar cache válido
    if (cache && Date.now() - cache.timestamp < cache.ttl) {
      set({
        analytics: cache.data,
        isLoading: false,
        error: null
      })
      return
    }
    
    // Verificar se já existe uma requisição pendente
    if (pendingRequest) {
      return pendingRequest
    }
    
    set({ isLoading: true, error: null })
    
    // Criar e armazenar a Promise pendente
    const requestPromise = (async () => {
      try {
        const response = await apiClient.getAnalytics({ period })
        
        if (response.success && response.data) {
          const analyticsData = response.data
          
          // Atualizar cache e dados
          set({
            analytics: analyticsData,
            isLoading: false,
            cache: {
              data: analyticsData,
              timestamp: Date.now(),
              ttl: CACHE_TTL
            },
            pendingRequest: null
          })
          
          return analyticsData
        } else {
          set({
            error: response.error?.message || 'Failed to load analytics',
            isLoading: false,
            pendingRequest: null
          })
          throw new Error(response.error?.message || 'Failed to load analytics')
        }
      } catch (error) {
        set({
          error: 'Network error',
          isLoading: false,
          pendingRequest: null
        })
        throw error
      }
    })()
    
    // Armazenar requisição pendente
    set({ pendingRequest: requestPromise })
    
    return requestPromise
  },

  clearCache: () => {
    set({ cache: null })
  },

  clearError: () => {
    set({ error: null })
  }
}))