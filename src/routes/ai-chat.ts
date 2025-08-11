import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { AIChatController } from '../controllers/ai-chat.js';
import { PrismaClient } from '../../database/generated/client';
import Redis from 'ioredis';

export default async function aiChatRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
) {
  // Get dependencies from Fastify decorators
  const prisma = fastify.prisma as PrismaClient;
  const redis = fastify.redis as Redis;

  // Initialize controller
  const chatController = new AIChatController(prisma, redis);
  await chatController.initialize();

  // Define schemas for documentation
  const chatMessageRequestSchema = {
    type: 'object',
    required: ['message'],
    properties: {
      message: {
        type: 'string',
        minLength: 1,
        maxLength: 2000,
        description: 'The user message to process'
      },
      sessionId: {
        type: 'string',
        description: 'Optional session ID for conversation continuity'
      },
      conversationId: {
        type: 'string',
        description: 'Optional conversation ID for database persistence'
      },
      userId: {
        type: 'string',
        description: 'User ID (optional if authenticated)'
      }
    }
  };

  const chatResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          intent: { type: 'string' },
          nextSteps: {
            type: 'array',
            items: { type: 'string' }
          },
          isCompleted: { type: 'boolean' },
          requiresInput: { type: 'boolean' },
          confidence: { type: 'number' },
          sessionData: { type: 'object' }
        }
      }
    }
  };

  const errorResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      error: { type: 'string' },
      details: { type: 'array' }
    }
  };

  const healthResponseSchema = {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      data: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
          timestamp: { type: 'string' },
          services: {
            type: 'object',
            properties: {
              anthropic: { type: 'string' },
              chromadb: { type: 'string' }
            }
          },
          overall: { type: 'boolean' }
        }
      }
    }
  };

  // Chat message processing endpoint
  fastify.post('/chat/message', {
    schema: {
      description: 'Process a chat message and get AI response',
      tags: ['AI Chat'],
      body: chatMessageRequestSchema,
      response: {
        200: chatResponseSchema,
        400: errorResponseSchema,
        401: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: async (request, reply) => {
      // Rate limiting check
      const clientId = request.ip;
      const rateLimitKey = `rate_limit:chat:${clientId}`;
      
      const current = await redis.incr(rateLimitKey);
      if (current === 1) {
        await redis.expire(rateLimitKey, 60); // 1 minute window
      }
      
      if (current > 30) { // 30 messages per minute per IP
        reply.code(429).send({
          success: false,
          error: 'Rate limit exceeded. Please try again later.'
        });
        return;
      }
    }
  }, chatController.processMessage.bind(chatController));

  // Streaming chat endpoint
  fastify.post('/chat/stream', {
    schema: {
      description: 'Process chat message with streaming response',
      tags: ['AI Chat'],
      body: {
        ...chatMessageRequestSchema,
        properties: {
          ...chatMessageRequestSchema.properties,
          stream: {
            type: 'boolean',
            default: true,
            description: 'Enable streaming response'
          }
        }
      },
      response: {
        400: errorResponseSchema,
        401: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: async (request, reply) => {
      // Same rate limiting as regular chat
      const clientId = request.ip;
      const rateLimitKey = `rate_limit:chat:${clientId}`;
      
      const current = await redis.incr(rateLimitKey);
      if (current === 1) {
        await redis.expire(rateLimitKey, 60);
      }
      
      if (current > 20) { // Slightly lower limit for streaming
        reply.code(429).send({
          success: false,
          error: 'Rate limit exceeded for streaming.'
        });
        return;
      }
    }
  }, chatController.processMessageStreaming.bind(chatController));

  // Get conversation history
  fastify.get('/chat/history', {
    schema: {
      description: 'Get conversation history',
      tags: ['AI Chat'],
      querystring: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: {
            type: 'string',
            description: 'Session ID to get history for'
          },
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 50,
            default: 20,
            description: 'Maximum number of messages to return'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                conversationId: { type: 'string' },
                messages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      content: { type: 'string' },
                      role: { type: 'string' },
                      createdAt: { type: 'string' }
                    }
                  }
                },
                totalCount: { type: 'number' },
                isCompleted: { type: 'boolean' }
              }
            }
          }
        },
        400: errorResponseSchema,
        401: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, chatController.getConversationHistory.bind(chatController));

  // Create new conversation
  fastify.post('/chat/conversation', {
    schema: {
      description: 'Create a new conversation',
      tags: ['AI Chat'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                conversationId: { type: 'string' },
                sessionId: { type: 'string' },
                createdAt: { type: 'string' }
              }
            }
          }
        },
        401: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, chatController.createConversation.bind(chatController));

  // Health check endpoint
  fastify.get('/chat/health', {
    schema: {
      description: 'Check AI system health status',
      tags: ['AI Chat'],
      response: {
        200: healthResponseSchema,
        503: healthResponseSchema,
        500: errorResponseSchema
      }
    }
  }, chatController.getHealthStatus.bind(chatController));

  // Statistics endpoint
  fastify.get('/chat/stats', {
    schema: {
      description: 'Get AI system usage statistics',
      tags: ['AI Chat'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                conversations: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    byUser: { type: 'number' }
                  }
                },
                messages: {
                  type: 'object',
                  properties: {
                    total: { type: 'number' },
                    byRole: { type: 'object' }
                  }
                },
                aiServices: { type: 'object' },
                timestamp: { type: 'string' }
              }
            }
          }
        },
        500: errorResponseSchema
      }
    },
    preHandler: async (request, reply) => {
      // Optional: Add authentication check for stats endpoint
      // For now, allow public access to basic stats
    }
  }, chatController.getStats.bind(chatController));

  // WebSocket endpoint for real-time chat (if using fastify-websocket)
  if (fastify.websocketServer) {
    fastify.register(async function (fastify) {
      fastify.get('/chat/ws', { websocket: true }, async (connection, request) => {
        // Extract user ID from query or headers
        const userId = request.query?.userId as string || 'anonymous';
        
        await chatController.handleWebSocketConnection(connection.socket, userId);
      });
    });
  }

  // Batch message processing (for handling multiple messages)
  fastify.post('/chat/batch', {
    schema: {
      description: 'Process multiple chat messages in batch',
      tags: ['AI Chat'],
      body: {
        type: 'object',
        required: ['messages'],
        properties: {
          messages: {
            type: 'array',
            items: chatMessageRequestSchema,
            minItems: 1,
            maxItems: 5
          },
          sessionId: { type: 'string' },
          conversationId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                responses: {
                  type: 'array',
                  items: chatResponseSchema
                },
                totalProcessed: { type: 'number' },
                errors: {
                  type: 'array',
                  items: { type: 'object' }
                }
              }
            }
          }
        },
        400: errorResponseSchema,
        401: errorResponseSchema,
        429: errorResponseSchema,
        500: errorResponseSchema
      }
    },
    preHandler: async (request, reply) => {
      // Stricter rate limiting for batch processing
      const clientId = request.ip;
      const rateLimitKey = `rate_limit:batch:${clientId}`;
      
      const current = await redis.incr(rateLimitKey);
      if (current === 1) {
        await redis.expire(rateLimitKey, 300); // 5 minute window
      }
      
      if (current > 5) { // 5 batch requests per 5 minutes
        reply.code(429).send({
          success: false,
          error: 'Batch rate limit exceeded.'
        });
        return;
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as any;
      const responses = [];
      const errors = [];

      for (const messageData of body.messages) {
        try {
          const response = await chatController.processMessage(
            { body: messageData } as any,
            reply
          );
          responses.push(response);
        } catch (error) {
          errors.push({
            message: messageData.message,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      reply.send({
        success: true,
        data: {
          responses,
          totalProcessed: responses.length,
          errors
        }
      });

    } catch (error) {
      reply.code(500).send({
        success: false,
        error: 'Batch processing failed'
      });
    }
  });

  // Context management endpoints
  fastify.delete('/chat/context/:sessionId', {
    schema: {
      description: 'Clear conversation context for a session',
      tags: ['AI Chat'],
      params: {
        type: 'object',
        required: ['sessionId'],
        properties: {
          sessionId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        401: errorResponseSchema,
        500: errorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const { sessionId } = request.params as { sessionId: string };
      const userId = chatController['extractUserIdFromRequest'](request);

      if (!userId) {
        return reply.code(401).send({
          success: false,
          error: 'User authentication required'
        });
      }

      // Clear conversation context from Redis
      const contextKey = `conversation_context:${userId}:${sessionId}`;
      await redis.del(contextKey);

      reply.send({
        success: true,
        message: 'Conversation context cleared'
      });

    } catch (error) {
      reply.code(500).send({
        success: false,
        error: 'Failed to clear context'
      });
    }
  });
}

// Export route options for registration
export const routeOptions = {
  prefix: '/api/v1',
  logLevel: 'info'
};