import { useNotificationsStore } from '@/store/notifications'

/**
 * AI Notification System - EO Clínica
 * 
 * Este módulo gerencia notificações para agendamentos realizados pela IA
 * Será integrado com o sistema de chat da IA na próxima semana
 */

export interface AIBookingData {
  patientName: string
  patientEmail?: string
  doctorName: string
  doctorId: string
  specialtyName: string
  scheduledAt: string
  appointmentId: string
  chatId: string
  confidence: number // 0-1, confiança da IA no agendamento
  context: {
    symptoms?: string[]
    urgency?: 'low' | 'medium' | 'high' | 'urgent'
    patientPreferences?: string[]
    conversationSummary?: string
  }
}

/**
 * Simula um agendamento feito pela IA
 * Na próxima semana será substituído pela integração real com o chat da IA
 */
export function simulateAIBooking(): AIBookingData {
  const mockPatients = [
    'Maria Santos', 'João Silva', 'Ana Costa', 'Pedro Oliveira',
    'Carla Ferreira', 'Lucas Pereira', 'Sofia Rodrigues', 'Diego Almeida'
  ]
  
  const mockDoctors = [
    { name: 'Dr. Roberto Cardoso', specialty: 'Cardiologia' },
    { name: 'Dra. Fernanda Lima', specialty: 'Dermatologia' },
    { name: 'Dr. Carlos Mendes', specialty: 'Clínica Geral' },
    { name: 'Dra. Juliana Torres', specialty: 'Pediatria' }
  ]
  
  const mockSymptoms = [
    ['dor no peito', 'falta de ar'],
    ['manchas na pele', 'coceira'],
    ['febre', 'dor de cabeça'],
    ['tosse persistente', 'cansaço']
  ]
  
  const patient = mockPatients[Math.floor(Math.random() * mockPatients.length)]
  const doctor = mockDoctors[Math.floor(Math.random() * mockDoctors.length)]
  const symptoms = mockSymptoms[Math.floor(Math.random() * mockSymptoms.length)]
  
  // Gerar data futura aleatória (próximos 7 dias)
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 7) + 1)
  const hours = Math.floor(Math.random() * 10) + 8 // 8h às 17h
  const minutes = Math.random() < 0.5 ? 0 : 30
  futureDate.setHours(hours, minutes, 0, 0)
  
  const scheduledAt = futureDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }) + ` às ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  
  return {
    patientName: patient,
    patientEmail: `${patient.toLowerCase().replace(' ', '.')}@email.com`,
    doctorName: doctor.name,
    doctorId: `dr_${Math.random().toString(36).substr(2, 9)}`,
    specialtyName: doctor.specialty,
    scheduledAt,
    appointmentId: `ai_apt_${Date.now()}`,
    chatId: `chat_${Math.random().toString(36).substr(2, 9)}`,
    confidence: 0.85 + Math.random() * 0.15, // 85-100%
    context: {
      symptoms,
      urgency: Math.random() > 0.7 ? 'high' : 'medium',
      patientPreferences: ['manhã', 'médico experiente'],
      conversationSummary: `Paciente relata ${symptoms.join(' e ')}. Solicita consulta com ${doctor.specialty.toLowerCase()}.`
    }
  }
}

/**
 * Cria notificação para agendamento feito pela IA
 */
export function createAIBookingNotification(bookingData: AIBookingData) {
  const { addAIBookingNotification, addNotification } = useNotificationsStore.getState()
  
  // Notificação principal de agendamento
  addAIBookingNotification({
    patientName: bookingData.patientName,
    doctorName: bookingData.doctorName,
    scheduledAt: bookingData.scheduledAt,
    appointmentId: bookingData.appointmentId,
    chatId: bookingData.chatId
  })
  
  // Se urgência alta, criar notificação adicional
  if (bookingData.context.urgency === 'high' || bookingData.context.urgency === 'urgent') {
    addNotification({
      type: 'urgent',
      title: '🚨 Agendamento Urgente pela IA',
      message: `IA identificou urgência alta para ${bookingData.patientName}. Consulta agendada para ${bookingData.scheduledAt}`,
      priority: 'urgent',
      metadata: {
        appointmentId: bookingData.appointmentId,
        patientName: bookingData.patientName,
        doctorName: bookingData.doctorName,
        scheduledAt: bookingData.scheduledAt,
        aiGenerated: true,
        source: 'ai_chat'
      }
    })
  }
}

/**
 * Hook para simular agendamentos da IA (para demonstração)
 * Na próxima semana será substituído pela integração real
 */
export function useAIBookingSimulation() {
  const simulateBooking = () => {
    const bookingData = simulateAIBooking()
    createAIBookingNotification(bookingData)
    return bookingData
  }
  
  return { simulateBooking }
}

/**
 * DOCUMENTAÇÃO: TIPOS DE NOTIFICAÇÕES FUTURAS
 * 
 * Quando a automação com IA for implementada na próxima semana,
 * o sistema suportará os seguintes tipos de notificações:
 */

export const FUTURE_NOTIFICATION_TYPES = {
  // 🤖 AGENDAMENTOS VIA IA
  AI_BOOKING_SUCCESS: {
    type: 'ai_booking',
    title: '🤖 IA Agendou Consulta',
    description: 'IA identificou necessidade e agendou automaticamente',
    priority: 'high',
    triggers: ['chat_completion', 'symptom_analysis', 'urgent_case']
  },
  
  AI_BOOKING_CONFIRMATION_NEEDED: {
    type: 'ai_booking',
    title: '🤔 IA Precisa de Confirmação',
    description: 'IA sugeriu agendamento mas precisa de aprovação humana',
    priority: 'medium',
    triggers: ['low_confidence', 'complex_case', 'multiple_options']
  },
  
  AI_RESCHEDULE_SUGGESTION: {
    type: 'ai_booking',
    title: '📅 IA Sugere Reagendamento',
    description: 'IA detectou conflito e sugere nova data/hora',
    priority: 'medium',
    triggers: ['conflict_detected', 'better_slot_available']
  },
  
  // 🧠 ANÁLISES INTELIGENTES
  AI_SYMPTOM_ANALYSIS: {
    type: 'system',
    title: '🔍 Análise de Sintomas Concluída',
    description: 'IA analisou sintomas e sugeriu especialidade',
    priority: 'medium',
    triggers: ['symptom_input', 'chat_analysis']
  },
  
  AI_URGENT_CASE_DETECTED: {
    type: 'urgent',
    title: '🚨 Caso Urgente Identificado',
    description: 'IA detectou sintomas que requerem atenção imediata',
    priority: 'urgent',
    triggers: ['red_flag_symptoms', 'emergency_keywords']
  },
  
  AI_FOLLOW_UP_REMINDER: {
    type: 'reminder',
    title: '🔄 IA Sugere Retorno',
    description: 'IA recomenda consulta de acompanhamento',
    priority: 'medium',
    triggers: ['treatment_timeline', 'recovery_tracking']
  },
  
  // 📊 OTIMIZAÇÕES AUTOMÁTICAS
  AI_SCHEDULE_OPTIMIZATION: {
    type: 'system',
    title: '⚡ Agenda Otimizada pela IA',
    description: 'IA reorganizou agenda para melhor eficiência',
    priority: 'low',
    triggers: ['schedule_gaps', 'optimization_opportunity']
  },
  
  AI_PATIENT_NO_SHOW_PREDICTION: {
    type: 'reminder',
    title: '⚠️ IA Prevê Possível Falta',
    description: 'IA sugere contato preventivo com paciente',
    priority: 'medium',
    triggers: ['behavioral_pattern', 'risk_analysis']
  },
  
  // 💬 INTERAÇÕES DE CHAT
  AI_CHAT_ESCALATION: {
    type: 'system',
    title: '📞 Chat Escalado para Humano',
    description: 'IA transferiu conversa para atendimento humano',
    priority: 'high',
    triggers: ['complex_query', 'patient_request', 'ai_limitation']
  },
  
  AI_SATISFACTION_LOW: {
    type: 'system',
    title: '😞 Satisfação Baixa Detectada',
    description: 'IA detectou insatisfação do paciente no chat',
    priority: 'high',
    triggers: ['negative_sentiment', 'complaint_detected']
  }
} as const

/**
 * FLUXO DE INTEGRAÇÃO PLANEJADO:
 * 
 * 1. 📱 Paciente inicia chat com IA
 * 2. 🧠 IA analisa sintomas e necessidades
 * 3. 🔍 IA consulta disponibilidade de médicos
 * 4. 📅 IA propõe horários compatíveis
 * 5. ✅ IA confirma agendamento automaticamente
 * 6. 🔔 Sistema cria notificações relevantes
 * 7. 📧 IA envia confirmação por email/SMS
 * 8. 📊 Sistema atualiza métricas e relatórios
 * 
 * TRIGGERS PARA NOTIFICAÇÕES:
 * - Agendamento realizado com sucesso
 * - Necessidade de confirmação humana
 * - Casos urgentes detectados
 * - Otimizações de agenda
 * - Escalações para atendimento humano
 * - Feedback negativo do paciente
 */