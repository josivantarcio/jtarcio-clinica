'use client'

import { useAuthStore } from '@/store/auth'

/**
 * Custom hook that returns auth state with hydration already handled globally
 * Since AuthProvider handles hydration at app level, this is simplified
 */
export function useAuthWithHydration() {
  const authState = useAuthStore()
  
  // Since hydration is handled at app level, we can safely return state
  return {
    ...authState,
    isReady: true // Always ready after global hydration
  }
}