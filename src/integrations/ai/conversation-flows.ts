import { PrismaClient } from '../../database/generated/client';
import { logger } from '../../config/logger.js';
import { Intent } from './nlp-pipeline.js';
import { ConversationContext, SlotMap, ConversationContextManager } from './conversation-context.js';
import MedicalKnowledgeBase from './knowledge-base.js';

export interface FlowResult {
  success: boolean;
  message: string;
  nextStep?: string;
  requiresConfirmation?: boolean;
  data?: any;
  errors?: string[];
}

export interface AppointmentData {
  patientName: string;
  patientPhone: string;
  patientCPF?: string;
  patientEmail?: string;
  specialty: string;
  preferredDate?: string;
  preferredTime?: string;
  symptoms?: string;
  insurancePlan?: string;
  doctorId?: string;
}

export interface AppointmentSlot {
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  duration: number;
  available: boolean;
}

export class ConversationFlowHandler {
  private prisma: PrismaClient;
  private contextManager: ConversationContextManager;
  private knowledgeBase: MedicalKnowledgeBase;

  constructor(
    prisma: PrismaClient,
    contextManager: ConversationContextManager,
    knowledgeBase: MedicalKnowledgeBase
  ) {
    this.prisma = prisma;
    this.contextManager = contextManager;
    this.knowledgeBase = knowledgeBase;
  }

  /**
   * Handle appointment scheduling flow
   */
  async handleSchedulingFlow(context: ConversationContext): Promise<FlowResult> {
    try {
      const missingSlots = this.contextManager.getMissingSlots(context);
      
      // Step 1: Collect patient information
      if (missingSlots.includes('patientName') || missingSlots.includes('patientPhone')) {
        return this.collectPatientInfo(context, missingSlots);
      }

      // Step 2: Collect specialty preference
      if (missingSlots.includes('specialty')) {
        return this.collectSpecialtyInfo(context);
      }

      // Step 3: Collect date/time preferences
      if (!context.slotsFilled.preferredDate && !context.slotsFilled.timePreference) {
        return this.collectTimePreferences(context);
      }

      // Step 4: Check availability and present options
      if (context.flowState === 'collecting_appointment_details') {
        return await this.checkAvailabilityAndPresentOptions(context);
      }

      // Step 5: Confirm appointment details
      if (context.flowState === 'confirming_details') {
        return await this.confirmAppointmentDetails(context);
      }

      // Step 6: Create appointment
      if (context.flowState === 'ready_to_book') {
        return await this.createAppointment(context);
      }

      return {
        success: false,
        message: 'Estado do fluxo não reconhecido. Vamos recomeçar o agendamento.',
        nextStep: 'restart'
      };

    } catch (error) {
      logger.error('Error in scheduling flow', {
        userId: context.userId,
        sessionId: context.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Ocorreu um erro no processo de agendamento. Vamos tentar novamente.',
        nextStep: 'restart',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Handle rescheduling flow
   */
  async handleReschedulingFlow(context: ConversationContext): Promise<FlowResult> {
    try {
      // Step 1: Identify existing appointment
      if (!context.slotsFilled.existingAppointmentId && !context.slotsFilled.patientName) {
        return {
          success: false,
          message: 'Para reagendar, preciso identificar sua consulta atual. Pode me informar seu nome completo e a data da consulta que deseja alterar?',
          nextStep: 'identify_appointment'
        };
      }

      // Step 2: Find and confirm existing appointment
      if (context.flowState === 'identifying_appointment') {
        return await this.findExistingAppointment(context);
      }

      // Step 3: Collect new preferences
      if (context.flowState === 'collecting_new_preferences') {
        return this.collectNewTimePreferences(context);
      }

      // Step 4: Check new availability
      if (context.flowState === 'checking_new_availability') {
        return await this.checkRescheduleAvailability(context);
      }

      // Step 5: Process rescheduling
      if (context.flowState === 'ready_to_reschedule') {
        return await this.processRescheduling(context);
      }

      return {
        success: false,
        message: 'Problema no fluxo de reagendamento. Vamos recomeçar.',
        nextStep: 'restart'
      };

    } catch (error) {
      logger.error('Error in rescheduling flow', {
        userId: context.userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Erro ao reagendar consulta. Tente novamente.',
        nextStep: 'restart'
      };
    }
  }

  /**
   * Handle cancellation flow
   */
  async handleCancellationFlow(context: ConversationContext): Promise<FlowResult> {
    try {
      // Step 1: Identify appointment to cancel
      if (!context.slotsFilled.existingAppointmentId && !context.slotsFilled.patientName) {
        return {
          success: false,
          message: 'Para cancelar sua consulta, preciso de seus dados. Qual seu nome completo e quando é a consulta que deseja cancelar?',
          nextStep: 'identify_appointment'
        };
      }

      // Step 2: Find and confirm appointment
      if (context.flowState === 'identifying_appointment') {
        return await this.findAppointmentToCancel(context);
      }

      // Step 3: Explain cancellation policy
      if (context.flowState === 'explaining_policy') {
        return this.explainCancellationPolicy(context);
      }

      // Step 4: Process cancellation
      if (context.flowState === 'ready_to_cancel') {
        return await this.processCancellation(context);
      }

      return {
        success: false,
        message: 'Problema no cancelamento. Vamos tentar novamente.',
        nextStep: 'restart'
      };

    } catch (error) {
      logger.error('Error in cancellation flow', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Erro ao cancelar consulta. Tente novamente.',
        nextStep: 'restart'
      };
    }
  }

  /**
   * Handle emergency assessment flow
   */
  async handleEmergencyFlow(context: ConversationContext): Promise<FlowResult> {
    try {
      const symptoms = context.slotsFilled.symptoms?.value || [];
      const urgencyLevel = context.slotsFilled.urgencyLevel?.value;

      // Check for emergency protocols
      const emergencyProtocol = this.knowledgeBase.checkEmergency(
        Array.isArray(symptoms) ? symptoms : [symptoms]
      );

      if (emergencyProtocol) {
        return {
          success: true,
          message: `⚠️ SITUAÇÃO DE EMERGÊNCIA IDENTIFICADA

${emergencyProtocol.response}

AÇÕES RECOMENDADAS:
${emergencyProtocol.actions.map(action => `• ${action}`).join('\n')}

🚨 Se a situação for grave, não hesite em chamar o SAMU (192) imediatamente.

Nossa clínica também tem plantão 24h disponível.`,
          nextStep: 'emergency_handled',
          data: { emergency: true, protocol: emergencyProtocol }
        };
      }

      // For non-critical symptoms, try to schedule urgent consultation
      return {
        success: true,
        message: `Entendo sua preocupação. Vou tentar agendar uma consulta urgente para você.

Com base nos sintomas que descreveu, recomendo uma avaliação médica o mais breve possível.

Pode me informar seu nome completo e telefone para que eu possa verificar a disponibilidade mais próxima?`,
        nextStep: 'schedule_urgent',
        data: { urgent: true }
      };

    } catch (error) {
      logger.error('Error in emergency flow', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        success: false,
        message: 'Em caso de emergência real, procure atendimento médico imediato ou chame o SAMU (192).',
        nextStep: 'emergency_fallback'
      };
    }
  }

  /**
   * Collect patient information
   */
  private collectPatientInfo(context: ConversationContext, missingSlots: string[]): FlowResult {
    const needsName = missingSlots.includes('patientName');
    const needsPhone = missingSlots.includes('patientPhone');

    if (needsName && needsPhone) {
      return {
        success: false,
        message: 'Para agendar sua consulta, preciso de algumas informações básicas. Pode me informar seu nome completo e telefone para contato?',
        nextStep: 'collect_basic_info'
      };
    }

    if (needsName) {
      return {
        success: false,
        message: 'Perfeito! Agora preciso do seu nome completo.',
        nextStep: 'collect_name'
      };
    }

    if (needsPhone) {
      return {
        success: false,
        message: 'Ótimo! E qual seu telefone para contato?',
        nextStep: 'collect_phone'
      };
    }

    return {
      success: true,
      message: 'Informações básicas coletadas com sucesso!',
      nextStep: 'collect_specialty'
    };
  }

  /**
   * Collect specialty information
   */
  private collectSpecialtyInfo(context: ConversationContext): FlowResult {
    const availableSpecialties = this.knowledgeBase.getAllSpecialties();
    
    const specialtyList = availableSpecialties
      .map(s => `• ${s.name}`)
      .join('\n');

    return {
      success: false,
      message: `Agora preciso saber qual especialidade médica você precisa. Temos as seguintes disponíveis:

${specialtyList}

Qual especialidade você gostaria de agendar?`,
      nextStep: 'collect_specialty',
      data: { availableSpecialties }
    };
  }

  /**
   * Collect time preferences
   */
  private collectTimePreferences(context: ConversationContext): FlowResult {
    return {
      success: false,
      message: 'Perfeito! Agora me diga quando você gostaria de agendar. Tem alguma preferência de data e horário? Por exemplo: "próxima semana de manhã" ou "quinta-feira à tarde".',
      nextStep: 'collect_time_preferences'
    };
  }

  /**
   * Check availability and present options
   */
  private async checkAvailabilityAndPresentOptions(context: ConversationContext): Promise<FlowResult> {
    try {
      const specialty = context.slotsFilled.specialty?.value;
      const preferredDate = context.slotsFilled.preferredDate?.value;
      const timePreference = context.slotsFilled.timePreference?.value;

      // Get available slots from database
      const availableSlots = await this.getAvailableSlots(specialty, preferredDate, timePreference);

      if (availableSlots.length === 0) {
        return {
          success: false,
          message: 'Infelizmente não temos disponibilidade exatamente no período que você solicitou. Pode me sugerir outras opções de data e horário? Ou posso verificar a próxima semana.',
          nextStep: 'no_availability',
          data: { noAvailability: true }
        };
      }

      const optionsText = availableSlots.slice(0, 3).map((slot, index) => 
        `${index + 1}. ${slot.doctorName} - ${this.formatDate(slot.date)} às ${slot.time}`
      ).join('\n');

      return {
        success: false,
        message: `Encontrei algumas opções para você:

${optionsText}

Qual dessas opções você prefere? Digite o número da sua escolha.`,
        nextStep: 'present_options',
        data: { availableSlots: availableSlots.slice(0, 3) }
      };

    } catch (error) {
      logger.error('Error checking availability', { error });
      return {
        success: false,
        message: 'Erro ao verificar disponibilidade. Tente novamente.',
        nextStep: 'restart'
      };
    }
  }

  /**
   * Confirm appointment details
   */
  private async confirmAppointmentDetails(context: ConversationContext): Promise<FlowResult> {
    const appointmentData = this.extractAppointmentData(context);
    
    return {
      success: false,
      message: `Por favor, confirme os dados da sua consulta:

👤 Nome: ${appointmentData.patientName}
📞 Telefone: ${appointmentData.patientPhone}
🏥 Especialidade: ${appointmentData.specialty}
📅 Data e horário: ${appointmentData.preferredDate} às ${appointmentData.preferredTime}

Está tudo correto? Digite "sim" para confirmar ou me diga o que precisa alterar.`,
      nextStep: 'confirm_details',
      requiresConfirmation: true,
      data: { appointmentData }
    };
  }

  /**
   * Create appointment in database
   */
  private async createAppointment(context: ConversationContext): Promise<FlowResult> {
    try {
      const appointmentData = this.extractAppointmentData(context);
      
      // Find or create patient
      let patient = await this.findOrCreatePatient(appointmentData);
      
      // Find doctor and specialty
      const doctor = await this.findDoctorBySpecialty(appointmentData.specialty);
      const specialty = await this.findSpecialty(appointmentData.specialty);

      if (!doctor || !specialty) {
        return {
          success: false,
          message: 'Erro ao encontrar médico ou especialidade. Tente novamente.',
          nextStep: 'restart'
        };
      }

      // Create appointment
      const appointment = await this.prisma.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          specialtyId: specialty.id,
          scheduledAt: new Date(appointmentData.preferredDate + 'T' + appointmentData.preferredTime),
          endTime: new Date(new Date(appointmentData.preferredDate + 'T' + appointmentData.preferredTime).getTime() + 30 * 60000), // +30 min
          reason: appointmentData.symptoms || 'Consulta médica',
          status: 'SCHEDULED',
          type: 'CONSULTATION',
          conversationId: context.conversationId
        },
        include: {
          doctor: {
            include: {
              user: true
            }
          },
          specialty: true
        }
      });

      return {
        success: true,
        message: `✅ Consulta agendada com sucesso!

📋 Detalhes:
• Paciente: ${appointmentData.patientName}
• Médico: Dr(a). ${appointment.doctor.user.firstName} ${appointment.doctor.user.lastName}
• Especialidade: ${appointment.specialty.name}
• Data: ${this.formatDate(appointment.scheduledAt.toISOString())}
• Horário: ${this.formatTime(appointment.scheduledAt)}

📝 Lembretes importantes:
• Chegue 15 minutos antes do horário
• Traga documento com foto e cartão do convênio
• Em caso de cancelamento, avise com 24h de antecedência

Você receberá uma confirmação por SMS/WhatsApp em breve.`,
        nextStep: 'completed',
        data: { appointment, appointmentId: appointment.id }
      };

    } catch (error) {
      logger.error('Error creating appointment', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        context: context.sessionId 
      });

      return {
        success: false,
        message: 'Ocorreu um erro ao agendar sua consulta. Nossa equipe foi notificada. Tente novamente ou entre em contato pelo telefone.',
        nextStep: 'restart',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Find existing appointment
   */
  private async findExistingAppointment(context: ConversationContext): Promise<FlowResult> {
    try {
      const patientName = context.slotsFilled.patientName?.value;
      const patientPhone = context.slotsFilled.patientPhone?.value;

      if (!patientName && !patientPhone) {
        return {
          success: false,
          message: 'Preciso do seu nome completo ou telefone para encontrar sua consulta.',
          nextStep: 'identify_patient'
        };
      }

      // Find patient appointments
      const appointments = await this.prisma.appointment.findMany({
        where: {
          OR: [
            {
              patient: {
                user: {
                  fullName: { contains: patientName, mode: 'insensitive' }
                }
              }
            },
            {
              patient: {
                user: {
                  phone: patientPhone
                }
              }
            }
          ],
          status: {
            in: ['SCHEDULED', 'CONFIRMED']
          },
          scheduledAt: {
            gte: new Date() // Future appointments only
          }
        },
        include: {
          doctor: {
            include: { user: true }
          },
          specialty: true,
          patient: {
            include: { user: true }
          }
        },
        orderBy: {
          scheduledAt: 'asc'
        }
      });

      if (appointments.length === 0) {
        return {
          success: false,
          message: 'Não encontrei consultas agendadas com esses dados. Pode verificar o nome ou telefone informados?',
          nextStep: 'verify_patient_data'
        };
      }

      if (appointments.length === 1) {
        const apt = appointments[0];
        return {
          success: true,
          message: `Encontrei sua consulta:

📋 ${apt.patient.user.fullName}
🏥 ${apt.specialty.name} - Dr(a). ${apt.doctor.user.firstName} ${apt.doctor.user.lastName}
📅 ${this.formatDate(apt.scheduledAt.toISOString())} às ${this.formatTime(apt.scheduledAt)}

É essa consulta que você deseja alterar?`,
          nextStep: 'confirm_appointment',
          data: { selectedAppointment: apt }
        };
      }

      // Multiple appointments - let user choose
      const appointmentsList = appointments.map((apt, index) => 
        `${index + 1}. ${apt.specialty.name} - ${this.formatDate(apt.scheduledAt.toISOString())} às ${this.formatTime(apt.scheduledAt)}`
      ).join('\n');

      return {
        success: false,
        message: `Encontrei várias consultas agendadas:

${appointmentsList}

Digite o número da consulta que deseja alterar.`,
        nextStep: 'select_appointment',
        data: { appointments }
      };

    } catch (error) {
      logger.error('Error finding existing appointment', { error });
      return {
        success: false,
        message: 'Erro ao buscar consultas. Tente novamente.',
        nextStep: 'restart'
      };
    }
  }

  /**
   * Helper methods
   */
  private extractAppointmentData(context: ConversationContext): AppointmentData {
    return {
      patientName: context.slotsFilled.patientName?.value || '',
      patientPhone: context.slotsFilled.patientPhone?.value || '',
      patientCPF: context.slotsFilled.patientCPF?.value,
      patientEmail: context.slotsFilled.patientEmail?.value,
      specialty: context.slotsFilled.specialty?.value || '',
      preferredDate: context.slotsFilled.preferredDate?.value,
      preferredTime: context.slotsFilled.preferredTime?.value,
      symptoms: Array.isArray(context.slotsFilled.symptoms?.value) 
        ? context.slotsFilled.symptoms.value.join(', ')
        : context.slotsFilled.symptoms?.value,
      insurancePlan: context.slotsFilled.insurancePlan?.value
    };
  }

  private async getAvailableSlots(
    specialty: string, 
    preferredDate?: string, 
    timePreference?: string
  ): Promise<AppointmentSlot[]> {
    // Mock implementation - would query real availability
    return [
      {
        doctorId: 'doc1',
        doctorName: 'Dr. João Silva',
        specialty: specialty,
        date: '2024-12-15',
        time: '14:00',
        duration: 30,
        available: true
      },
      {
        doctorId: 'doc2',
        doctorName: 'Dra. Maria Santos',
        specialty: specialty,
        date: '2024-12-16',
        time: '09:30',
        duration: 30,
        available: true
      }
    ];
  }

  private async findOrCreatePatient(appointmentData: AppointmentData): Promise<any> {
    // Implementation would find or create patient
    // For now, return mock patient
    return { id: 'patient1' };
  }

  private async findDoctorBySpecialty(specialty: string): Promise<any> {
    // Implementation would find doctor by specialty
    return { id: 'doctor1' };
  }

  private async findSpecialty(specialtyName: string): Promise<any> {
    // Implementation would find specialty by name
    return { id: 'specialty1', name: specialtyName };
  }

  private formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('pt-BR');
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  private collectNewTimePreferences(context: ConversationContext): FlowResult {
    return {
      success: false,
      message: 'Para qual data e horário você gostaria de reagendar?',
      nextStep: 'collect_new_time'
    };
  }

  private async checkRescheduleAvailability(context: ConversationContext): Promise<FlowResult> {
    // Implementation for rescheduling availability check
    return { success: true, message: 'Availability checked' };
  }

  private async processRescheduling(context: ConversationContext): Promise<FlowResult> {
    // Implementation for processing rescheduling
    return { success: true, message: 'Rescheduled successfully' };
  }

  private async findAppointmentToCancel(context: ConversationContext): Promise<FlowResult> {
    // Implementation for finding appointment to cancel
    return { success: true, message: 'Appointment found' };
  }

  private explainCancellationPolicy(context: ConversationContext): FlowResult {
    const policy = this.knowledgeBase.getPolicy('cancelamento');
    
    return {
      success: false,
      message: `Sobre nossa política de cancelamento:

${policy?.policy || 'Cancelamentos devem ser feitos com 24h de antecedência.'}

Você confirma o cancelamento da sua consulta?`,
      nextStep: 'confirm_cancellation',
      requiresConfirmation: true
    };
  }

  private async processCancellation(context: ConversationContext): Promise<FlowResult> {
    // Implementation for processing cancellation
    return { 
      success: true, 
      message: 'Consulta cancelada com sucesso! Você receberá uma confirmação por SMS.' 
    };
  }
}

export default ConversationFlowHandler;