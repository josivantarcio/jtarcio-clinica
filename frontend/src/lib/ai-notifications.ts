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
 * Cria um agendamento baseado em dados reais fornecidos pela IA
 * Este método será usado quando a integração real com o chat da IA for implementada
 */
export function createAIBookingFromRealData(bookingParams: Partial<AIBookingData>): AIBookingData {
  const now = new Date()
  const appointmentId = `ai_apt_${now.getTime()}`
  const chatId = bookingParams.chatId || `chat_${now.getTime()}`
  
  // Generate scheduled time in a more realistic way
  const scheduledDate = new Date(bookingParams.scheduledAt || now)
  const scheduledAt = scheduledDate.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }) + ` às ${scheduledDate.getHours().toString().padStart(2, '0')}:${scheduledDate.getMinutes().toString().padStart(2, '0')}`
  
  return {
    patientName: bookingParams.patientName || 'Paciente',
    patientEmail: bookingParams.patientEmail || 'paciente@email.com',
    doctorName: bookingParams.doctorName || 'Médico',
    doctorId: bookingParams.doctorId || `dr_${now.getTime()}`,
    specialtyName: bookingParams.specialtyName || 'Consulta Geral',
    scheduledAt,
    appointmentId,
    chatId,
    confidence: bookingParams.confidence || 0.90,
    context: {
      symptoms: bookingParams.context?.symptoms || [],
      urgency: bookingParams.context?.urgency || 'medium',
      patientPreferences: bookingParams.context?.patientPreferences || [],
      conversationSummary: bookingParams.context?.conversationSummary || 'Agendamento via IA'
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
 * Hook para demonstração de agendamentos da IA
 * Usa dados genéricos para demonstração até integração real ser implementada
 */
export function useAIBookingSimulation() {
  const simulateBooking = () => {
    // Generate future date for demo (next 1-3 days)
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 3) + 1)
    futureDate.setHours(8 + Math.floor(Math.random() * 9), Math.random() < 0.5 ? 0 : 30, 0, 0)
    
    const bookingData = createAIBookingFromRealData({
      patientName: 'Usuário Demo',
      patientEmail: 'demo@email.com',
      doctorName: 'Dr. Sistema',
      doctorId: 'demo_doctor',
      specialtyName: 'Consulta Demo',
      scheduledAt: futureDate.toISOString(),
      confidence: 0.95,
      context: {
        symptoms: ['Consulta de demonstração'],
        urgency: 'medium',
        patientPreferences: ['Agendamento via IA'],
        conversationSummary: 'Demonstração do sistema de agendamento automático via IA'
      }
    })
    
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