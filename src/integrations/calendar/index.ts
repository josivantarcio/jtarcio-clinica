/**
 * Calendar Integration Module for EO Clínica
 * Exports calendar integration functionality
 */

export * from './google-calendar';

// Re-export types
export type {
  CalendarEvent,
  CalendarSyncResult,
  ConflictResolution
} from './google-calendar';