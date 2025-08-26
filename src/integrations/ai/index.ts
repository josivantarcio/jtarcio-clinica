/**
 * AI Integration Module Index
 *
 * This module exports all the AI integration components for the medical clinic system.
 * It provides a comprehensive conversational AI system with Claude Sonnet 4 integration,
 * NLP processing, vector embeddings, and medical knowledge management.
 */

// Core AI clients and services
export { GeminiClient } from './gemini-client.js';
export type {
  ConversationMessage,
  StreamingResponse,
} from './gemini-client.js';

export { NLPPipeline, Intent } from './nlp-pipeline.js';
export type { ExtractedEntities, NLPResult } from './nlp-pipeline.js';

export { default as ChromaDBClient } from './chromadb-client.js';
export type {
  DocumentMetadata,
  SearchResult,
  EmbeddingStats,
} from './chromadb-client.js';

// Conversation management
export { default as ConversationContextManager } from './conversation-context.js';
export type {
  ConversationContext,
  SlotValue,
  SlotMap,
} from './conversation-context.js';

export { ConversationManager } from './conversation-manager.js';
export type {
  ConversationResponse,
  StreamingConversationResponse,
} from './conversation-manager.js';

// Knowledge base and templates
export { default as MedicalKnowledgeBase } from './knowledge-base.js';
export type {
  MedicalSpecialty,
  FAQEntry,
  EmergencyProtocol,
  ClinicPolicy,
} from './knowledge-base.js';

export { default as PromptTemplateManager } from './prompt-templates.js';
export type { PromptTemplate, PromptVariables } from './prompt-templates.js';

// Conversation flows
export { default as ConversationFlowHandler } from './conversation-flows.js';
export type {
  FlowResult,
  AppointmentData,
  AppointmentSlot,
} from './conversation-flows.js';

// Main AI service factory
import { PrismaClient } from '../../database/generated/client';
import Redis from 'ioredis';
import { ConversationManager } from './conversation-manager.js';
import { logger } from '../../config/logger.js';

/**
 * AI Service Factory
 * Creates and initializes all AI services
 */
export class AIServiceFactory {
  private static instance: AIServiceFactory;
  private conversationManager: ConversationManager | null = null;
  private initialized = false;

  private constructor() {}

  static getInstance(): AIServiceFactory {
    if (!AIServiceFactory.instance) {
      AIServiceFactory.instance = new AIServiceFactory();
    }
    return AIServiceFactory.instance;
  }

  /**
   * Initialize all AI services
   */
  async initialize(
    prisma: PrismaClient,
    redis: Redis,
  ): Promise<ConversationManager> {
    if (this.initialized && this.conversationManager) {
      return this.conversationManager;
    }

    try {
      logger.info('Initializing AI services...');

      this.conversationManager = new ConversationManager(prisma, redis);
      await this.conversationManager.initialize();

      this.initialized = true;

      logger.info('AI services initialized successfully');
      return this.conversationManager;
    } catch (error) {
      logger.error('Failed to initialize AI services', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get conversation manager instance
   */
  getConversationManager(): ConversationManager | null {
    return this.conversationManager;
  }

  /**
   * Health check for all AI services
   */
  async healthCheck(): Promise<{
    initialized: boolean;
    services: {
      conversationManager: boolean;
      anthropic: boolean;
      chromadb: boolean;
    };
    overall: boolean;
  }> {
    const result = {
      initialized: this.initialized,
      services: {
        conversationManager: false,
        anthropic: false,
        chromadb: false,
      },
      overall: false,
    };

    if (this.conversationManager) {
      result.services.conversationManager = true;

      try {
        const health = await this.conversationManager.healthCheck();
        result.services.anthropic = health.gemini;
        result.services.chromadb = health.chroma;
      } catch (error) {
        logger.error('Health check failed', { error });
      }
    }

    result.overall =
      result.initialized &&
      result.services.conversationManager &&
      result.services.anthropic &&
      result.services.chromadb;

    return result;
  }

  /**
   * Shutdown all AI services
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down AI services...');

    this.conversationManager = null;
    this.initialized = false;

    logger.info('AI services shutdown complete');
  }
}

/**
 * Utility functions for AI integration
 */
export const AIUtils = {
  /**
   * Validate message content
   */
  validateMessage(message: string): { valid: boolean; error?: string } {
    if (!message || message.trim().length === 0) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (message.length > 2000) {
      return { valid: false, error: 'Message too long (max 2000 characters)' };
    }

    // Basic profanity/spam detection
    const suspiciousPatterns = [
      /(.)\1{10,}/g, // Repeated characters
      /https?:\/\/[^\s]+/g, // URLs (might be spam)
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(message)) {
        return { valid: false, error: 'Message contains suspicious content' };
      }
    }

    return { valid: true };
  },

  /**
   * Format response for frontend
   */
  formatResponse(response: ConversationResponse): {
    message: string;
    intent: string;
    metadata: any;
    suggestions?: string[];
  } {
    return {
      message: response.message,
      intent: response.intent,
      metadata: {
        confidence: response.confidence,
        isCompleted: response.isCompleted,
        requiresInput: response.requiresInput,
        data: response.data,
      },
      suggestions: response.nextSteps,
    };
  },

  /**
   * Extract user intent from message (simple keyword matching)
   */
  quickIntentDetection(message: string): Intent {
    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('emergência') ||
      lowerMessage.includes('urgente')
    ) {
      return Intent.EMERGENCIA;
    }

    if (lowerMessage.includes('agendar') || lowerMessage.includes('marcar')) {
      return Intent.AGENDAR_CONSULTA;
    }

    if (
      lowerMessage.includes('cancelar') ||
      lowerMessage.includes('desmarcar')
    ) {
      return Intent.CANCELAR_CONSULTA;
    }

    if (
      lowerMessage.includes('reagendar') ||
      lowerMessage.includes('remarcar')
    ) {
      return Intent.REAGENDAR_CONSULTA;
    }

    if (
      lowerMessage.includes('consultar') ||
      lowerMessage.includes('verificar')
    ) {
      return Intent.CONSULTAR_AGENDAMENTO;
    }

    return Intent.INFORMACOES_GERAIS;
  },
};

/**
 * Constants for AI configuration
 */
export const AI_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  MAX_CONVERSATION_HISTORY: 20,
  DEFAULT_CONFIDENCE_THRESHOLD: 0.6,
  RATE_LIMITS: {
    MESSAGES_PER_MINUTE: 30,
    STREAMING_PER_MINUTE: 20,
    BATCH_PER_5_MINUTES: 5,
  },
  INTENTS: {
    [Intent.AGENDAR_CONSULTA]: 'Agendamento de consulta',
    [Intent.REAGENDAR_CONSULTA]: 'Reagendamento de consulta',
    [Intent.CANCELAR_CONSULTA]: 'Cancelamento de consulta',
    [Intent.CONSULTAR_AGENDAMENTO]: 'Consulta de agendamentos',
    [Intent.EMERGENCIA]: 'Situação de emergência',
    [Intent.INFORMACOES_GERAIS]: 'Informações gerais',
    [Intent.UNKNOWN]: 'Intenção não identificada',
  },
};

// Re-export the Intent enum for convenience
export { Intent } from './nlp-pipeline.js';
