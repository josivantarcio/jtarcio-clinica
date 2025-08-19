/**
 * Utility functions for date handling and calculations
 */

/**
 * Calculate years of experience from graduation or CRM registration date
 * @param graduationDate - Medical school graduation date
 * @param crmRegistrationDate - CRM registration date
 * @returns Number of years of experience
 */
export function calculateExperience(
  graduationDate?: Date | string | null,
  crmRegistrationDate?: Date | string | null
): number {
  // Use the later date between graduation and CRM registration
  // This ensures we count from when the doctor actually started practicing
  
  const graduation = graduationDate ? new Date(graduationDate) : null
  const crmRegistration = crmRegistrationDate ? new Date(crmRegistrationDate) : null
  
  let startDate: Date | null = null
  
  if (graduation && crmRegistration) {
    // Use the later date (when they could actually start practicing)
    startDate = graduation > crmRegistration ? graduation : crmRegistration
  } else if (graduation) {
    startDate = graduation
  } else if (crmRegistration) {
    startDate = crmRegistration
  }
  
  if (!startDate) {
    return 0 // No dates available
  }
  
  const now = new Date()
  const diffInMilliseconds = now.getTime() - startDate.getTime()
  const diffInYears = diffInMilliseconds / (1000 * 60 * 60 * 24 * 365.25) // Account for leap years
  
  return Math.floor(Math.max(0, diffInYears))
}

/**
 * Format experience years into a readable string
 * @param years - Number of years
 * @returns Formatted string
 */
export function formatExperience(years: number): string {
  if (years === 0) {
    return 'Recém-formado'
  } else if (years === 1) {
    return '1 ano de experiência'
  } else {
    return `${years} anos de experiência`
  }
}

/**
 * Fix timezone issues with date inputs
 * @param dateString - Date string from input (YYYY-MM-DD)
 * @returns Properly formatted date string for API (without timezone conversion)
 */
export function formatDateForAPI(dateString: string): string {
  if (!dateString) return ''
  // Return the date without timezone conversion to avoid day shifts
  // The backend should receive the date exactly as entered by the user
  return dateString
}

/**
 * Parse date from API response handling timezone issues
 * @param dateValue - Date value from API
 * @returns Date object or undefined
 */
export function parseDateFromAPI(dateValue: string | Date | null | undefined): Date | undefined {
  if (!dateValue) return undefined
  
  const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString()
  
  // Extract just the date part if it's an ISO string
  if (dateStr.includes('T')) {
    const datePart = dateStr.split('T')[0]
    // Create date object in local timezone, not UTC
    const [year, month, day] = datePart.split('-').map(Number)
    return new Date(year, month - 1, day) // month is 0-indexed
  } else {
    // If it's just date string (YYYY-MM-DD), parse as local date
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day) // month is 0-indexed
  }
}

/**
 * Format date for display in Brazilian format
 * @param date - Date to format
 * @returns Formatted string in dd/mm/yyyy format
 */
export function formatDateForDisplay(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  // Use our timezone-safe parsing function
  const dateObj = typeof date === 'string' ? parseDateFromAPI(date) : date
  if (!dateObj) return ''
  
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric'
  })
}

/**
 * Convert Date to input[type="date"] format (YYYY-MM-DD)
 * @param date - Date to convert
 * @returns String in YYYY-MM-DD format
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  if (typeof date === 'string') {
    // If it's already a string in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date
    }
    // If it's an ISO string, extract only the date part
    if (date.includes('T')) {
      return date.split('T')[0]
    }
  }
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Use UTC methods to avoid timezone conversion issues
  const year = dateObj.getUTCFullYear()
  const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getUTCDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}