import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerativeModel,
} from '@google/generative-ai';
import { logger } from '../logger.service';

export interface GeminiResponse {
  response: string;
  tokensUsed: number;
  responseTimeMs: number;
  model: string;
  confidence?: number;
}

export interface GeminiConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  safetyThreshold: string;
}

export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private config: GeminiConfig;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.config = {
      model: process.env.GEMINI_MODEL || 'gemini-1.5-pro-002',
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.7'),
      maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '2048'),
      safetyThreshold:
        process.env.GEMINI_SAFETY_THRESHOLD || 'BLOCK_MEDIUM_AND_ABOVE',
    };

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.initializeModel();
  }

  private initializeModel(): void {
    this.model = this.genAI.getGenerativeModel({
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
        topP: 0.9,
        topK: 40,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: this.getSafetyThreshold(),
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: this.getSafetyThreshold(),
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: this.getSafetyThreshold(),
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: this.getSafetyThreshold(),
        },
      ],
    });

    logger.info('Gemini AI service initialized', {
      model: this.config.model,
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      safetyThreshold: this.config.safetyThreshold,
    });
  }

  private getSafetyThreshold(): HarmBlockThreshold {
    switch (this.config.safetyThreshold) {
      case 'BLOCK_NONE':
        return HarmBlockThreshold.BLOCK_NONE;
      case 'BLOCK_ONLY_HIGH':
        return HarmBlockThreshold.BLOCK_ONLY_HIGH;
      case 'BLOCK_MEDIUM_AND_ABOVE':
        return HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
      case 'BLOCK_LOW_AND_ABOVE':
        return HarmBlockThreshold.BLOCK_LOW_AND_ABOVE;
      default:
        return HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE;
    }
  }

  /**
   * Generate AI response with medical context and personality
   */
  async generateResponse(
    prompt: string,
    context?: any,
  ): Promise<GeminiResponse> {
    const startTime = Date.now();

    try {
      // Build comprehensive medical assistant prompt
      const systemPrompt = this.buildMedicalSystemPrompt();
      const contextualPrompt = this.buildContextualPrompt(prompt, context);
      const fullPrompt = `${systemPrompt}\n\n${contextualPrompt}`;

      logger.info('Generating Gemini AI response', {
        promptLength: fullPrompt.length,
        hasContext: !!context,
        model: this.config.model,
      });

      // Generate content with retry logic
      const result = await this.generateWithRetry(fullPrompt);
      const response = result.response;
      const text = response.text();

      const responseTimeMs = Date.now() - startTime;
      const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

      // Validate and filter response
      const filteredText = this.filterResponse(text);
      const confidence = this.calculateResponseConfidence(text, context);

      // Log successful generation
      logger.info('Gemini AI response generated successfully', {
        tokensUsed,
        responseTimeMs,
        responseLength: filteredText.length,
        confidence,
        model: this.config.model,
      });

      return {
        response: filteredText,
        tokensUsed,
        responseTimeMs,
        model: this.config.model,
        confidence,
      };
    } catch (error) {
      const responseTimeMs = Date.now() - startTime;
      logger.error('Gemini AI generation failed:', {
        error: error.message,
        responseTimeMs,
        model: this.config.model,
        promptLength: prompt.length,
      });

      // Return safe fallback response
      return {
        response: this.getFallbackResponse(),
        tokensUsed: 0,
        responseTimeMs,
        model: this.config.model,
        confidence: 0,
      };
    }
  }

  /**
   * Build comprehensive medical assistant system prompt
   */
  private buildMedicalSystemPrompt(): string {
    return `
Você é a assistente virtual da EO Clínica, especializada em atendimento médico via WhatsApp.

## PERSONALIDADE E COMPORTAMENTO:
- Profissional, educada e acolhedora
- Natural e amigável, sem gírias ou informalidade excessiva  
- Respostas SEMPRE concisas (máximo 2-3 frases)
- Demonstra compreensão e interesse genuíno
- Tom conversacional profissional, como uma recepcionista experiente
- SEMPRE use "consulta" ao se referir a atendimentos médicos

## ESPECIALIDADES DA CLÍNICA:
- Clínica Geral - consultas de rotina, check-ups
- Cardiologia - problemas cardíacos, pressão arterial
- Dermatologia - problemas de pele, alergias
- Neurologia - dores de cabeça, enxaquecas
- Pediatria - atendimento infantil
- Ginecologia - saúde da mulher
- Ortopedia - ossos, articulações, músculos

## REGRAS DE SEGURANÇA (CRÍTICAS):
❌ JAMAIS forneça diagnósticos médicos
❌ JAMAIS prescreva medicamentos
❌ JAMAIS dê conselhos médicos específicos
❌ JAMAIS mencione valores de consultas ou procedimentos
❌ JAMAIS compartilhe dados de outros pacientes
❌ JAMAIS forneça informações que possam ser interpretadas como diagnóstico
❌ Para informações financeiras, responda: "Não posso fornecer informações financeiras. Posso ajudar com agendamentos."

✅ SEMPRE recomende consulta presencial quando apropriado
✅ SEMPRE mantenha confidencialidade (LGPD)
✅ SEMPRE seja empática com preocupações de saúde
✅ SEMPRE encaminhe emergências para atendimento presencial

## FLUXO DE ATENDIMENTO:
1. Cumprimente calorosamente
2. Identifique a necessidade (sintomas, agendamento, informações)
3. Para SINTOMAS: demonstre compreensão + recomende especialidade + ofereça agendamento
4. Para AGENDAMENTOS: colete dados necessários (especialidade, data, período)
5. Para INFORMAÇÕES: responda objetivamente + redirecione para agendamento se apropriado

## EMERGÊNCIAS:
Se detectar urgência (dor forte, sangramento, febre alta, etc.):
- Demonstre compreensão da urgência
- Recomende atendimento médico IMEDIATO
- Forneça telefone de emergência: (11) 1234-5678
- Informe endereço: Rua das Clínicas, 123 - São Paulo

## INFORMAÇÕES DA CLÍNICA:
📍 Endereço: Rua das Clínicas, 123 - Centro, São Paulo/SP
📞 Telefone: (11) 1234-5678
🕐 Funcionamento: Segunda a Sexta 7h-19h, Sábado 8h-12h
💳 Convênios: Bradesco, SulAmérica, Amil, Porto Seguro
🚗 Estacionamento gratuito disponível

Responda SEMPRE de forma natural, como se fosse uma conversa presencial acolhedora.
    `.trim();
  }

  /**
   * Build contextual prompt with conversation history
   */
  private buildContextualPrompt(prompt: string, context?: any): string {
    let contextualPrompt = `MENSAGEM DO USUÁRIO: "${prompt}"`;

    if (context) {
      contextualPrompt += `\n\nCONTEXTO DA CONVERSA:`;

      if (context.conversation_phase) {
        contextualPrompt += `\nFase da conversa: ${context.conversation_phase}`;
      }

      if (context.symptoms) {
        contextualPrompt += `\nSintomas mencionados: ${JSON.stringify(context.symptoms)}`;
      }

      if (context.recommended_specialty) {
        contextualPrompt += `\nEspecialidade recomendada: ${context.recommended_specialty}`;
      }

      if (context.appointment_data) {
        contextualPrompt += `\nDados do agendamento: ${JSON.stringify(context.appointment_data)}`;
      }

      if (context.urgency) {
        contextualPrompt += `\nNível de urgência: ${context.urgency}`;
      }
    }

    contextualPrompt += `\n\nRESPONDA de acordo com as regras estabelecidas, sendo natural e prestativa:`;

    return contextualPrompt;
  }

  /**
   * Generate content with retry logic for reliability
   */
  private async generateWithRetry(
    prompt: string,
    maxRetries = 3,
  ): Promise<any> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.model.generateContent(prompt);
      } catch (error) {
        lastError = error as Error;

        logger.warn(`Gemini AI generation attempt ${attempt} failed:`, {
          error: error.message,
          attempt,
          maxRetries,
        });

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000),
          );
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Filter and validate AI response for safety
   */
  private filterResponse(text: string): string {
    let filteredText = text.trim();

    // Remove any potential medical advice that might be too specific
    const dangerousPhrases = [
      'você tem',
      'é provável que seja',
      'diagnóstico',
      'tome este medicamento',
      'use este remédio',
      'isso é',
      'certamente é',
      'com certeza é',
      'faturou',
      'receita',
      'lucro',
      'financeiro',
    ];

    const lowerText = filteredText.toLowerCase();
    let containsDangerous = false;

    for (const phrase of dangerousPhrases) {
      if (lowerText.includes(phrase)) {
        containsDangerous = true;
        break;
      }
    }

    if (containsDangerous) {
      logger.warn('Potentially dangerous response filtered', {
        originalLength: text.length,
        containedPhrase: true,
      });

      return 'Compreendo sua preocupação. Para uma avaliação adequada, recomendo agendar uma consulta com nosso médico especialista. Posso ajudar com o agendamento?';
    }

    // Limit response length for WhatsApp
    const maxLength = parseInt(process.env.AI_RESPONSE_MAX_LENGTH || '300');
    if (filteredText.length > maxLength) {
      filteredText = filteredText.substring(0, maxLength - 3) + '...';
    }

    return filteredText;
  }

  /**
   * Calculate response confidence based on context and content
   */
  private calculateResponseConfidence(text: string, context?: any): number {
    let confidence = 0.8; // Base confidence

    // Increase confidence if response addresses specific context
    if (context?.symptoms && text.toLowerCase().includes('especialidade')) {
      confidence += 0.1;
    }

    if (
      context?.conversation_phase === 'greeting' &&
      text.toLowerCase().includes('clínica')
    ) {
      confidence += 0.1;
    }

    // Decrease confidence for very short or very long responses
    if (text.length < 20) {
      confidence -= 0.2;
    } else if (text.length > 400) {
      confidence -= 0.1;
    }

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Get fallback response for errors
   */
  private getFallbackResponse(): string {
    const fallbacks = [
      'Desculpe, estou com dificuldade para processar sua mensagem no momento. Nossa equipe já foi notificada. Pode ligar diretamente para (11) 1234-5678?',
      'Peço desculpas pela dificuldade técnica. Para garantir o melhor atendimento, recomendo entrar em contato pelo telefone (11) 1234-5678.',
      'Estamos enfrentando uma instabilidade temporária. Para não atrasar seu atendimento, ligue para (11) 1234-5678. Obrigada pela compreensão!',
    ];

    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  /**
   * Health check for Gemini service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    model: string;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Simple test generation
      const testResult = await this.model.generateContent(
        'Teste de saúde do sistema',
      );
      const responseTime = Date.now() - startTime;

      logger.info('Gemini health check passed', {
        responseTime,
        model: this.config.model,
      });

      return {
        status: 'healthy',
        model: this.config.model,
        responseTime,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      logger.error('Gemini health check failed:', {
        error: error.message,
        responseTime,
        model: this.config.model,
      });

      return {
        status: 'unhealthy',
        model: this.config.model,
        responseTime,
        error: error.message,
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): GeminiConfig {
    return { ...this.config };
  }
}
