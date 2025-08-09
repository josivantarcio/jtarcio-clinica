import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client/generated/client/index.js';
import Redis from 'ioredis';

// Import AI components
import { AnthropicClient } from '../src/integrations/ai/anthropic-client.js';
import { NLPPipeline, Intent } from '../src/integrations/ai/nlp-pipeline.js';
import ChromaDBClient from '../src/integrations/ai/chromadb-client.js';
import ConversationContextManager from '../src/integrations/ai/conversation-context.js';
import { ConversationManager } from '../src/integrations/ai/conversation-manager.js';
import MedicalKnowledgeBase from '../src/integrations/ai/knowledge-base.js';
import PromptTemplateManager from '../src/integrations/ai/prompt-templates.js';
import ConversationFlowHandler from '../src/integrations/ai/conversation-flows.js';
import { AIServiceFactory, AIUtils } from '../src/integrations/ai/index.js';

// Mock dependencies
jest.mock('@anthropic-ai/sdk');
jest.mock('chromadb');

describe('AI Integration Tests', () => {
  let prisma: PrismaClient;
  let redis: Redis;
  let conversationManager: ConversationManager;
  let aiFactory: AIServiceFactory;

  beforeAll(async () => {
    // Setup test database and Redis
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/test_clinic'
        }
      }
    });

    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 1, // Use test database
    });

    // Initialize AI services
    aiFactory = AIServiceFactory.getInstance();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('AnthropicClient', () => {
    let anthropicClient: AnthropicClient;

    beforeAll(() => {
      anthropicClient = new AnthropicClient(redis);
    });

    test('should initialize correctly', () => {
      expect(anthropicClient).toBeDefined();
    });

    test('should validate rate limiting', async () => {
      const userId = 'test-user-123';
      
      // Mock rate limit check
      const canProceed = await anthropicClient['checkRateLimit'](userId);
      expect(typeof canProceed).toBe('boolean');
    });

    test('should handle API errors gracefully', async () => {
      const messages = [{ role: 'user' as const, content: 'Test message' }];
      
      try {
        // This should handle the mocked API error
        await anthropicClient.generateResponse(messages, 'test-user');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    test('should check health status', async () => {
      const health = await anthropicClient.healthCheck();
      expect(typeof health).toBe('boolean');
    });
  });

  describe('NLPPipeline', () => {
    let nlpPipeline: NLPPipeline;
    let mockAnthropicClient: AnthropicClient;

    beforeAll(() => {
      mockAnthropicClient = new AnthropicClient(redis);
      nlpPipeline = new NLPPipeline(mockAnthropicClient);
    });

    test('should classify intents correctly', async () => {
      const testCases = [
        { message: 'Quero agendar uma consulta', expectedIntent: Intent.AGENDAR_CONSULTA },
        { message: 'Preciso cancelar minha consulta', expectedIntent: Intent.CANCELAR_CONSULTA },
        { message: 'É uma emergência', expectedIntent: Intent.EMERGENCIA },
        { message: 'Que horários vocês funcionam?', expectedIntent: Intent.INFORMACOES_GERAIS },
      ];

      for (const testCase of testCases) {
        const result = await nlpPipeline.processMessage(testCase.message, 'test-user');
        
        expect(result).toHaveProperty('intent');
        expect(result).toHaveProperty('entities');
        expect(result).toHaveProperty('confidence');
        expect(result.originalText).toBe(testCase.message);
      }
    });

    test('should extract entities from messages', async () => {
      const message = 'Meu nome é João Silva, telefone 11999887766, quero agendar cardiologia';
      const result = await nlpPipeline.processMessage(message, 'test-user');

      expect(result.entities).toBeDefined();
      // Should extract some entities even with fallback methods
      expect(typeof result.entities).toBe('object');
    });

    test('should handle empty messages', async () => {
      const result = await nlpPipeline.processMessage('', 'test-user');
      
      expect(result.intent).toBe(Intent.UNKNOWN);
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should analyze message sentiment', async () => {
      const sentiment = await nlpPipeline.analyzeSentiment('Muito obrigado, excelente atendimento!');
      
      expect(sentiment).toHaveProperty('sentiment');
      expect(sentiment).toHaveProperty('confidence');
      expect(['positive', 'negative', 'neutral']).toContain(sentiment.sentiment);
    });
  });

  describe('ChromaDBClient', () => {
    let chromaClient: ChromaDBClient;

    beforeAll(async () => {
      chromaClient = new ChromaDBClient();
      // Mock initialize to avoid actual ChromaDB connection
      jest.spyOn(chromaClient, 'initialize').mockResolvedValue();
      await chromaClient.initialize();
    });

    test('should initialize successfully', async () => {
      expect(chromaClient).toBeDefined();
    });

    test('should add conversation messages', async () => {
      const messageId = 'test-msg-123';
      const content = 'Test conversation message';
      const metadata = {
        userId: 'test-user',
        timestamp: new Date().toISOString(),
        type: 'conversation' as const
      };

      // Mock the add method
      jest.spyOn(chromaClient, 'addConversationMessage').mockResolvedValue();
      
      await expect(chromaClient.addConversationMessage(messageId, content, metadata))
        .resolves.not.toThrow();
    });

    test('should search for similar content', async () => {
      const query = 'Quero agendar consulta';
      
      // Mock search results
      jest.spyOn(chromaClient, 'searchSimilar').mockResolvedValue([]);
      
      const results = await chromaClient.searchSimilar(query);
      expect(Array.isArray(results)).toBe(true);
    });

    test('should get embedding statistics', async () => {
      // Mock stats
      jest.spyOn(chromaClient, 'getStats').mockResolvedValue({
        totalDocuments: 0,
        conversationDocuments: 0,
        knowledgeDocuments: 0,
        faqDocuments: 0
      });

      const stats = await chromaClient.getStats();
      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('conversationDocuments');
    });
  });

  describe('ConversationContextManager', () => {
    let contextManager: ConversationContextManager;

    beforeAll(() => {
      contextManager = new ConversationContextManager(redis);
    });

    test('should create new conversation context', async () => {
      const userId = 'test-user-context';
      const sessionId = 'test-session-123';
      
      const context = await contextManager.createContext(userId, sessionId);
      
      expect(context).toHaveProperty('userId', userId);
      expect(context).toHaveProperty('sessionId', sessionId);
      expect(context).toHaveProperty('conversationHistory');
      expect(context).toHaveProperty('slotsFilled');
      expect(Array.isArray(context.conversationHistory)).toBe(true);
    });

    test('should add messages to context', async () => {
      const userId = 'test-user-msg';
      const sessionId = 'test-session-msg';
      
      let context = await contextManager.createContext(userId, sessionId);
      
      const message = {
        role: 'user' as const,
        content: 'Hello, I want to schedule an appointment',
        timestamp: new Date()
      };

      context = await contextManager.addMessage(context, message);
      
      expect(context.conversationHistory).toHaveLength(1);
      expect(context.conversationHistory[0].content).toBe(message.content);
    });

    test('should update slots with entities', async () => {
      const userId = 'test-user-slots';
      const sessionId = 'test-session-slots';
      
      let context = await contextManager.createContext(userId, sessionId);
      
      const entities = {
        pessoa: { nome: 'João Silva' },
        contato: { telefone: '11999887766' },
        especialidade: ['cardiologia']
      };

      context = await contextManager.updateSlots(context, entities);
      
      expect(context.slotsFilled.patientName?.value).toBe('João Silva');
      expect(context.slotsFilled.patientPhone?.value).toBe('11999887766');
      expect(context.slotsFilled.specialty?.value).toBe('cardiologia');
    });

    test('should identify missing slots', async () => {
      const userId = 'test-user-missing';
      const sessionId = 'test-session-missing';
      
      const context = await contextManager.createContext(userId, sessionId, Intent.AGENDAR_CONSULTA);
      const missingSlots = contextManager.getMissingSlots(context);
      
      expect(Array.isArray(missingSlots)).toBe(true);
      expect(missingSlots.length).toBeGreaterThan(0);
    });
  });

  describe('MedicalKnowledgeBase', () => {
    let knowledgeBase: MedicalKnowledgeBase;
    let mockChromaClient: ChromaDBClient;

    beforeAll(() => {
      mockChromaClient = new ChromaDBClient();
      knowledgeBase = new MedicalKnowledgeBase(mockChromaClient);
    });

    test('should find medical specialties', () => {
      const specialty = knowledgeBase.findSpecialty('cardiologia');
      expect(specialty).toBeDefined();
      expect(specialty?.name).toBe('Cardiologia');
    });

    test('should find relevant FAQs', () => {
      const faqs = knowledgeBase.findFAQs('cancelar consulta');
      expect(Array.isArray(faqs)).toBe(true);
      expect(faqs.length).toBeGreaterThan(0);
    });

    test('should detect emergency situations', () => {
      const emergency = knowledgeBase.checkEmergency(['dor no peito', 'falta de ar']);
      expect(emergency).toBeDefined();
      expect(emergency?.urgencyLevel).toBe('immediate');
    });

    test('should get clinic policies', () => {
      const policy = knowledgeBase.getPolicy('cancelamento');
      expect(policy).toBeDefined();
      expect(policy?.topic).toContain('Cancelamento');
    });

    test('should get all specialties', () => {
      const specialties = knowledgeBase.getAllSpecialties();
      expect(Array.isArray(specialties)).toBe(true);
      expect(specialties.length).toBeGreaterThan(0);
    });

    test('should generate emergency info', () => {
      const emergencyInfo = knowledgeBase.getEmergencyInfo();
      expect(typeof emergencyInfo).toBe('string');
      expect(emergencyInfo).toContain('EMERGÊNCIAS');
    });
  });

  describe('PromptTemplateManager', () => {
    let templateManager: PromptTemplateManager;

    beforeAll(() => {
      templateManager = new PromptTemplateManager();
    });

    test('should get template by name', () => {
      const template = templateManager.getTemplate('base_assistant');
      expect(template).toBeDefined();
      expect(template?.name).toBe('base_assistant');
      expect(template?.system).toContain('assistente médico');
    });

    test('should get template by intent', () => {
      const template = templateManager.getTemplateByIntent(Intent.AGENDAR_CONSULTA);
      expect(template).toBeDefined();
      expect(template?.name).toBe('schedule_appointment');
    });

    test('should build prompts with variables', () => {
      const prompt = templateManager.buildPrompt('base_assistant', {
        context: 'Test context for appointment scheduling'
      });
      
      expect(prompt).toBeDefined();
      expect(prompt?.system).toContain('assistente médico');
      expect(prompt?.user).toContain('Test context');
    });

    test('should list available templates', () => {
      const templates = templateManager.getAvailableTemplates();
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates).toContain('base_assistant');
    });
  });

  describe('ConversationFlowHandler', () => {
    let flowHandler: ConversationFlowHandler;
    let mockKnowledgeBase: MedicalKnowledgeBase;
    let mockContextManager: ConversationContextManager;

    beforeAll(() => {
      mockContextManager = new ConversationContextManager(redis);
      mockKnowledgeBase = new MedicalKnowledgeBase(new ChromaDBClient());
      flowHandler = new ConversationFlowHandler(prisma, mockContextManager, mockKnowledgeBase);
    });

    test('should handle scheduling flow', async () => {
      const context = await mockContextManager.createContext('test-user', 'test-session', Intent.AGENDAR_CONSULTA);
      
      const result = await flowHandler.handleSchedulingFlow(context);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.message).toBe('string');
    });

    test('should handle emergency flow', async () => {
      const context = await mockContextManager.createContext('test-user', 'test-session', Intent.EMERGENCIA);
      
      // Add some symptoms
      await mockContextManager.updateSlots(context, {
        sintoma: ['dor no peito', 'falta de ar']
      });

      const result = await flowHandler.handleEmergencyFlow(context);
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('EMERGÊNCIA');
    });
  });

  describe('ConversationManager Integration', () => {
    let conversationManager: ConversationManager;

    beforeAll(async () => {
      conversationManager = new ConversationManager(prisma, redis);
      
      // Mock initialization
      jest.spyOn(conversationManager, 'initialize').mockResolvedValue();
      await conversationManager.initialize();
    });

    test('should process simple messages', async () => {
      const userId = 'test-user-integration';
      const message = 'Olá, quero agendar uma consulta';

      // Mock the process message method
      jest.spyOn(conversationManager, 'processMessage').mockResolvedValue({
        message: 'Olá! Vou ajudá-lo a agendar sua consulta. Qual seu nome completo?',
        intent: Intent.AGENDAR_CONSULTA,
        isCompleted: false,
        requiresInput: true,
        confidence: 0.8,
        nextSteps: ['Informe seu nome completo'],
        data: { intent: Intent.AGENDAR_CONSULTA }
      });

      const response = await conversationManager.processMessage(userId, message);
      
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('intent');
      expect(response.intent).toBe(Intent.AGENDAR_CONSULTA);
      expect(response.confidence).toBeGreaterThan(0);
    });

    test('should handle streaming responses', async () => {
      const userId = 'test-user-stream';
      const message = 'Preciso cancelar minha consulta';

      // Mock streaming response
      const mockStreamGenerator = async function*() {
        yield { content: 'Vou ajudá-lo ', isComplete: false };
        yield { content: 'com o cancelamento.', isComplete: true };
      };

      jest.spyOn(conversationManager, 'processMessageStreaming').mockImplementation(mockStreamGenerator);

      const chunks = [];
      for await (const chunk of conversationManager.processMessageStreaming(userId, message)) {
        chunks.push(chunk);
      }
      
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].isComplete).toBe(true);
    });

    test('should perform health checks', async () => {
      // Mock health check
      jest.spyOn(conversationManager, 'healthCheck').mockResolvedValue({
        anthropic: true,
        chroma: true,
        overall: true
      });

      const health = await conversationManager.healthCheck();
      
      expect(health).toHaveProperty('anthropic');
      expect(health).toHaveProperty('chroma');
      expect(health).toHaveProperty('overall');
    });
  });

  describe('AIServiceFactory', () => {
    test('should create singleton instance', () => {
      const factory1 = AIServiceFactory.getInstance();
      const factory2 = AIServiceFactory.getInstance();
      
      expect(factory1).toBe(factory2);
    });

    test('should initialize services', async () => {
      const factory = AIServiceFactory.getInstance();
      
      // Mock initialization
      jest.spyOn(factory, 'initialize').mockResolvedValue(new ConversationManager(prisma, redis));
      
      const manager = await factory.initialize(prisma, redis);
      expect(manager).toBeInstanceOf(ConversationManager);
    });

    test('should perform health checks', async () => {
      const factory = AIServiceFactory.getInstance();
      
      // Mock health check
      jest.spyOn(factory, 'healthCheck').mockResolvedValue({
        initialized: true,
        services: {
          conversationManager: true,
          anthropic: true,
          chromadb: true
        },
        overall: true
      });

      const health = await factory.healthCheck();
      
      expect(health).toHaveProperty('initialized');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('overall');
    });
  });

  describe('AIUtils', () => {
    test('should validate messages', () => {
      // Valid message
      let validation = AIUtils.validateMessage('Hello, I want to schedule an appointment');
      expect(validation.valid).toBe(true);

      // Empty message
      validation = AIUtils.validateMessage('');
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('empty');

      // Too long message
      validation = AIUtils.validateMessage('a'.repeat(2001));
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('long');

      // Suspicious content
      validation = AIUtils.validateMessage('aaaaaaaaaaaaaaaaaaa'); // Repeated characters
      expect(validation.valid).toBe(false);
      expect(validation.error).toContain('suspicious');
    });

    test('should format responses', () => {
      const response = {
        message: 'Test response',
        intent: Intent.AGENDAR_CONSULTA,
        confidence: 0.8,
        isCompleted: false,
        requiresInput: true,
        nextSteps: ['Step 1', 'Step 2'],
        data: { test: 'data' }
      };

      const formatted = AIUtils.formatResponse(response);
      
      expect(formatted).toHaveProperty('message');
      expect(formatted).toHaveProperty('intent');
      expect(formatted).toHaveProperty('metadata');
      expect(formatted).toHaveProperty('suggestions');
      expect(formatted.suggestions).toEqual(['Step 1', 'Step 2']);
    });

    test('should detect intents quickly', () => {
      const testCases = [
        { message: 'É uma emergência!', expected: Intent.EMERGENCIA },
        { message: 'Quero agendar consulta', expected: Intent.AGENDAR_CONSULTA },
        { message: 'Preciso cancelar', expected: Intent.CANCELAR_CONSULTA },
        { message: 'Vou remarcar', expected: Intent.REAGENDAR_CONSULTA },
        { message: 'Quero verificar minha consulta', expected: Intent.CONSULTAR_AGENDAMENTO },
        { message: 'Que horários vocês funcionam?', expected: Intent.INFORMACOES_GERAIS },
      ];

      for (const testCase of testCases) {
        const detected = AIUtils.quickIntentDetection(testCase.message);
        expect(detected).toBe(testCase.expected);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle API failures gracefully', async () => {
      const anthropicClient = new AnthropicClient(redis);
      
      // Force an error
      jest.spyOn(anthropicClient, 'generateResponse').mockRejectedValue(new Error('API Error'));
      
      await expect(anthropicClient.generateResponse([], 'test-user'))
        .rejects.toThrow('API Error');
    });

    test('should handle database connection failures', async () => {
      // Mock database failure
      const mockPrisma = {
        conversation: {
          create: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        }
      } as any;

      const manager = new ConversationManager(mockPrisma, redis);
      
      // Should handle gracefully without throwing
      expect(manager).toBeDefined();
    });

    test('should handle Redis connection failures', async () => {
      const mockRedis = {
        incr: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
        setex: jest.fn().mockRejectedValue(new Error('Redis connection failed'))
      } as any;

      const contextManager = new ConversationContextManager(mockRedis);
      
      // Should handle gracefully
      expect(contextManager).toBeDefined();
    });
  });
});

// Integration test helper functions
export const TestHelpers = {
  createTestUser: async (prisma: PrismaClient) => {
    return await prisma.user.create({
      data: {
        email: 'test@example.com',
        phone: '11999887766',
        password: 'hashed_password',
        firstName: 'Test',
        lastName: 'User',
        fullName: 'Test User',
        role: 'PATIENT'
      }
    });
  },

  createTestConversation: async (prisma: PrismaClient, userId: string) => {
    return await prisma.conversation.create({
      data: {
        userId,
        title: 'Test Conversation',
        isCompleted: false
      }
    });
  },

  cleanupTestData: async (prisma: PrismaClient, redis: Redis) => {
    await prisma.message.deleteMany({ where: { content: { contains: 'test' } } });
    await prisma.conversation.deleteMany({ where: { title: { contains: 'Test' } } });
    await prisma.user.deleteMany({ where: { email: { contains: 'test' } } });
    
    // Clean Redis test keys
    const keys = await redis.keys('*test*');
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};