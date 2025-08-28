import { GeminiService } from './gemini.service';
import { VoiceRecognitionService } from './voice.service';
import { ConversationContextService } from './context.service';
import { AppointmentAutomationService } from '../automation/appointment.service';
import { logger } from '../logger.service';

export interface ProcessMessageRequest {
  phoneNumber: string;
  message: string;
  messageId: string;
  originalType?: 'text' | 'voice';
  confidence?: number;
}

export interface ProcessMessageResponse {
  text: string;
  actions?: Array<{
    type: 'book_appointment' | 'escalate_to_human' | 'send_reminder';
    data: any;
  }>;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  processingTime: number;
}

export interface ConversationState {
  phase:
    | 'greeting'
    | 'symptom_gathering'
    | 'appointment_booking'
    | 'confirmation'
    | 'completed';
  userInfo?: {
    name?: string;
    phone?: string;
    preferredSpecialty?: string;
  };
  symptoms?: string[];
  appointmentData?: {
    specialty?: string;
    preferredDate?: string;
    preferredTime?: string;
    urgency?: 'low' | 'medium' | 'high';
  };
  lastInteraction: Date;
}

export class WhatsAppAIService {
  private geminiService: GeminiService;
  private voiceService: VoiceRecognitionService;
  private contextService: ConversationContextService;
  private appointmentService: AppointmentAutomationService;

  constructor() {
    this.geminiService = new GeminiService();
    this.voiceService = new VoiceRecognitionService();
    this.contextService = new ConversationContextService();
    this.appointmentService = new AppointmentAutomationService();
  }

  /**
   * Main method to process incoming WhatsApp messages
   */
  async processTextMessage(
    request: ProcessMessageRequest,
  ): Promise<ProcessMessageResponse> {
    const startTime = Date.now();

    try {
      // Get or create conversation context
      const conversationId = this.generateConversationId(request.phoneNumber);
      const context = await this.contextService.getContext(conversationId);

      // Detect message urgency
      const urgency = this.detectUrgency(request.message);

      // Log message processing start
      logger.info('Processing WhatsApp AI message', {
        phoneNumber: this.sanitizePhoneNumber(request.phoneNumber),
        messageLength: request.message.length,
        originalType: request.originalType || 'text',
        urgency,
        conversationPhase: context.phase,
      });

      // Update context with new message
      await this.contextService.updateLastInteraction(conversationId);

      // Generate AI response based on conversation phase and content
      let response: ProcessMessageResponse;

      switch (context.phase) {
        case 'greeting':
          response = await this.handleGreetingPhase(request, context);
          break;

        case 'symptom_gathering':
          response = await this.handleSymptomGatheringPhase(request, context);
          break;

        case 'appointment_booking':
          response = await this.handleAppointmentBookingPhase(request, context);
          break;

        case 'confirmation':
          response = await this.handleConfirmationPhase(request, context);
          break;

        default:
          response = await this.handleGeneralInquiry(request, context);
      }

      // Override urgency if detected as high
      if (urgency === 'high') {
        response.urgency = 'high';
        response.actions = response.actions || [];
        response.actions.push({
          type: 'escalate_to_human',
          data: { reason: 'high_urgency', message: request.message },
        });
      }

      // Update conversation context based on response
      await this.updateConversationContext(conversationId, request, response);

      // Log message processing completion
      const processingTime = Date.now() - startTime;
      logger.info('WhatsApp AI message processed', {
        phoneNumber: this.sanitizePhoneNumber(request.phoneNumber),
        processingTime,
        urgency: response.urgency,
        hasActions: !!response.actions?.length,
        responseLength: response.text.length,
      });

      response.processingTime = processingTime;
      return response;
    } catch (error) {
      logger.error('Failed to process WhatsApp AI message:', error);

      return {
        text: 'Desculpe, ocorreu um erro ao processar sua mensagem. Nosso atendimento humano já foi notificado. Tente novamente ou ligue diretamente para (11) 1234-5678.',
        urgency: 'medium',
        confidence: 0,
        processingTime: Date.now() - startTime,
        actions: [
          {
            type: 'escalate_to_human',
            data: { reason: 'processing_error', error: error.message },
          },
        ],
      };
    }
  }

  /**
   * Handle greeting phase - user first interaction
   */
  private async handleGreetingPhase(
    request: ProcessMessageRequest,
    context: ConversationState,
  ): Promise<ProcessMessageResponse> {
    const greetingPrompt = `
    Você é a assistente virtual da EO Clínica. O usuário está iniciando uma conversa.
    
    Mensagem do usuário: "${request.message}"
    
    Responda de forma acolhedora e profissional:
    - Cumprimente o usuário
    - Apresente-se brevemente
    - Pergunte como pode ajudar
    - Mantenha resposta em máximo 2 frases
    
    IMPORTANTE: Seja natural e empática, mas concisa.
    `;

    const geminiResponse = await this.geminiService.generateResponse(
      greetingPrompt,
      {
        conversation_phase: 'greeting',
        user_message: request.message,
      },
    );

    // Check if user mentioned symptoms or appointment in first message
    const mentionsSymptoms = this.containsSymptomKeywords(request.message);
    const mentionsAppointment = this.containsAppointmentKeywords(
      request.message,
    );

    let nextPhase: ConversationState['phase'] = 'greeting';
    if (mentionsSymptoms) {
      nextPhase = 'symptom_gathering';
    } else if (mentionsAppointment) {
      nextPhase = 'appointment_booking';
    }

    return {
      text: geminiResponse.response,
      urgency: this.detectUrgency(request.message),
      confidence: 0.85,
      processingTime: geminiResponse.responseTimeMs,
    };
  }

  /**
   * Handle symptom gathering phase
   */
  private async handleSymptomGatheringPhase(
    request: ProcessMessageRequest,
    context: ConversationState,
  ): Promise<ProcessMessageResponse> {
    // Analyze symptoms with specialized AI
    const symptomAnalysis = await this.appointmentService.analyzeSymptoms(
      request.message,
    );

    const symptomPrompt = `
    O usuário está relatando sintomas. Analise e responda profissionalmente:
    
    Sintomas relatados: "${request.message}"
    Análise AI: ${JSON.stringify(symptomAnalysis)}
    Contexto da conversa: ${JSON.stringify(context)}
    
    Sua resposta deve:
    - Demonstrar compreensão dos sintomas
    - Recomendar a especialidade médica apropriada
    - Perguntar se deseja agendar consulta
    - Ser empática mas não dar diagnósticos
    - Máximo 3 frases
    `;

    const geminiResponse = await this.geminiService.generateResponse(
      symptomPrompt,
      {
        conversation_phase: 'symptom_gathering',
        symptoms: symptomAnalysis.symptoms,
        recommended_specialty: symptomAnalysis.recommendedSpecialty,
        urgency: symptomAnalysis.urgencyLevel,
      },
    );

    const actions = [];
    if (symptomAnalysis.confidence > 0.7) {
      actions.push({
        type: 'book_appointment' as const,
        data: {
          symptoms: symptomAnalysis.symptoms,
          recommendedSpecialty: symptomAnalysis.recommendedSpecialty,
          urgency: symptomAnalysis.urgencyLevel,
        },
      });
    }

    return {
      text: geminiResponse.response,
      urgency: symptomAnalysis.urgencyLevel as 'low' | 'medium' | 'high',
      confidence: symptomAnalysis.confidence,
      processingTime: geminiResponse.responseTimeMs,
      actions: actions.length > 0 ? actions : undefined,
    };
  }

  /**
   * Handle appointment booking phase
   */
  private async handleAppointmentBookingPhase(
    request: ProcessMessageRequest,
    context: ConversationState,
  ): Promise<ProcessMessageResponse> {
    const bookingPrompt = `
    O usuário quer agendar uma consulta. Colete informações necessárias:
    
    Mensagem atual: "${request.message}"
    Contexto: ${JSON.stringify(context)}
    
    Responda coletando:
    - Especialidade desejada (se não informada)
    - Data preferida
    - Período (manhã/tarde)
    - Confirmação de dados
    
    Seja prática e organize as informações claramente.
    Máximo 3 frases.
    `;

    const geminiResponse = await this.geminiService.generateResponse(
      bookingPrompt,
      {
        conversation_phase: 'appointment_booking',
        current_appointment_data: context.appointmentData,
        user_message: request.message,
      },
    );

    // Check if we have enough information to proceed
    const hasSpecialty =
      context.appointmentData?.specialty ||
      this.extractSpecialty(request.message);
    const hasDatePreference =
      context.appointmentData?.preferredDate ||
      this.extractDatePreference(request.message);

    const actions = [];
    if (hasSpecialty && hasDatePreference) {
      // Try to find available appointments
      const availableSlots = await this.appointmentService.findAvailableSlots(
        hasSpecialty,
        context.appointmentData?.urgency || 'medium',
      );

      if (availableSlots.availableSlots.length > 0) {
        actions.push({
          type: 'book_appointment' as const,
          data: {
            specialty: hasSpecialty,
            preferredDate: hasDatePreference,
            availableSlots: availableSlots.availableSlots,
          },
        });
      }
    }

    return {
      text: geminiResponse.response,
      urgency: this.detectUrgency(request.message),
      confidence: 0.8,
      processingTime: geminiResponse.responseTimeMs,
      actions: actions.length > 0 ? actions : undefined,
    };
  }

  /**
   * Handle confirmation phase
   */
  private async handleConfirmationPhase(
    request: ProcessMessageRequest,
    context: ConversationState,
  ): Promise<ProcessMessageResponse> {
    const isConfirmation = this.isConfirmationMessage(request.message);

    const confirmationPrompt = `
    O usuário está confirmando ou negando um agendamento:
    
    Mensagem: "${request.message}"
    É confirmação: ${isConfirmation}
    Dados do agendamento: ${JSON.stringify(context.appointmentData)}
    
    Se confirmação:
    - Confirme o agendamento
    - Forneça detalhes (data, hora, local)
    - Dê instruções finais
    
    Se negação:
    - Pergunte o que deseja alterar
    - Ofereça novas opções
    
    Máximo 3 frases, seja clara e prestativa.
    `;

    const geminiResponse = await this.geminiService.generateResponse(
      confirmationPrompt,
      {
        conversation_phase: 'confirmation',
        is_confirmation: isConfirmation,
        appointment_data: context.appointmentData,
      },
    );

    return {
      text: geminiResponse.response,
      urgency: 'low',
      confidence: 0.9,
      processingTime: geminiResponse.responseTimeMs,
    };
  }

  /**
   * Handle general inquiries
   */
  private async handleGeneralInquiry(
    request: ProcessMessageRequest,
    context: ConversationState,
  ): Promise<ProcessMessageResponse> {
    const generalPrompt = `
    Responda como assistente virtual da EO Clínica:
    
    Pergunta: "${request.message}"
    Contexto: ${JSON.stringify(context)}
    
    Forneça informações úteis sobre:
    - Serviços da clínica
    - Como agendar
    - Localização e contato
    - Orientações gerais
    
    Seja prestativa mas redirecione para agendamento quando apropriado.
    Máximo 3 frases.
    `;

    const geminiResponse = await this.geminiService.generateResponse(
      generalPrompt,
      {
        conversation_phase: 'general_inquiry',
        user_question: request.message,
      },
    );

    return {
      text: geminiResponse.response,
      urgency: 'low',
      confidence: 0.75,
      processingTime: geminiResponse.responseTimeMs,
    };
  }

  /**
   * Detect message urgency level
   */
  private detectUrgency(message: string): 'low' | 'medium' | 'high' {
    const urgentKeywords = [
      'urgente',
      'emergência',
      'emergency',
      'dor forte',
      'sangramento',
      'febre alta',
      'não consigo',
      'muito mal',
      'socorro',
      'ajuda',
      'grave',
      'sério',
      'crítico',
      'imediato',
    ];

    const mediumKeywords = [
      'dor',
      'mal estar',
      'preocupado',
      'ansioso',
      'desconforto',
      'hoje',
      'agora',
      'rápido',
      'logo',
    ];

    const lowerMessage = message.toLowerCase();

    if (urgentKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'high';
    }

    if (mediumKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Check if message contains symptom-related keywords
   */
  private containsSymptomKeywords(message: string): boolean {
    const symptomKeywords = [
      'dor',
      'febre',
      'tosse',
      'dor de cabeça',
      'mal estar',
      'náusea',
      'vômito',
      'diarreia',
      'constipação',
      'cansaço',
      'fraqueza',
      'tontura',
      'falta de ar',
      'palpitação',
      'insônia',
      'ansiedade',
      'sangramento',
      'machucado',
      'ferida',
      'sintoma',
      'doendo',
      'está doendo',
      'sentindo',
      'dói',
      'incomoda',
    ];

    return symptomKeywords.some(keyword =>
      message.toLowerCase().includes(keyword),
    );
  }

  /**
   * Check if message contains appointment-related keywords
   */
  private containsAppointmentKeywords(message: string): boolean {
    const appointmentKeywords = [
      'agendar',
      'marcar',
      'consulta',
      'appointment',
      'horário',
      'disponibilidade',
      'agenda',
      'atendimento',
      'médico',
      'doutor',
      'doutora',
      'especialista',
      'quando',
      'data',
    ];

    return appointmentKeywords.some(keyword =>
      message.toLowerCase().includes(keyword),
    );
  }

  /**
   * Check if message is a confirmation (yes/no)
   */
  private isConfirmationMessage(message: string): boolean {
    const positiveKeywords = [
      'sim',
      'yes',
      'confirmo',
      'ok',
      'tá bom',
      'aceito',
      'quero',
    ];
    const negativeKeywords = ['não', 'no', 'não quero', 'cancelar', 'não pode'];

    const lowerMessage = message.toLowerCase();

    return (
      positiveKeywords.some(keyword => lowerMessage.includes(keyword)) ||
      negativeKeywords.some(keyword => lowerMessage.includes(keyword))
    );
  }

  /**
   * Extract specialty from message
   */
  private extractSpecialty(message: string): string | null {
    const specialties = {
      cardiologista: ['coração', 'cardio', 'cardiologista', 'pressão'],
      dermatologista: ['pele', 'dermat', 'dermatologista', 'alergia'],
      neurologista: ['cabeça', 'neuro', 'neurologista', 'enxaqueca'],
      'clínico geral': ['clínico', 'geral', 'clínica geral'],
    };

    const lowerMessage = message.toLowerCase();

    for (const [specialty, keywords] of Object.entries(specialties)) {
      if (keywords.some(keyword => lowerMessage.includes(keyword))) {
        return specialty;
      }
    }

    return null;
  }

  /**
   * Extract date preference from message
   */
  private extractDatePreference(message: string): string | null {
    const dateKeywords = {
      hoje: new Date().toISOString().split('T')[0],
      amanhã: new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
      segunda: 'next-monday',
      terça: 'next-tuesday',
      quarta: 'next-wednesday',
      quinta: 'next-thursday',
      sexta: 'next-friday',
    };

    const lowerMessage = message.toLowerCase();

    for (const [keyword, date] of Object.entries(dateKeywords)) {
      if (lowerMessage.includes(keyword)) {
        return date;
      }
    }

    return null;
  }

  /**
   * Update conversation context based on interaction
   */
  private async updateConversationContext(
    conversationId: string,
    request: ProcessMessageRequest,
    response: ProcessMessageResponse,
  ): Promise<void> {
    try {
      const context = await this.contextService.getContext(conversationId);

      // Update phase based on response content
      let newPhase = context.phase;

      if (this.containsSymptomKeywords(request.message)) {
        newPhase = 'symptom_gathering';
      } else if (this.containsAppointmentKeywords(request.message)) {
        newPhase = 'appointment_booking';
      } else if (
        response.actions?.some(action => action.type === 'book_appointment')
      ) {
        newPhase = 'confirmation';
      }

      // Extract user information if available
      const userInfo = {
        ...context.userInfo,
        phone: request.phoneNumber,
      };

      // Extract appointment data
      const appointmentData = {
        ...context.appointmentData,
        specialty:
          this.extractSpecialty(request.message) ||
          context.appointmentData?.specialty,
        preferredDate:
          this.extractDatePreference(request.message) ||
          context.appointmentData?.preferredDate,
        urgency: response.urgency,
      };

      await this.contextService.updateContext(conversationId, {
        ...context,
        phase: newPhase,
        userInfo,
        appointmentData,
        lastInteraction: new Date(),
      });
    } catch (error) {
      logger.error('Failed to update conversation context:', error);
    }
  }

  /**
   * Generate unique conversation ID from phone number
   */
  private generateConversationId(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/\D/g, '');
    return `whatsapp_${cleaned}`;
  }

  /**
   * Sanitize phone number for logging (LGPD compliance)
   */
  private sanitizePhoneNumber(phoneNumber: string): string {
    if (!phoneNumber) return 'unknown';

    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 2)}****${cleaned.slice(-2)}`;
    }

    return '****';
  }
}
