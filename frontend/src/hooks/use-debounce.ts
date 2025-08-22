'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Hook para debounce de valores
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

// Hook para debounce de callbacks
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>()

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

// Hook para auto-save com debounce
export function useAutoSave<T>(
  value: T,
  saveFunction: (value: T) => Promise<void> | void,
  options: {
    delay?: number
    enabled?: boolean
    onSaveStart?: () => void
    onSaveSuccess?: () => void
    onSaveError?: (error: any) => void
  } = {}
) {
  const {
    delay = 1000,
    enabled = true,
    onSaveStart,
    onSaveSuccess,
    onSaveError
  } = options

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<any>(null)
  
  const debouncedValue = useDebounce(value, delay)
  const initialValueRef = useRef<T>(value)
  const hasChangedRef = useRef(false)

  // Track if value has changed from initial
  useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(initialValueRef.current)) {
      hasChangedRef.current = true
    }
  }, [value])

  const performSave = useCallback(async (valueToSave: T) => {
    if (!enabled || !hasChangedRef.current) return

    try {
      setIsSaving(true)
      setError(null)
      onSaveStart?.()

      await saveFunction(valueToSave)
      
      setLastSaved(new Date())
      hasChangedRef.current = false
      onSaveSuccess?.()
    } catch (err) {
      setError(err)
      onSaveError?.(err)
    } finally {
      setIsSaving(false)
    }
  }, [saveFunction, enabled, onSaveStart, onSaveSuccess, onSaveError])

  // Auto-save when debounced value changes
  useEffect(() => {
    performSave(debouncedValue)
  }, [debouncedValue, performSave])

  const forceSave = useCallback(() => {
    performSave(value)
  }, [performSave, value])

  const reset = useCallback(() => {
    initialValueRef.current = value
    hasChangedRef.current = false
    setError(null)
    setLastSaved(null)
  }, [value])

  return {
    isSaving,
    lastSaved,
    error,
    hasUnsavedChanges: hasChangedRef.current,
    forceSave,
    reset
  }
}

// Hook para detectar mudanças não salvas antes de sair da página
export function useUnsavedChanges(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault()
        event.returnValue = 'Você tem alterações não salvas. Deseja realmente sair?'
        return event.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])
}

// Hook combinado para formulários com auto-save
export function useFormAutoSave<T extends Record<string, any>>(
  formData: T,
  saveFunction: (data: T) => Promise<void>,
  options?: {
    delay?: number
    enabled?: boolean
  }
) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  
  const autoSave = useAutoSave(formData, saveFunction, {
    ...options,
    onSaveStart: () => setStatus('saving'),
    onSaveSuccess: () => {
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    },
    onSaveError: () => setStatus('error')
  })

  useUnsavedChanges(autoSave.hasUnsavedChanges)

  return {
    ...autoSave,
    status
  }
}

// Hook para debounce de chamadas de API
export function useDebouncedApi<T extends (...args: any[]) => Promise<any>>(
  apiCall: T,
  delay: number = 300
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingRef = useRef<Promise<any> | null>(null)

  return useCallback(
    (async (...args: Parameters<T>) => {
      // Se há uma chamada pendente, retorna ela
      if (pendingRef.current) {
        return pendingRef.current
      }

      // Limpa timeout anterior se existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Cria nova Promise debounced
      pendingRef.current = new Promise((resolve, reject) => {
        timeoutRef.current = setTimeout(async () => {
          try {
            const result = await apiCall(...args)
            pendingRef.current = null
            resolve(result)
          } catch (error) {
            pendingRef.current = null
            reject(error)
          }
        }, delay)
      })

      return pendingRef.current
    }) as T,
    [apiCall, delay]
  )
}

export default useDebounce