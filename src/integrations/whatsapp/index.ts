/**
 * WhatsApp Integration Module for EO Clínica
 * Exports WhatsApp Business API integration functionality
 */

export * from './whatsapp-business';

// Re-export types
export type {
  WhatsAppMessage,
  WhatsAppTemplate,
  WhatsAppTemplateComponent,
  WhatsAppParameter,
  WhatsAppInteractive,
  WhatsAppWebhook,
  MessageResult
} from './whatsapp-business';