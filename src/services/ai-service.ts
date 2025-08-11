/**
 * AI Service Integration Layer
 * 
 * This service provides a unified interface to all AI capabilities
 * for the medical clinic system, including conversation management,
 * appointment booking assistance, and medical knowledge access.
 */

import { PrismaClient } from '@/database/generated/client';
import Redis from 'ioredis';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

import {
  AIServiceFactory,
  ConversationManager,
  Intent,
  StreamingConversationResponse,
  AIUtils
} from '../integrations/ai/index.js';

export interface AIServiceConfig {
  enableAI: boolean;
  anthropicApiKey?: string;
  chromaHost: string;
  chromaPort: number;
  rateLimiting: {
    messagesPerMinute: number;
    streamingPerMinute: number;
    batchPerFiveMinutes: number;
  };
}

export interface ChatRequest {
  message: string;
  userId: string;
  sessionId?: string;
  conversationId?: string;
  context?: Record<string, any>;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    message: string;
    intent: Intent;
    confidence: number;
    sessionId: string;
    conversationId?: string;
    nextSteps?: string[];
    isCompleted: boolean;
    requiresInput: boolean;
    metadata?: Record<string, any>;
  };
  error?: string;
  rateLimited?: boolean;
}

export interface StreamingChatResponse {
  success: boolean;
  stream?: AsyncGenerator<StreamingConversationResponse, void, unknown>;
  error?: string;
  rateLimited?: boolean;
}

export interface AIHealthStatus {
  overall: boolean;
  services: {
    anthropic: boolean;
    chromadb: boolean;
    conversationManager: boolean;
  };
  initialized: boolean;
  lastCheck: Date;
}

export class AIService {
  private config: AIServiceConfig;
  private conversationManager: ConversationManager | null = null;
  private prisma: PrismaClient;
  private redis: Redis;
  private aiFactory: AIServiceFactory;
  private initialized = false;
  private lastHealthCheck: Date = new Date();

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.aiFactory = AIServiceFactory.getInstance();
    
    this.config = {
      enableAI: env.ENABLE_AI_INTEGRATION,
      anthropicApiKey: env.ANTHROPIC_API_KEY,
      chromaHost: env.CHROMA_HOST,
      chromaPort: env.CHROMA_PORT,
      rateLimiting: {
        messagesPerMinute: 30,
        streamingPerMinute: 20,
        batchPerFiveMinutes: 5
      }
    };
  }

  /**
   * Initialize the AI service
   */
  async initialize(): Promise<void> {
    if (!this.config.enableAI) {
      logger.info('AI integration is disabled');
      return;
    }

    if (this.initialized) {
      return;
    }

    try {
      logger.info('Initializing AI Service...');

      // Validate configuration
      this.validateConfiguration();

      // Initialize AI services
      this.conversationManager = await this.aiFactory.initialize(this.prisma, this.redis);

      this.initialized = true;
      logger.info('AI Service initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize AI Service', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error(`AI Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a chat message
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Check if AI is enabled
      if (!this.config.enableAI || !this.conversationManager) {
        return {
          success: false,
          error: 'AI service is not available'
        };
      }

      // Validate request
      const validation = AIUtils.validateMessage(request.message);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(request.userId, 'message');
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
          rateLimited: true
        };
      }

      // Process the message
      const response = await this.conversationManager.processMessage(
        request.userId,
        request.message,
        request.sessionId,
        request.conversationId
      );

      // Generate session ID if not provided
      const sessionId = request.sessionId || `session_${Date.now()}_${request.userId}`;

      logger.info('Message processed successfully', {
        userId: request.userId,
        sessionId,
        intent: response.intent,
        confidence: response.confidence
      });

      return {
        success: true,
        data: {
          message: response.message,
          intent: response.intent,
          confidence: response.confidence,
          sessionId,
          conversationId: request.conversationId,
          nextSteps: response.nextSteps,
          isCompleted: response.isCompleted,
          requiresInput: response.requiresInput,
          metadata: response.data
        }
      };

    } catch (error) {
      logger.error('Error processing chat message', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to process message. Please try again.'
      };
    }
  }

  /**
   * Process message with streaming response
   */
  async processMessageStreaming(request: ChatRequest): Promise<StreamingChatResponse> {
    try {
      // Check if AI is enabled
      if (!this.config.enableAI || !this.conversationManager) {
        return {
          success: false,
          error: 'AI service is not available'
        };
      }

      // Validate request
      const validation = AIUtils.validateMessage(request.message);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // Check rate limits
      const rateLimitCheck = await this.checkRateLimit(request.userId, 'streaming');
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: 'Streaming rate limit exceeded. Please try again later.',
          rateLimited: true
        };
      }

      // Generate session ID if not provided
      const sessionId = request.sessionId || `session_${Date.now()}_${request.userId}`;

      // Create streaming response
      const stream = this.conversationManager.processMessageStreaming(
        request.userId,
        request.message,
        sessionId,
        request.conversationId
      );

      logger.info('Streaming message processing started', {
        userId: request.userId,
        sessionId
      });

      return {
        success: true,
        stream
      };

    } catch (error) {
      logger.error('Error processing streaming message', {
        userId: request.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to process streaming message. Please try again.'
      };
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    userId: string,
    conversationId?: string,
    limit: number = 20
  ): Promise<{
    success: boolean;
    data?: {
      messages: Array<{
        id: string;
        content: string;
        role: string;
        createdAt: Date;
      }>;
      conversationId?: string;
      totalCount: number;
    };
    error?: string;
  }> {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          ...(conversationId && { id: conversationId })
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: limit
          }
        }
      });

      if (!conversation) {
        return {
          success: true,
          data: {
            messages: [],
            totalCount: 0
          }
        };
      }

      return {
        success: true,
        data: {
          conversationId: conversation.id,
          messages: conversation.messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            createdAt: msg.createdAt
          })),
          totalCount: conversation.messages.length
        }
      };

    } catch (error) {
      logger.error('Error getting conversation history', {
        userId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to get conversation history'
      };
    }
  }

  /**
   * Create new conversation
   */
  async createConversation(userId: string): Promise<{
    success: boolean;
    data?: {
      conversationId: string;
      sessionId: string;
      createdAt: Date;
    };
    error?: string;
  }> {
    try {
      const conversation = await this.prisma.conversation.create({
        data: {
          userId,
          title: 'Nova Conversa',
          summary: null,
          isCompleted: false,
          aiContext: {}
        }
      });

      const sessionId = `session_${Date.now()}_${userId}`;

      logger.info('New conversation created', {
        userId,
        conversationId: conversation.id,
        sessionId
      });

      return {
        success: true,
        data: {
          conversationId: conversation.id,
          sessionId,
          createdAt: conversation.createdAt
        }
      };

    } catch (error) {
      logger.error('Error creating conversation', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to create conversation'
      };
    }
  }

  /**
   * Get AI service health status
   */
  async getHealthStatus(forceCheck = false): Promise<AIHealthStatus> {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    // Use cached result if recent and not forced
    if (!forceCheck && this.lastHealthCheck > fiveMinutesAgo) {
      return this.getCachedHealthStatus();
    }

    try {
      if (!this.config.enableAI) {
        return {
          overall: false,
          services: {
            anthropic: false,
            chromadb: false,
            conversationManager: false
          },
          initialized: false,
          lastCheck: now
        };
      }

      const health = await this.aiFactory.healthCheck();

      this.lastHealthCheck = now;

      return {
        overall: health.overall,
        services: {
          anthropic: health.services.anthropic,
          chromadb: health.services.chromadb,
          conversationManager: health.services.conversationManager
        },
        initialized: health.initialized,
        lastCheck: now
      };

    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        overall: false,
        services: {
          anthropic: false,
          chromadb: false,
          conversationManager: false
        },
        initialized: this.initialized,
        lastCheck: now
      };
    }
  }

  /**
   * Get AI service statistics
   */
  async getStats(userId?: string): Promise<{
    success: boolean;
    data?: Record<string, any>;
    error?: string;
  }> {
    try {
      if (!this.conversationManager) {
        return {
          success: false,
          error: 'AI service not initialized'
        };
      }

      const stats = await this.conversationManager.getStats();

      // Add database stats
      const dbStats = await this.getDatabaseStats(userId);

      return {
        success: true,
        data: {
          ...stats,
          database: dbStats,
          config: {
            enabled: this.config.enableAI,
            initialized: this.initialized
          },
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      logger.error('Error getting AI stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to get statistics'
      };
    }
  }

  /**
   * Clear conversation context
   */
  async clearContext(userId: string, sessionId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const contextKey = `conversation_context:${userId}:${sessionId}`;
      await this.redis.del(contextKey);

      logger.info('Conversation context cleared', { userId, sessionId });

      return { success: true };

    } catch (error) {
      logger.error('Error clearing context', {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        error: 'Failed to clear context'
      };
    }
  }

  /**
   * Shutdown AI service
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down AI Service...');

    try {
      await this.aiFactory.shutdown();
      this.conversationManager = null;
      this.initialized = false;

      logger.info('AI Service shutdown completed');
    } catch (error) {
      logger.error('Error during AI Service shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Private helper methods
   */
  private validateConfiguration(): void {
    if (!this.config.anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY is required for AI integration');
    }

    if (!this.config.chromaHost || !this.config.chromaPort) {
      throw new Error('ChromaDB configuration is required');
    }
  }

  private async checkRateLimit(
    userId: string,
    type: 'message' | 'streaming' | 'batch'
  ): Promise<{ allowed: boolean; remaining: number }> {
    const limits = {
      message: { window: 60, max: this.config.rateLimiting.messagesPerMinute },
      streaming: { window: 60, max: this.config.rateLimiting.streamingPerMinute },
      batch: { window: 300, max: this.config.rateLimiting.batchPerFiveMinutes }
    };

    const limit = limits[type];
    const key = `rate_limit:ai:${type}:${userId}`;

    const current = await this.redis.incr(key);
    if (current === 1) {
      await this.redis.expire(key, limit.window);
    }

    return {
      allowed: current <= limit.max,
      remaining: Math.max(0, limit.max - current)
    };
  }

  private getCachedHealthStatus(): AIHealthStatus {
    return {
      overall: this.initialized,
      services: {
        anthropic: this.initialized,
        chromadb: this.initialized,
        conversationManager: this.initialized
      },
      initialized: this.initialized,
      lastCheck: this.lastHealthCheck
    };
  }

  private async getDatabaseStats(userId?: string): Promise<Record<string, any>> {
    try {
      const [conversationCount, messageCount] = await Promise.all([
        this.prisma.conversation.count({
          where: userId ? { userId } : undefined
        }),
        this.prisma.message.count({
          where: userId ? { 
            conversation: { userId }
          } : undefined
        })
      ]);

      return {
        conversations: conversationCount,
        messages: messageCount,
        ...(userId && { userSpecific: true })
      };
    } catch (error) {
      logger.error('Error getting database stats', { error });
      return {};
    }
  }

  /**
   * Static factory method for easy service creation
   */
  static async create(prisma: PrismaClient, redis: Redis): Promise<AIService> {
    const service = new AIService(prisma, redis);
    await service.initialize();
    return service;
  }

  /**
   * Check if AI service is ready
   */
  isReady(): boolean {
    return this.initialized && this.config.enableAI && !!this.conversationManager;
  }
}

export default AIService;