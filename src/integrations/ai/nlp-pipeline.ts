import { logger } from '../../config/logger.js';
import { AnthropicClient, ConversationMessage } from './anthropic-client.js';

// Intent types based on the requirements
export enum Intent {
  AGENDAR_CONSULTA = 'AGENDAR_CONSULTA',
  REAGENDAR_CONSULTA = 'REAGENDAR_CONSULTA',
  CANCELAR_CONSULTA = 'CANCELAR_CONSULTA',
  CONSULTAR_AGENDAMENTO = 'CONSULTAR_AGENDAMENTO',
  EMERGENCIA = 'EMERGENCIA',
  INFORMACOES_GERAIS = 'INFORMACOES_GERAIS',
  UNKNOWN = 'UNKNOWN'
}

// Entity types for extraction
export interface ExtractedEntities {
  pessoa?: {
    nome?: string;
    nomeCompleto?: string;
  };
  documento?: {
    cpf?: string;
    rg?: string;
  };
  contato?: {
    telefone?: string;
    email?: string;
  };
  especialidade?: string[];
  temporal?: {
    data?: string;
    horario?: string;
    periodo?: 'manha' | 'tarde' | 'noite';
    proximaSemana?: boolean;
    proximoMes?: boolean;
  };
  sintoma?: string[];
  urgencia?: {
    nivel: 'baixa' | 'media' | 'alta' | 'emergencia';
    descricao?: string;
  };
  preferencias?: {
    medico?: string;
    periodo?: string;
    dias?: string[];
  };
  agendamentoExistente?: {
    id?: string;
    data?: string;
    medico?: string;
  };
}

export interface NLPResult {
  intent: Intent;
  confidence: number;
  entities: ExtractedEntities;
  originalText: string;
  processedAt: Date;
}

export class NLPPipeline {
  private anthropicClient: AnthropicClient;
  private intentPrompt: string;
  private entityPrompt: string;

  constructor(anthropicClient: AnthropicClient) {
    this.anthropicClient = anthropicClient;
    this.setupPrompts();
  }

  private setupPrompts(): void {
    this.intentPrompt = `
Você é um especialista em classificação de intenções para um sistema de agendamento médico.
Analise a mensagem do usuário e classifique a intenção principal.

INTENÇÕES DISPONÍVEIS:
- AGENDAR_CONSULTA: Usuário quer marcar uma nova consulta
- REAGENDAR_CONSULTA: Usuário quer remarcar uma consulta existente  
- CANCELAR_CONSULTA: Usuário quer cancelar uma consulta
- CONSULTAR_AGENDAMENTO: Usuário quer verificar consultas agendadas
- EMERGENCIA: Situação de emergência médica
- INFORMACOES_GERAIS: Perguntas sobre a clínica, especialidades, horários, etc.

INSTRUÇÕES:
1. Analise o contexto e objetivo principal da mensagem
2. Retorne APENAS o nome da intenção
3. Se não tiver certeza, retorne INFORMACOES_GERAIS

Mensagem do usuário: "{message}"

Intenção:`;

    this.entityPrompt = `
Você é um especialista em extração de entidades para um sistema médico.
Extraia todas as informações relevantes da mensagem do usuário.

ENTIDADES PARA EXTRAIR:
- PESSOA: nome, nome completo
- DOCUMENTO: CPF, RG  
- CONTATO: telefone, email
- ESPECIALIDADE: cardiologia, ortopedia, pediatria, etc.
- TEMPORAL: datas específicas, horários, períodos (manhã/tarde/noite), "próxima semana", etc.
- SINTOMA: descrição de problemas de saúde
- URGENCIA: nível de emergência e descrição
- PREFERENCIAS: médico específico, período preferido, dias da semana
- AGENDAMENTO_EXISTENTE: referência a consulta já marcada

INSTRUÇÕES:
1. Extraia apenas informações explicitamente mencionadas
2. Normalize datas e horários quando possível
3. Identifique especialidades médicas mesmo com nomes populares
4. Retorne JSON válido com as entidades encontradas
5. Use null para campos não encontrados

ESPECIALIDADES COMUNS E SEUS SINÔNIMOS:
- Cardiologia: coração, cardíaco, cardiologista
- Ortopedia: osso, fratura, articulação, ortopedista
- Pediatria: criança, bebê, pediatra
- Ginecologia: gineco, ginecologista, mulher
- Neurologia: neurologista, cabeça, neurológico
- Dermatologia: pele, dermatologista
- Psiquiatria: psiquiatra, saúde mental
- Oftalmologia: olho, oftalmologista, visão

Mensagem: "{message}"

Responda APENAS com JSON no formato:
{
  "pessoa": {"nome": null, "nomeCompleto": null},
  "documento": {"cpf": null, "rg": null},
  "contato": {"telefone": null, "email": null},
  "especialidade": [],
  "temporal": {"data": null, "horario": null, "periodo": null, "proximaSemana": false, "proximoMes": false},
  "sintoma": [],
  "urgencia": {"nivel": null, "descricao": null},
  "preferencias": {"medico": null, "periodo": null, "dias": []},
  "agendamentoExistente": {"id": null, "data": null, "medico": null}
}`;
  }

  /**
   * Process user message through NLP pipeline
   */
  async processMessage(
    message: string, 
    userId: string,
    context?: ConversationMessage[]
  ): Promise<NLPResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting NLP processing', { userId, messageLength: message.length });

      // Step 1: Intent Classification
      const intent = await this.classifyIntent(message, userId, context);
      
      // Step 2: Entity Extraction
      const entities = await this.extractEntities(message, userId);

      const processingTime = Date.now() - startTime;
      
      const result: NLPResult = {
        intent,
        confidence: this.calculateConfidence(intent, entities),
        entities,
        originalText: message,
        processedAt: new Date()
      };

      logger.info('NLP processing completed', { 
        userId, 
        intent, 
        processingTime,
        entitiesFound: Object.keys(entities).filter(key => entities[key as keyof ExtractedEntities] != null).length
      });

      return result;
    } catch (error) {
      logger.error('NLP processing failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: message.substring(0, 100)
      });

      // Return fallback result
      return {
        intent: Intent.UNKNOWN,
        confidence: 0,
        entities: {},
        originalText: message,
        processedAt: new Date()
      };
    }
  }

  /**
   * Classify user intent
   */
  private async classifyIntent(
    message: string, 
    userId: string,
    context?: ConversationMessage[]
  ): Promise<Intent> {
    try {
      // Prepare messages with context if available
      const messages: ConversationMessage[] = [];
      
      // Add context if provided (last few messages)
      if (context && context.length > 0) {
        messages.push({
          role: 'user',
          content: `Contexto da conversa:\n${context.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\n`
        });
      }

      messages.push({
        role: 'user',
        content: this.intentPrompt.replace('{message}', message)
      });

      const response = await this.anthropicClient.generateResponse(
        messages,
        userId,
        {
          maxTokens: 50,
          temperature: 0.1,
          system: 'Você é um classificador de intenções preciso e conciso.'
        }
      );

      const intentText = response.trim().toUpperCase();
      
      // Validate intent
      if (Object.values(Intent).includes(intentText as Intent)) {
        return intentText as Intent;
      }

      // Fallback logic for common patterns
      return this.fallbackIntentClassification(message);
    } catch (error) {
      logger.error('Intent classification failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return this.fallbackIntentClassification(message);
    }
  }

  /**
   * Extract entities from message
   */
  private async extractEntities(message: string, userId: string): Promise<ExtractedEntities> {
    try {
      const messages: ConversationMessage[] = [{
        role: 'user',
        content: this.entityPrompt.replace('{message}', message)
      }];

      const response = await this.anthropicClient.generateResponse(
        messages,
        userId,
        {
          maxTokens: 500,
          temperature: 0.1,
          system: 'Você é um extrator de entidades preciso que retorna apenas JSON válido.'
        }
      );

      // Parse JSON response
      const cleanedResponse = response.trim().replace(/```json\n?|\n?```/g, '');
      const entities = JSON.parse(cleanedResponse) as ExtractedEntities;

      // Clean up null values and empty arrays
      return this.cleanEntities(entities);
    } catch (error) {
      logger.error('Entity extraction failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return this.fallbackEntityExtraction(message);
    }
  }

  /**
   * Fallback intent classification using keyword matching
   */
  private fallbackIntentClassification(message: string): Intent {
    const lowerMessage = message.toLowerCase();
    
    // Emergency keywords
    if (lowerMessage.includes('emergência') || lowerMessage.includes('urgente') || 
        lowerMessage.includes('dor forte') || lowerMessage.includes('não aguenta')) {
      return Intent.EMERGENCIA;
    }

    // Scheduling keywords
    if (lowerMessage.includes('agendar') || lowerMessage.includes('marcar') || 
        lowerMessage.includes('consulta') || lowerMessage.includes('horário')) {
      return Intent.AGENDAR_CONSULTA;
    }

    // Rescheduling keywords
    if (lowerMessage.includes('reagendar') || lowerMessage.includes('remarcar') || 
        lowerMessage.includes('mudar horário')) {
      return Intent.REAGENDAR_CONSULTA;
    }

    // Cancellation keywords
    if (lowerMessage.includes('cancelar') || lowerMessage.includes('desmarcar')) {
      return Intent.CANCELAR_CONSULTA;
    }

    // Consultation keywords
    if (lowerMessage.includes('consultar') || lowerMessage.includes('verificar') || 
        lowerMessage.includes('minha consulta')) {
      return Intent.CONSULTAR_AGENDAMENTO;
    }

    return Intent.INFORMACOES_GERAIS;
  }

  /**
   * Fallback entity extraction using regex patterns
   */
  private fallbackEntityExtraction(message: string): ExtractedEntities {
    const entities: ExtractedEntities = {};

    // Extract CPF pattern
    const cpfMatch = message.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    if (cpfMatch) {
      entities.documento = { cpf: cpfMatch[0] };
    }

    // Extract phone pattern
    const phoneMatch = message.match(/\(?(\d{2})\)?\s?9?\d{4}-?\d{4}/);
    if (phoneMatch) {
      entities.contato = { telefone: phoneMatch[0] };
    }

    // Extract common specialties
    const specialties = ['cardiologia', 'ortopedia', 'pediatria', 'ginecologia', 'neurologia'];
    const foundSpecialties = specialties.filter(specialty => 
      message.toLowerCase().includes(specialty)
    );
    if (foundSpecialties.length > 0) {
      entities.especialidade = foundSpecialties;
    }

    return entities;
  }

  /**
   * Calculate confidence score based on intent and entities
   */
  private calculateConfidence(intent: Intent, entities: ExtractedEntities): number {
    let confidence = 0.5; // Base confidence

    // Higher confidence for specific intents
    if (intent !== Intent.UNKNOWN && intent !== Intent.INFORMACOES_GERAIS) {
      confidence += 0.2;
    }

    // Increase confidence based on extracted entities
    const entityCount = Object.keys(entities).filter(key => {
      const value = entities[key as keyof ExtractedEntities];
      return value != null && (Array.isArray(value) ? value.length > 0 : true);
    }).length;

    confidence += Math.min(entityCount * 0.1, 0.3);

    return Math.min(confidence, 1.0);
  }

  /**
   * Clean extracted entities by removing null/empty values
   */
  private cleanEntities(entities: ExtractedEntities): ExtractedEntities {
    const cleaned: ExtractedEntities = {};

    for (const [key, value] of Object.entries(entities)) {
      if (value != null) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            cleaned[key as keyof ExtractedEntities] = value as any;
          }
        } else if (typeof value === 'object') {
          const cleanedObject = Object.fromEntries(
            Object.entries(value).filter(([, v]) => v != null && v !== '')
          );
          if (Object.keys(cleanedObject).length > 0) {
            cleaned[key as keyof ExtractedEntities] = cleanedObject as any;
          }
        } else if (value !== '' && value !== null) {
          cleaned[key as keyof ExtractedEntities] = value as any;
        }
      }
    }

    return cleaned;
  }

  /**
   * Analyze message sentiment (basic implementation)
   */
  async analyzeSentiment(message: string): Promise<{
    sentiment: 'positive' | 'negative' | 'neutral';
    confidence: number;
  }> {
    // Simple keyword-based sentiment analysis
    const positiveWords = ['obrigado', 'ótimo', 'perfeito', 'excelente', 'bom'];
    const negativeWords = ['ruim', 'terrível', 'horrível', 'péssimo', 'problema'];

    const lowerMessage = message.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;

    if (positiveCount > negativeCount) {
      return { sentiment: 'positive', confidence: 0.6 + (positiveCount * 0.1) };
    } else if (negativeCount > positiveCount) {
      return { sentiment: 'negative', confidence: 0.6 + (negativeCount * 0.1) };
    }

    return { sentiment: 'neutral', confidence: 0.5 };
  }
}

export type { ConversationMessage };