import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import Redis from 'ioredis';

interface AnthropicConfig {
  apiKey: string;
  apiVersion: string;
  maxRetries: number;
  timeout: number;
  rateLimitWindow: number;
  rateLimitMax: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

interface StreamingResponse {
  content: string;
  isComplete: boolean;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

export class AnthropicClient {
  private client: Anthropic;
  private redis: Redis;
  private config: AnthropicConfig;

  constructor(redis: Redis) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is required for AI integration');
    }

    this.config = {
      apiKey: env.ANTHROPIC_API_KEY,
      apiVersion: env.ANTHROPIC_API_VERSION,
      maxRetries: 3,
      timeout: 60000,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMax: 100, // 100 requests per minute per user
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
    });

    this.redis = redis;
  }

  /**
   * Check rate limit for a user
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    const key = `rate_limit:anthropic:${userId}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, this.config.rateLimitWindow / 1000);
    }
    
    if (current > this.config.rateLimitMax) {
      logger.warn(`Rate limit exceeded for user ${userId}`, { current, limit: this.config.rateLimitMax });
      return false;
    }
    
    return true;
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Don't retry on client errors (4xx)
        if (error instanceof Error && error.message.includes('4')) {
          throw error;
        }

        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        logger.warn(`API call failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  /**
   * Generate a single response from Claude
   */
  async generateResponse(
    messages: ConversationMessage[],
    userId: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      system?: string;
    } = {}
  ): Promise<string> {
    // Check rate limit
    const canProceed = await this.checkRateLimit(userId);
    if (!canProceed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const {
      maxTokens = 1000,
      temperature = 0.7,
      system = 'Você é um assistente médico especializado em agendamento de consultas.'
    } = options;

    return await this.withRetry(async () => {
      try {
        const response = await this.client.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: maxTokens,
          temperature,
          system,
          messages: messages.map(msg => ({
            role: msg.role === 'system' ? 'user' : msg.role, // Claude doesn't support system in messages array
            content: msg.content
          }))
        });

        if (response.content[0].type === 'text') {
          // Log usage for monitoring
          logger.info('Claude API usage', {
            userId,
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
            model: response.model
          });

          return response.content[0].text;
        }

        throw new Error('Unexpected response format from Claude API');
      } catch (error) {
        logger.error('Claude API error', {
          userId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
      }
    });
  }

  /**
   * Generate streaming response from Claude
   */
  async *generateStreamingResponse(
    messages: ConversationMessage[],
    userId: string,
    options: {
      maxTokens?: number;
      temperature?: number;
      system?: string;
    } = {}
  ): AsyncGenerator<StreamingResponse, void, unknown> {
    // Check rate limit
    const canProceed = await this.checkRateLimit(userId);
    if (!canProceed) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const {
      maxTokens = 1000,
      temperature = 0.7,
      system = 'Você é um assistente médico especializado em agendamento de consultas.'
    } = options;

    let fullContent = '';
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      const stream = await this.client.messages.create({
        model: 'claude-3-sonnet-20240229',
        max_tokens: maxTokens,
        temperature,
        system,
        messages: messages.map(msg => ({
          role: msg.role === 'system' ? 'user' : msg.role,
          content: msg.content
        })),
        stream: true
      });

      for await (const event of stream) {
        if (event.type === 'message_start') {
          inputTokens = event.message.usage.input_tokens;
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            const deltaText = event.delta.text;
            fullContent += deltaText;
            
            yield {
              content: deltaText,
              isComplete: false
            };
          }
        } else if (event.type === 'message_delta') {
          outputTokens = event.usage.output_tokens;
        } else if (event.type === 'message_stop') {
          // Final response with usage info
          yield {
            content: '',
            isComplete: true,
            usage: {
              inputTokens,
              outputTokens
            }
          };

          // Log usage
          logger.info('Claude streaming API usage', {
            userId,
            inputTokens,
            outputTokens,
            totalContent: fullContent.length
          });
        }
      }
    } catch (error) {
      logger.error('Claude streaming API error', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Generate embeddings for text (using Claude's embedding capability or fallback)
   * Note: Claude doesn't have direct embedding API, so this would need to use another service
   * For now, we'll return a placeholder that would integrate with ChromaDB's built-in embeddings
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // This would typically call an embedding service like OpenAI's embeddings
    // or use ChromaDB's built-in embedding models
    // For now, we'll throw an error to indicate this needs to be implemented
    throw new Error('Embedding generation should be handled by ChromaDB service');
  }

  /**
   * Health check for Anthropic API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.withRetry(
        async () => await this.client.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'Hello' }]
        }),
        1, // Only try once for health check
        500
      );

      return response.content.length > 0;
    } catch (error) {
      logger.error('Anthropic health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Get API usage statistics
   */
  async getUsageStats(userId: string): Promise<{
    requestsThisMinute: number;
    requestsRemaining: number;
  }> {
    const key = `rate_limit:anthropic:${userId}`;
    const current = await this.redis.get(key);
    const requestsThisMinute = current ? parseInt(current, 10) : 0;
    
    return {
      requestsThisMinute,
      requestsRemaining: Math.max(0, this.config.rateLimitMax - requestsThisMinute)
    };
  }
}

export type { ConversationMessage, StreamingResponse };