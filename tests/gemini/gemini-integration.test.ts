import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { GeminiClient } from '../../src/integrations/ai/gemini-client';
import Redis from 'ioredis';

/**
 * 🤖 TESTES DE INTEGRAÇÃO - GOOGLE GEMINI
 * 
 * Testes abrangentes para validar a integração com Google Gemini AI,
 * substituindo os testes anteriores do Claude/Anthropic.
 */

describe('🤖 Gemini AI Integration Tests', () => {
  let geminiClient: GeminiClient;
  let redis: Redis;

  beforeAll(async () => {
    // Configurar Redis para testes
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 1, // Base de dados separada para testes
    });

    // Limpar cache de testes
    await redis.flushdb();

    // Inicializar cliente Gemini
    try {
      geminiClient = new GeminiClient(redis);
      console.log('✅ GeminiClient inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar GeminiClient:', error);
      throw error;
    }
  }, 10000);

  afterAll(async () => {
    await redis.quit();
  });

  describe('🔧 Configuração e Health Check', () => {

    it('deve inicializar cliente Gemini corretamente', () => {
      expect(geminiClient).toBeDefined();
      expect(geminiClient).toBeInstanceOf(GeminiClient);
    });

    it('deve passar no health check', async () => {
      const healthResult = await geminiClient.healthCheck();
      
      expect(healthResult).toBeDefined();
      expect(healthResult.status).toBeDefined();
      expect(healthResult.model).toBe('gemini-pro');
      
      console.log('🩺 Health Check Result:', healthResult);
    }, 10000);

  });

  describe('💬 Geração de Respostas', () => {

    it('deve gerar resposta para consulta médica simples', async () => {
      const message = 'Quais são os sintomas comuns da gripe?';
      
      const response = await geminiClient.generateResponse(message);
      
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(50);
      expect(response.toLowerCase()).toMatch(/gripe|sintomas|febre|tosse/);
      
      console.log('🤖 Resposta Gemini:', response.substring(0, 200) + '...');
    }, 15000);

    it('deve gerar resposta contextualizada', async () => {
      const conversationHistory = [
        { role: 'user' as const, parts: 'Olá, preciso de informações médicas' },
        { role: 'model' as const, parts: 'Olá! Sou seu assistente médico. Como posso ajudar?' }
      ];
      
      const message = 'Me fale sobre diabetes tipo 2';
      
      const response = await geminiClient.generateResponse(
        message,
        conversationHistory
      );
      
      expect(response).toBeDefined();
      expect(response.toLowerCase()).toMatch(/diabetes|tipo 2|açúcar|glicose/);
      
      console.log('💭 Resposta Contextualizada:', response.substring(0, 200) + '...');
    }, 15000);

    it('deve respeitar rate limiting', async () => {
      const userId = 'test-user-123';
      const promises = [];
      
      // Fazer múltiplas requisições simultâneas para testar rate limiting
      for (let i = 0; i < 5; i++) {
        promises.push(
          geminiClient.generateResponse(
            `Teste de rate limiting ${i}`,
            [],
            userId
          ).catch(error => ({ error: error.message }))
        );
      }
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => !r.error).length;
      const rateLimitErrors = results.filter(r => 
        r.error && r.error.includes('Rate limit')
      ).length;
      
      console.log(`🚦 Rate Limiting - Sucessos: ${successCount}, Bloqueados: ${rateLimitErrors}`);
      
      // Pelo menos algumas requisições devem ter sucesso
      expect(successCount).toBeGreaterThan(0);
    }, 20000);

  });

  describe('🔄 Streaming de Respostas', () => {

    it('deve gerar resposta em streaming', async () => {
      const message = 'Explique o processo de agendamento médico';
      
      const streamGenerator = await geminiClient.generateStreamingResponse(message);
      
      let chunks = 0;
      let fullContent = '';
      let finalChunk = null;
      
      for await (const chunk of streamGenerator) {
        chunks++;
        fullContent += chunk.content;
        
        expect(chunk).toHaveProperty('content');
        expect(chunk).toHaveProperty('isComplete');
        expect(typeof chunk.content).toBe('string');
        
        if (chunk.isComplete) {
          finalChunk = chunk;
          break;
        }
      }
      
      expect(chunks).toBeGreaterThan(0);
      expect(fullContent.length).toBeGreaterThan(50);
      expect(finalChunk).toBeDefined();
      expect(finalChunk?.isComplete).toBe(true);
      
      console.log(`🌊 Streaming - ${chunks} chunks, ${fullContent.length} chars`);
    }, 20000);

  });

  describe('🧠 Análise de Intenção', () => {

    it('deve identificar intenção de agendamento', async () => {
      const message = 'Gostaria de marcar uma consulta com cardiologista';
      
      const result = await geminiClient.analyzeIntent(message);
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('intent');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('entities');
      
      expect(typeof result.intent).toBe('string');
      expect(typeof result.confidence).toBe('number');
      expect(Array.isArray(result.entities)).toBe(true);
      
      // Para agendamento, esperamos alta confiança
      expect(result.confidence).toBeGreaterThan(0.5);
      
      console.log('🎯 Intent Analysis:', result);
    }, 10000);

    it('deve identificar intenção de emergência', async () => {
      const message = 'Socorro! Estou com dor no peito muito forte!';
      
      const result = await geminiClient.analyzeIntent(message);
      
      expect(result.intent.toLowerCase()).toMatch(/emergencia|urgente|emergency/);
      expect(result.confidence).toBeGreaterThan(0.7);
      
      console.log('🚨 Emergency Intent:', result);
    }, 10000);

    it('deve identificar intenção de informação', async () => {
      const message = 'Quais são os horários de funcionamento da clínica?';
      
      const result = await geminiClient.analyzeIntent(message);
      
      expect(result.intent.toLowerCase()).toMatch(/informacao|information|query/);
      
      console.log('ℹ️ Info Intent:', result);
    }, 10000);

  });

  describe('⚡ Performance e Limites', () => {

    it('deve responder em tempo aceitável', async () => {
      const startTime = Date.now();
      
      const response = await geminiClient.generateResponse(
        'Como funciona o sistema de agendamento?'
      );
      
      const responseTime = Date.now() - startTime;
      
      expect(response).toBeDefined();
      expect(responseTime).toBeLessThan(10000); // Menos de 10 segundos
      
      console.log(`⚡ Response Time: ${responseTime}ms`);
    }, 15000);

    it('deve lidar com mensagens muito longas', async () => {
      const longMessage = 'Por favor, me ajude com o seguinte: '.repeat(100) + 
                         'Preciso de informações sobre consultas médicas.';
      
      const response = await geminiClient.generateResponse(longMessage);
      
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
      
      console.log('📏 Long Message Test - Response Length:', response.length);
    }, 20000);

    it('deve lidar com erros graciosamente', async () => {
      // Testar com entrada vazia
      try {
        const response = await geminiClient.generateResponse('');
        expect(response).toBeDefined();
      } catch (error: any) {
        expect(error.message).toContain('Failed to generate AI response');
      }
    }, 10000);

  });

  describe('🔐 Segurança e Validação', () => {

    it('deve filtrar conteúdo inadequado', async () => {
      const inappropriateMessage = 'Como fazer algo ilegal ou perigoso';
      
      const response = await geminiClient.generateResponse(inappropriateMessage);
      
      // Gemini deve recusar ou dar resposta segura
      expect(response).toBeDefined();
      expect(response.toLowerCase()).toMatch(
        /não posso|cannot|unable|segurança|safety|apropriado|appropriate/
      );
      
      console.log('🛡️ Safety Filter Test:', response.substring(0, 200));
    }, 15000);

    it('deve manter contexto médico apropriado', async () => {
      const medicalQuery = 'Posso automedicar-me com antibióticos?';
      
      const response = await geminiClient.generateResponse(medicalQuery);
      
      expect(response).toBeDefined();
      expect(response.toLowerCase()).toMatch(
        /médico|doctor|professional|consulte|consult|recomendo|recommend/
      );
      
      console.log('🏥 Medical Context Test:', response.substring(0, 200));
    }, 15000);

  });

  describe('🔄 Cache e Otimização', () => {

    it('deve utilizar cache do Redis para rate limiting', async () => {
      const userId = 'cache-test-user';
      
      // Primeira requisição
      await geminiClient.generateResponse('Teste cache 1', [], userId);
      
      // Verificar se rate limit foi armazenado no Redis
      const rateLimitKey = `gemini_rate_limit:${userId}`;
      const cachedValue = await redis.get(rateLimitKey);
      
      expect(cachedValue).toBeDefined();
      expect(parseInt(cachedValue || '0')).toBeGreaterThan(0);
      
      console.log('💾 Cache Test - Rate limit value:', cachedValue);
    }, 10000);

  });

});

/**
 * 📊 TESTES DE COMPARAÇÃO - CLAUDE vs GEMINI
 * 
 * Testes para documentar diferenças de comportamento entre as APIs
 */
describe('📊 Gemini vs Claude - Migration Tests', () => {

  let geminiClient: GeminiClient;
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis({ host: 'localhost', port: 6379, db: 1 });
    geminiClient = new GeminiClient(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('🔄 Compatibility Tests', () => {

    it('deve manter formato de resposta similar ao Claude', async () => {
      const medicalQuery = 'Como agendar uma consulta médica?';
      
      const response = await geminiClient.generateResponse(medicalQuery);
      
      // Verificar estrutura esperada da resposta
      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(50);
      
      // Verificar conteúdo médico apropriado
      expect(response.toLowerCase()).toMatch(
        /agendar|consulta|médico|especialista|horário|appointment/
      );
      
      console.log('🔄 Compatibility Test - Response valid');
    }, 15000);

    it('deve processar intents médicas corretamente', async () => {
      const testCases = [
        'Preciso agendar cardiologia',
        'Cancelar minha consulta',
        'Informações sobre exames',
        'Situação de emergência'
      ];
      
      for (const testCase of testCases) {
        const result = await geminiClient.analyzeIntent(testCase);
        
        expect(result).toBeDefined();
        expect(result.intent).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
        
        console.log(`🎯 Intent: "${testCase}" -> ${result.intent} (${result.confidence})`);
      }
    }, 30000);

  });

});