'use client'

import { useState, useCallback } from 'react'

export interface ValidationRule {
  required?: boolean
  minLength?: number
  maxLength?: number
  pattern?: RegExp
  email?: boolean
  phone?: boolean
  cpf?: boolean
  custom?: (value: any) => string | null
}

export interface ValidationError {
  field: string
  message: string
}

export interface FieldValidation {
  [key: string]: ValidationRule
}

// Validation utilities
const validationUtils = {
  isEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },
  
  isPhone: (phone: string): boolean => {
    const phoneRegex = /^\(?(\d{2})\)?[\s-]?(\d{4,5})[\s-]?(\d{4})$/
    return phoneRegex.test(phone.replace(/\D/g, ''))
  },
  
  isCPF: (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '')
    
    if (cleanCPF.length !== 11 || /^(\d)\1{10}$/.test(cleanCPF)) {
      return false
    }
    
    // Validate CPF algorithm
    let sum = 0
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i)
    }
    let digit = 11 - (sum % 11)
    if (digit > 9) digit = 0
    
    if (digit !== parseInt(cleanCPF.charAt(9))) return false
    
    sum = 0
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i)
    }
    digit = 11 - (sum % 11)
    if (digit > 9) digit = 0
    
    return digit === parseInt(cleanCPF.charAt(10))
  }
}

export function useValidation<T extends Record<string, any>>(
  validationRules: FieldValidation
) {
  const [errors, setErrors] = useState<ValidationError[]>([])
  
  const validateField = useCallback((
    field: string,
    value: any,
    rules: ValidationRule
  ): string | null => {
    // Required validation
    if (rules.required && (!value || value.toString().trim() === '')) {
      return 'Este campo é obrigatório'
    }
    
    // Skip other validations if field is empty and not required
    if (!value || value.toString().trim() === '') {
      return null
    }
    
    const stringValue = value.toString()
    
    // Length validations
    if (rules.minLength && stringValue.length < rules.minLength) {
      return `Deve ter pelo menos ${rules.minLength} caracteres`
    }
    
    if (rules.maxLength && stringValue.length > rules.maxLength) {
      return `Deve ter no máximo ${rules.maxLength} caracteres`
    }
    
    // Pattern validation
    if (rules.pattern && !rules.pattern.test(stringValue)) {
      return 'Formato inválido'
    }
    
    // Email validation
    if (rules.email && !validationUtils.isEmail(stringValue)) {
      return 'Email inválido'
    }
    
    // Phone validation
    if (rules.phone && !validationUtils.isPhone(stringValue)) {
      return 'Telefone inválido'
    }
    
    // CPF validation
    if (rules.cpf && !validationUtils.isCPF(stringValue)) {
      return 'CPF inválido'
    }
    
    // Custom validation
    if (rules.custom) {
      return rules.custom(value)
    }
    
    return null
  }, [])
  
  const validate = useCallback((data: T): boolean => {
    const newErrors: ValidationError[] = []
    
    Object.entries(validationRules).forEach(([field, rules]) => {
      const error = validateField(field, data[field], rules)
      if (error) {
        newErrors.push({ field, message: error })
      }
    })
    
    setErrors(newErrors)
    return newErrors.length === 0
  }, [validationRules, validateField])
  
  const validateSingle = useCallback((field: string, value: any): boolean => {
    const rules = validationRules[field]
    if (!rules) return true
    
    const error = validateField(field, value, rules)
    
    setErrors(prevErrors => {
      const filtered = prevErrors.filter(e => e.field !== field)
      return error ? [...filtered, { field, message: error }] : filtered
    })
    
    return !error
  }, [validationRules, validateField])
  
  const getFieldError = useCallback((field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message
  }, [errors])
  
  const hasErrors = errors.length > 0
  
  const clearErrors = useCallback(() => {
    setErrors([])
  }, [])
  
  const clearFieldError = useCallback((field: string) => {
    setErrors(prevErrors => prevErrors.filter(e => e.field !== field))
  }, [])
  
  return {
    errors,
    hasErrors,
    validate,
    validateSingle,
    getFieldError,
    clearErrors,
    clearFieldError
  }
}

// Form input component with validation
interface ValidatedInputProps {
  name: string
  value: any
  onChange: (name: string, value: any) => void
  validation: ReturnType<typeof useValidation>
  label?: string
  placeholder?: string
  type?: string
  className?: string
  disabled?: boolean
}

export function ValidatedInput({
  name,
  value,
  onChange,
  validation,
  label,
  placeholder,
  type = 'text',
  className = '',
  disabled = false
}: ValidatedInputProps) {
  const error = validation.getFieldError(name)
  const hasError = !!error
  
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={name} className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <input
        id={name}
        type={type}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        onBlur={() => validation.validateSingle(name, value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-colors ${
          hasError 
            ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 focus:ring-primary focus:border-primary'
        } ${className}`}
      />
      {hasError && (
        <p className="text-sm text-red-600 flex items-center">
          <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  )
}

// Predefined validation rules
export const commonValidations = {
  required: { required: true },
  email: { required: true, email: true },
  phone: { phone: true },
  cpf: { cpf: true },
  password: { required: true, minLength: 8 },
  name: { required: true, minLength: 2, maxLength: 50 },
  text: { maxLength: 500 },
  longText: { maxLength: 2000 }
}

export default useValidation