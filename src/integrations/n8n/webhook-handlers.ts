import { Request, Response } from 'express';
import { workflowManager } from './workflow-manager';
import { logger } from '../../config/logger';

/**
 * Webhook Handlers for N8N Integration
 * Handles incoming webhooks from external services and triggers appropriate N8N workflows
 */

export interface WebhookPayload {
  [key: string]: any;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
}

/**
 * Base webhook handler class
 */
abstract class BaseWebhookHandler {
  abstract handle(payload: WebhookPayload): Promise<WebhookResponse>;

  protected validatePayload(
    payload: WebhookPayload,
    requiredFields: string[],
  ): string[] {
    const errors: string[] = [];

    for (const field of requiredFields) {
      if (!payload[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return errors;
  }

  protected async triggerWorkflow(
    workflowName: string,
    data: any,
  ): Promise<any> {
    try {
      const workflows = await workflowManager.listWorkflows(true);
      const targetWorkflow = workflows.find(w => w.name === workflowName);

      if (!targetWorkflow) {
        throw new Error(`Workflow not found: ${workflowName}`);
      }

      return await workflowManager.executeWorkflow(targetWorkflow.id!, data);
    } catch (error) {
      logger.error('Failed to trigger workflow', { workflowName, error });
      throw error;
    }
  }
}

/**
 * Google Calendar webhook handler
 * Processes calendar change notifications and syncs with the clinic system
 */
export class GoogleCalendarWebhookHandler extends BaseWebhookHandler {
  async handle(payload: WebhookPayload): Promise<WebhookResponse> {
    try {
      logger.info('Processing Google Calendar webhook', payload);

      const errors = this.validatePayload(payload, [
        'resourceId',
        'resourceUri',
      ]);
      if (errors.length > 0) {
        return {
          success: false,
          message: 'Invalid payload',
          errors,
        };
      }

      // Parse Google Calendar webhook
      const calendarChange = {
        resourceId: payload.resourceId,
        resourceUri: payload.resourceUri,
        channelId: payload.channelId,
        channelToken: payload.channelToken,
        changeType: this.determineChangeType(payload),
        timestamp: new Date().toISOString(),
      };

      // Trigger calendar sync workflow
      const result = await this.triggerWorkflow(
        'google-calendar-sync',
        calendarChange,
      );

      return {
        success: true,
        message: 'Calendar webhook processed successfully',
        data: { executionId: result.id },
      };
    } catch (error) {
      logger.error('Google Calendar webhook processing failed', error);
      return {
        success: false,
        message: 'Webhook processing failed',
        errors: [error.message],
      };
    }
  }

  private determineChangeType(
    payload: WebhookPayload,
  ): 'created' | 'updated' | 'deleted' | 'unknown' {
    // Google Calendar doesn't provide explicit change type, so we need to detect it
    if (payload.eventType === 'created') return 'created';
    if (payload.eventType === 'deleted') return 'deleted';
    if (payload.eventType === 'updated') return 'updated';
    return 'unknown';
  }
}

/**
 * WhatsApp Business webhook handler
 * Processes incoming WhatsApp messages and responses
 */
export class WhatsAppWebhookHandler extends BaseWebhookHandler {
  async handle(payload: WebhookPayload): Promise<WebhookResponse> {
    try {
      logger.info('Processing WhatsApp webhook', payload);

      const errors = this.validatePayload(payload, ['entry']);
      if (errors.length > 0) {
        return {
          success: false,
          message: 'Invalid WhatsApp webhook payload',
          errors,
        };
      }

      const responses: any[] = [];

      // Process each entry in the webhook
      for (const entry of payload.entry) {
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'messages' && change.value.messages) {
              // Process incoming messages
              for (const message of change.value.messages) {
                const response = await this.processWhatsAppMessage(
                  message,
                  change.value,
                );
                responses.push(response);
              }
            }

            if (change.field === 'message_template_status_update') {
              // Process template status updates
              await this.processTemplateStatusUpdate(change.value);
            }
          }
        }
      }

      return {
        success: true,
        message: 'WhatsApp webhook processed successfully',
        data: { responses },
      };
    } catch (error) {
      logger.error('WhatsApp webhook processing failed', error);
      return {
        success: false,
        message: 'WhatsApp webhook processing failed',
        errors: [error.message],
      };
    }
  }

  private async processWhatsAppMessage(
    message: any,
    context: any,
  ): Promise<any> {
    const messageData = {
      messageId: message.id,
      from: message.from,
      timestamp: message.timestamp,
      type: message.type,
      text: message.text?.body,
      interactive: message.interactive,
      context: context.metadata,
      contacts: context.contacts,
    };

    // Determine message type and trigger appropriate workflow
    if (message.type === 'interactive') {
      // Handle button/menu interactions
      return await this.triggerWorkflow(
        'whatsapp-interactive-response',
        messageData,
      );
    } else if (message.type === 'text') {
      // Handle text messages (confirmations, etc.)
      return await this.triggerWorkflow('whatsapp-text-response', messageData);
    }

    return { processed: false, reason: 'Unsupported message type' };
  }

  private async processTemplateStatusUpdate(statusUpdate: any): Promise<void> {
    logger.info('WhatsApp template status update', statusUpdate);
    // Template status updates can be logged for monitoring
  }
}

/**
 * Payment gateway webhook handler
 * Processes payment confirmations and updates
 */
export class PaymentWebhookHandler extends BaseWebhookHandler {
  async handle(payload: WebhookPayload): Promise<WebhookResponse> {
    try {
      logger.info('Processing payment webhook', payload);

      const errors = this.validatePayload(payload, ['id', 'status']);
      if (errors.length > 0) {
        return {
          success: false,
          message: 'Invalid payment webhook payload',
          errors,
        };
      }

      const paymentData = {
        paymentId: payload.id,
        status: payload.status,
        amount: payload.amount,
        currency: payload.currency,
        patientId: payload.metadata?.patient_id,
        appointmentId: payload.metadata?.appointment_id,
        timestamp: payload.created || new Date().toISOString(),
      };

      // Trigger payment processing workflow
      const result = await this.triggerWorkflow('process-payment', paymentData);

      return {
        success: true,
        message: 'Payment webhook processed successfully',
        data: { executionId: result.id },
      };
    } catch (error) {
      logger.error('Payment webhook processing failed', error);
      return {
        success: false,
        message: 'Payment webhook processing failed',
        errors: [error.message],
      };
    }
  }
}

/**
 * Appointment confirmation webhook handler
 * Processes patient confirmations from external systems
 */
export class AppointmentConfirmationWebhookHandler extends BaseWebhookHandler {
  async handle(payload: WebhookPayload): Promise<WebhookResponse> {
    try {
      logger.info('Processing appointment confirmation webhook', payload);

      const errors = this.validatePayload(payload, ['appointmentId', 'action']);
      if (errors.length > 0) {
        return {
          success: false,
          message: 'Invalid confirmation webhook payload',
          errors,
        };
      }

      const confirmationData = {
        appointmentId: payload.appointmentId,
        action: payload.action, // 'confirm', 'cancel', 'reschedule'
        patientId: payload.patientId,
        confirmationCode: payload.confirmationCode,
        source: payload.source || 'external',
        timestamp: new Date().toISOString(),
        additionalData: payload.additionalData || {},
      };

      let workflowName: string;
      switch (payload.action) {
        case 'confirm':
          workflowName = 'appointment-confirmation';
          break;
        case 'cancel':
          workflowName = 'appointment-cancellation';
          break;
        case 'reschedule':
          workflowName = 'reagendamento';
          break;
        default:
          throw new Error(`Unsupported action: ${payload.action}`);
      }

      const result = await this.triggerWorkflow(workflowName, confirmationData);

      return {
        success: true,
        message: 'Appointment confirmation processed successfully',
        data: { executionId: result.id, action: payload.action },
      };
    } catch (error) {
      logger.error('Appointment confirmation webhook processing failed', error);
      return {
        success: false,
        message: 'Appointment confirmation processing failed',
        errors: [error.message],
      };
    }
  }
}

/**
 * Webhook router and registry
 */
export class WebhookRouter {
  private handlers: Map<string, BaseWebhookHandler> = new Map();

  constructor() {
    this.registerHandlers();
  }

  private registerHandlers(): void {
    this.handlers.set('google-calendar', new GoogleCalendarWebhookHandler());
    this.handlers.set('whatsapp', new WhatsAppWebhookHandler());
    this.handlers.set('payment', new PaymentWebhookHandler());
    this.handlers.set(
      'appointment-confirmation',
      new AppointmentConfirmationWebhookHandler(),
    );
  }

  async handleWebhook(
    type: string,
    payload: WebhookPayload,
  ): Promise<WebhookResponse> {
    const handler = this.handlers.get(type);

    if (!handler) {
      logger.error('Unknown webhook type', { type });
      return {
        success: false,
        message: `Unknown webhook type: ${type}`,
        errors: ['Unsupported webhook type'],
      };
    }

    return await handler.handle(payload);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

/**
 * Express middleware for webhook handling
 */
export const createWebhookMiddleware = (webhookRouter: WebhookRouter) => {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const webhookType = req.params.type;
      const payload = req.body;

      // Log webhook received
      logger.info('Webhook received', {
        type: webhookType,
        method: req.method,
        headers: req.headers,
        ip: req.ip,
      });

      // Verify webhook signature if needed
      await verifyWebhookSignature(req, webhookType);

      // Process webhook
      const result = await webhookRouter.handleWebhook(webhookType, payload);

      // Send response
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(result);
    } catch (error) {
      logger.error('Webhook middleware error', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        errors: [error.message],
      });
    }
  };
};

/**
 * Verify webhook signatures for security
 */
async function verifyWebhookSignature(
  req: Request,
  webhookType: string,
): Promise<void> {
  // Implementation depends on the webhook provider
  switch (webhookType) {
    case 'whatsapp':
      await verifyWhatsAppSignature(req);
      break;
    case 'payment':
      await verifyPaymentSignature(req);
      break;
    // Add other signature verifications as needed
  }
}

async function verifyWhatsAppSignature(req: Request): Promise<void> {
  const signature = req.get('X-Hub-Signature-256');
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  if (!signature || !verifyToken) {
    throw new Error('Missing WhatsApp webhook signature or verify token');
  }

  // Implement WhatsApp signature verification logic
  // This is a simplified example - implement actual verification
}

async function verifyPaymentSignature(req: Request): Promise<void> {
  const signature =
    req.get('Stripe-Signature') || req.get('X-Payment-Signature');

  if (!signature) {
    throw new Error('Missing payment webhook signature');
  }

  // Implement payment provider signature verification logic
}

// Export singleton instances
export const webhookRouter = new WebhookRouter();
export const webhookMiddleware = createWebhookMiddleware(webhookRouter);
