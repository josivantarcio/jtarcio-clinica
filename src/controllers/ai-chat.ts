import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { logger } from '../config/logger.js';
import { ConversationManager } from '../integrations/ai/conversation-manager.js';
import { PrismaClient } from '../../database/generated/client';
import Redis from 'ioredis';

// Validation schemas
const chatMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  sessionId: z.string().optional(),
  conversationId: z.string().optional(),
  userId: z.string().optional()
});

const streamingChatSchema = chatMessageSchema.extend({
  stream: z.boolean().default(true)
});

const conversationHistorySchema = z.object({
  sessionId: z.string(),
  limit: z.number().min(1).max(50).default(20)
});

interface ChatController {
  processMessage: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  processMessageStreaming: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  getConversationHistory: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  createConversation: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  getHealthStatus: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  getStats: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

export class AIChatController implements ChatController {
  private conversationManager: ConversationManager;
  private prisma: PrismaClient;
  private redis: Redis;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.redis = redis;
    this.conversationManager = new ConversationManager(prisma, redis);
  }

  /**
   * Initialize the conversation manager
   */
  async initialize(): Promise<void> {
    await this.conversationManager.initialize();
    logger.info('AI Chat Controller initialized');
  }

  /**
   * Process a chat message and return response
   */
  async processMessage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = chatMessageSchema.parse(request.body);
      const userId = body.userId || this.extractUserIdFromRequest(request);

      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'User authentication required'
        });
      }

      logger.info('Processing chat message', {
        userId,
        sessionId: body.sessionId,
        messageLength: body.message.length
      });

      const response = await this.conversationManager.processMessage(
        userId,
        body.message,
        body.sessionId,
        body.conversationId
      );

      reply.send({
        success: true,
        data: {
          message: response.message,
          intent: response.intent,
          nextSteps: response.nextSteps,
          isCompleted: response.isCompleted,
          requiresInput: response.requiresInput,
          confidence: response.confidence,
          sessionData: response.data
        }
      });

    } catch (error) {
      logger.error('Error processing chat message', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: request.body
      });

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Process message with streaming response
   */
  async processMessageStreaming(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const body = streamingChatSchema.parse(request.body);
      const userId = body.userId || this.extractUserIdFromRequest(request);

      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'User authentication required'
        });
      }

      logger.info('Processing streaming chat message', {
        userId,
        sessionId: body.sessionId,
        messageLength: body.message.length
      });

      // Set headers for Server-Sent Events
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection event
      reply.raw.write('event: connected\n');
      reply.raw.write('data: {"connected": true}\n\n');

      try {
        for await (const chunk of this.conversationManager.processMessageStreaming(
          userId,
          body.message,
          body.sessionId,
          body.conversationId
        )) {
          const data = JSON.stringify(chunk);
          reply.raw.write(`event: message\n`);
          reply.raw.write(`data: ${data}\n\n`);

          if (chunk.isComplete) {
            reply.raw.write('event: complete\n');
            reply.raw.write('data: {"finished": true}\n\n');
            break;
          }
        }
      } catch (streamError) {
        const errorData = JSON.stringify({
          error: streamError instanceof Error ? streamError.message : 'Unknown error'
        });
        reply.raw.write('event: error\n');
        reply.raw.write(`data: ${errorData}\n\n`);
      }

      reply.raw.end();

    } catch (error) {
      logger.error('Error in streaming chat', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
      }

      if (!reply.sent) {
        reply.code(500).send({
          success: false,
          error: 'Internal server error'
        });
      }
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const query = conversationHistorySchema.parse(request.query);
      const userId = this.extractUserIdFromRequest(request);

      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'User authentication required'
        });
      }

      const conversation = await this.prisma.conversation.findFirst({
        where: {
          userId,
          // Use sessionId to find conversation if available
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: query.limit
          }
        }
      });

      if (!conversation) {
        return reply.send({
          success: true,
          data: {
            messages: [],
            totalCount: 0
          }
        });
      }

      reply.send({
        success: true,
        data: {
          conversationId: conversation.id,
          messages: conversation.messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            role: msg.role,
            createdAt: msg.createdAt
          })),
          totalCount: conversation.messages.length,
          isCompleted: conversation.isCompleted
        }
      });

    } catch (error) {
      logger.error('Error getting conversation history', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
      }

      reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Create new conversation
   */
  async createConversation(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = this.extractUserIdFromRequest(request);

      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'User authentication required'
        });
      }

      const conversation = await this.prisma.conversation.create({
        data: {
          userId,
          title: 'Nova Conversa',
          summary: null,
          isCompleted: false,
          aiContext: {}
        }
      });

      logger.info('Created new conversation', {
        userId,
        conversationId: conversation.id
      });

      reply.send({
        success: true,
        data: {
          conversationId: conversation.id,
          sessionId: `session_${Date.now()}_${userId}`,
          createdAt: conversation.createdAt
        }
      });

    } catch (error) {
      logger.error('Error creating conversation', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      reply.code(500).send({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get AI system health status
   */
  async getHealthStatus(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const health = await this.conversationManager.healthCheck();

      const status = health.overall ? 'healthy' : 'degraded';
      const statusCode = health.overall ? 200 : 503;

      reply.code(statusCode).send({
        success: true,
        data: {
          status,
          timestamp: new Date().toISOString(),
          services: {
            anthropic: health.anthropic ? 'healthy' : 'unhealthy',
            chromadb: health.chroma ? 'healthy' : 'unhealthy'
          },
          overall: health.overall
        }
      });

    } catch (error) {
      logger.error('Error checking health status', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      reply.code(500).send({
        success: false,
        error: 'Health check failed'
      });
    }
  }

  /**
   * Get AI system statistics
   */
  async getStats(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const userId = this.extractUserIdFromRequest(request);

      // Get conversation stats from database
      const conversationStats = await this.prisma.conversation.groupBy({
        by: ['userId'],
        where: userId ? { userId } : {},
        _count: {
          id: true
        }
      });

      // Get message stats
      const messageStats = await this.prisma.message.groupBy({
        by: ['role'],
        _count: {
          id: true
        }
      });

      // Get AI service stats
      const aiStats = await this.conversationManager.getStats();

      reply.send({
        success: true,
        data: {
          conversations: {
            total: conversationStats.reduce((acc, stat) => acc + stat._count.id, 0),
            byUser: userId ? conversationStats.find(s => s.userId === userId)?._count.id || 0 : undefined
          },
          messages: {
            total: messageStats.reduce((acc, stat) => acc + stat._count.id, 0),
            byRole: messageStats.reduce((acc, stat) => {
              acc[stat.role] = stat._count.id;
              return acc;
            }, {} as Record<string, number>)
          },
          aiServices: aiStats,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting stats', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      reply.code(500).send({
        success: false,
        error: 'Failed to get statistics'
      });
    }
  }

  /**
   * Extract user ID from request (from JWT or other auth mechanism)
   */
  private extractUserIdFromRequest(request: FastifyRequest): string | null {
    // This would typically extract from JWT token in Authorization header
    // For now, we'll use a mock implementation
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    // Mock user ID extraction - in real implementation, verify JWT
    const token = authHeader.substring(7);
    
    // Simple mock - in production, verify and decode JWT
    if (token && token.length > 10) {
      return `user_${token.substring(0, 10)}`;
    }

    return null;
  }

  /**
   * Handle websocket connections for real-time chat
   */
  async handleWebSocketConnection(socket: any, userId: string): Promise<void> {
    logger.info('WebSocket connection established', { userId });

    socket.on('chat_message', async (data: any) => {
      try {
        const { message, sessionId, conversationId } = data;
        
        // Process message through streaming
        for await (const chunk of this.conversationManager.processMessageStreaming(
          userId,
          message,
          sessionId,
          conversationId
        )) {
          socket.emit('chat_response', chunk);
        }
      } catch (error) {
        socket.emit('chat_error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    socket.on('disconnect', () => {
      logger.info('WebSocket connection closed', { userId });
    });
  }
}

export default AIChatController;