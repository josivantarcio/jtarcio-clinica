import Redis from 'ioredis';
import { logger } from '../../config/logger.js';
import { Intent, ExtractedEntities } from './nlp-pipeline.js';
import { ConversationMessage } from './anthropic-client.js';

export interface SlotValue {
  value: any;
  confidence: number;
  extractedAt: Date;
  confirmed: boolean;
}

export interface SlotMap {
  // Patient information
  patientName?: SlotValue;
  patientCPF?: SlotValue;
  patientPhone?: SlotValue;
  patientEmail?: SlotValue;

  // Appointment details
  specialty?: SlotValue;
  doctor?: SlotValue;
  preferredDate?: SlotValue;
  preferredTime?: SlotValue;
  timePreference?: SlotValue; // morning, afternoon, evening
  appointmentReason?: SlotValue;

  // Existing appointment (for rescheduling/canceling)
  existingAppointmentId?: SlotValue;
  existingAppointmentDate?: SlotValue;

  // Emergency details
  symptoms?: SlotValue;
  urgencyLevel?: SlotValue;

  // Insurance
  insurancePlan?: SlotValue;
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  conversationId?: string;
  
  // Current state
  currentIntent: Intent;
  currentStep: string;
  isCompleted: boolean;
  
  // Message history
  conversationHistory: ConversationMessage[];
  
  // Extracted data
  extractedEntities: ExtractedEntities[];
  slotsFilled: SlotMap;
  
  // Conversation flow
  flowState: string;
  nextExpectedInput: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  lastActivity: Date;
  
  // Context for AI
  conversationSummary?: string;
  patientContext?: any; // Previous appointments, preferences, etc.
  
  // Error handling
  errorCount: number;
  clarificationCount: number;
}

export class ConversationContextManager {
  private redis: Redis;
  private contextTTL: number = 30 * 60; // 30 minutes
  private maxHistoryLength: number = 20;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Create new conversation context
   */
  async createContext(
    userId: string,
    sessionId: string,
    initialIntent: Intent = Intent.UNKNOWN
  ): Promise<ConversationContext> {
    const context: ConversationContext = {
      userId,
      sessionId,
      currentIntent: initialIntent,
      currentStep: 'initial',
      isCompleted: false,
      conversationHistory: [],
      extractedEntities: [],
      slotsFilled: {},
      flowState: this.getInitialFlowState(initialIntent),
      nextExpectedInput: this.getExpectedInputs(initialIntent, 'initial'),
      createdAt: new Date(),
      updatedAt: new Date(),
      lastActivity: new Date(),
      errorCount: 0,
      clarificationCount: 0
    };

    await this.saveContext(context);
    
    logger.info('Created new conversation context', {
      userId,
      sessionId,
      initialIntent
    });

    return context;
  }

  /**
   * Get existing conversation context
   */
  async getContext(userId: string, sessionId: string): Promise<ConversationContext | null> {
    try {
      const key = this.getContextKey(userId, sessionId);
      const contextData = await this.redis.get(key);
      
      if (!contextData) {
        return null;
      }

      const context = JSON.parse(contextData) as ConversationContext;
      
      // Convert date strings back to Date objects
      context.createdAt = new Date(context.createdAt);
      context.updatedAt = new Date(context.updatedAt);
      context.lastActivity = new Date(context.lastActivity);

      // Extend TTL on access
      await this.redis.expire(key, this.contextTTL);

      return context;
    } catch (error) {
      logger.error('Failed to get conversation context', {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  /**
   * Update conversation context
   */
  async updateContext(
    context: ConversationContext,
    updates: Partial<ConversationContext>
  ): Promise<ConversationContext> {
    const updatedContext = {
      ...context,
      ...updates,
      updatedAt: new Date(),
      lastActivity: new Date()
    };

    await this.saveContext(updatedContext);

    logger.debug('Updated conversation context', {
      userId: context.userId,
      sessionId: context.sessionId,
      updates: Object.keys(updates)
    });

    return updatedContext;
  }

  /**
   * Add message to conversation history
   */
  async addMessage(
    context: ConversationContext,
    message: ConversationMessage
  ): Promise<ConversationContext> {
    const updatedHistory = [...context.conversationHistory, message];
    
    // Trim history if too long
    if (updatedHistory.length > this.maxHistoryLength) {
      updatedHistory.splice(0, updatedHistory.length - this.maxHistoryLength);
    }

    return await this.updateContext(context, {
      conversationHistory: updatedHistory
    });
  }

  /**
   * Update slots with new entities
   */
  async updateSlots(
    context: ConversationContext,
    entities: ExtractedEntities,
    confidence: number = 0.8
  ): Promise<ConversationContext> {
    const updatedSlots = { ...context.slotsFilled };
    const timestamp = new Date();

    // Map entities to slots
    if (entities.pessoa?.nome) {
      updatedSlots.patientName = {
        value: entities.pessoa.nome,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.pessoa?.nomeCompleto) {
      updatedSlots.patientName = {
        value: entities.pessoa.nomeCompleto,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.documento?.cpf) {
      updatedSlots.patientCPF = {
        value: entities.documento.cpf,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.contato?.telefone) {
      updatedSlots.patientPhone = {
        value: entities.contato.telefone,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.contato?.email) {
      updatedSlots.patientEmail = {
        value: entities.contato.email,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.especialidade && entities.especialidade.length > 0) {
      updatedSlots.specialty = {
        value: entities.especialidade[0],
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.temporal?.data) {
      updatedSlots.preferredDate = {
        value: entities.temporal.data,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.temporal?.horario) {
      updatedSlots.preferredTime = {
        value: entities.temporal.horario,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.temporal?.periodo) {
      updatedSlots.timePreference = {
        value: entities.temporal.periodo,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.sintoma && entities.sintoma.length > 0) {
      updatedSlots.symptoms = {
        value: entities.sintoma,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.urgencia) {
      updatedSlots.urgencyLevel = {
        value: entities.urgencia.nivel,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    if (entities.agendamentoExistente?.id) {
      updatedSlots.existingAppointmentId = {
        value: entities.agendamentoExistente.id,
        confidence,
        extractedAt: timestamp,
        confirmed: false
      };
    }

    return await this.updateContext(context, {
      slotsFilled: updatedSlots,
      extractedEntities: [...context.extractedEntities, entities]
    });
  }

  /**
   * Confirm a slot value
   */
  async confirmSlot(
    context: ConversationContext,
    slotName: keyof SlotMap
  ): Promise<ConversationContext> {
    const updatedSlots = { ...context.slotsFilled };
    
    if (updatedSlots[slotName]) {
      updatedSlots[slotName]!.confirmed = true;
    }

    return await this.updateContext(context, {
      slotsFilled: updatedSlots
    });
  }

  /**
   * Get missing required slots for current intent
   */
  getMissingSlots(context: ConversationContext): (keyof SlotMap)[] {
    const requiredSlots = this.getRequiredSlots(context.currentIntent);
    const missing: (keyof SlotMap)[] = [];

    for (const slot of requiredSlots) {
      const slotValue = context.slotsFilled[slot];
      if (!slotValue || !slotValue.confirmed) {
        missing.push(slot);
      }
    }

    return missing;
  }

  /**
   * Check if all required slots are filled
   */
  areAllSlotsFilled(context: ConversationContext): boolean {
    return this.getMissingSlots(context).length === 0;
  }

  /**
   * Generate context summary for AI prompts
   */
  getContextSummary(context: ConversationContext): string {
    const summary = [];

    summary.push(`Intent: ${context.currentIntent}`);
    summary.push(`Step: ${context.currentStep}`);

    // Confirmed slots
    const confirmedSlots = Object.entries(context.slotsFilled)
      .filter(([, slot]) => slot.confirmed)
      .map(([key, slot]) => `${key}: ${slot.value}`)
      .join(', ');
    
    if (confirmedSlots) {
      summary.push(`Confirmed info: ${confirmedSlots}`);
    }

    // Missing slots
    const missing = this.getMissingSlots(context);
    if (missing.length > 0) {
      summary.push(`Still need: ${missing.join(', ')}`);
    }

    // Recent messages
    const recentMessages = context.conversationHistory.slice(-3);
    if (recentMessages.length > 0) {
      summary.push('Recent conversation:');
      recentMessages.forEach(msg => {
        summary.push(`${msg.role}: ${msg.content.substring(0, 100)}`);
      });
    }

    return summary.join('\n');
  }

  /**
   * Clean up expired contexts
   */
  async cleanupExpiredContexts(): Promise<number> {
    try {
      const pattern = 'conversation_context:*';
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        logger.info('Cleaned up expired conversation contexts', { count: cleanedCount });
      }

      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup expired contexts', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return 0;
    }
  }

  /**
   * Delete conversation context
   */
  async deleteContext(userId: string, sessionId: string): Promise<boolean> {
    try {
      const key = this.getContextKey(userId, sessionId);
      const result = await this.redis.del(key);
      
      logger.info('Deleted conversation context', { userId, sessionId });
      return result > 0;
    } catch (error) {
      logger.error('Failed to delete conversation context', {
        userId,
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  /**
   * Save context to Redis
   */
  private async saveContext(context: ConversationContext): Promise<void> {
    const key = this.getContextKey(context.userId, context.sessionId);
    await this.redis.setex(
      key,
      this.contextTTL,
      JSON.stringify(context)
    );
  }

  /**
   * Generate Redis key for context
   */
  private getContextKey(userId: string, sessionId: string): string {
    return `conversation_context:${userId}:${sessionId}`;
  }

  /**
   * Get initial flow state based on intent
   */
  private getInitialFlowState(intent: Intent): string {
    switch (intent) {
      case Intent.AGENDAR_CONSULTA:
        return 'collecting_patient_info';
      case Intent.REAGENDAR_CONSULTA:
        return 'identifying_appointment';
      case Intent.CANCELAR_CONSULTA:
        return 'identifying_appointment';
      case Intent.CONSULTAR_AGENDAMENTO:
        return 'identifying_patient';
      case Intent.EMERGENCIA:
        return 'assessing_emergency';
      case Intent.INFORMACOES_GERAIS:
        return 'providing_information';
      default:
        return 'understanding_intent';
    }
  }

  /**
   * Get expected inputs for current state
   */
  private getExpectedInputs(intent: Intent, step: string): string[] {
    const inputMap: Record<string, string[]> = {
      'collecting_patient_info': ['name', 'cpf', 'phone', 'specialty'],
      'collecting_appointment_details': ['date', 'time', 'symptoms'],
      'identifying_appointment': ['appointment_id', 'date', 'doctor'],
      'identifying_patient': ['name', 'cpf', 'phone'],
      'assessing_emergency': ['symptoms', 'urgency_level'],
      'providing_information': ['question_topic'],
      'understanding_intent': ['user_intent']
    };

    return inputMap[step] || [];
  }

  /**
   * Get required slots for intent
   */
  private getRequiredSlots(intent: Intent): (keyof SlotMap)[] {
    switch (intent) {
      case Intent.AGENDAR_CONSULTA:
        return ['patientName', 'patientPhone', 'specialty'];
      case Intent.REAGENDAR_CONSULTA:
      case Intent.CANCELAR_CONSULTA:
        return ['patientName', 'patientPhone'];
      case Intent.CONSULTAR_AGENDAMENTO:
        return ['patientName', 'patientPhone'];
      case Intent.EMERGENCIA:
        return ['patientName', 'patientPhone', 'symptoms'];
      default:
        return [];
    }
  }
}

export default ConversationContextManager;