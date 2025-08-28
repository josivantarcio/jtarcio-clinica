import { logger } from '../logger.service';
import { GeminiService } from '../ai/gemini.service';

export interface SymptomAnalysis {
  symptoms: string[];
  urgencyLevel: 'low' | 'medium' | 'high';
  recommendedSpecialty: string;
  confidence: number;
  processingTime: number;
  recommendations?: string[];
}

export interface AvailableSlot {
  date: string;
  time: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  duration: number;
  cost?: number;
}

export interface AvailabilityResult {
  availableSlots: AvailableSlot[];
  nextAvailable: string;
  totalFound: number;
  searchCriteria: {
    specialty: string;
    urgency: string;
    dateRange: string;
  };
}

export interface BookingRequest {
  phoneNumber: string;
  patientName?: string;
  symptoms: string[];
  preferredSpecialty: string;
  preferredDate?: string;
  preferredTime?: string;
  urgency: 'low' | 'medium' | 'high';
  notes?: string;
}

export interface BookingResult {
  success: boolean;
  appointmentId?: string;
  appointmentDetails?: {
    date: string;
    time: string;
    doctor: string;
    specialty: string;
    location: string;
    instructions?: string[];
  };
  error?: string;
  alternativeSlots?: AvailableSlot[];
}

export class AppointmentAutomationService {
  private geminiService: GeminiService;
  private specialtyMappings: Map<string, string[]>;
  private urgencyPriority: Map<string, number>;

  constructor() {
    this.geminiService = new GeminiService();
    this.initializeSpecialtyMappings();
    this.initializeUrgencyPriority();

    logger.info('Appointment Automation Service initialized', {
      specialties: this.specialtyMappings.size,
      urgencyLevels: this.urgencyPriority.size,
    });
  }

  /**
   * Analyze symptoms and recommend appropriate specialty
   */
  async analyzeSymptoms(symptomsText: string): Promise<SymptomAnalysis> {
    const startTime = Date.now();

    try {
      logger.info('Starting symptom analysis', {
        textLength: symptomsText.length,
      });

      // Create specialized prompt for medical symptom analysis
      const analysisPrompt = `
      Analise os seguintes sintomas e retorne APENAS um JSON válido com a estrutura exata:

      {
        "symptoms": ["sintoma1", "sintoma2"],
        "urgencyLevel": "low|medium|high",
        "recommendedSpecialty": "nome_da_especialidade",
        "confidence": 0.85,
        "recommendations": ["recomendacao1", "recomendacao2"]
      }

      ESPECIALIDADES DISPONÍVEIS:
      - Clínica Geral: sintomas gerais, check-ups, prevenção
      - Cardiologia: problemas cardíacos, pressão arterial, dor no peito
      - Dermatologia: problemas de pele, alergias, manchas, coceira
      - Neurologia: dores de cabeça, enxaquecas, tonturas, formigamento
      - Pediatria: crianças até 18 anos, desenvolvimento infantil
      - Ginecologia: saúde da mulher, menstruação, gravidez
      - Ortopedia: ossos, articulações, músculos, fraturas

      NÍVEIS DE URGÊNCIA:
      - high: sintomas graves (dor intensa, sangramento, febre alta, falta de ar)
      - medium: sintomas preocupantes mas não críticos
      - low: sintomas leves, check-ups, prevenção

      SINTOMAS DESCRITOS: "${symptomsText}"

      Responda APENAS com o JSON, sem explicações adicionais:
      `;

      const geminiResponse =
        await this.geminiService.generateResponse(analysisPrompt);

      try {
        // Parse AI response as JSON
        const analysis = JSON.parse(geminiResponse.response);

        // Validate and sanitize response
        const validatedAnalysis = this.validateSymptomAnalysis(analysis);
        validatedAnalysis.processingTime = Date.now() - startTime;

        logger.info('Symptom analysis completed', {
          symptoms: validatedAnalysis.symptoms.length,
          urgency: validatedAnalysis.urgencyLevel,
          specialty: validatedAnalysis.recommendedSpecialty,
          confidence: validatedAnalysis.confidence,
          processingTime: validatedAnalysis.processingTime,
        });

        return validatedAnalysis;
      } catch (parseError) {
        logger.warn(
          'Failed to parse AI JSON response, using fallback analysis',
          {
            originalResponse: geminiResponse.response.substring(0, 200),
            parseError: parseError.message,
          },
        );

        // Fallback to pattern-based analysis
        return this.fallbackSymptomAnalysis(
          symptomsText,
          Date.now() - startTime,
        );
      }
    } catch (error) {
      logger.error('Symptom analysis failed:', {
        error: error.message,
        processingTime: Date.now() - startTime,
      });

      // Return safe fallback analysis
      return {
        symptoms: ['sintomas relatados'],
        urgencyLevel: 'medium',
        recommendedSpecialty: 'Clínica Geral',
        confidence: 0.3,
        processingTime: Date.now() - startTime,
        recommendations: ['Recomendamos consulta para avaliação adequada'],
      };
    }
  }

  /**
   * Find available appointment slots based on criteria
   */
  async findAvailableSlots(
    specialty: string,
    urgency: 'low' | 'medium' | 'high' = 'medium',
  ): Promise<AvailabilityResult> {
    try {
      logger.info('Searching for available slots', {
        specialty,
        urgency,
      });

      // In production, this would query the actual database
      // For now, generate mock available slots based on specialty and urgency
      const mockSlots = this.generateMockAvailableSlots(specialty, urgency);

      // Sort slots by date/time and urgency priority
      const sortedSlots = this.sortSlotsByPriority(mockSlots, urgency);

      // Determine next available slot
      const nextAvailable =
        sortedSlots.length > 0
          ? `${sortedSlots[0].date} às ${sortedSlots[0].time}`
          : 'Não há horários disponíveis no momento';

      logger.info('Available slots found', {
        specialty,
        totalFound: sortedSlots.length,
        nextAvailable,
        urgency,
      });

      return {
        availableSlots: sortedSlots,
        nextAvailable,
        totalFound: sortedSlots.length,
        searchCriteria: {
          specialty,
          urgency,
          dateRange: '7 days',
        },
      };
    } catch (error) {
      logger.error('Failed to find available slots:', {
        specialty,
        urgency,
        error: error.message,
      });

      return {
        availableSlots: [],
        nextAvailable: 'Erro ao buscar horários disponíveis',
        totalFound: 0,
        searchCriteria: {
          specialty,
          urgency,
          dateRange: '7 days',
        },
      };
    }
  }

  /**
   * Attempt to book an appointment (mock implementation)
   */
  async bookAppointment(request: BookingRequest): Promise<BookingResult> {
    try {
      logger.info('Processing appointment booking request', {
        phoneNumber: this.sanitizePhoneNumber(request.phoneNumber),
        specialty: request.preferredSpecialty,
        urgency: request.urgency,
        hasPreferredDate: !!request.preferredDate,
      });

      // Find available slots
      const availability = await this.findAvailableSlots(
        request.preferredSpecialty,
        request.urgency,
      );

      if (availability.availableSlots.length === 0) {
        return {
          success: false,
          error: 'Não há horários disponíveis para a especialidade solicitada',
          alternativeSlots: [],
        };
      }

      // Select best slot based on preferences
      const selectedSlot = this.selectBestSlot(
        availability.availableSlots,
        request.preferredDate,
        request.preferredTime,
      );

      // In production, this would integrate with the actual booking system
      const mockBookingSuccess = Math.random() > 0.1; // 90% success rate

      if (mockBookingSuccess) {
        const appointmentId = `APP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        logger.info('Appointment booked successfully', {
          appointmentId,
          phoneNumber: this.sanitizePhoneNumber(request.phoneNumber),
          date: selectedSlot.date,
          time: selectedSlot.time,
          doctor: selectedSlot.doctorName,
        });

        return {
          success: true,
          appointmentId,
          appointmentDetails: {
            date: selectedSlot.date,
            time: selectedSlot.time,
            doctor: selectedSlot.doctorName,
            specialty: selectedSlot.specialty,
            location: 'EO Clínica - Rua das Clínicas, 123',
            instructions: [
              'Chegue 15 minutos antes do horário marcado',
              'Traga documento de identidade e cartão do convênio',
              'Em caso de impedimento, ligue para reagendar',
            ],
          },
        };
      } else {
        logger.warn('Appointment booking failed', {
          phoneNumber: this.sanitizePhoneNumber(request.phoneNumber),
          reason: 'System booking failure',
        });

        return {
          success: false,
          error:
            'Erro temporário no sistema de agendamento. Tente novamente em alguns instantes.',
          alternativeSlots: availability.availableSlots.slice(1, 4), // Offer alternatives
        };
      }
    } catch (error) {
      logger.error('Appointment booking failed:', {
        phoneNumber: this.sanitizePhoneNumber(request.phoneNumber),
        error: error.message,
      });

      return {
        success: false,
        error:
          'Erro interno no sistema de agendamento. Nossa equipe foi notificada.',
      };
    }
  }

  /**
   * Send appointment reminders
   */
  async sendReminder(
    appointmentId: string,
    reminderType: 'confirmation' | '24h' | '2h' | 'followup',
  ): Promise<boolean> {
    try {
      logger.info('Sending appointment reminder', {
        appointmentId,
        reminderType,
      });

      // In production, this would integrate with notification services
      // Mock implementation for now
      const reminderSuccess = Math.random() > 0.05; // 95% success rate

      if (reminderSuccess) {
        logger.info('Appointment reminder sent successfully', {
          appointmentId,
          reminderType,
        });
      } else {
        logger.error('Failed to send appointment reminder', {
          appointmentId,
          reminderType,
        });
      }

      return reminderSuccess;
    } catch (error) {
      logger.error('Reminder sending failed:', {
        appointmentId,
        reminderType,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Initialize specialty mappings for symptom recognition
   */
  private initializeSpecialtyMappings(): void {
    this.specialtyMappings = new Map([
      [
        'Cardiologia',
        [
          'dor no peito',
          'palpitação',
          'pressão alta',
          'coração acelerado',
          'falta de ar',
          'cansaço extremo',
          'inchaço nas pernas',
          'tontura',
          'desmaio',
          'batimento irregular',
        ],
      ],
      [
        'Dermatologia',
        [
          'coceira',
          'manchas na pele',
          'alergia',
          'vermelhidão',
          'descamação',
          'ferida que não cicatriza',
          'acne',
          'eczema',
          'psoríase',
          'verruga',
          'mancha escura',
        ],
      ],
      [
        'Neurologia',
        [
          'dor de cabeça',
          'enxaqueca',
          'tontura persistente',
          'formigamento',
          'dormência',
          'tremor',
          'convulsão',
          'perda de memória',
          'confusão mental',
          'visão turva',
          'dificuldade para falar',
        ],
      ],
      [
        'Ginecologia',
        [
          'menstruação irregular',
          'cólica forte',
          'corrimento',
          'coceira íntima',
          'dor durante relação',
          'gravidez',
          'menopausa',
          'contraceptivos',
          'exame preventivo',
        ],
      ],
      [
        'Pediatria',
        [
          'criança',
          'bebê',
          'adolescente',
          'vacinação',
          'desenvolvimento infantil',
          'febre em criança',
          'diarreia infantil',
          'crescimento',
        ],
      ],
      [
        'Ortopedia',
        [
          'dor nas costas',
          'dor no joelho',
          'fratura',
          'entorse',
          'dor muscular',
          'artrite',
          'bursite',
          'tendinite',
          'dor na coluna',
          'lesão esportiva',
        ],
      ],
    ]);
  }

  /**
   * Initialize urgency priority levels
   */
  private initializeUrgencyPriority(): void {
    this.urgencyPriority = new Map([
      ['high', 1],
      ['medium', 2],
      ['low', 3],
    ]);
  }

  /**
   * Validate and sanitize symptom analysis response
   */
  private validateSymptomAnalysis(analysis: any): SymptomAnalysis {
    return {
      symptoms: Array.isArray(analysis.symptoms)
        ? analysis.symptoms
        : ['sintomas relatados'],
      urgencyLevel: ['low', 'medium', 'high'].includes(analysis.urgencyLevel)
        ? analysis.urgencyLevel
        : 'medium',
      recommendedSpecialty:
        typeof analysis.recommendedSpecialty === 'string'
          ? analysis.recommendedSpecialty
          : 'Clínica Geral',
      confidence:
        typeof analysis.confidence === 'number' &&
        analysis.confidence >= 0 &&
        analysis.confidence <= 1
          ? analysis.confidence
          : 0.5,
      processingTime: 0, // Will be set by caller
      recommendations: Array.isArray(analysis.recommendations)
        ? analysis.recommendations
        : undefined,
    };
  }

  /**
   * Fallback symptom analysis using pattern matching
   */
  private fallbackSymptomAnalysis(
    symptomsText: string,
    processingTime: number,
  ): SymptomAnalysis {
    const lowerText = symptomsText.toLowerCase();
    let recommendedSpecialty = 'Clínica Geral';
    let urgencyLevel: 'low' | 'medium' | 'high' = 'medium';
    let confidence = 0.6;

    // Check for specialty-specific keywords
    for (const [specialty, keywords] of this.specialtyMappings.entries()) {
      const matchCount = keywords.filter(keyword =>
        lowerText.includes(keyword),
      ).length;
      if (matchCount > 0) {
        recommendedSpecialty = specialty;
        confidence = Math.min(0.9, 0.5 + matchCount * 0.1);
        break;
      }
    }

    // Detect urgency
    const urgentKeywords = [
      'dor forte',
      'sangramento',
      'febre alta',
      'não consigo',
      'muito mal',
    ];
    const mediumKeywords = ['dor', 'preocupado', 'desconforto'];

    if (urgentKeywords.some(keyword => lowerText.includes(keyword))) {
      urgencyLevel = 'high';
    } else if (mediumKeywords.some(keyword => lowerText.includes(keyword))) {
      urgencyLevel = 'medium';
    } else {
      urgencyLevel = 'low';
    }

    // Extract symptoms (basic pattern matching)
    const symptoms = this.extractSymptomsFromText(symptomsText);

    return {
      symptoms,
      urgencyLevel,
      recommendedSpecialty,
      confidence,
      processingTime,
      recommendations: [`Consulta com ${recommendedSpecialty} recomendada`],
    };
  }

  /**
   * Extract symptoms from text using pattern matching
   */
  private extractSymptomsFromText(text: string): string[] {
    const commonSymptoms = [
      'dor',
      'febre',
      'tosse',
      'dor de cabeça',
      'náusea',
      'vômito',
      'diarreia',
      'cansaço',
      'tontura',
      'falta de ar',
      'coceira',
    ];

    const lowerText = text.toLowerCase();
    return commonSymptoms.filter(symptom => lowerText.includes(symptom));
  }

  /**
   * Generate mock available slots for testing
   */
  private generateMockAvailableSlots(
    specialty: string,
    urgency: string,
  ): AvailableSlot[] {
    const slots: AvailableSlot[] = [];
    const baseDate = new Date();

    // Generate slots for the next 7 days
    for (
      let dayOffset = urgency === 'high' ? 0 : 1;
      dayOffset < 7;
      dayOffset++
    ) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() + dayOffset);

      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('pt-BR', { weekday: 'long' });

      // Skip weekends for some specialties
      if (date.getDay() === 0 || date.getDay() === 6) {
        continue;
      }

      // Generate time slots
      const timeSlots =
        urgency === 'high'
          ? ['08:00', '08:30', '14:00', '14:30']
          : ['09:00', '10:00', '14:00', '15:00', '16:00'];

      for (const time of timeSlots) {
        slots.push({
          date: dateStr,
          time,
          doctorId: `dr_${specialty.toLowerCase()}_${Math.floor(Math.random() * 3) + 1}`,
          doctorName: this.getMockDoctorName(specialty),
          specialty,
          duration: 30,
          cost: this.getEstimatedCost(specialty),
        });
      }
    }

    return slots.slice(0, urgency === 'high' ? 5 : 10); // Limit results
  }

  /**
   * Get mock doctor name for specialty
   */
  private getMockDoctorName(specialty: string): string {
    const doctors = {
      Cardiologia: ['Dr. Silva Cardio', 'Dra. Santos Coração'],
      Dermatologia: ['Dr. Pele Santos', 'Dra. Silva Derma'],
      Neurologia: ['Dr. Cérebro Lima', 'Dra. Neuro Silva'],
      Ginecologia: ['Dra. Mulher Santos', 'Dra. Gine Lima'],
      Pediatria: ['Dr. Criança Silva', 'Dra. Pediatra Santos'],
      Ortopedia: ['Dr. Osso Lima', 'Dra. Orto Silva'],
      'Clínica Geral': ['Dr. Geral Santos', 'Dra. Clínica Lima'],
    };

    const specialtyDoctors = doctors[specialty] || doctors['Clínica Geral'];
    return specialtyDoctors[
      Math.floor(Math.random() * specialtyDoctors.length)
    ];
  }

  /**
   * Get estimated cost for specialty
   */
  private getEstimatedCost(specialty: string): number {
    const costs = {
      Cardiologia: 250,
      Dermatologia: 200,
      Neurologia: 280,
      Ginecologia: 220,
      Pediatria: 180,
      Ortopedia: 240,
      'Clínica Geral': 150,
    };

    return costs[specialty] || 150;
  }

  /**
   * Sort slots by priority based on urgency
   */
  private sortSlotsByPriority(
    slots: AvailableSlot[],
    urgency: string,
  ): AvailableSlot[] {
    return slots.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);

      if (urgency === 'high') {
        // For high urgency, prioritize earliest slots
        return dateA.getTime() - dateB.getTime();
      } else {
        // For normal urgency, sort by date but allow some variety
        return dateA.getTime() - dateB.getTime();
      }
    });
  }

  /**
   * Select best slot based on patient preferences
   */
  private selectBestSlot(
    slots: AvailableSlot[],
    preferredDate?: string,
    preferredTime?: string,
  ): AvailableSlot {
    if (slots.length === 0) {
      throw new Error('No available slots');
    }

    // If no preferences, return first available
    if (!preferredDate && !preferredTime) {
      return slots[0];
    }

    // Try to match preferences
    let bestMatch = slots[0];
    let bestScore = 0;

    for (const slot of slots) {
      let score = 0;

      if (preferredDate && slot.date === preferredDate) {
        score += 10;
      }

      if (preferredTime && slot.time === preferredTime) {
        score += 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = slot;
      }
    }

    return bestMatch;
  }

  /**
   * Sanitize phone number for logging
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
