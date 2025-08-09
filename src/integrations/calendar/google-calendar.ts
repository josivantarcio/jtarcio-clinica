import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { logger } from '../../config/logger';

/**
 * Google Calendar Integration for EO Clínica
 * Provides bidirectional sync between clinic appointments and Google Calendar
 */

export interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  }>;
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: 'email' | 'popup';
      minutes: number;
    }>;
  };
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
}

export interface CalendarSyncResult {
  success: boolean;
  calendarEventId?: string;
  appointmentId: string;
  action: 'created' | 'updated' | 'deleted';
  errors?: string[];
}

export interface ConflictResolution {
  strategy: 'clinic_wins' | 'calendar_wins' | 'manual_review' | 'merge';
  reason: string;
  conflictingFields: string[];
}

export class GoogleCalendarIntegration {
  private oauth2Client: OAuth2Client;
  private calendar: any;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ) {
    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);
    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Set access credentials
   */
  setCredentials(tokens: { access_token: string; refresh_token?: string; expiry_date?: number }): void {
    this.oauth2Client.setCredentials(tokens);
  }

  /**
   * Create a new calendar event
   */
  async createEvent(calendarId: string, event: CalendarEvent): Promise<CalendarSyncResult> {
    try {
      logger.info('Creating Google Calendar event', { 
        calendarId, 
        summary: event.summary,
        start: event.start.dateTime 
      });

      const response = await this.calendar.events.insert({
        calendarId,
        resource: event,
        sendNotifications: true,
        supportsAttachments: true
      });

      logger.info('Google Calendar event created successfully', {
        calendarEventId: response.data.id,
        summary: response.data.summary
      });

      return {
        success: true,
        calendarEventId: response.data.id,
        appointmentId: event.extendedProperties?.private?.appointmentId || '',
        action: 'created'
      };

    } catch (error) {
      logger.error('Failed to create Google Calendar event', error);
      return {
        success: false,
        appointmentId: event.extendedProperties?.private?.appointmentId || '',
        action: 'created',
        errors: [error.message]
      };
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(calendarId: string, eventId: string, event: CalendarEvent): Promise<CalendarSyncResult> {
    try {
      logger.info('Updating Google Calendar event', { 
        calendarId, 
        eventId,
        summary: event.summary 
      });

      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        resource: event,
        sendNotifications: true
      });

      logger.info('Google Calendar event updated successfully', {
        calendarEventId: response.data.id,
        summary: response.data.summary
      });

      return {
        success: true,
        calendarEventId: response.data.id,
        appointmentId: event.extendedProperties?.private?.appointmentId || '',
        action: 'updated'
      };

    } catch (error) {
      logger.error('Failed to update Google Calendar event', error);
      return {
        success: false,
        appointmentId: event.extendedProperties?.private?.appointmentId || '',
        action: 'updated',
        errors: [error.message]
      };
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(calendarId: string, eventId: string, appointmentId: string): Promise<CalendarSyncResult> {
    try {
      logger.info('Deleting Google Calendar event', { calendarId, eventId });

      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendNotifications: true
      });

      logger.info('Google Calendar event deleted successfully', { eventId });

      return {
        success: true,
        calendarEventId: eventId,
        appointmentId,
        action: 'deleted'
      };

    } catch (error) {
      logger.error('Failed to delete Google Calendar event', error);
      return {
        success: false,
        appointmentId,
        action: 'deleted',
        errors: [error.message]
      };
    }
  }

  /**
   * Get a calendar event by ID
   */
  async getEvent(calendarId: string, eventId: string): Promise<CalendarEvent | null> {
    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId
      });

      return this.mapGoogleEventToCalendarEvent(response.data);
    } catch (error) {
      if (error.code === 404) {
        logger.warn('Google Calendar event not found', { calendarId, eventId });
        return null;
      }
      logger.error('Failed to get Google Calendar event', error);
      throw error;
    }
  }

  /**
   * List calendar events for a specific time range
   */
  async listEvents(
    calendarId: string,
    timeMin: Date,
    timeMax: Date,
    maxResults: number = 250
  ): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items?.map(item => this.mapGoogleEventToCalendarEvent(item)) || [];
    } catch (error) {
      logger.error('Failed to list Google Calendar events', error);
      throw error;
    }
  }

  /**
   * Detect conflicts between clinic appointments and calendar events
   */
  async detectConflicts(
    calendarId: string,
    appointmentStart: Date,
    appointmentEnd: Date,
    excludeEventId?: string
  ): Promise<CalendarEvent[]> {
    try {
      const events = await this.listEvents(calendarId, appointmentStart, appointmentEnd);

      return events.filter(event => {
        // Exclude the event we're checking against (for updates)
        if (excludeEventId && event.id === excludeEventId) {
          return false;
        }

        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);

        // Check for time overlap
        return (
          (appointmentStart < eventEnd && appointmentEnd > eventStart) ||
          (eventStart < appointmentEnd && eventEnd > appointmentStart)
        );
      });
    } catch (error) {
      logger.error('Failed to detect calendar conflicts', error);
      throw error;
    }
  }

  /**
   * Resolve conflicts between clinic and calendar data
   */
  async resolveConflict(
    clinicData: any,
    calendarEvent: CalendarEvent,
    strategy: ConflictResolution['strategy']
  ): Promise<{ resolved: boolean; action: string; result?: any }> {
    try {
      logger.info('Resolving calendar conflict', {
        strategy,
        appointmentId: clinicData.id,
        calendarEventId: calendarEvent.id
      });

      switch (strategy) {
        case 'clinic_wins':
          // Update calendar to match clinic data
          const clinicWinsResult = await this.updateEventFromAppointment(
            'primary', // or specific calendar ID
            calendarEvent.id!,
            clinicData
          );
          return {
            resolved: clinicWinsResult.success,
            action: 'calendar_updated',
            result: clinicWinsResult
          };

        case 'calendar_wins':
          // Update clinic to match calendar data
          // This would require calling the clinic API
          return {
            resolved: false,
            action: 'manual_intervention_required',
            result: { reason: 'Calendar wins strategy requires clinic API update' }
          };

        case 'merge':
          // Merge non-conflicting fields
          const mergedEvent = await this.mergeEventData(clinicData, calendarEvent);
          const mergeResult = await this.updateEvent('primary', calendarEvent.id!, mergedEvent);
          return {
            resolved: mergeResult.success,
            action: 'events_merged',
            result: mergeResult
          };

        case 'manual_review':
        default:
          // Flag for manual review
          logger.warn('Conflict flagged for manual review', {
            appointmentId: clinicData.id,
            calendarEventId: calendarEvent.id
          });
          return {
            resolved: false,
            action: 'manual_review_required',
            result: { clinicData, calendarEvent }
          };
      }
    } catch (error) {
      logger.error('Failed to resolve calendar conflict', error);
      return {
        resolved: false,
        action: 'error',
        result: { error: error.message }
      };
    }
  }

  /**
   * Bulk sync multiple appointments
   */
  async bulkSync(
    calendarId: string,
    appointments: any[],
    conflictResolution: ConflictResolution['strategy'] = 'manual_review'
  ): Promise<{
    successful: CalendarSyncResult[];
    failed: CalendarSyncResult[];
    conflicts: Array<{
      appointment: any;
      conflictingEvents: CalendarEvent[];
      resolution?: any;
    }>;
  }> {
    const successful: CalendarSyncResult[] = [];
    const failed: CalendarSyncResult[] = [];
    const conflicts: any[] = [];

    for (const appointment of appointments) {
      try {
        // Check for conflicts first
        const appointmentStart = new Date(appointment.date);
        const appointmentEnd = new Date(appointmentStart.getTime() + (appointment.duration * 60000));
        
        const conflictingEvents = await this.detectConflicts(
          calendarId,
          appointmentStart,
          appointmentEnd,
          appointment.externalCalendarId
        );

        if (conflictingEvents.length > 0) {
          conflicts.push({
            appointment,
            conflictingEvents,
            resolution: await this.resolveConflict(appointment, conflictingEvents[0], conflictResolution)
          });
          continue;
        }

        // No conflicts, proceed with sync
        let result: CalendarSyncResult;
        
        if (appointment.externalCalendarId) {
          // Update existing event
          const event = this.mapAppointmentToCalendarEvent(appointment);
          result = await this.updateEvent(calendarId, appointment.externalCalendarId, event);
        } else {
          // Create new event
          const event = this.mapAppointmentToCalendarEvent(appointment);
          result = await this.createEvent(calendarId, event);
        }

        if (result.success) {
          successful.push(result);
        } else {
          failed.push(result);
        }

      } catch (error) {
        logger.error('Bulk sync error for appointment', { appointmentId: appointment.id, error });
        failed.push({
          success: false,
          appointmentId: appointment.id,
          action: 'created',
          errors: [error.message]
        });
      }
    }

    logger.info('Bulk sync completed', {
      total: appointments.length,
      successful: successful.length,
      failed: failed.length,
      conflicts: conflicts.length
    });

    return { successful, failed, conflicts };
  }

  /**
   * Set up webhook notifications for calendar changes
   */
  async setupWebhookNotifications(
    calendarId: string,
    webhookUrl: string,
    channelId: string
  ): Promise<{ success: boolean; channel?: any; error?: string }> {
    try {
      const response = await this.calendar.events.watch({
        calendarId,
        resource: {
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          expiration: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        }
      });

      logger.info('Google Calendar webhook notifications setup', {
        calendarId,
        channelId,
        webhookUrl
      });

      return {
        success: true,
        channel: response.data
      };
    } catch (error) {
      logger.error('Failed to setup Google Calendar webhook notifications', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convert clinic appointment to Google Calendar event
   */
  private mapAppointmentToCalendarEvent(appointment: any): CalendarEvent {
    const startTime = new Date(appointment.date);
    const endTime = new Date(startTime.getTime() + (appointment.duration * 60000));

    return {
      summary: `${appointment.specialty} - ${appointment.patientName}`,
      description: `Consulta médica agendada via EO Clínica\n\n` +
                  `Paciente: ${appointment.patientName}\n` +
                  `Médico: Dr(a) ${appointment.doctorName}\n` +
                  `Especialidade: ${appointment.specialty}\n` +
                  `Duração: ${appointment.duration} minutos\n` +
                  `Status: ${appointment.status}\n` +
                  (appointment.notes ? `\nObservações: ${appointment.notes}` : ''),
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      attendees: [
        {
          email: appointment.patientEmail,
          displayName: appointment.patientName,
          responseStatus: appointment.status === 'CONFIRMED' ? 'accepted' : 'needsAction'
        },
        {
          email: appointment.doctorEmail,
          displayName: `Dr(a) ${appointment.doctorName}`,
          responseStatus: 'accepted'
        }
      ],
      location: appointment.clinicAddress || 'EO Clínica',
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'email', minutes: 60 },      // 1 hour
          { method: 'popup', minutes: 15 }       // 15 minutes
        ]
      },
      extendedProperties: {
        private: {
          appointmentId: appointment.id,
          clinicSystem: 'eo-clinica',
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          specialtyId: appointment.specialtyId
        }
      }
    };
  }

  /**
   * Convert Google Calendar event to standard CalendarEvent
   */
  private mapGoogleEventToCalendarEvent(googleEvent: any): CalendarEvent {
    return {
      id: googleEvent.id,
      summary: googleEvent.summary,
      description: googleEvent.description,
      start: {
        dateTime: googleEvent.start.dateTime || googleEvent.start.date,
        timeZone: googleEvent.start.timeZone || 'America/Sao_Paulo'
      },
      end: {
        dateTime: googleEvent.end.dateTime || googleEvent.end.date,
        timeZone: googleEvent.end.timeZone || 'America/Sao_Paulo'
      },
      attendees: googleEvent.attendees?.map((attendee: any) => ({
        email: attendee.email,
        displayName: attendee.displayName,
        responseStatus: attendee.responseStatus
      })),
      location: googleEvent.location,
      reminders: googleEvent.reminders,
      extendedProperties: googleEvent.extendedProperties
    };
  }

  /**
   * Update calendar event from appointment data
   */
  private async updateEventFromAppointment(
    calendarId: string,
    eventId: string,
    appointment: any
  ): Promise<CalendarSyncResult> {
    const event = this.mapAppointmentToCalendarEvent(appointment);
    return await this.updateEvent(calendarId, eventId, event);
  }

  /**
   * Merge clinic and calendar event data
   */
  private async mergeEventData(clinicData: any, calendarEvent: CalendarEvent): Promise<CalendarEvent> {
    // Clinic data takes precedence for core appointment info
    const merged = this.mapAppointmentToCalendarEvent(clinicData);
    
    // Preserve calendar-specific data
    if (calendarEvent.attendees) {
      merged.attendees = [
        ...merged.attendees!,
        ...calendarEvent.attendees.filter(a => 
          !merged.attendees!.some(ma => ma.email === a.email)
        )
      ];
    }

    // Preserve additional reminders from calendar
    if (calendarEvent.reminders?.overrides) {
      const clinicReminders = merged.reminders?.overrides || [];
      const calendarReminders = calendarEvent.reminders.overrides.filter(cr =>
        !clinicReminders.some(mr => mr.method === cr.method && mr.minutes === cr.minutes)
      );
      
      if (merged.reminders) {
        merged.reminders.overrides = [...clinicReminders, ...calendarReminders];
      }
    }

    return merged;
  }
}

// Export singleton instance
export const googleCalendarIntegration = new GoogleCalendarIntegration(
  process.env.GOOGLE_CLIENT_ID || '',
  process.env.GOOGLE_CLIENT_SECRET || '',
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback'
);