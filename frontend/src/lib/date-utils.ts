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
 * @param dateString - Date string from input
 * @returns Properly formatted date string for API
 */
export function formatDateForAPI(dateString: string): string {
  if (!dateString) return ''
  // Ensure the date is treated as local time to avoid timezone shifts
  return `${dateString}T00:00:00.000Z`
}

/**
 * Parse date from API response handling timezone issues
 * @param dateValue - Date value from API
 * @returns Date object or undefined
 */
export function parseDateFromAPI(dateValue: string | Date | null | undefined): Date | undefined {
  if (!dateValue) return undefined
  
  const dateStr = typeof dateValue === 'string' ? dateValue : dateValue.toISOString()
  
  if (dateStr.includes('T')) {
    // If it's ISO string, use it directly
    return new Date(dateStr)
  } else {
    // If it's just date string, append local time to avoid timezone issues
    return new Date(dateStr + 'T00:00:00')
  }
}

/**
 * Format date for display in Brazilian format
 * @param date - Date to format
 * @returns Formatted string in dd/mm/yyyy format
 */
export function formatDateForDisplay(date: Date | string | null | undefined): string {
  if (!date) return ''
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
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
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  // Get date components accounting for timezone
  const year = dateObj.getFullYear()
  const month = String(dateObj.getMonth() + 1).padStart(2, '0')
  const day = String(dateObj.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}