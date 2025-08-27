import axios, { AxiosInstance } from 'axios';
import { logger } from '../logger.service';

export interface WhatsAppMessage {
  from: string;
  to: string;
  body?: {
    text?: string;
  };
  type: 'text' | 'voice' | 'image' | 'document' | 'location';
  timestamp: string;
  id: string;
}

export interface WhatsAppSession {
  name: string;
  status: 'STOPPED' | 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED';
  qr?: string;
  me?: {
    id: string;
    pushName: string;
  };
}

export interface VoiceTranscription {
  text: string;
  confidence: number;
  language: string;
}

export interface SendMessageOptions {
  session: string;
  chatId: string;
  text?: string;
  url?: string;
  filename?: string;
  caption?: string;
}

export class WAHAService {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey: string;
  private sessionName: string;

  constructor() {
    this.baseURL = process.env.WAHA_API_URL || 'http://localhost:3001';
    this.apiKey = process.env.WAHA_API_KEY || 'your-waha-api-key';
    this.sessionName = process.env.WAHA_SESSION_NAME || 'eo-clinica-session';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('WAHA API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          session: this.sessionName,
        });
        return config;
      },
      (error) => {
        logger.error('WAHA API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.info('WAHA API Response', {
          status: response.status,
          url: response.config.url,
          responseTime: response.headers['x-response-time'],
        });
        return response;
      },
      (error) => {
        logger.error('WAHA API Response Error', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        });
        return Promise.reject(this.handleError(error));
      }
    );
  }

  private handleError(error: any): Error {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      switch (status) {
        case 401:
          return new Error('WAHA: API key inválida ou expirada');
        case 403:
          return new Error('WAHA: Acesso negado - verifique permissões');
        case 404:
          return new Error('WAHA: Endpoint não encontrado');
        case 429:
          return new Error('WAHA: Limite de taxa excedido - tente novamente');
        case 500:
          return new Error('WAHA: Erro interno do servidor WhatsApp');
        default:
          return new Error(`WAHA: ${message}`);
      }
    }
    
    if (error.code === 'ECONNREFUSED') {
      return new Error('WAHA: Serviço indisponível - verifique se WAHA está rodando');
    }
    
    return new Error(`WAHA: ${error.message}`);
  }

  /**
   * Get all available sessions
   */
  async getSessions(): Promise<WhatsAppSession[]> {
    try {
      const response = await this.client.get('/api/sessions');
      return response.data;
    } catch (error) {
      logger.error('Failed to get WAHA sessions:', error);
      throw error;
    }
  }

  /**
   * Get specific session status
   */
  async getSessionStatus(): Promise<WhatsAppSession> {
    try {
      const response = await this.client.get(`/api/sessions/${this.sessionName}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get session status:', error);
      throw error;
    }
  }

  /**
   * Start WhatsApp session
   */
  async startSession(): Promise<WhatsAppSession> {
    try {
      const response = await this.client.post(`/api/sessions/${this.sessionName}/start`, {
        name: this.sessionName,
        config: {
          debug: process.env.NODE_ENV === 'development',
          printQR: true,
          webhooks: [
            {
              url: process.env.WAHA_WEBHOOK_URL || 'http://localhost:3000/api/v1/webhooks/whatsapp',
              events: ['message', 'session.status', 'call'],
              hmac: {
                key: process.env.WAHA_WEBHOOK_HMAC_KEY,
              },
            },
          ],
        },
      });

      logger.info('WhatsApp session started successfully', {
        session: this.sessionName,
        status: response.data.status,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to start WhatsApp session:', error);
      throw error;
    }
  }

  /**
   * Stop WhatsApp session
   */
  async stopSession(): Promise<void> {
    try {
      await this.client.post(`/api/sessions/${this.sessionName}/stop`);
      logger.info('WhatsApp session stopped successfully', {
        session: this.sessionName,
      });
    } catch (error) {
      logger.error('Failed to stop WhatsApp session:', error);
      throw error;
    }
  }

  /**
   * Restart WhatsApp session
   */
  async restartSession(): Promise<WhatsAppSession> {
    try {
      await this.stopSession();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return await this.startSession();
    } catch (error) {
      logger.error('Failed to restart WhatsApp session:', error);
      throw error;
    }
  }

  /**
   * Get QR code for session authentication
   */
  async getQRCode(): Promise<string | null> {
    try {
      const session = await this.getSessionStatus();
      return session.qr || null;
    } catch (error) {
      logger.error('Failed to get QR code:', error);
      throw error;
    }
  }

  /**
   * Send text message
   */
  async sendTextMessage(chatId: string, text: string): Promise<any> {
    try {
      const response = await this.client.post(`/api/sendText`, {
        session: this.sessionName,
        chatId,
        text,
      });

      logger.info('Text message sent successfully', {
        session: this.sessionName,
        chatId: this.sanitizePhoneNumber(chatId),
        messageLength: text.length,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send text message:', error);
      throw error;
    }
  }

  /**
   * Send voice message (audio file)
   */
  async sendVoiceMessage(chatId: string, audioUrl: string, caption?: string): Promise<any> {
    try {
      const response = await this.client.post(`/api/sendVoice`, {
        session: this.sessionName,
        chatId,
        url: audioUrl,
        caption,
      });

      logger.info('Voice message sent successfully', {
        session: this.sessionName,
        chatId: this.sanitizePhoneNumber(chatId),
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send voice message:', error);
      throw error;
    }
  }

  /**
   * Send image with caption
   */
  async sendImage(chatId: string, imageUrl: string, caption?: string): Promise<any> {
    try {
      const response = await this.client.post(`/api/sendImage`, {
        session: this.sessionName,
        chatId,
        url: imageUrl,
        caption,
      });

      logger.info('Image sent successfully', {
        session: this.sessionName,
        chatId: this.sanitizePhoneNumber(chatId),
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send image:', error);
      throw error;
    }
  }

  /**
   * Send document/file
   */
  async sendDocument(chatId: string, documentUrl: string, filename?: string, caption?: string): Promise<any> {
    try {
      const response = await this.client.post(`/api/sendFile`, {
        session: this.sessionName,
        chatId,
        url: documentUrl,
        filename: filename || 'document',
        caption,
      });

      logger.info('Document sent successfully', {
        session: this.sessionName,
        chatId: this.sanitizePhoneNumber(chatId),
        filename,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send document:', error);
      throw error;
    }
  }

  /**
   * Transcribe voice message to text (Portuguese)
   */
  async transcribeVoice(audioUrl: string, language = 'pt-BR'): Promise<VoiceTranscription> {
    try {
      const response = await this.client.post('/api/transcribe', {
        url: audioUrl,
        language,
        session: this.sessionName,
      });

      const transcription: VoiceTranscription = {
        text: response.data.text || '',
        confidence: response.data.confidence || 0,
        language: response.data.language || language,
      };

      logger.info('Voice transcription completed', {
        textLength: transcription.text.length,
        confidence: transcription.confidence,
        language: transcription.language,
      });

      return transcription;
    } catch (error) {
      logger.error('Failed to transcribe voice:', error);
      
      // Return empty transcription on error
      return {
        text: '',
        confidence: 0,
        language,
      };
    }
  }

  /**
   * Get chat information
   */
  async getChatInfo(chatId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/chats/${chatId}`, {
        params: { session: this.sessionName },
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to get chat info:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(chatId: string, messageId?: string): Promise<void> {
    try {
      await this.client.post('/api/markAsRead', {
        session: this.sessionName,
        chatId,
        messageId,
      });

      logger.info('Message marked as read', {
        session: this.sessionName,
        chatId: this.sanitizePhoneNumber(chatId),
      });
    } catch (error) {
      logger.error('Failed to mark message as read:', error);
      // Don't throw error - this is not critical
    }
  }

  /**
   * Send typing indicator
   */
  async sendTyping(chatId: string, typing = true): Promise<void> {
    try {
      await this.client.post('/api/sendPresence', {
        session: this.sessionName,
        chatId,
        presence: typing ? 'typing' : 'available',
      });
    } catch (error) {
      logger.error('Failed to send typing indicator:', error);
      // Don't throw error - this is not critical
    }
  }

  /**
   * Check if WhatsApp number is valid and registered
   */
  async checkNumberExists(phoneNumber: string): Promise<boolean> {
    try {
      const response = await this.client.post('/api/checkNumberStatus', {
        session: this.sessionName,
        phone: this.formatPhoneNumber(phoneNumber),
      });

      return response.data.exists === true;
    } catch (error) {
      logger.error('Failed to check number status:', error);
      return false;
    }
  }

  /**
   * Get session health status
   */
  async getHealth(): Promise<{
    status: string;
    session: boolean;
    whatsapp: boolean;
    message: string;
  }> {
    try {
      const response = await this.client.get('/api/health');
      const sessionStatus = await this.getSessionStatus();
      
      return {
        status: 'healthy',
        session: sessionStatus.status === 'WORKING',
        whatsapp: sessionStatus.status === 'WORKING',
        message: `Session: ${sessionStatus.status}`,
      };
    } catch (error) {
      logger.error('WAHA health check failed:', error);
      return {
        status: 'unhealthy',
        session: false,
        whatsapp: false,
        message: error.message,
      };
    }
  }

  /**
   * Utility: Format phone number to WhatsApp format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-numeric characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add Brazil country code if not present
    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Utility: Sanitize phone number for logging (LGPD compliance)
   */
  private sanitizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return 'unknown';
    
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 2)}****${cleaned.slice(-2)}`;
    }
    
    return '****';
  }

  /**
   * Utility: Parse incoming webhook message
   */
  static parseWebhookMessage(webhookData: any): WhatsAppMessage | null {
    try {
      const { body, from, to, type, timestamp, id } = webhookData;
      
      return {
        from,
        to,
        body: body || {},
        type: type || 'text',
        timestamp: timestamp || new Date().toISOString(),
        id: id || `msg_${Date.now()}`,
      };
    } catch (error) {
      logger.error('Failed to parse webhook message:', error);
      return null;
    }
  }
}