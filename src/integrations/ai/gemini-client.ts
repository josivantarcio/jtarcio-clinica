import { GoogleGenerativeAI, GenerativeModel, GenerationConfig, SafetySetting, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { env } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import Redis from 'ioredis';

interface GeminiConfig {
  apiKey: string;
  model: string;
  maxRetries: number;
  timeout: number;
  rateLimitWindow: number;
  rateLimitMax: number;
}

interface ConversationMessage {
  role: 'user' | 'model';
  parts: string;
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

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private redis: Redis;
  private config: GeminiConfig;

  constructor(redis: Redis) {
    if (!env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is required for AI integration');
    }

    this.config = {
      apiKey: env.GEMINI_API_KEY,
      model: env.GEMINI_MODEL,
      maxRetries: 3,
      timeout: 60000,
      rateLimitWindow: 60000, // 1 minute
      rateLimitMax: 100, // 100 requests per minute per user
    };

    this.genAI = new GoogleGenerativeAI(this.config.apiKey);
    
    // Configure model with safety settings
    const generationConfig: GenerationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };

    const safetySettings: SafetySetting[] = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ];

    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig,
      safetySettings,
    });

    this.redis = redis;
    logger.info('GeminiClient initialized successfully');
  }

  async generateResponse(
    message: string,
    conversationHistory?: ConversationMessage[],
    userId?: string
  ): Promise<string> {
    try {
      // Check rate limit if user provided
      if (userId) {
        await this.checkRateLimit(userId);
      }

      // Prepare context with conversation history
      let prompt = message;
      if (conversationHistory && conversationHistory.length > 0) {
        const context = conversationHistory
          .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.parts}`)
          .join('\n');
        prompt = `Contexto da conversa:\n${context}\n\nUsuário: ${message}`;
      }

      // Add system prompt for medical context
      const systemPrompt = `Você é um assistente médico especializado em agendamentos e informações de saúde.
Responda de forma profissional, empática e precisa. Se não souber algo específico sobre saúde, 
recomende consultar um profissional médico. Mantenha as respostas focadas e úteis.

${prompt}`;

      const result = await this.model.generateContent(systemPrompt);
      const response = await result.response;
      const text = response.text();

      // Log usage if available
      if (response.usageMetadata) {
        logger.info('Gemini API usage', {
          inputTokens: response.usageMetadata.promptTokenCount,
          outputTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        });
      }

      return text;
    } catch (error) {
      logger.error('Error generating Gemini response:', error);
      throw new Error('Failed to generate AI response');
    }
  }

  async generateStreamingResponse(
    message: string,
    conversationHistory?: ConversationMessage[],
    userId?: string
  ): Promise<AsyncGenerator<StreamingResponse>> {
    if (userId) {
      await this.checkRateLimit(userId);
    }

    // Prepare context
    let prompt = message;
    if (conversationHistory && conversationHistory.length > 0) {
      const context = conversationHistory
        .map(msg => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.parts}`)
        .join('\n');
      prompt = `Contexto da conversa:\n${context}\n\nUsuário: ${message}`;
    }

    const systemPrompt = `Você é um assistente médico especializado em agendamentos e informações de saúde.
Responda de forma profissional, empática e precisa. Se não souber algo específico sobre saúde, 
recomende consultar um profissional médico. Mantenha as respostas focadas e úteis.

${prompt}`;

    const result = await this.model.generateContentStream(systemPrompt);

    async function* streamGenerator(): AsyncGenerator<StreamingResponse> {
      let fullContent = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullContent += chunkText;
        
        yield {
          content: chunkText,
          isComplete: false,
        };
      }

      // Final response with complete content
      yield {
        content: fullContent,
        isComplete: true,
      };
    }

    return streamGenerator();
  }

  async analyzeIntent(message: string): Promise<{
    intent: string;
    confidence: number;
    entities: Array<{ type: string; value: string }>;
  }> {
    try {
      const prompt = `Analise a seguinte mensagem de um paciente e identifique:
1. Intenção principal (agendamento, cancelamento, reagendamento, informação, emergência)
2. Entidades mencionadas (especialidade médica, data, horário, sintomas)
3. Nível de confiança (0-1)

Mensagem: "${message}"

Responda APENAS em formato JSON:
{
  "intent": "string",
  "confidence": number,
  "entities": [{"type": "string", "value": "string"}]
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      try {
        return JSON.parse(text);
      } catch {
        // Fallback if JSON parsing fails
        return {
          intent: 'information',
          confidence: 0.5,
          entities: [],
        };
      }
    } catch (error) {
      logger.error('Error analyzing intent with Gemini:', error);
      return {
        intent: 'unknown',
        confidence: 0.0,
        entities: [],
      };
    }
  }

  private async checkRateLimit(userId: string): Promise<void> {
    const key = `gemini_rate_limit:${userId}`;
    const current = await this.redis.get(key);
    
    if (current && parseInt(current) >= this.config.rateLimitMax) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }
    
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, Math.ceil(this.config.rateLimitWindow / 1000));
    await pipeline.exec();
  }

  async healthCheck(): Promise<{ status: string; model: string }> {
    try {
      const result = await this.model.generateContent('Hello, please respond with "OK" if you can hear me.');
      const response = await result.response;
      const text = response.text();
      
      return {
        status: text.toLowerCase().includes('ok') ? 'healthy' : 'degraded',
        model: this.config.model,
      };
    } catch (error) {
      logger.error('Gemini health check failed:', error);
      return {
        status: 'unhealthy',
        model: this.config.model,
      };
    }
  }
}