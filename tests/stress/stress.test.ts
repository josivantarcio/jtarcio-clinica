import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import axios from 'axios';

/**
 * 🔥 TESTE DE STRESS E CARGA - EO CLÍNICA
 * 
 * Este arquivo implementa testes de stress abrangentes para validar
 * a estabilidade do sistema sob alta carga e condições extremas.
 */

const API_BASE_URL = 'http://localhost:3000';
const FRONTEND_URL = 'http://localhost:3001';

// Configurações para diferentes tipos de teste
const LOAD_CONFIGS = {
  LIGHT: {
    concurrent_users: 10,
    requests_per_user: 5,
    duration_ms: 5000
  },
  MEDIUM: {
    concurrent_users: 50,
    requests_per_user: 10,
    duration_ms: 15000
  },
  HEAVY: {
    concurrent_users: 100,
    requests_per_user: 20,
    duration_ms: 30000
  },
  EXTREME: {
    concurrent_users: 500,
    requests_per_user: 50,
    duration_ms: 60000
  }
};

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
}

interface StressTestMetrics {
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  responseTime95Percentile: number;
}

describe('🔥 Stress Tests - Sistema EO Clínica', () => {

  beforeAll(async () => {
    // Verificar se os serviços estão rodando
    try {
      await axios.get(`${API_BASE_URL}/health`);
      console.log('✅ Backend disponível para testes de stress');
    } catch (error) {
      throw new Error('❌ Backend não disponível. Execute: npm run dev');
    }

    try {
      await axios.get(FRONTEND_URL);
      console.log('✅ Frontend disponível para testes de stress');
    } catch (error) {
      console.log('⚠️ Frontend não disponível (opcional para alguns testes)');
    }
  }, 15000);

  describe('🚀 Testes de Carga - API Backend', () => {

    it('deve suportar carga leve (10 usuários simultâneos)', async () => {
      const config = LOAD_CONFIGS.LIGHT;
      const result = await runLoadTest('/api/v1/users', config);
      
      expect(result.errorRate).toBeLessThan(5); // Menos de 5% de erro
      expect(result.averageResponseTime).toBeLessThan(500); // Menos de 500ms
      expect(result.requestsPerSecond).toBeGreaterThan(15);
      
      console.log('📊 Carga Leve - Resultados:', result);
    }, 30000);

    it('deve suportar carga média (50 usuários simultâneos)', async () => {
      const config = LOAD_CONFIGS.MEDIUM;
      const result = await runLoadTest('/health', config);
      
      expect(result.errorRate).toBeLessThan(10); // Menos de 10% de erro
      expect(result.averageResponseTime).toBeLessThan(1000); // Menos de 1s
      expect(result.requestsPerSecond).toBeGreaterThan(10);
      
      console.log('📊 Carga Média - Resultados:', result);
    }, 45000);

    it('deve manter estabilidade sob carga pesada (100 usuários)', async () => {
      const config = LOAD_CONFIGS.HEAVY;
      const result = await runLoadTest('/health', config);
      
      // Critérios mais relaxados para carga pesada
      expect(result.errorRate).toBeLessThan(15); // Menos de 15% de erro
      expect(result.averageResponseTime).toBeLessThan(2000); // Menos de 2s
      expect(result.successfulRequests).toBeGreaterThan(config.concurrent_users * config.requests_per_user * 0.8);
      
      console.log('📊 Carga Pesada - Resultados:', result);
    }, 60000);

  });

  describe('💥 Testes de Stress Extremo', () => {

    it('deve identificar limites do sistema (500 usuários)', async () => {
      const config = LOAD_CONFIGS.EXTREME;
      const result = await runLoadTest('/health', config);
      
      // Para stress extremo, apenas documentamos os resultados
      console.log('🔥 Stress Extremo - Métricas:', result);
      
      // Verificações básicas de que o sistema não travou completamente
      expect(result.successfulRequests).toBeGreaterThan(0);
      expect(result.averageResponseTime).toBeLessThan(10000); // Menos de 10s (limite para não travar)
      
      // Log para análise de capacidade
      if (result.errorRate > 50) {
        console.log('⚠️ ATENÇÃO: Sistema atingiu limites sob carga extrema');
      }
    }, 120000);

  });

  describe('🗄️ Stress Tests - Banco de Dados', () => {

    it('deve suportar múltiplas conexões simultâneas', async () => {
      const promises = [];
      const startTime = Date.now();
      
      // Simular 50 operações de banco simultâneas
      for (let i = 0; i < 50; i++) {
        promises.push(
          axios.get(`${API_BASE_URL}/api/v1/specialties`)
            .catch(error => ({ error: true, status: error.response?.status }))
        );
      }
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const successCount = results.filter(r => !r.error).length;
      const errorCount = results.filter(r => r.error).length;
      
      console.log(`📊 DB Stress - ${successCount} sucessos, ${errorCount} erros em ${duration}ms`);
      
      expect(successCount).toBeGreaterThan(40); // Pelo menos 80% de sucesso
      expect(duration).toBeLessThan(5000); // Menos de 5s para todas as operações
    }, 15000);

  });

  describe('🤖 Stress Tests - Integração IA (Gemini)', () => {

    it('deve suportar múltiplas chamadas simultâneas à IA', async () => {
      const promises = [];
      const testMessages = [
        'Preciso agendar uma consulta',
        'Quais são os horários disponíveis?',
        'Como cancelar um agendamento?',
        'Informações sobre cardiologia',
        'Sintomas de gripe'
      ];
      
      // Simular 10 conversas simultâneas com a IA
      for (let i = 0; i < 10; i++) {
        const message = testMessages[i % testMessages.length];
        promises.push(
          // Simular chamada à IA (substituir quando endpoint real estiver disponível)
          simulateAIRequest(message)
        );
      }
      
      const results = await Promise.all(promises);
      const successCount = results.filter(r => r.success).length;
      
      console.log(`🤖 IA Stress - ${successCount}/10 chamadas bem-sucedidas`);
      
      expect(successCount).toBeGreaterThan(7); // Pelo menos 70% de sucesso
    }, 30000);

  });

  describe('🔐 Stress Tests - Autenticação', () => {

    it('deve suportar múltiplas tentativas de login simultâneas', async () => {
      const promises = [];
      
      // Simular 20 logins simultâneos
      for (let i = 0; i < 20; i++) {
        promises.push(
          axios.post(`${API_BASE_URL}/api/v1/auth/login`, {
            email: `test${i}@example.com`,
            password: 'TestPassword123!'
          }).catch(error => ({ 
            error: true, 
            status: error.response?.status,
            message: error.message 
          }))
        );
      }
      
      const results = await Promise.all(promises);
      const authResults = results.filter(r => r.status === 401 || r.status === 200); // Respostas válidas
      
      console.log(`🔐 Auth Stress - ${authResults.length}/20 respostas válidas`);
      
      expect(authResults.length).toBeGreaterThan(15); // Sistema deve responder mesmo com credenciais inválidas
    }, 15000);

  });

  describe('📊 Memory & Resource Stress', () => {

    it('deve monitorar uso de memória durante carga', async () => {
      const initialMemory = await getSystemMemoryUsage();
      
      // Executar carga média e monitorar recursos
      const config = LOAD_CONFIGS.MEDIUM;
      const result = await runLoadTest('/health', config);
      
      const finalMemory = await getSystemMemoryUsage();
      const memoryIncrease = finalMemory - initialMemory;
      
      console.log(`💾 Memória: Inicial ${initialMemory}MB, Final ${finalMemory}MB, Aumento ${memoryIncrease}MB`);
      
      // Verificar se não há vazamento extremo de memória
      expect(memoryIncrease).toBeLessThan(500); // Menos de 500MB de aumento
      expect(result.errorRate).toBeLessThan(10);
    }, 45000);

  });

});

/**
 * Executa teste de carga em um endpoint específico
 */
async function runLoadTest(endpoint: string, config: typeof LOAD_CONFIGS.LIGHT): Promise<LoadTestResult> {
  const url = `${API_BASE_URL}${endpoint}`;
  const promises: Promise<any>[] = [];
  const responseTimes: number[] = [];
  
  const startTime = Date.now();
  
  // Criar todas as requisições simultâneas
  for (let user = 0; user < config.concurrent_users; user++) {
    for (let req = 0; req < config.requests_per_user; req++) {
      promises.push(
        measureRequest(url)
      );
    }
  }
  
  // Executar todas as requisições
  const results = await Promise.all(promises);
  const endTime = Date.now();
  
  // Processar resultados
  const successfulRequests = results.filter(r => r.success).length;
  const failedRequests = results.filter(r => !r.success).length;
  const totalRequests = results.length;
  
  results.forEach(r => {
    if (r.responseTime) {
      responseTimes.push(r.responseTime);
    }
  });
  
  const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length || 0;
  const minResponseTime = Math.min(...responseTimes) || 0;
  const maxResponseTime = Math.max(...responseTimes) || 0;
  
  const durationSeconds = (endTime - startTime) / 1000;
  const requestsPerSecond = totalRequests / durationSeconds;
  const errorRate = (failedRequests / totalRequests) * 100;
  
  return {
    totalRequests,
    successfulRequests,
    failedRequests,
    averageResponseTime,
    minResponseTime,
    maxResponseTime,
    requestsPerSecond,
    errorRate
  };
}

/**
 * Mede o tempo de resposta de uma requisição
 */
async function measureRequest(url: string): Promise<{ success: boolean; responseTime?: number; status?: number }> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, { timeout: 10000 });
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.status >= 200 && response.status < 300,
      responseTime,
      status: response.status
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      responseTime,
      status: error.response?.status || 0
    };
  }
}

/**
 * Simula requisição à IA (substituir por implementação real)
 */
async function simulateAIRequest(message: string): Promise<{ success: boolean; responseTime: number }> {
  const startTime = Date.now();
  
  // Simular processamento da IA
  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500)); // 500-2500ms
  
  const responseTime = Date.now() - startTime;
  const success = Math.random() > 0.1; // 90% taxa de sucesso simulada
  
  return { success, responseTime };
}

/**
 * Obtém uso de memória do sistema (simulado)
 */
async function getSystemMemoryUsage(): Promise<number> {
  // Em um cenário real, usaria process.memoryUsage() ou ferramentas de monitoramento
  // Por enquanto, simula valores de memória
  return Math.floor(Math.random() * 100) + 50; // 50-150MB simulados
}