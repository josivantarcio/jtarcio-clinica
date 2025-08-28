import { logger } from '../logger.service';
import { RedisService } from '../redis.service';

export interface ConversationState {
  conversationId: string;
  phase:
    | 'greeting'
    | 'symptom_gathering'
    | 'appointment_booking'
    | 'confirmation'
    | 'completed';
  userInfo?: {
    name?: string;
    phone?: string;
    preferredSpecialty?: string;
    previousAppointments?: number;
  };
  symptoms?: string[];
  appointmentData?: {
    specialty?: string;
    preferredDate?: string;
    preferredTime?: string;
    urgency?: 'low' | 'medium' | 'high';
    doctorId?: string;
    estimatedCost?: number;
  };
  messageHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    urgency?: string;
  }>;
  metadata?: {
    sessionStarted: Date;
    lastInteraction: Date;
    totalMessages: number;
    averageResponseTime?: number;
    userSatisfactionRating?: number;
  };
  flags?: {
    escalatedToHuman?: boolean;
    appointmentBooked?: boolean;
    followupScheduled?: boolean;
    emergencyDetected?: boolean;
  };
}

export class ConversationContextService {
  private redis: RedisService;
  private defaultExpiration: number;
  private maxHistoryMessages: number;

  constructor() {
    this.redis = new RedisService();
    this.defaultExpiration = parseInt(
      process.env.AI_CONVERSATION_TIMEOUT || '1800',
    ); // 30 minutes
    this.maxHistoryMessages = parseInt(
      process.env.AI_MAX_CONTEXT_MESSAGES || '20',
    );

    logger.info('Conversation Context Service initialized', {
      defaultExpiration: this.defaultExpiration,
      maxHistoryMessages: this.maxHistoryMessages,
    });
  }

  /**
   * Get conversation context, creating new if doesn't exist
   */
  async getContext(conversationId: string): Promise<ConversationState> {
    try {
      const key = this.buildContextKey(conversationId);
      const cached = await this.redis.get(key);

      if (cached) {
        const context = JSON.parse(cached) as ConversationState;

        // Convert date strings back to Date objects
        if (context.metadata?.sessionStarted) {
          context.metadata.sessionStarted = new Date(
            context.metadata.sessionStarted,
          );
        }
        if (context.metadata?.lastInteraction) {
          context.metadata.lastInteraction = new Date(
            context.metadata.lastInteraction,
          );
        }
        if (context.messageHistory) {
          context.messageHistory = context.messageHistory.map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        }

        logger.info('Context retrieved from cache', {
          conversationId: this.sanitizeId(conversationId),
          phase: context.phase,
          messageCount: context.messageHistory?.length || 0,
          lastInteraction: context.metadata?.lastInteraction,
        });

        return context;
      }

      // Create new context if none exists
      const newContext = this.createNewContext(conversationId);
      await this.saveContext(newContext);

      logger.info('New context created', {
        conversationId: this.sanitizeId(conversationId),
        phase: newContext.phase,
      });

      return newContext;
    } catch (error) {
      logger.error('Failed to get conversation context:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });

      // Return new context on error
      return this.createNewContext(conversationId);
    }
  }

  /**
   * Update conversation context
   */
  async updateContext(
    conversationId: string,
    context: ConversationState,
  ): Promise<void> {
    try {
      // Update metadata
      context.metadata = {
        ...context.metadata,
        lastInteraction: new Date(),
        totalMessages: (context.metadata?.totalMessages || 0) + 1,
      };

      await this.saveContext(context);

      logger.info('Context updated', {
        conversationId: this.sanitizeId(conversationId),
        phase: context.phase,
        totalMessages: context.metadata.totalMessages,
      });
    } catch (error) {
      logger.error('Failed to update conversation context:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Add message to conversation history
   */
  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    urgency?: string,
  ): Promise<void> {
    try {
      const context = await this.getContext(conversationId);

      if (!context.messageHistory) {
        context.messageHistory = [];
      }

      // Add new message
      context.messageHistory.push({
        role,
        content,
        timestamp: new Date(),
        urgency,
      });

      // Trim history if too long - keep more messages for better context
      const maxMessages = this.maxHistoryMessages + 2; // Allow slight overflow for better context
      if (context.messageHistory.length > maxMessages) {
        context.messageHistory = context.messageHistory.slice(
          -maxMessages,
        );
      }

      await this.updateContext(conversationId, context);

      logger.info('Message added to context', {
        conversationId: this.sanitizeId(conversationId),
        role,
        contentLength: content.length,
        historySize: context.messageHistory.length,
        urgency,
      });
    } catch (error) {
      logger.error('Failed to add message to context:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });
    }
  }

  /**
   * Update conversation phase
   */
  async updatePhase(
    conversationId: string,
    phase: ConversationState['phase'],
  ): Promise<void> {
    try {
      const context = await this.getContext(conversationId);
      const previousPhase = context.phase;

      context.phase = phase;
      await this.updateContext(conversationId, context);

      logger.info('Conversation phase updated', {
        conversationId: this.sanitizeId(conversationId),
        previousPhase,
        newPhase: phase,
      });
    } catch (error) {
      logger.error('Failed to update conversation phase:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });
    }
  }

  /**
   * Update user information
   */
  async updateUserInfo(
    conversationId: string,
    userInfo: Partial<ConversationState['userInfo']>,
  ): Promise<void> {
    try {
      const context = await this.getContext(conversationId);

      context.userInfo = {
        ...context.userInfo,
        ...userInfo,
      };

      await this.updateContext(conversationId, context);

      logger.info('User info updated', {
        conversationId: this.sanitizeId(conversationId),
        hasName: !!context.userInfo?.name,
        hasPhone: !!context.userInfo?.phone,
        hasSpecialty: !!context.userInfo?.preferredSpecialty,
      });
    } catch (error) {
      logger.error('Failed to update user info:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });
    }
  }

  /**
   * Update appointment data
   */
  async updateAppointmentData(
    conversationId: string,
    appointmentData: Partial<ConversationState['appointmentData']>,
  ): Promise<void> {
    try {
      const context = await this.getContext(conversationId);

      context.appointmentData = {
        ...context.appointmentData,
        ...appointmentData,
      };

      await this.updateContext(conversationId, context);

      logger.info('Appointment data updated', {
        conversationId: this.sanitizeId(conversationId),
        hasSpecialty: !!context.appointmentData?.specialty,
        hasDate: !!context.appointmentData?.preferredDate,
        urgency: context.appointmentData?.urgency,
      });
    } catch (error) {
      logger.error('Failed to update appointment data:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });
    }
  }

  /**
   * Set conversation flag
   */
  async setFlag(
    conversationId: string,
    flag: keyof ConversationState['flags'],
    value: boolean,
  ): Promise<void> {
    try {
      const context = await this.getContext(conversationId);

      if (!context.flags) {
        context.flags = {};
      }

      context.flags[flag] = value;
      await this.updateContext(conversationId, context);

      logger.info('Conversation flag set', {
        conversationId: this.sanitizeId(conversationId),
        flag,
        value,
      });
    } catch (error) {
      logger.error('Failed to set conversation flag:', {
        conversationId: this.sanitizeId(conversationId),
        flag,
        error: error.message,
      });
    }
  }

  /**
   * Update last interaction timestamp
   */
  async updateLastInteraction(conversationId: string): Promise<void> {
    try {
      const context = await this.getContext(conversationId);

      if (!context.metadata) {
        context.metadata = {
          sessionStarted: new Date(),
          lastInteraction: new Date(),
          totalMessages: 0,
        };
      } else {
        context.metadata.lastInteraction = new Date();
      }

      await this.saveContext(context);
    } catch (error) {
      logger.error('Failed to update last interaction:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });
    }
  }

  /**
   * Get conversation summary for analytics
   */
  async getConversationSummary(conversationId: string): Promise<{
    duration: number;
    messageCount: number;
    phase: string;
    appointmentBooked: boolean;
    escalated: boolean;
    userSatisfaction?: number;
  }> {
    try {
      const context = await this.getContext(conversationId);
      const now = new Date();
      const sessionStart = context.metadata?.sessionStarted || now;

      return {
        duration: now.getTime() - sessionStart.getTime(),
        messageCount: context.metadata?.totalMessages || 0,
        phase: context.phase,
        appointmentBooked: context.flags?.appointmentBooked || false,
        escalated: context.flags?.escalatedToHuman || false,
        userSatisfaction: context.metadata?.userSatisfactionRating,
      };
    } catch (error) {
      logger.error('Failed to get conversation summary:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });

      return {
        duration: 0,
        messageCount: 0,
        phase: 'greeting',
        appointmentBooked: false,
        escalated: false,
      };
    }
  }

  /**
   * Clear conversation context (for testing or explicit reset)
   */
  async clearContext(conversationId: string): Promise<void> {
    try {
      const key = this.buildContextKey(conversationId);
      await this.redis.del(key);

      logger.info('Context cleared', {
        conversationId: this.sanitizeId(conversationId),
      });
    } catch (error) {
      logger.error('Failed to clear context:', {
        conversationId: this.sanitizeId(conversationId),
        error: error.message,
      });
    }
  }

  /**
   * Get all active conversations (for admin/monitoring)
   */
  async getActiveConversations(): Promise<string[]> {
    try {
      const pattern = this.buildContextKey('*');
      const keys = await this.redis.keys(pattern);

      const conversationIds = keys.map(key =>
        key.replace('whatsapp_context:', ''),
      );

      logger.info('Retrieved active conversations', {
        count: conversationIds.length,
      });

      return conversationIds;
    } catch (error) {
      logger.error('Failed to get active conversations:', error);
      return [];
    }
  }

  /**
   * Cleanup expired conversations
   */
  async cleanupExpiredConversations(olderThanHours = 24): Promise<number> {
    try {
      const activeConversations = await this.getActiveConversations();
      let cleanedCount = 0;

      for (const conversationId of activeConversations) {
        const context = await this.getContext(conversationId);
        const lastInteraction = context.metadata?.lastInteraction || new Date();
        const hoursAgo =
          (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60);

        if (hoursAgo > olderThanHours) {
          await this.clearContext(conversationId);
          cleanedCount++;
        }
      }

      logger.info('Expired conversations cleaned up', {
        totalChecked: activeConversations.length,
        cleaned: cleanedCount,
        olderThanHours,
      });

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired conversations:', error);
      return 0;
    }
  }

  /**
   * Create new conversation context
   */
  private createNewContext(conversationId: string): ConversationState {
    return {
      conversationId,
      phase: 'greeting',
      metadata: {
        sessionStarted: new Date(),
        lastInteraction: new Date(),
        totalMessages: 0,
      },
      messageHistory: [],
      flags: {},
    };
  }

  /**
   * Save context to Redis
   */
  private async saveContext(context: ConversationState): Promise<void> {
    const key = this.buildContextKey(context.conversationId);
    const serialized = JSON.stringify(context);

    await this.redis.set(key, serialized, this.defaultExpiration);
  }

  /**
   * Build Redis key for context
   */
  private buildContextKey(conversationId: string): string {
    return `whatsapp_context:${conversationId}`;
  }

  /**
   * Sanitize conversation ID for logging
   */
  private sanitizeId(conversationId: string): string {
    if (conversationId.length > 8) {
      return `${conversationId.substring(0, 4)}****${conversationId.slice(-4)}`;
    }
    return '****';
  }
}
