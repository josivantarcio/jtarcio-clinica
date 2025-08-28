import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  WAHAService,
  WhatsAppMessage,
} from '../../services/whatsapp/waha.service';
import { WhatsAppAIService } from '../../services/ai/whatsapp-ai.service';
import { logger } from '../../services/logger.service';
import crypto from 'crypto';

interface WebhookRequest {
  Body: {
    event: string;
    session: string;
    payload: any;
  };
  Headers: {
    'x-webhook-signature'?: string;
    'user-agent'?: string;
  };
}

export default async function whatsappWebhookRoutes(fastify: FastifyInstance) {
  const wahaService = new WAHAService();
  const whatsappAI = new WhatsAppAIService();

  /**
   * Verify webhook signature for security (HMAC)
   */
  function verifyWebhookSignature(
    payload: string,
    signature?: string,
  ): boolean {
    if (!signature || !process.env.WAHA_WEBHOOK_HMAC_KEY) {
      return true; // Skip verification if not configured
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', process.env.WAHA_WEBHOOK_HMAC_KEY)
        .update(payload)
        .digest('hex');

      const receivedSignature = signature.replace('sha256=', '');
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex'),
      );
    } catch (error) {
      logger.error('Failed to verify webhook signature:', error);
      return false;
    }
  }

  /**
   * Main WhatsApp webhook endpoint
   */
  fastify.post(
    '/whatsapp',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const startTime = Date.now();

      try {
        const rawPayload = JSON.stringify(request.body);
        const signature = request.headers['x-webhook-signature'] as string;

        // Verify webhook signature
        if (!verifyWebhookSignature(rawPayload, signature)) {
          logger.warn('Invalid webhook signature received', {
            userAgent: request.headers['user-agent'],
            ip: request.ip,
          });
          return reply.code(401).send({ error: 'Invalid signature' });
        }

        const webhookData = request.body as any;
        const { event, session, payload } = webhookData;

        logger.info('WhatsApp webhook received', {
          event,
          session,
          hasPayload: !!payload,
          processingTime: Date.now() - startTime,
        });

        // Handle different webhook events
        switch (event) {
          case 'message':
            await handleIncomingMessage(payload);
            break;

          case 'session.status':
            await handleSessionStatus(payload);
            break;

          case 'call':
            await handleIncomingCall(payload);
            break;

          default:
            logger.info('Unhandled webhook event', { event, payload });
        }

        return reply.send({
          success: true,
          processed: true,
          processingTime: Date.now() - startTime,
        });
      } catch (error) {
        logger.error('WhatsApp webhook processing error:', error);
        return reply.code(500).send({
          error: 'Webhook processing failed',
          message: error.message,
        });
      }
    },
  );

  /**
   * Handle incoming WhatsApp messages
   */
  async function handleIncomingMessage(payload: any): Promise<void> {
    try {
      const message = WAHAService.parseWebhookMessage(payload);
      if (!message) {
        logger.error('Failed to parse incoming message');
        return;
      }

      // Skip messages from the bot itself
      if (message.from === message.to) {
        logger.info('Skipping self-message');
        return;
      }

      // Log incoming message (sanitized for privacy)
      logger.info('Processing incoming WhatsApp message', {
        from: sanitizePhoneNumber(message.from),
        type: message.type,
        messageId: message.id,
        hasText: !!message.body?.text,
        textLength: message.body?.text?.length || 0,
      });

      // Mark message as read immediately
      await wahaService.markAsRead(message.from, message.id);

      // Show typing indicator while processing
      await wahaService.sendTyping(message.from, true);

      // Process message based on type
      switch (message.type) {
        case 'text':
          await handleTextMessage(message);
          break;

        case 'voice':
          await handleVoiceMessage(message);
          break;

        case 'image':
          await handleImageMessage(message);
          break;

        case 'document':
          await handleDocumentMessage(message);
          break;

        default:
          await handleUnsupportedMessage(message);
      }

      // Remove typing indicator
      await wahaService.sendTyping(message.from, false);
    } catch (error) {
      logger.error('Failed to handle incoming message:', error);

      // Send error message to user
      if (payload?.from) {
        try {
          await wahaService.sendTextMessage(
            payload.from,
            '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes ou entre em contato diretamente com a clínica.',
          );
        } catch (sendError) {
          logger.error('Failed to send error message:', sendError);
        }
      }
    }
  }

  /**
   * Handle text messages
   */
  async function handleTextMessage(message: WhatsAppMessage): Promise<void> {
    const text = message.body?.text || '';

    if (!text.trim()) {
      await wahaService.sendTextMessage(
        message.from,
        'Olá! Não consegui entender sua mensagem. Pode escrever novamente o que precisa?',
      );
      return;
    }

    // Process with AI service
    const response = await whatsappAI.processTextMessage({
      phoneNumber: message.from,
      message: text,
      messageId: message.id,
    });

    // Send AI response
    if (response.text) {
      await wahaService.sendTextMessage(message.from, response.text);
    }

    // Handle additional actions (appointment booking, etc.)
    if (response.actions) {
      await handleAIActions(message.from, response.actions);
    }
  }

  /**
   * Handle voice messages
   */
  async function handleVoiceMessage(message: WhatsAppMessage): Promise<void> {
    try {
      // Check if voice transcription is enabled
      if (
        !process.env.WAHA_VOICE_TRANSCRIPTION ||
        process.env.WAHA_VOICE_TRANSCRIPTION !== 'true'
      ) {
        await wahaService.sendTextMessage(
          message.from,
          '🎤 Recebi seu áudio, mas no momento só posso responder mensagens de texto. Pode escrever sua mensagem?',
        );
        return;
      }

      const audioUrl = (message as any).payload?.url;
      if (!audioUrl) {
        await wahaService.sendTextMessage(
          message.from,
          '❌ Não consegui processar seu áudio. Tente enviar novamente ou escreva sua mensagem.',
        );
        return;
      }

      // Transcribe voice to text
      const transcription = await wahaService.transcribeVoice(
        audioUrl,
        'pt-BR',
      );

      if (!transcription.text || transcription.confidence < 0.5) {
        await wahaService.sendTextMessage(
          message.from,
          '🎤 Não consegui entender bem o áudio. Pode falar mais devagar ou escrever sua mensagem?',
        );
        return;
      }

      logger.info('Voice message transcribed', {
        from: sanitizePhoneNumber(message.from),
        confidence: transcription.confidence,
        textLength: transcription.text.length,
      });

      // Process transcribed text with AI
      const response = await whatsappAI.processTextMessage({
        phoneNumber: message.from,
        message: transcription.text,
        messageId: message.id,
        originalType: 'voice',
        confidence: transcription.confidence,
      });

      // Send response acknowledging the voice message
      const voiceResponse = `🎤 Entendi seu áudio: "${transcription.text}"\n\n${response.text}`;
      await wahaService.sendTextMessage(message.from, voiceResponse);

      // Handle additional actions
      if (response.actions) {
        await handleAIActions(message.from, response.actions);
      }
    } catch (error) {
      logger.error('Failed to handle voice message:', error);
      await wahaService.sendTextMessage(
        message.from,
        '❌ Erro ao processar áudio. Tente enviar uma mensagem de texto.',
      );
    }
  }

  /**
   * Handle image messages
   */
  async function handleImageMessage(message: WhatsAppMessage): Promise<void> {
    await wahaService.sendTextMessage(
      message.from,
      '📷 Recebi sua imagem! No momento não consigo analisar imagens, mas posso ajudar com informações sobre consultas e agendamentos. Como posso ajudar?',
    );
  }

  /**
   * Handle document messages
   */
  async function handleDocumentMessage(
    message: WhatsAppMessage,
  ): Promise<void> {
    await wahaService.sendTextMessage(
      message.from,
      '📄 Recebi seu documento! No momento não consigo analisar documentos pelo WhatsApp. Para envio de exames ou documentos, recomendo usar nosso portal online ou trazê-los na consulta. Posso ajudar com agendamentos?',
    );
  }

  /**
   * Handle unsupported message types
   */
  async function handleUnsupportedMessage(
    message: WhatsAppMessage,
  ): Promise<void> {
    await wahaService.sendTextMessage(
      message.from,
      `📱 Recebi sua mensagem do tipo "${message.type}", mas no momento só posso processar mensagens de texto e áudio. Como posso ajudar?`,
    );
  }

  /**
   * Handle AI actions (appointment booking, escalation, etc.)
   */
  async function handleAIActions(
    phoneNumber: string,
    actions: any[],
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'book_appointment':
            await handleAppointmentBooking(phoneNumber, action.data);
            break;

          case 'escalate_to_human':
            await handleEscalation(phoneNumber, action.data);
            break;

          case 'send_reminder':
            await handleReminder(phoneNumber, action.data);
            break;

          default:
            logger.warn('Unknown AI action type', {
              type: action.type,
              data: action.data,
            });
        }
      } catch (error) {
        logger.error(`Failed to handle AI action ${action.type}:`, error);
      }
    }
  }

  /**
   * Handle appointment booking
   */
  async function handleAppointmentBooking(
    phoneNumber: string,
    data: any,
  ): Promise<void> {
    // Implementation will be added in Phase 3
    logger.info('Appointment booking requested', {
      phoneNumber: sanitizePhoneNumber(phoneNumber),
      data,
    });
  }

  /**
   * Handle escalation to human agent
   */
  async function handleEscalation(
    phoneNumber: string,
    data: any,
  ): Promise<void> {
    logger.info('Escalation to human requested', {
      phoneNumber: sanitizePhoneNumber(phoneNumber),
      reason: data.reason,
    });

    await wahaService.sendTextMessage(
      phoneNumber,
      '👥 Vou conectar você com um de nossos atendentes. Aguarde um momento...\n\n📞 Ou ligue diretamente: (11) 1234-5678\n📍 Endereço: Rua das Clínicas, 123',
    );

    // TODO: Integrate with CRM or ticketing system
  }

  /**
   * Handle appointment reminder
   */
  async function handleReminder(phoneNumber: string, data: any): Promise<void> {
    logger.info('Reminder sent', {
      phoneNumber: sanitizePhoneNumber(phoneNumber),
      type: data.type,
    });
  }

  /**
   * Handle session status changes
   */
  async function handleSessionStatus(payload: any): Promise<void> {
    logger.info('WhatsApp session status changed', {
      session: payload.session,
      status: payload.status,
    });

    // Handle session state changes
    switch (payload.status) {
      case 'WORKING':
        logger.info('WhatsApp session is now active and ready');
        break;

      case 'SCAN_QR_CODE':
        logger.info('WhatsApp session requires QR code scan');
        break;

      case 'FAILED':
        logger.error('WhatsApp session failed', payload);
        // TODO: Send alert to administrators
        break;

      case 'STOPPED':
        logger.warn('WhatsApp session stopped');
        break;
    }
  }

  /**
   * Handle incoming calls
   */
  async function handleIncomingCall(payload: any): Promise<void> {
    logger.info('WhatsApp call received', {
      from: sanitizePhoneNumber(payload.from),
      callType: payload.type,
    });

    // Auto-decline calls and send message
    try {
      await wahaService.sendTextMessage(
        payload.from,
        '📞 Recebemos sua ligação! No momento atendemos apenas por mensagens de texto. Como posso ajudar?\n\n📱 Para emergências, ligue: (11) 1234-5678',
      );
    } catch (error) {
      logger.error('Failed to send call response message:', error);
    }
  }

  /**
   * Health check endpoint for WhatsApp webhook
   */
  fastify.get(
    '/whatsapp/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const health = await wahaService.getHealth();
        return reply.send({
          service: 'whatsapp-webhook',
          status: health.status,
          waha: health,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error('WhatsApp health check failed:', error);
        return reply.code(503).send({
          service: 'whatsapp-webhook',
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    },
  );

  /**
   * Test endpoint for sending messages (development only)
   */
  if (process.env.NODE_ENV === 'development') {
    fastify.post(
      '/whatsapp/test-send',
      async (request: FastifyRequest, reply: FastifyReply) => {
        const { phoneNumber, message } = request.body as any;

        try {
          const result = await wahaService.sendTextMessage(
            phoneNumber,
            message,
          );
          return reply.send({ success: true, result });
        } catch (error) {
          logger.error('Test message send failed:', error);
          return reply.code(500).send({ error: error.message });
        }
      },
    );
  }

  /**
   * Utility function to sanitize phone numbers for logging
   */
  function sanitizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return 'unknown';

    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 2)}****${cleaned.slice(-2)}`;
    }

    return '****';
  }
}
