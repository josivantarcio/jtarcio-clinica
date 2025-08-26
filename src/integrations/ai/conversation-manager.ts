import { PrismaClient } from '../../database/generated/client';
import { logger } from '../../config/logger.js';
import { GeminiClient, ConversationMessage } from './gemini-client.js';
import { NLPPipeline, Intent, NLPResult } from './nlp-pipeline.js';
import ChromaDBClient, { SearchResult } from './chromadb-client.js';
import ConversationContextManager, {
  ConversationContext,
} from './conversation-context.js';
import Redis from 'ioredis';

export interface ConversationResponse {
  message: string;
  intent: Intent;
  nextSteps?: string[];
  isCompleted: boolean;
  requiresInput: boolean;
  data?: any;
  confidence: number;
}

export interface StreamingConversationResponse {
  content: string;
  isComplete: boolean;
  intent?: Intent;
  nextSteps?: string[];
  data?: any;
}

export class ConversationManager {
  private prisma: PrismaClient;
  private geminiClient: GeminiClient;
  private nlpPipeline: NLPPipeline;
  private chromaClient: ChromaDBClient;
  private contextManager: ConversationContextManager;

  constructor(prisma: PrismaClient, redis: Redis) {
    this.prisma = prisma;
    this.geminiClient = new GeminiClient(redis);
    this.nlpPipeline = new NLPPipeline(this.geminiClient);
    this.chromaClient = new ChromaDBClient();
    this.contextManager = new ConversationContextManager(redis);
  }

  /**
   * Initialize the conversation manager
   */
  async initialize(): Promise<void> {
    await this.chromaClient.initialize();
    logger.info('Conversation manager initialized');
  }

  /**
   * Process user message and generate response
   */
  async processMessage(
    userId: string,
    message: string,
    sessionId?: string,
    conversationId?: string,
  ): Promise<ConversationResponse> {
    const actualSessionId = sessionId || `session_${Date.now()}`;

    try {
      logger.info('Processing message', {
        userId,
        sessionId: actualSessionId,
        messageLength: message.length,
      });

      // Get or create conversation context
      let context = await this.contextManager.getContext(
        userId,
        actualSessionId,
      );
      if (!context) {
        context = await this.contextManager.createContext(
          userId,
          actualSessionId,
        );
      }

      // Add user message to context
      context = await this.contextManager.addMessage(context, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      // Process message through NLP pipeline
      const nlpResult = await this.nlpPipeline.processMessage(
        message,
        userId,
        context.conversationHistory.slice(-5), // Last 5 messages for context
      );

      // Update context with NLP results
      if (nlpResult.intent !== Intent.UNKNOWN) {
        context = await this.contextManager.updateContext(context, {
          currentIntent: nlpResult.intent,
        });
      }

      // Update slots with extracted entities
      if (Object.keys(nlpResult.entities).length > 0) {
        context = await this.contextManager.updateSlots(
          context,
          nlpResult.entities,
          nlpResult.confidence,
        );
      }

      // Get relevant context from ChromaDB
      const contextInfo = await this.chromaClient.getContext(
        message,
        userId,
        conversationId,
      );

      // Generate AI response
      const response = await this.generateContextualResponse(
        context,
        nlpResult,
        contextInfo,
      );

      // Add AI response to context
      await this.contextManager.addMessage(context, {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
      });

      // Store conversation in ChromaDB for future context
      const messageId = `msg_${Date.now()}_${userId}`;
      await this.chromaClient.addConversationMessage(messageId, message, {
        userId,
        conversationId,
        timestamp: new Date().toISOString(),
        type: 'conversation',
        intent: nlpResult.intent,
      });

      // Store in Prisma if we have a conversation record
      if (conversationId) {
        await this.saveMessageToDatabase(conversationId, message, 'user');
        await this.saveMessageToDatabase(
          conversationId,
          response.message,
          'assistant',
        );
      }

      logger.info('Message processed successfully', {
        userId,
        sessionId: actualSessionId,
        intent: nlpResult.intent,
        confidence: response.confidence,
      });

      return response;
    } catch (error) {
      logger.error('Failed to process message', {
        userId,
        sessionId: actualSessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return {
        message:
          'Desculpe, ocorreu um erro ao processar sua mensagem. Pode tentar novamente?',
        intent: Intent.UNKNOWN,
        isCompleted: false,
        requiresInput: true,
        confidence: 0.1,
      };
    }
  }

  /**
   * Process message with streaming response
   */
  async *processMessageStreaming(
    userId: string,
    message: string,
    sessionId?: string,
    conversationId?: string,
  ): AsyncGenerator<StreamingConversationResponse, void, unknown> {
    const actualSessionId = sessionId || `session_${Date.now()}`;

    try {
      // Get context and process NLP (non-streaming parts)
      let context = await this.contextManager.getContext(
        userId,
        actualSessionId,
      );
      if (!context) {
        context = await this.contextManager.createContext(
          userId,
          actualSessionId,
        );
      }

      context = await this.contextManager.addMessage(context, {
        role: 'user',
        content: message,
        timestamp: new Date(),
      });

      const nlpResult = await this.nlpPipeline.processMessage(
        message,
        userId,
        context.conversationHistory.slice(-5),
      );

      if (nlpResult.intent !== Intent.UNKNOWN) {
        context = await this.contextManager.updateContext(context, {
          currentIntent: nlpResult.intent,
        });
      }

      if (Object.keys(nlpResult.entities).length > 0) {
        context = await this.contextManager.updateSlots(
          context,
          nlpResult.entities,
          nlpResult.confidence,
        );
      }

      const contextInfo = await this.chromaClient.getContext(
        message,
        userId,
        conversationId,
      );

      // Stream the response
      let fullResponse = '';
      for await (const chunk of this.generateContextualResponseStream(
        context,
        nlpResult,
        contextInfo,
      )) {
        fullResponse += chunk.content;

        yield {
          content: chunk.content,
          isComplete: chunk.isComplete,
          intent: nlpResult.intent,
          ...(chunk.isComplete && {
            nextSteps: this.getNextSteps(context),
          }),
        };
      }

      // Save final response to context
      await this.contextManager.addMessage(context, {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date(),
      });

      // Store in databases
      const messageId = `msg_${Date.now()}_${userId}`;
      await this.chromaClient.addConversationMessage(messageId, message, {
        userId,
        conversationId,
        timestamp: new Date().toISOString(),
        type: 'conversation',
        intent: nlpResult.intent,
      });

      if (conversationId) {
        await this.saveMessageToDatabase(conversationId, message, 'user');
        await this.saveMessageToDatabase(
          conversationId,
          fullResponse,
          'assistant',
        );
      }
    } catch (error) {
      logger.error('Failed to process streaming message', {
        userId,
        sessionId: actualSessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      yield {
        content:
          'Desculpe, ocorreu um erro ao processar sua mensagem. Pode tentar novamente?',
        isComplete: true,
      };
    }
  }

  /**
   * Generate contextual response
   */
  private async generateContextualResponse(
    context: ConversationContext,
    nlpResult: NLPResult,
    contextInfo: {
      similarConversations: SearchResult[];
      relevantKnowledge: SearchResult[];
      recentHistory: SearchResult[];
    },
  ): Promise<ConversationResponse> {
    const prompt = this.buildPrompt(context, nlpResult, contextInfo);

    const response = await this.geminiClient.generateResponse(
      [{ role: 'user', content: prompt }],
      context.userId,
      {
        maxTokens: 1000,
        temperature: 0.7,
        system: this.getSystemPrompt(context.currentIntent),
      },
    );

    const isCompleted = this.isConversationComplete(context);
    const requiresInput = this.requiresUserInput(context);

    return {
      message: response.trim(),
      intent: context.currentIntent,
      nextSteps: this.getNextSteps(context),
      isCompleted,
      requiresInput,
      confidence: nlpResult.confidence,
      data: this.extractResponseData(context),
    };
  }

  /**
   * Generate streaming contextual response
   */
  private async *generateContextualResponseStream(
    context: ConversationContext,
    nlpResult: NLPResult,
    contextInfo: {
      similarConversations: SearchResult[];
      relevantKnowledge: SearchResult[];
      recentHistory: SearchResult[];
    },
  ): AsyncGenerator<{ content: string; isComplete: boolean }, void, unknown> {
    const prompt = this.buildPrompt(context, nlpResult, contextInfo);

    for await (const chunk of this.geminiClient.generateStreamingResponse(
      [{ role: 'user', content: prompt }],
      context.userId,
      {
        maxTokens: 1000,
        temperature: 0.7,
        system: this.getSystemPrompt(context.currentIntent),
      },
    )) {
      yield chunk;
    }
  }

  /**
   * Build prompt for AI response
   */
  private buildPrompt(
    context: ConversationContext,
    nlpResult: NLPResult,
    contextInfo: {
      similarConversations: SearchResult[];
      relevantKnowledge: SearchResult[];
      recentHistory: SearchResult[];
    },
  ): string {
    const sections = [];

    sections.push('CONTEXTO DA CONVERSA:');
    sections.push(this.contextManager.getContextSummary(context));

    if (contextInfo.relevantKnowledge.length > 0) {
      sections.push('\nCONHECIMENTO RELEVANTE:');
      contextInfo.relevantKnowledge.forEach(item => {
        sections.push(`- ${item.content}`);
      });
    }

    if (contextInfo.recentHistory.length > 0) {
      sections.push('\nHISTÓRICO RECENTE:');
      contextInfo.recentHistory.slice(-3).forEach(item => {
        sections.push(`- ${item.content.substring(0, 150)}...`);
      });
    }

    sections.push('\nPROCESSAMENTO NLP:');
    sections.push(`Intent detectado: ${nlpResult.intent}`);
    sections.push(`Confiança: ${nlpResult.confidence}`);

    if (Object.keys(nlpResult.entities).length > 0) {
      sections.push('Entidades extraídas:');
      Object.entries(nlpResult.entities).forEach(([key, value]) => {
        if (value && (Array.isArray(value) ? value.length > 0 : true)) {
          sections.push(`- ${key}: ${JSON.stringify(value)}`);
        }
      });
    }

    const missingSlots = this.contextManager.getMissingSlots(context);
    if (missingSlots.length > 0) {
      sections.push(
        `\nINFORMAÇÕES AINDA NECESSÁRIAS: ${missingSlots.join(', ')}`,
      );
    }

    sections.push('\nMENSAGEM ATUAL DO USUÁRIO:');
    sections.push(nlpResult.originalText);

    sections.push('\nRESPONDA DE FORMA:');
    sections.push('1. Natural e conversacional');
    sections.push('2. Profissional mas amigável');
    sections.push('3. Focada em resolver o problema do usuário');
    sections.push('4. Solicitando informações faltantes quando necessário');

    return sections.join('\n');
  }

  /**
   * Get system prompt based on intent
   */
  private getSystemPrompt(intent: Intent): string {
    const basePrompt = `
Você é um assistente especializado em agendamento médico da clínica.
Seu objetivo é ajudar pacientes de forma eficiente e amigável.
Seja sempre cordial, profissional e preciso.`;

    const intentPrompts = {
      [Intent.AGENDAR_CONSULTA]: `
${basePrompt}

FOCO: Ajudar a agendar nova consulta médica
COLETA NECESSÁRIA: nome, telefone, especialidade, preferência de data/horário
PROCESSO: Colete informações gradualmente, confirme dados, apresente opções disponíveis`,

      [Intent.REAGENDAR_CONSULTA]: `
${basePrompt}

FOCO: Remarcar consulta existente
COLETA NECESSÁRIA: dados do paciente, identificação da consulta atual
PROCESSO: Identifique consulta, confirme nova data/horário, processe alteração`,

      [Intent.CANCELAR_CONSULTA]: `
${basePrompt}

FOCO: Cancelar consulta existente
COLETA NECESSÁRIA: dados do paciente, identificação da consulta
PROCESSO: Identifique consulta, confirme cancelamento, explique política`,

      [Intent.EMERGENCIA]: `
${basePrompt}

FOCO: Avaliar situação de emergência
PRIORIDADE: Segurança do paciente
PROCESSO: Avalie urgência, colete sintomas, direcione para atendimento adequado`,

      [Intent.INFORMACOES_GERAIS]: `
${basePrompt}

FOCO: Fornecer informações sobre a clínica
AREAS: especialidades, horários, convênios, localização, procedimentos`,
    };

    return intentPrompts[intent] || basePrompt;
  }

  /**
   * Check if conversation is complete
   */
  private isConversationComplete(context: ConversationContext): boolean {
    if (context.currentIntent === Intent.INFORMACOES_GERAIS) {
      return true; // Information requests are typically one-off
    }

    return (
      this.contextManager.areAllSlotsFilled(context) &&
      context.flowState === 'completed'
    );
  }

  /**
   * Check if user input is required
   */
  private requiresUserInput(context: ConversationContext): boolean {
    const missingSlots = this.contextManager.getMissingSlots(context);
    return missingSlots.length > 0 || context.flowState !== 'completed';
  }

  /**
   * Get next steps for the conversation
   */
  private getNextSteps(context: ConversationContext): string[] {
    const missingSlots = this.contextManager.getMissingSlots(context);
    const steps = [];

    missingSlots.forEach(slot => {
      switch (slot) {
        case 'patientName':
          steps.push('Informe seu nome completo');
          break;
        case 'patientPhone':
          steps.push('Informe seu telefone');
          break;
        case 'specialty':
          steps.push('Escolha a especialidade médica');
          break;
        case 'preferredDate':
          steps.push('Informe sua preferência de data');
          break;
        case 'preferredTime':
          steps.push('Informe sua preferência de horário');
          break;
      }
    });

    return steps;
  }

  /**
   * Extract data for frontend use
   */
  private extractResponseData(context: ConversationContext): any {
    const data: any = {};

    // Extract confirmed slot values
    Object.entries(context.slotsFilled).forEach(([key, slot]) => {
      if (slot?.confirmed) {
        data[key] = slot.value;
      }
    });

    data.intent = context.currentIntent;
    data.flowState = context.flowState;
    data.isCompleted = this.isConversationComplete(context);

    return data;
  }

  /**
   * Save message to database
   */
  private async saveMessageToDatabase(
    conversationId: string,
    content: string,
    role: 'user' | 'assistant',
  ): Promise<void> {
    try {
      await this.prisma.message.create({
        data: {
          conversationId,
          content,
          role,
          processed: role === 'user', // Mark user messages as needing processing
        },
      });
    } catch (error) {
      logger.error('Failed to save message to database', {
        conversationId,
        role,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Health check for all AI services
   */
  async healthCheck(): Promise<{
    gemini: boolean;
    chroma: boolean;
    overall: boolean;
  }> {
    const [geminiHealth, chromaHealth] = await Promise.all([
      this.geminiClient.healthCheck().then(result => result.status === 'healthy'),
      this.chromaClient.healthCheck(),
    ]);

    return {
      gemini: geminiHealth,
      chroma: chromaHealth,
      overall: geminiHealth && chromaHealth,
    };
  }

  /**
   * Get usage statistics
   */
  async getStats(): Promise<{
    gemini: any;
    chroma: any;
  }> {
    const [chromaStats] = await Promise.all([this.chromaClient.getStats()]);

    return {
      gemini: {}, // Would need to implement in GeminiClient
      chroma: chromaStats,
    };
  }
}
