import axios, { AxiosInstance } from 'axios';
import { logger } from '../../config/logger';

/**
 * WhatsApp Business API Integration for EO Clínica
 * Handles message templates, interactive messages, and webhook processing
 */

export interface WhatsAppMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template' | 'text' | 'interactive';
  template?: WhatsAppTemplate;
  text?: { body: string };
  interactive?: WhatsAppInteractive;
}

export interface WhatsAppTemplate {
  name: string;
  language: { code: string };
  components: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'button';
  parameters?: WhatsAppParameter[];
  sub_type?: string;
  index?: string;
}

export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
  video?: {
    link: string;
  };
}

export interface WhatsAppInteractive {
  type: 'button' | 'list';
  header?: {
    type: 'text' | 'image' | 'document' | 'video';
    text?: string;
    image?: { link: string };
    document?: { link: string; filename?: string };
    video?: { link: string };
  };
  body: { text: string };
  footer?: { text: string };
  action: {
    buttons?: Array<{
      type: 'reply';
      reply: { id: string; title: string };
    }>;
    button?: string;
    sections?: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  };
}

export interface WhatsAppWebhook {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string;
    changes: Array<{
      field: 'messages' | 'message_template_status_update';
      value: any;
    }>;
  }>;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
  contacts?: Array<{ wa_id: string; input: string }>;
}

/**
 * WhatsApp Business API Client
 */
export class WhatsAppBusinessAPI {
  private client: AxiosInstance;
  private phoneNumberId: string;
  private accessToken: string;

  constructor(phoneNumberId: string, accessToken: string) {
    this.phoneNumberId = phoneNumberId;
    this.accessToken = accessToken;

    this.client = axios.create({
      baseURL: `https://graph.facebook.com/v17.0`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      config => {
        logger.info('WhatsApp API Request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      error => {
        logger.error('WhatsApp API Request Error', error);
        return Promise.reject(error);
      },
    );

    this.client.interceptors.response.use(
      response => {
        logger.info('WhatsApp API Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      error => {
        logger.error('WhatsApp API Response Error', {
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Send a template message
   */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = 'pt_BR',
    components: WhatsAppTemplateComponent[] = [],
  ): Promise<MessageResult> {
    try {
      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components,
        },
      };

      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        message,
      );

      return {
        success: true,
        messageId: response.data.messages[0]?.id,
        contacts: response.data.contacts,
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp template', {
        to,
        templateName,
        error: error.response?.data || error.message,
      });

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Send a text message
   */
  async sendText(to: string, text: string): Promise<MessageResult> {
    try {
      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'text',
        text: { body: text },
      };

      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        message,
      );

      return {
        success: true,
        messageId: response.data.messages[0]?.id,
        contacts: response.data.contacts,
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp text message', {
        to,
        error: error.response?.data || error.message,
      });

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Send an interactive message
   */
  async sendInteractive(
    to: string,
    interactive: WhatsAppInteractive,
  ): Promise<MessageResult> {
    try {
      const message: WhatsAppMessage = {
        messaging_product: 'whatsapp',
        to: this.formatPhoneNumber(to),
        type: 'interactive',
        interactive,
      };

      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        message,
      );

      return {
        success: true,
        messageId: response.data.messages[0]?.id,
        contacts: response.data.contacts,
      };
    } catch (error) {
      logger.error('Failed to send WhatsApp interactive message', {
        to,
        error: error.response?.data || error.message,
      });

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(
    messageId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await this.client.post(`/${this.phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to mark WhatsApp message as read', {
        messageId,
        error: error.response?.data || error.message,
      });

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Get media URL
   */
  async getMediaUrl(
    mediaId: string,
  ): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      const response = await this.client.get(`/${mediaId}`);

      return {
        success: true,
        url: response.data.url,
      };
    } catch (error) {
      logger.error('Failed to get WhatsApp media URL', {
        mediaId,
        error: error.response?.data || error.message,
      });

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * Format phone number to WhatsApp format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if not present (assuming Brazil +55)
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      // Mobile number with DDD
      cleaned = '55' + cleaned;
    } else if (cleaned.length === 10) {
      // Landline with DDD
      cleaned = '55' + cleaned;
    } else if (!cleaned.startsWith('55') && cleaned.length < 13) {
      // Assume Brazil if no country code
      cleaned = '55' + cleaned;
    }

    return cleaned;
  }
}

/**
 * WhatsApp Template Manager
 * Manages clinic-specific message templates
 */
export class WhatsAppTemplateManager {
  private api: WhatsAppBusinessAPI;

  constructor(api: WhatsAppBusinessAPI) {
    this.api = api;
  }

  /**
   * Send appointment confirmation template
   */
  async sendAppointmentConfirmation(
    phoneNumber: string,
    patientName: string,
    date: string,
    time: string,
    doctorName: string,
    confirmationCode: string,
  ): Promise<MessageResult> {
    return this.api.sendTemplate(phoneNumber, 'confirmacao_consulta', 'pt_BR', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: patientName },
          { type: 'text', text: date },
          { type: 'text', text: time },
          { type: 'text', text: doctorName },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: confirmationCode }],
      },
    ]);
  }

  /**
   * Send appointment reminder template
   */
  async sendAppointmentReminder(
    phoneNumber: string,
    patientName: string,
    date: string,
    time: string,
    doctorName: string,
    reminderType: '24h' | '4h' | '1h',
  ): Promise<MessageResult> {
    return this.api.sendTemplate(
      phoneNumber,
      `lembrete_consulta_${reminderType}`,
      'pt_BR',
      [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: patientName },
            { type: 'text', text: date },
            { type: 'text', text: time },
            { type: 'text', text: doctorName },
          ],
        },
      ],
    );
  }

  /**
   * Send available slot notification template
   */
  async sendAvailableSlot(
    phoneNumber: string,
    patientName: string,
    specialty: string,
    doctorName: string,
    date: string,
    time: string,
    waitingDays: number,
    notificationId: string,
  ): Promise<MessageResult> {
    return this.api.sendTemplate(phoneNumber, 'vaga_disponivel', 'pt_BR', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: patientName },
          { type: 'text', text: specialty },
          { type: 'text', text: doctorName },
          { type: 'text', text: date },
          { type: 'text', text: time },
          { type: 'text', text: waitingDays.toString() },
        ],
      },
      {
        type: 'button',
        sub_type: 'url',
        index: '0',
        parameters: [{ type: 'text', text: notificationId }],
      },
    ]);
  }

  /**
   * Send appointment rescheduled template
   */
  async sendAppointmentRescheduled(
    phoneNumber: string,
    patientName: string,
    oldDate: string,
    oldTime: string,
    newDate: string,
    newTime: string,
    doctorName: string,
  ): Promise<MessageResult> {
    return this.api.sendTemplate(phoneNumber, 'consulta_reagendada', 'pt_BR', [
      {
        type: 'body',
        parameters: [
          { type: 'text', text: patientName },
          { type: 'text', text: oldDate },
          { type: 'text', text: oldTime },
          { type: 'text', text: newDate },
          { type: 'text', text: newTime },
          { type: 'text', text: doctorName },
        ],
      },
    ]);
  }

  /**
   * Send interactive confirmation request
   */
  async sendConfirmationRequest(
    phoneNumber: string,
    patientName: string,
    date: string,
    time: string,
    doctorName: string,
    appointmentId: string,
  ): Promise<MessageResult> {
    const interactive: WhatsAppInteractive = {
      type: 'button',
      body: {
        text: `Olá ${patientName}!\n\n*Confirmação de Consulta*\n\nVocê tem uma consulta marcada:\nData: ${date}\nHorário: ${time}\nMédico: Dr(a) ${doctorName}\n\nPor favor, confirme sua presença:`,
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: {
              id: `confirm_${appointmentId}`,
              title: 'Confirmar',
            },
          },
          {
            type: 'reply',
            reply: {
              id: `reschedule_${appointmentId}`,
              title: 'Reagendar',
            },
          },
          {
            type: 'reply',
            reply: {
              id: `cancel_${appointmentId}`,
              title: 'Cancelar',
            },
          },
        ],
      },
    };

    return this.api.sendInteractive(phoneNumber, interactive);
  }

  /**
   * Send queue position update
   */
  async sendQueueUpdate(
    phoneNumber: string,
    patientName: string,
    specialty: string,
    currentPosition: number,
    estimatedWait: string,
  ): Promise<MessageResult> {
    return this.api.sendText(
      phoneNumber,
      `*Atualização da Fila - EO Clínica*\n\n` +
        `Olá ${patientName}!\n\n` +
        `*${specialty}*\n` +
        `Posição atual: ${currentPosition}º na fila\n` +
        `Tempo estimado: ${estimatedWait}\n\n` +
        `Você receberá uma notificação quando uma vaga estiver disponível.\n\n` +
        `Obrigado pela paciência!`,
    );
  }
}

/**
 * WhatsApp Webhook Processor
 * Processes incoming webhook messages and responses
 */
export class WhatsAppWebhookProcessor {
  private api: WhatsAppBusinessAPI;
  private templateManager: WhatsAppTemplateManager;

  constructor(
    api: WhatsAppBusinessAPI,
    templateManager: WhatsAppTemplateManager,
  ) {
    this.api = api;
    this.templateManager = templateManager;
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(webhook: WhatsAppWebhook): Promise<void> {
    logger.info('Processing WhatsApp webhook', webhook);

    for (const entry of webhook.entry) {
      for (const change of entry.changes) {
        await this.processChange(change);
      }
    }
  }

  /**
   * Process individual change from webhook
   */
  private async processChange(change: any): Promise<void> {
    switch (change.field) {
      case 'messages':
        await this.processMessages(change.value);
        break;
      case 'message_template_status_update':
        await this.processTemplateStatusUpdate(change.value);
        break;
      default:
        logger.warn('Unknown webhook change field', { field: change.field });
    }
  }

  /**
   * Process incoming messages
   */
  private async processMessages(messageData: any): Promise<void> {
    const { messages, contacts, metadata } = messageData;

    if (!messages) return;

    for (const message of messages) {
      // Mark message as read
      await this.api.markAsRead(message.id);

      // Process based on message type
      if (message.type === 'interactive') {
        await this.processInteractiveResponse(message, contacts[0]);
      } else if (message.type === 'text') {
        await this.processTextMessage(message, contacts[0]);
      }
    }
  }

  /**
   * Process interactive button/menu responses
   */
  private async processInteractiveResponse(
    message: any,
    contact: any,
  ): Promise<void> {
    const response = message.interactive;
    const phoneNumber = contact.wa_id;

    if (response.type === 'button_reply') {
      const buttonId = response.button_reply.id;
      await this.handleButtonResponse(phoneNumber, buttonId);
    } else if (response.type === 'list_reply') {
      const listId = response.list_reply.id;
      await this.handleListResponse(phoneNumber, listId);
    }
  }

  /**
   * Handle button responses
   */
  private async handleButtonResponse(
    phoneNumber: string,
    buttonId: string,
  ): Promise<void> {
    const [action, appointmentId] = buttonId.split('_');

    switch (action) {
      case 'confirm':
        await this.handleConfirmation(phoneNumber, appointmentId);
        break;
      case 'reschedule':
        await this.handleRescheduleRequest(phoneNumber, appointmentId);
        break;
      case 'cancel':
        await this.handleCancellation(phoneNumber, appointmentId);
        break;
      default:
        logger.warn('Unknown button action', { action, appointmentId });
    }
  }

  /**
   * Handle appointment confirmation
   */
  private async handleConfirmation(
    phoneNumber: string,
    appointmentId: string,
  ): Promise<void> {
    // Send confirmation acknowledgment
    await this.api.sendText(
      phoneNumber,
      '*Consulta Confirmada!*\n\n' +
        'Sua presença foi confirmada com sucesso.\n\n' +
        '*Lembre-se:*\n' +
        '• Chegue 15 minutos antes\n' +
        '• Traga documento com foto\n' +
        '• Traga cartão do convênio (se aplicável)\n\n' +
        '*EO Clínica*\n' +
        'Até breve!',
    );

    // TODO: Call clinic API to confirm appointment
    logger.info('Appointment confirmed via WhatsApp', {
      phoneNumber,
      appointmentId,
    });
  }

  /**
   * Handle reschedule request
   */
  private async handleRescheduleRequest(
    phoneNumber: string,
    appointmentId: string,
  ): Promise<void> {
    await this.api.sendText(
      phoneNumber,
      '*Reagendamento Solicitado*\n\n' +
        'Entendemos que você precisa reagendar sua consulta.\n\n' +
        'Use o link abaixo para escolher uma nova data:\n' +
        `${process.env.FRONTEND_URL}/reagendar-consulta/${appointmentId}\n\n` +
        'Ou ligue para nossa central:\n' +
        `${process.env.CLINIC_PHONE || '(11) 9999-9999'}\n\n` +
        'Horário de atendimento: 8h às 18h',
    );

    logger.info('Reschedule requested via WhatsApp', {
      phoneNumber,
      appointmentId,
    });
  }

  /**
   * Handle cancellation
   */
  private async handleCancellation(
    phoneNumber: string,
    appointmentId: string,
  ): Promise<void> {
    await this.api.sendText(
      phoneNumber,
      '*Cancelamento Solicitado*\n\n' +
        'Lamentamos que você precise cancelar sua consulta.\n\n' +
        'Confirme o cancelamento no link:\n' +
        `${process.env.FRONTEND_URL}/cancelar-consulta/${appointmentId}\n\n` +
        '*Importante:*\n' +
        '• Cancelamentos com menos de 4h de antecedência podem ter taxa\n' +
        '• Você será notificado sobre vagas futuras\n\n' +
        '*EO Clínica* - Cuidando da sua saúde',
    );

    logger.info('Cancellation requested via WhatsApp', {
      phoneNumber,
      appointmentId,
    });
  }

  /**
   * Process text messages
   */
  private async processTextMessage(message: any, contact: any): Promise<void> {
    const text = message.text.body.toLowerCase().trim();
    const phoneNumber = contact.wa_id;

    // Simple keyword-based responses
    if (text.includes('ajuda') || text.includes('help')) {
      await this.sendHelpMessage(phoneNumber);
    } else if (text.includes('horario') || text.includes('funcionamento')) {
      await this.sendBusinessHours(phoneNumber);
    } else if (text.includes('endereco') || text.includes('local')) {
      await this.sendClinicAddress(phoneNumber);
    } else {
      // Default response
      await this.sendDefaultResponse(phoneNumber);
    }
  }

  /**
   * Send help message
   */
  private async sendHelpMessage(phoneNumber: string): Promise<void> {
    await this.api.sendText(
      phoneNumber,
      '*Como posso ajudar?*\n\n' +
        '*Comandos disponíveis:*\n' +
        '• "horario" - Horário de funcionamento\n' +
        '• "endereco" - Localização da clínica\n' +
        '• "ajuda" - Esta mensagem\n\n' +
        '*Links úteis:*\n' +
        `• Agendar consulta: ${process.env.FRONTEND_URL}/agendar\n` +
        `• Minhas consultas: ${process.env.FRONTEND_URL}/consultas\n\n` +
        '*Precisa falar conosco?*\n' +
        `Ligue: ${process.env.CLINIC_PHONE || '(11) 9999-9999'}`,
    );
  }

  /**
   * Send business hours
   */
  private async sendBusinessHours(phoneNumber: string): Promise<void> {
    await this.api.sendText(
      phoneNumber,
      '*Horário de Funcionamento*\n\n' +
        '**Segunda a Sexta:**\n' +
        '8:00 - 18:00\n\n' +
        '**Sábado:**\n' +
        '8:00 - 12:00\n\n' +
        '**Domingo e Feriados:**\n' +
        'Fechado\n\n' +
        '*Emergências 24h:*\n' +
        `${process.env.EMERGENCY_PHONE || '(11) 9999-9999'}`,
    );
  }

  /**
   * Send clinic address
   */
  private async sendClinicAddress(phoneNumber: string): Promise<void> {
    await this.api.sendText(
      phoneNumber,
      '*Localização - EO Clínica*\n\n' +
        '**Endereço:**\n' +
        `${process.env.CLINIC_ADDRESS || 'Rua Example, 123 - Centro, São Paulo - SP'}\n\n` +
        '**Como chegar:**\n' +
        '• Metrô: Estação Centro (300m)\n' +
        '• Ônibus: Linhas 100, 200, 300\n' +
        '• Estacionamento gratuito disponível\n\n' +
        '**Ver no mapa:**\n' +
        `${process.env.CLINIC_MAPS_URL || 'https://maps.google.com'}`,
    );
  }

  /**
   * Send default response
   */
  private async sendDefaultResponse(phoneNumber: string): Promise<void> {
    await this.api.sendText(
      phoneNumber,
      '*EO Clínica - Atendimento Automatizado*\n\n' +
        'Obrigado por entrar em contato!\n\n' +
        'Para um atendimento mais rápido, digite:\n' +
        '• "ajuda" - Ver comandos disponíveis\n' +
        '• "horario" - Horário de funcionamento\n' +
        '• "endereco" - Localização da clínica\n\n' +
        '**Precisa de atendimento humano?**\n' +
        `Ligue: ${process.env.CLINIC_PHONE || '(11) 9999-9999'}`,
    );
  }

  /**
   * Process template status updates
   */
  private async processTemplateStatusUpdate(statusUpdate: any): Promise<void> {
    logger.info('WhatsApp template status update received', statusUpdate);

    // Template status updates can be used for monitoring
    // Log the status for administrative purposes
  }
}

// Export configured instances
export const whatsappAPI = new WhatsAppBusinessAPI(
  process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  process.env.WHATSAPP_ACCESS_TOKEN || '',
);

export const whatsappTemplateManager = new WhatsAppTemplateManager(whatsappAPI);
export const whatsappWebhookProcessor = new WhatsAppWebhookProcessor(
  whatsappAPI,
  whatsappTemplateManager,
);
