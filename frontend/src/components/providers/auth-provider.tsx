'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/auth'

interface AuthProviderProps {
  children: React.ReactNode
}

/**
 * Global Auth Provider that handles hydration at the app level
 * This ensures all pages start with the correct auth state
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    // Hydrate the auth store
    const unsubscribe = useAuthStore.persist.rehydrate()
    
    // Mark as hydrated after a short delay to ensure state is properly loaded
    const timer = setTimeout(() => {
      setIsHydrated(true)
    }, 100)

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
      clearTimeout(timer)
    }
  }, [])

  // Show loading until hydrated
  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">EO Clínica</h3>
            <p className="text-sm text-muted-foreground">Inicializando sistema...</p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}