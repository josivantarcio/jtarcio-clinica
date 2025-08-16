import { logger } from '../../config/logger.js';
import ChromaDBClient from './chromadb-client.js';

export interface MedicalSpecialty {
  id: string;
  name: string;
  description: string;
  commonSymptoms: string[];
  commonProcedures: string[];
  duration: number; // typical appointment duration in minutes
  keywords: string[];
  urgencyIndicators: string[];
}

export interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  category: 'appointment' | 'insurance' | 'emergency' | 'general' | 'policy';
  keywords: string[];
}

export interface EmergencyProtocol {
  id: string;
  symptoms: string[];
  urgencyLevel: 'immediate' | 'urgent' | 'semi_urgent';
  response: string;
  actions: string[];
}

export interface ClinicPolicy {
  id: string;
  topic: string;
  policy: string;
  applicableScenarios: string[];
}

export class MedicalKnowledgeBase {
  private chromaClient: ChromaDBClient;
  private specialties: MedicalSpecialty[] = [];
  private faqs: FAQEntry[] = [];
  private emergencyProtocols: EmergencyProtocol[] = [];
  private clinicPolicies: ClinicPolicy[] = [];

  constructor(chromaClient: ChromaDBClient) {
    this.chromaClient = chromaClient;
    this.initializeKnowledge();
  }

  /**
   * Initialize all knowledge data
   */
  private initializeKnowledge(): void {
    this.initializeSpecialties();
    this.initializeFAQs();
    this.initializeEmergencyProtocols();
    this.initializeClinicPolicies();
  }

  /**
   * Initialize medical specialties
   */
  private initializeSpecialties(): void {
    this.specialties = [
      {
        id: 'cardiologia',
        name: 'Cardiologia',
        description:
          'Especialidade médica dedicada ao diagnóstico e tratamento das doenças do coração, dos vasos sanguíneos e do sistema circulatório.',
        commonSymptoms: [
          'dor no peito',
          'palpitações',
          'falta de ar',
          'fadiga',
          'tontura',
          'inchaço nas pernas',
          'pressão alta',
          'arritmia',
        ],
        commonProcedures: [
          'eletrocardiograma',
          'ecocardiograma',
          'teste ergométrico',
          'holter 24h',
          'cateterismo',
          'angioplastia',
        ],
        duration: 45,
        keywords: [
          'coração',
          'cardíaco',
          'cardiologista',
          'pressão',
          'hipertensão',
          'infarto',
          'arritmia',
          'palpitação',
        ],
        urgencyIndicators: [
          'dor no peito intensa',
          'falta de ar severa',
          'desmaio',
          'palpitações muito fortes',
        ],
      },
      {
        id: 'ortopedia',
        name: 'Ortopedia',
        description:
          'Especialidade médica que cuida do sistema músculo-esquelético, incluindo ossos, articulações, músculos, tendões e ligamentos.',
        commonSymptoms: [
          'dor nas costas',
          'dor nas articulações',
          'dor muscular',
          'limitação de movimento',
          'inchaço',
          'rigidez',
        ],
        commonProcedures: [
          'raio-x',
          'ressonância magnética',
          'ultrassom',
          'infiltração',
          'fisioterapia',
          'cirurgia ortopédica',
        ],
        duration: 30,
        keywords: [
          'osso',
          'articulação',
          'músculo',
          'ortopedista',
          'fratura',
          'entorse',
          'artrose',
          'coluna',
          'joelho',
          'ombro',
        ],
        urgencyIndicators: [
          'fratura exposta',
          'luxação',
          'perda total de movimento',
          'dor insuportável',
        ],
      },
      {
        id: 'pediatria',
        name: 'Pediatria',
        description:
          'Especialidade médica dedicada aos cuidados de saúde de bebês, crianças e adolescentes até os 18 anos.',
        commonSymptoms: [
          'febre',
          'tosse',
          'vômito',
          'diarreia',
          'irritabilidade',
          'perda de apetite',
          'erupções cutâneas',
        ],
        commonProcedures: [
          'consultas de rotina',
          'vacinação',
          'avaliação do crescimento',
          'exames preventivos',
          'tratamento de infecções',
        ],
        duration: 30,
        keywords: [
          'criança',
          'bebê',
          'adolescente',
          'pediatra',
          'vacina',
          'crescimento',
          'desenvolvimento',
          'puericultura',
        ],
        urgencyIndicators: [
          'febre muito alta',
          'dificuldade respiratória',
          'convulsão',
          'desidratação severa',
        ],
      },
      {
        id: 'ginecologia',
        name: 'Ginecologia',
        description:
          'Especialidade médica que cuida da saúde do sistema reprodutor feminino.',
        commonSymptoms: [
          'irregularidade menstrual',
          'dor pélvica',
          'corrimento',
          'sangramento anormal',
          'cólicas intensas',
        ],
        commonProcedures: [
          'exame ginecológico',
          'papanicolau',
          'ultrassom pélvico',
          'colposcopia',
          'mamografia',
        ],
        duration: 30,
        keywords: [
          'ginecologista',
          'gineco',
          'menstruação',
          'útero',
          'ovário',
          'gravidez',
          'contraceptivo',
          'menopausa',
        ],
        urgencyIndicators: [
          'sangramento intenso',
          'dor pélvica severa',
          'gravidez ectópica',
        ],
      },
      {
        id: 'dermatologia',
        name: 'Dermatologia',
        description:
          'Especialidade médica que trata das doenças da pele, cabelos, unhas e mucosas.',
        commonSymptoms: [
          'manchas na pele',
          'coceira',
          'descamação',
          'feridas',
          'mudanças em pintas',
          'acne',
          'queda de cabelo',
        ],
        commonProcedures: [
          'dermatoscopia',
          'biópsia',
          'crioterapia',
          'tratamentos estéticos',
          'remoção de lesões',
        ],
        duration: 30,
        keywords: [
          'pele',
          'dermatologista',
          'mancha',
          'pinta',
          'acne',
          'alergia',
          'eczema',
          'psoríase',
        ],
        urgencyIndicators: [
          'lesões que sangram',
          'mudanças rápidas em pintas',
          'reações alérgicas severas',
        ],
      },
      {
        id: 'oftalmologia',
        name: 'Oftalmologia',
        description:
          'Especialidade médica que cuida da saúde dos olhos e do sistema visual.',
        commonSymptoms: [
          'perda de visão',
          'dor nos olhos',
          'visão embaçada',
          'olhos vermelhos',
          'sensibilidade à luz',
          'moscas volantes',
        ],
        commonProcedures: [
          'exame de fundo de olho',
          'medição de pressão ocular',
          'teste de acuidade visual',
          'campo visual',
        ],
        duration: 30,
        keywords: [
          'olho',
          'oftalmologista',
          'visão',
          'óculos',
          'lente',
          'catarata',
          'glaucoma',
          'miopia',
        ],
        urgencyIndicators: [
          'perda súbita de visão',
          'trauma ocular',
          'dor ocular intensa',
        ],
      },
    ];
  }

  /**
   * Initialize FAQs
   */
  private initializeFAQs(): void {
    this.faqs = [
      {
        id: 'appointment_cancellation',
        question: 'Como cancelar uma consulta?',
        answer:
          'Você pode cancelar sua consulta através do nosso chat, pelo telefone ou app. Por favor, cancele com pelo menos 24 horas de antecedência para evitar cobrança.',
        category: 'appointment',
        keywords: ['cancelar', 'desmarcar', 'consulta', '24 horas'],
      },
      {
        id: 'appointment_rescheduling',
        question: 'Posso remarcar minha consulta?',
        answer:
          'Sim! Você pode reagendar através do chat, telefone ou app. Verificaremos a disponibilidade do médico e ofereceremos novas opções de horário.',
        category: 'appointment',
        keywords: ['reagendar', 'remarcar', 'mudar horário', 'disponibilidade'],
      },
      {
        id: 'insurance_coverage',
        question: 'Quais convênios vocês atendem?',
        answer:
          'Trabalhamos com Unimed, Bradesco Saúde, SulAmérica, Amil, Golden Cross e outros. Verifique a cobertura antes da consulta. Também atendemos particular.',
        category: 'insurance',
        keywords: [
          'convênio',
          'plano',
          'unimed',
          'bradesco',
          'sulamerica',
          'amil',
          'particular',
        ],
      },
      {
        id: 'clinic_hours',
        question: 'Qual o horário de funcionamento?',
        answer:
          'Funcionamos de segunda a sexta das 7h às 19h, e sábados das 7h às 12h. Para emergências, temos plantão 24h pelo telefone.',
        category: 'general',
        keywords: [
          'horário',
          'funcionamento',
          'segunda',
          'sexta',
          'sábado',
          'emergência',
          'plantão',
        ],
      },
      {
        id: 'appointment_preparation',
        question: 'Como me preparar para a consulta?',
        answer:
          'Traga um documento com foto, cartão do convênio (se houver), lista de medicamentos atuais, e chegue 15 minutos antes. Jejum só é necessário para exames específicos.',
        category: 'appointment',
        keywords: [
          'preparar',
          'documento',
          'cartão',
          'medicamento',
          'jejum',
          '15 minutos',
        ],
      },
      {
        id: 'emergency_contact',
        question: 'Como proceder em caso de emergência?',
        answer:
          'Para emergências, ligue imediatamente para nosso plantão 24h ou procure o pronto-socorro mais próximo. Em casos graves, chame o SAMU (192).',
        category: 'emergency',
        keywords: [
          'emergência',
          'plantão',
          'pronto-socorro',
          'samu',
          '192',
          'grave',
        ],
      },
      {
        id: 'first_appointment',
        question: 'É minha primeira consulta. O que preciso saber?',
        answer:
          'Para primeira consulta, chegue 30 minutos antes para cadastro. Traga documento, comprovante de endereço, cartão do convênio e liste suas queixas principais.',
        category: 'appointment',
        keywords: [
          'primeira',
          'consulta',
          'cadastro',
          '30 minutos',
          'comprovante',
          'queixas',
        ],
      },
      {
        id: 'prescription_renewal',
        question: 'Posso renovar receita sem consulta?',
        answer:
          'Receitas controladas e alguns medicamentos exigem consulta médica. Para medicamentos de uso contínuo, o médico pode autorizar renovação por um período determinado.',
        category: 'general',
        keywords: [
          'receita',
          'renovar',
          'controlada',
          'medicamento',
          'contínuo',
          'autorizar',
        ],
      },
    ];
  }

  /**
   * Initialize emergency protocols
   */
  private initializeEmergencyProtocols(): void {
    this.emergencyProtocols = [
      {
        id: 'chest_pain',
        symptoms: [
          'dor no peito',
          'dor torácica',
          'aperto no peito',
          'queimação no peito',
          'peso no peito',
        ],
        urgencyLevel: 'immediate',
        response:
          'Dor no peito pode indicar problemas cardíacos graves. Procure atendimento de emergência IMEDIATAMENTE.',
        actions: [
          'Chame o SAMU (192) ou vá ao pronto-socorro',
          'Se possível, mastigue um AAS 100mg',
          'Permaneça calmo e evite esforços',
          'Informe alguém sobre sua condição',
        ],
      },
      {
        id: 'breathing_difficulty',
        symptoms: [
          'falta de ar',
          'dificuldade para respirar',
          'sufocamento',
          'respiração ofegante',
          'chiado no peito',
        ],
        urgencyLevel: 'immediate',
        response:
          'Dificuldade respiratória severa requer atendimento imediato.',
        actions: [
          'Procure pronto-socorro imediatamente',
          'Sente-se em posição confortável',
          'Afrouxe roupas apertadas',
          'Mantenha-se calmo',
        ],
      },
      {
        id: 'high_fever',
        symptoms: [
          'febre alta',
          'temperatura acima de 39°C',
          'febre persistente',
          'calafrios intensos',
        ],
        urgencyLevel: 'urgent',
        response:
          'Febre muito alta, especialmente se persistente, requer avaliação médica urgente.',
        actions: [
          'Procure atendimento médico nas próximas horas',
          'Mantenha-se hidratado',
          'Use roupas leves',
          'Monitore outros sintomas',
        ],
      },
      {
        id: 'severe_injury',
        symptoms: [
          'fratura exposta',
          'sangramento intenso',
          'trauma grave',
          'perda de consciência',
          'convulsão',
        ],
        urgencyLevel: 'immediate',
        response: 'Trauma grave requer atendimento de emergência imediato.',
        actions: [
          'Chame SAMU (192)',
          'Não mova a pessoa se suspeitar de lesão na coluna',
          'Controle sangramento com pressão direta',
          'Mantenha vias aéreas desobstruídas',
        ],
      },
    ];
  }

  /**
   * Initialize clinic policies
   */
  private initializeClinicPolicies(): void {
    this.clinicPolicies = [
      {
        id: 'cancellation_policy',
        topic: 'Política de Cancelamento',
        policy:
          'Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência. Cancelamentos tardios podem gerar cobrança de 50% do valor da consulta.',
        applicableScenarios: ['cancelamento', 'reagendamento', 'falta'],
      },
      {
        id: 'payment_policy',
        topic: 'Política de Pagamento',
        policy:
          'Aceitamos dinheiro, cartão de débito/crédito e PIX. Consultas particulares devem ser pagas no ato. Convênios seguem regras específicas de cada plano.',
        applicableScenarios: ['pagamento', 'particular', 'convênio', 'cartão'],
      },
      {
        id: 'delay_policy',
        topic: 'Política de Atraso',
        policy:
          'Toleramos até 15 minutos de atraso. Após esse período, a consulta poderá ser reagendada conforme disponibilidade.',
        applicableScenarios: ['atraso', 'pontualidade', 'reagendamento'],
      },
      {
        id: 'privacy_policy',
        topic: 'Política de Privacidade',
        policy:
          'Todos os dados dos pacientes são protegidos conforme LGPD. Informações médicas são confidenciais e só compartilhadas com autorização expressa.',
        applicableScenarios: [
          'privacidade',
          'dados',
          'lgpd',
          'confidencialidade',
        ],
      },
    ];
  }

  /**
   * Search for specialty information
   */
  findSpecialty(query: string): MedicalSpecialty | null {
    const lowerQuery = query.toLowerCase();

    return (
      this.specialties.find(
        specialty =>
          specialty.keywords.some(keyword =>
            lowerQuery.includes(keyword.toLowerCase()),
          ) ||
          specialty.name.toLowerCase().includes(lowerQuery) ||
          specialty.commonSymptoms.some(symptom =>
            lowerQuery.includes(symptom.toLowerCase()),
          ),
      ) || null
    );
  }

  /**
   * Find relevant FAQs
   */
  findFAQs(query: string, limit: number = 3): FAQEntry[] {
    const lowerQuery = query.toLowerCase();

    const relevant = this.faqs.filter(
      faq =>
        faq.keywords.some(keyword =>
          lowerQuery.includes(keyword.toLowerCase()),
        ) ||
        faq.question.toLowerCase().includes(lowerQuery) ||
        faq.answer.toLowerCase().includes(lowerQuery),
    );

    return relevant.slice(0, limit);
  }

  /**
   * Check for emergency indicators
   */
  checkEmergency(symptoms: string[]): EmergencyProtocol | null {
    const lowerSymptoms = symptoms.map(s => s.toLowerCase());

    for (const protocol of this.emergencyProtocols) {
      const hasMatchingSymptom = protocol.symptoms.some(protocolSymptom =>
        lowerSymptoms.some(
          userSymptom =>
            userSymptom.includes(protocolSymptom.toLowerCase()) ||
            protocolSymptom.toLowerCase().includes(userSymptom),
        ),
      );

      if (hasMatchingSymptom) {
        return protocol;
      }
    }

    return null;
  }

  /**
   * Get clinic policy
   */
  getPolicy(topic: string): ClinicPolicy | null {
    const lowerTopic = topic.toLowerCase();

    return (
      this.clinicPolicies.find(
        policy =>
          policy.applicableScenarios.some(scenario =>
            lowerTopic.includes(scenario.toLowerCase()),
          ) || policy.topic.toLowerCase().includes(lowerTopic),
      ) || null
    );
  }

  /**
   * Get all specialties
   */
  getAllSpecialties(): MedicalSpecialty[] {
    return [...this.specialties];
  }

  /**
   * Get all FAQs by category
   */
  getFAQsByCategory(category?: string): FAQEntry[] {
    if (!category) {
      return [...this.faqs];
    }

    return this.faqs.filter(faq => faq.category === category);
  }

  /**
   * Get emergency information
   */
  getEmergencyInfo(): string {
    return `
EMERGÊNCIAS MÉDICAS - PROCURE ATENDIMENTO IMEDIATO:

SITUAÇÕES CRÍTICAS (CHAME SAMU - 192):
- Dor no peito intensa
- Dificuldade respiratória severa  
- Perda de consciência
- Sangramento intenso
- Convulsões

NOSSA CLÍNICA:
- Plantão 24h: (xx) xxxx-xxxx
- Endereço: [Endereço da clínica]

[IMPORTANTE] Em casos graves, não hesite em chamar o SAMU (192) ou ir ao pronto-socorro mais próximo.
`;
  }

  /**
   * Load knowledge into ChromaDB
   */
  async loadKnowledgeToChroma(): Promise<void> {
    try {
      const documents = [];

      // Add specialties
      for (const specialty of this.specialties) {
        documents.push({
          id: `specialty_${specialty.id}`,
          content: `${specialty.name}: ${specialty.description}. Sintomas comuns: ${specialty.commonSymptoms.join(', ')}. Procedimentos: ${specialty.commonProcedures.join(', ')}.`,
          metadata: {
            type: 'knowledge' as const,
            specialty: specialty.id,
            source: 'medical_specialty',
          },
        });
      }

      // Add FAQs
      for (const faq of this.faqs) {
        documents.push({
          id: `faq_${faq.id}`,
          content: `Pergunta: ${faq.question}. Resposta: ${faq.answer}`,
          metadata: {
            type: 'faq' as const,
            source: 'clinic_faq',
            category: faq.category,
          },
        });
      }

      // Add emergency protocols
      for (const protocol of this.emergencyProtocols) {
        documents.push({
          id: `emergency_${protocol.id}`,
          content: `Sintomas de emergência: ${protocol.symptoms.join(', ')}. Nível: ${protocol.urgencyLevel}. Resposta: ${protocol.response}. Ações: ${protocol.actions.join(', ')}.`,
          metadata: {
            type: 'knowledge' as const,
            source: 'emergency_protocol',
            urgency: protocol.urgencyLevel,
          },
        });
      }

      // Add policies
      for (const policy of this.clinicPolicies) {
        documents.push({
          id: `policy_${policy.id}`,
          content: `${policy.topic}: ${policy.policy}`,
          metadata: {
            type: 'knowledge' as const,
            source: 'clinic_policy',
            topic: policy.topic,
          },
        });
      }

      logger.info('Loading knowledge base to ChromaDB', {
        documentCount: documents.length,
      });

      // This would be called during initialization to populate ChromaDB
      // The actual loading is handled by ChromaDBClient initialization
    } catch (error) {
      logger.error('Failed to load knowledge to ChromaDB', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export default MedicalKnowledgeBase;
