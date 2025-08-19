'use client'

import { cn } from '@/lib/utils'
import { Loader2, RefreshCw } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'primary' | 'secondary'
  className?: string
}

interface LoadingStateProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  className?: string
  spinnerSize?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'overlay' | 'replace' | 'inline'
}

interface LoadingOverlayProps {
  isLoading: boolean
  text?: string
  className?: string
}

// Componente básico de spinner
export function LoadingSpinner({ 
  size = 'md', 
  variant = 'default',
  className 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const variantClasses = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    secondary: 'text-secondary-foreground'
  }

  return (
    <Loader2 
      className={cn(
        'animate-spin',
        sizeClasses[size],
        variantClasses[variant],
        className
      )} 
    />
  )
}

// Loading state que substitui ou sobrepõe o conteúdo
export function LoadingState({ 
  isLoading, 
  children, 
  loadingText = 'Carregando...',
  className,
  spinnerSize = 'md',
  variant = 'replace'
}: LoadingStateProps) {
  if (!isLoading) {
    return <>{children}</>
  }

  const loadingContent = (
    <div className={cn(
      'flex items-center justify-center space-x-2 py-8',
      className
    )}>
      <LoadingSpinner size={spinnerSize} variant="primary" />
      <span className="text-sm text-muted-foreground">{loadingText}</span>
    </div>
  )

  if (variant === 'overlay') {
    return (
      <div className="relative">
        {children}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="flex items-center space-x-2 bg-card p-4 rounded-lg shadow-lg border">
            <LoadingSpinner size={spinnerSize} variant="primary" />
            <span className="text-sm font-medium">{loadingText}</span>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <div className="flex items-center space-x-2">
        {children}
        <LoadingSpinner size="sm" variant="primary" />
      </div>
    )
  }

  return loadingContent
}

// Overlay de loading para páginas completas
export function LoadingOverlay({ 
  isLoading, 
  text = 'Carregando...',
  className 
}: LoadingOverlayProps) {
  if (!isLoading) return null

  return (
    <div className={cn(
      'fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center',
      className
    )}>
      <div className="bg-card p-6 rounded-lg shadow-xl border max-w-sm w-full mx-4">
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="lg" variant="primary" />
          <div>
            <h3 className="font-semibold">{text}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Aguarde um momento...
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Loading para botões
interface LoadingButtonProps {
  isLoading: boolean
  children: React.ReactNode
  loadingText?: string
  disabled?: boolean
  className?: string
  onClick?: () => void
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function LoadingButton({
  isLoading,
  children,
  loadingText,
  disabled,
  className,
  onClick,
  variant = 'default',
  size = 'default',
  ...props
}: LoadingButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        // Variant styles
        variant === 'default' && 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        variant === 'outline' && 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        variant === 'link' && 'text-primary underline-offset-4 hover:underline',
        // Size styles
        size === 'default' && 'h-9 px-4 py-2',
        size === 'sm' && 'h-8 rounded-md px-3 text-xs',
        size === 'lg' && 'h-10 rounded-md px-8',
        size === 'icon' && 'h-9 w-9',
        className
      )}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...props}
    >
      {isLoading ? (
        <>
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </>
      ) : (
        children
      )}
    </button>
  )
}

// Hook para loading state
export function useLoading(initialState = false) {
  const [isLoading, setIsLoading] = React.useState(initialState)

  const startLoading = React.useCallback(() => {
    setIsLoading(true)
  }, [])

  const stopLoading = React.useCallback(() => {
    setIsLoading(false)
  }, [])

  const withLoading = React.useCallback(async <T,>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    try {
      startLoading()
      return await asyncFn()
    } finally {
      stopLoading()
    }
  }, [startLoading, stopLoading])

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading
  }
}

import React from 'react'