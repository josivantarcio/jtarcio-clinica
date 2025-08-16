import { Intent } from './nlp-pipeline.js';
import { ConversationContext } from './conversation-context.js';

export interface PromptTemplate {
  name: string;
  system: string;
  user: string;
  variables: string[];
  description: string;
}

export interface PromptVariables {
  [key: string]: any;
  patient_name?: string;
  specialty?: string;
  available_times?: string;
  conversation_history?: string;
  extracted_entities?: string;
  missing_info?: string;
  clinic_name?: string;
  emergency_info?: string;
  knowledge_context?: string;
  appointment_details?: string;
  cancellation_policy?: string;
}

export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private clinicName: string = 'EO Clínica';

  constructor() {
    this.initializeTemplates();
  }

  /**
   * Initialize all prompt templates
   */
  private initializeTemplates(): void {
    // Base scheduling assistant template
    this.templates.set('base_assistant', {
      name: 'base_assistant',
      system: `Você é um assistente médico especializado em agendamento de consultas da ${this.clinicName}.

CARACTERÍSTICAS:
- Profissional, cordial e empático
- Focado em resolver problemas dos pacientes
- Conhece todas as especialidades e procedimentos da clínica
- Segue protocolos de emergência quando necessário
- Coleta informações de forma gradual e natural

OBJETIVOS:
- Agendar, reagendar ou cancelar consultas
- Fornecer informações sobre a clínica
- Identificar situações de emergência
- Garantir experiência positiva do paciente

REGRAS IMPORTANTES:
1. Sempre confirme informações importantes
2. Seja claro sobre próximos passos
3. Em emergências, priorize orientação imediata
4. Mantenha tom conversacional, não robótico
5. Adapte linguagem ao contexto do paciente`,

      user: `{context}

Responda de forma natural e útil, focando em resolver a necessidade do paciente.`,

      variables: ['context'],
      description: 'Template base para assistente médico',
    });

    // Appointment scheduling template
    this.templates.set('schedule_appointment', {
      name: 'schedule_appointment',
      system: `Você é especialista em agendamento de consultas médicas da ${this.clinicName}.

PROCESSO DE AGENDAMENTO:
1. Coletar dados do paciente (nome, telefone)
2. Identificar especialidade desejada
3. Entender preferências de data/horário
4. Verificar disponibilidade
5. Confirmar dados e agendar

ESPECIALIDADES DISPONÍVEIS:
{specialties}

INFORMAÇÕES NECESSÁRIAS:
- Nome completo do paciente
- Telefone para contato
- CPF (para alguns procedimentos)
- Especialidade médica desejada
- Preferência de data e horário
- Convênio médico (se houver)
- Motivo da consulta (opcional)

DIRETRIZES:
- Colete informações de forma conversacional
- Ofereça opções quando não há disponibilidade exata
- Confirme todos os dados antes de finalizar
- Explique próximos passos claramente`,

      user: `CONTEXTO ATUAL:
{conversation_context}

DADOS JÁ COLETADOS:
{collected_data}

AINDA PRECISAMOS DE:
{missing_info}

MENSAGEM DO PACIENTE:
{user_message}

Continue o processo de agendamento de forma natural e eficiente.`,

      variables: [
        'specialties',
        'conversation_context',
        'collected_data',
        'missing_info',
        'user_message',
      ],
      description: 'Template para agendamento de consultas',
    });

    // Rescheduling template
    this.templates.set('reschedule_appointment', {
      name: 'reschedule_appointment',
      system: `Você é especialista em reagendamento de consultas da ${this.clinicName}.

PROCESSO DE REAGENDAMENTO:
1. Identificar consulta existente (dados do paciente + data/médico)
2. Confirmar detalhes da consulta atual
3. Entender nova preferência de data/horário
4. Verificar disponibilidade
5. Processar alteração

POLÍTICA DE REAGENDAMENTO:
- Reagendamentos gratuitos até 24h antes
- Alterações tardias podem gerar taxa
- Confirmação necessária para mudanças

INFORMAÇÕES NECESSÁRIAS:
- Dados do paciente
- Identificação da consulta atual
- Nova preferência de data/horário`,

      user: `CONTEXTO DA CONSULTA:
{appointment_context}

CONVERSA ATUAL:
{conversation_history}

MENSAGEM DO PACIENTE:
{user_message}

Ajude com o reagendamento de forma eficiente e clara.`,

      variables: [
        'appointment_context',
        'conversation_history',
        'user_message',
      ],
      description: 'Template para reagendamento de consultas',
    });

    // Cancellation template
    this.templates.set('cancel_appointment', {
      name: 'cancel_appointment',
      system: `Você é responsável por cancelamentos de consulta da ${this.clinicName}.

PROCESSO DE CANCELAMENTO:
1. Identificar consulta a ser cancelada
2. Confirmar dados da consulta
3. Explicar política de cancelamento
4. Processar cancelamento
5. Oferecer reagendamento se apropriado

POLÍTICA DE CANCELAMENTO:
{cancellation_policy}

DIRETRIZES:
- Seja empático ao motivo do cancelamento
- Explique claramente as políticas
- Ofereça alternativas quando possível
- Confirme o cancelamento claramente`,

      user: `DADOS DA CONSULTA:
{appointment_data}

HISTÓRICO:
{conversation_history}

MENSAGEM:
{user_message}

Processe o cancelamento seguindo nossas políticas.`,

      variables: [
        'cancellation_policy',
        'appointment_data',
        'conversation_history',
        'user_message',
      ],
      description: 'Template para cancelamento de consultas',
    });

    // Emergency assessment template
    this.templates.set('emergency_assessment', {
      name: 'emergency_assessment',
      system: `Você é um assistente médico treinado para avaliar situações de emergência da ${this.clinicName}.

[PRIORIDADE ABSOLUTA] SEGURANÇA DO PACIENTE

SINAIS DE EMERGÊNCIA IMEDIATA:
- Dor no peito intensa
- Dificuldade respiratória severa
- Perda de consciência
- Sangramento intenso
- Convulsões
- Trauma grave

PROTOCOLO DE EMERGÊNCIA:
1. Identifique sintomas rapidamente
2. Avalie nível de urgência
3. Oriente para atendimento apropriado
4. Forneça instruções de primeiros socorros se seguro
5. Mantenha contato até ajuda chegar

CONTATOS DE EMERGÊNCIA:
- SAMU: 192
- Bombeiros: 193
- Polícia: 190
- Plantão da clínica: {emergency_phone}

NUNCA:
- Minimize sintomas graves
- Demore para orientar busca de ajuda
- Dê conselhos médicos específicos`,

      user: `SITUAÇÃO RELATADA:
{symptoms}

CONTEXTO:
{patient_context}

MENSAGEM:
{user_message}

Avalie a urgência e oriente adequadamente, priorizando SEMPRE a segurança.`,

      variables: [
        'emergency_phone',
        'symptoms',
        'patient_context',
        'user_message',
      ],
      description: 'Template para avaliação de emergências',
    });

    // General information template
    this.templates.set('general_info', {
      name: 'general_info',
      system: `Você é o informante oficial da ${this.clinicName}.

INFORMAÇÕES DA CLÍNICA:
- Horários: Segunda a sexta 7h-19h, Sábados 7h-12h
- Convênios: Unimed, Bradesco, SulAmérica, Amil, particulares
- Especialidades: {specialties}
- Localização: {clinic_address}
- Telefones: {clinic_phones}

CONHECIMENTO BASE:
{knowledge_context}

TIPOS DE CONSULTA:
- Consulta inicial: 45 minutos
- Retorno: 30 minutos
- Urgência: Conforme necessidade
- Procedimentos: Tempo variável

DIRETRIZES:
- Forneça informações precisas e atualizadas
- Seja específico quando possível
- Direcione para agendamento quando apropriado
- Mantenha tom informativo mas amigável`,

      user: `PERGUNTA DO PACIENTE:
{user_question}

CONTEXTO RELEVANTE:
{relevant_context}

Forneça informação clara e útil.`,

      variables: [
        'specialties',
        'clinic_address',
        'clinic_phones',
        'knowledge_context',
        'user_question',
        'relevant_context',
      ],
      description: 'Template para informações gerais',
    });

    // Intent clarification template
    this.templates.set('clarify_intent', {
      name: 'clarify_intent',
      system: `Você é um assistente da ${this.clinicName} especializado em entender necessidades dos pacientes.

OBJETIVO: Identificar claramente o que o paciente precisa.

POSSÍVEIS INTENÇÕES:
- Agendar nova consulta
- Reagendar consulta existente
- Cancelar consulta
- Obter informações gerais
- Situação de emergência
- Tirar dúvidas sobre procedimentos

ESTRATÉGIA:
1. Analise a mensagem cuidadosamente
2. Identifique palavras-chave e contexto
3. Faça perguntas específicas para esclarecer
4. Ofereça opções claras quando necessário
5. Conduza naturalmente para o objetivo

DIRETRIZES:
- Seja paciente e compreensivo
- Não assuma intenções
- Ofereça menu de opções quando necessário
- Use linguagem simples e clara`,

      user: `MENSAGEM INICIAL:
{user_message}

ANÁLISE NLP:
{nlp_analysis}

Ajude a esclarecer o que o paciente realmente precisa.`,

      variables: ['user_message', 'nlp_analysis'],
      description: 'Template para esclarecimento de intenções',
    });

    // Entity extraction template
    this.templates.set('extract_entities', {
      name: 'extract_entities',
      system: `Você é um extrator de informações médicas especializado.

EXTRAIA as seguintes informações da mensagem do paciente:

DADOS PESSOAIS:
- Nome completo
- CPF/RG
- Telefone
- Email

DADOS MÉDICOS:
- Especialidade desejada
- Sintomas descritos
- Médico preferido
- Data/horário preferido
- Convênio médico

DADOS DE CONSULTA EXISTENTE:
- Data da consulta
- Nome do médico
- Horário
- Tipo de consulta

DIRETRIZES:
- Extraia apenas informações explícitas
- Normalize dados quando possível
- Identifique especialidades mesmo com nomes populares
- Retorne formato estruturado`,

      user: `MENSAGEM:
{user_message}

CONTEXTO ANTERIOR:
{previous_context}

Extraia todas as informações relevantes em formato JSON.`,

      variables: ['user_message', 'previous_context'],
      description: 'Template para extração de entidades',
    });
  }

  /**
   * Get template by name
   */
  getTemplate(name: string): PromptTemplate | null {
    return this.templates.get(name) || null;
  }

  /**
   * Get template by intent
   */
  getTemplateByIntent(intent: Intent): PromptTemplate | null {
    const intentTemplateMap: Record<Intent, string> = {
      [Intent.AGENDAR_CONSULTA]: 'schedule_appointment',
      [Intent.REAGENDAR_CONSULTA]: 'reschedule_appointment',
      [Intent.CANCELAR_CONSULTA]: 'cancel_appointment',
      [Intent.EMERGENCIA]: 'emergency_assessment',
      [Intent.INFORMACOES_GERAIS]: 'general_info',
      [Intent.CONSULTAR_AGENDAMENTO]: 'general_info',
      [Intent.UNKNOWN]: 'clarify_intent',
    };

    const templateName = intentTemplateMap[intent];
    return templateName ? this.getTemplate(templateName) : null;
  }

  /**
   * Build prompt from template
   */
  buildPrompt(
    templateName: string,
    variables: PromptVariables,
  ): {
    system: string;
    user: string;
  } | null {
    const template = this.getTemplate(templateName);
    if (!template) {
      return null;
    }

    let systemPrompt = template.system;
    let userPrompt = template.user;

    // Replace variables in system prompt
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      systemPrompt = systemPrompt.replace(
        new RegExp(placeholder, 'g'),
        String(value || ''),
      );
      userPrompt = userPrompt.replace(
        new RegExp(placeholder, 'g'),
        String(value || ''),
      );
    }

    return {
      system: systemPrompt,
      user: userPrompt,
    };
  }

  /**
   * Build prompt for conversation context
   */
  buildContextualPrompt(
    context: ConversationContext,
    userMessage: string,
    additionalVariables: PromptVariables = {},
  ): { system: string; user: string } | null {
    const template = this.getTemplateByIntent(context.currentIntent);
    if (!template) {
      return this.buildPrompt('base_assistant', {
        context: `Intent: ${context.currentIntent}\nMessage: ${userMessage}`,
        ...additionalVariables,
      });
    }

    const variables: PromptVariables = {
      user_message: userMessage,
      conversation_context: this.formatConversationContext(context),
      collected_data: this.formatCollectedData(context),
      missing_info: this.formatMissingInfo(context),
      clinic_name: this.clinicName,
      ...additionalVariables,
    };

    return this.buildPrompt(template.name, variables);
  }

  /**
   * Format conversation context for prompts
   */
  private formatConversationContext(context: ConversationContext): string {
    const lines = [
      `Intent: ${context.currentIntent}`,
      `Step: ${context.currentStep}`,
      `Flow State: ${context.flowState}`,
    ];

    if (context.conversationHistory.length > 0) {
      lines.push('\nRecent Messages:');
      context.conversationHistory.slice(-3).forEach(msg => {
        lines.push(`${msg.role}: ${msg.content.substring(0, 100)}...`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Format collected data for prompts
   */
  private formatCollectedData(context: ConversationContext): string {
    const data = [];

    for (const [key, slot] of Object.entries(context.slotsFilled)) {
      if (slot && slot.confirmed) {
        data.push(`${key}: ${slot.value}`);
      }
    }

    return data.length > 0 ? data.join('\n') : 'Nenhum dado confirmado ainda';
  }

  /**
   * Format missing info for prompts
   */
  private formatMissingInfo(context: ConversationContext): string {
    const missing = [];

    for (const [key, slot] of Object.entries(context.slotsFilled)) {
      if (!slot || !slot.confirmed) {
        missing.push(key);
      }
    }

    return missing.length > 0
      ? missing.join(', ')
      : 'Todas as informações necessárias coletadas';
  }

  /**
   * Get all template names
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Add custom template
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Update clinic information
   */
  updateClinicInfo(clinicName: string): void {
    this.clinicName = clinicName;
    // Reinitialize templates with new clinic name
    this.initializeTemplates();
  }
}

export default PromptTemplateManager;
