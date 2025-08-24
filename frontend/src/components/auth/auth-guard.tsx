'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthWithHydration } from '@/hooks/use-auth-with-hydration'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Auth Guard component that protects routes from unauthorized access
 * Handles hydration properly to prevent flash of login screen
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading, isReady } = useAuthWithHydration()
  const router = useRouter()

  useEffect(() => {
    if (isReady && !isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, isLoading, isReady, router])

  // Show loading while hydrating or checking auth
  if (!isReady || isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      )
    )
  }

  // If not authenticated after hydration, show loading (redirect is in effect)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Redirecionando...</p>
        </div>
      </div>
    )
  }

  // User is authenticated and ready - render children
  return <>{children}</>
}