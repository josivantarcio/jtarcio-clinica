/**
 * Data sanitization utilities for medical and personal data
 * Complies with LGPD requirements
 */

import { validateCPF, cleanCPF, formatCPF } from './cpf-validation';

/**
 * Sanitizes CPF input by cleaning and validating
 */
export function sanitizeCPF(cpf: string | null | undefined): string | null {
  if (!cpf || typeof cpf !== 'string') return null;
  
  const cleaned = cleanCPF(cpf);
  
  // Return cleaned CPF if valid, null if invalid
  return validateCPF(cleaned) ? cleaned : null;
}

/**
 * Sanitizes CEP (Brazilian postal code)
 */
export function sanitizeCEP(cep: string | null | undefined): string | null {
  if (!cep || typeof cep !== 'string') return null;
  
  // Remove all non-digits
  const cleaned = cep.replace(/\D/g, '');
  
  // CEP must have exactly 8 digits
  if (cleaned.length !== 8) return null;
  
  // Basic validation: can't be all zeros or all nines
  if (cleaned === '00000000' || cleaned === '99999999') return null;
  
  return cleaned;
}

/**
 * Sanitizes phone number (Brazilian format)
 */
export function sanitizePhone(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== 'string') return null;
  
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Brazilian phone: 10 digits (landline) or 11 digits (mobile)
  if (cleaned.length < 10 || cleaned.length > 11) return null;
  
  // Mobile numbers must start with 9 in the 3rd digit (after area code)
  if (cleaned.length === 11 && cleaned[2] !== '9') return null;
  
  return cleaned;
}

/**
 * Sanitizes medical data inputs to prevent XSS and injection
 */
export function sanitizeMedicalData(input: string | null | undefined): string | null {
  if (!input || typeof input !== 'string') return null;
  
  // Remove potential XSS and script tags
  let sanitized = input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
  
  // Remove SQL injection patterns
  sanitized = sanitized
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/gi, '')
    .replace(/(['"])\s*(OR|AND)\s*\1\s*=\s*\1/gi, '')
    .replace(/(['"])\s*(OR|AND)\s*['"]?\d+['"]?\s*=\s*['"]?\d+['"]?/gi, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
  
  // Limit length for medical data
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }
  
  return sanitized.trim();
}

/**
 * Validates SQL query input for safety
 */
export function validateSQLInput(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  
  // Patterns that indicate SQL injection attempts
  const sqlInjectionPatterns = [
    /('\s*(OR|AND)\s*'?\w+'?\s*=\s*'?\w+'?)/i,
    /('\s*OR\s*'?1'?\s*=\s*'?1'?)/i,
    /('\s*UNION\s+SELECT)/i,
    /(DROP\s+TABLE)/i,
    /(INSERT\s+INTO)/i,
    /(DELETE\s+FROM)/i,
    /--/,
    /\/\*/,
    /\*\//,
    /('\s*;\s*DROP)/i,
    /('\s*;\s*INSERT)/i
  ];
  
  return !sqlInjectionPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitizes email input
 */
export function sanitizeEmail(email: string | null | undefined): string | null {
  if (!email || typeof email !== 'string') return null;
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  
  if (!emailRegex.test(trimmed)) return null;
  
  // Check for suspicious patterns
  if (validateSQLInput(trimmed)) {
    return trimmed;
  }
  
  return null;
}

/**
 * Sanitizes name input (first name, last name)
 */
export function sanitizeName(name: string | null | undefined): string | null {
  if (!name || typeof name !== 'string') return null;
  
  // Remove numbers and special characters, keep only letters, spaces, hyphens, apostrophes
  const sanitized = name
    .replace(/[^a-zA-ZÀ-ÿ\s\-']/g, '')
    .trim()
    .replace(/\s+/g, ' ');
  
  if (sanitized.length < 2 || sanitized.length > 100) return null;
  
  return sanitized;
}

/**
 * General purpose data sanitizer for user inputs
 */
export function sanitizeUserInput(input: any, type: 'cpf' | 'cep' | 'phone' | 'email' | 'name' | 'medical'): any {
  switch (type) {
    case 'cpf':
      return sanitizeCPF(input);
    case 'cep':
      return sanitizeCEP(input);
    case 'phone':
      return sanitizePhone(input);
    case 'email':
      return sanitizeEmail(input);
    case 'name':
      return sanitizeName(input);
    case 'medical':
      return sanitizeMedicalData(input);
    default:
      return input;
  }
}