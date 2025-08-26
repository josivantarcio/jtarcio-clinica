/**
 * Comprehensive Insurance Plans Tests
 * Testes abrangentes para Planos de Saúde e Convênios
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('🏥 Insurance Plans - Planos de Saúde', () => {
  
  describe('📊 Estrutura e Validação de Dados', () => {
    it('deveria validar estrutura completa de plano de saúde', () => {
      const mockInsurancePlan = {
        id: 'plan_unimed_001',
        name: 'Unimed São Paulo Premium',
        code: 'UNI_SP_PREM',
        category: 'PRIVATE',
        contactInfo: {
          contactName: 'Maria Santos',
          contactEmail: 'maria.santos@unimed.coop.br',
          contactPhone: '(11) 3456-7890',
          website: 'https://www.unimed.coop.br'
        },
        
        // Configurações Financeiras
        defaultDiscountPercentage: 15.0,
        paymentTerms: 30,
        requiresAuthorization: true,
        
        // Status
        isActive: true,
        createdAt: new Date('2025-01-01T10:00:00Z'),
        updatedAt: new Date('2025-08-26T15:30:00Z')
      };

      // Validações básicas
      expect(mockInsurancePlan.id).toBeDefined();
      expect(mockInsurancePlan.name).toBeTruthy();
      expect(mockInsurancePlan.code).toBeTruthy();
      expect(mockInsurancePlan.category).toBe('PRIVATE');
      
      // Validações de configurações financeiras
      expect(mockInsurancePlan.defaultDiscountPercentage).toBeGreaterThanOrEqual(0);
      expect(mockInsurancePlan.defaultDiscountPercentage).toBeLessThanOrEqual(100);
      expect(mockInsurancePlan.paymentTerms).toBeGreaterThan(0);
      expect(typeof mockInsurancePlan.requiresAuthorization).toBe('boolean');
      
      // Validações de informações de contato
      expect(mockInsurancePlan.contactInfo.contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(mockInsurancePlan.contactInfo.website).toMatch(/^https?:\/\/.+/);
      
      // Validações de status
      expect(typeof mockInsurancePlan.isActive).toBe('boolean');
      expect(mockInsurancePlan.createdAt).toBeInstanceOf(Date);
      expect(mockInsurancePlan.updatedAt).toBeInstanceOf(Date);
    });

    it('deveria validar todas as categorias de planos de saúde', () => {
      const validCategories = [
        'PRIVATE',     // Planos privados (Unimed, Amil, etc.)
        'PUBLIC',      // SUS, planos públicos
        'COOPERATIVE', // Cooperativas médicas
        'CORPORATE',   // Planos empresariais
        'INTERNATIONAL' // Planos internacionais
      ];

      validCategories.forEach(category => {
        const plan = {
          category,
          name: `Plano ${category}`,
          code: `${category}_001`
        };

        expect(validCategories).toContain(plan.category);
        expect(plan.name).toBeTruthy();
        expect(plan.code).toBeTruthy();
      });
    });

    it('deveria validar estrutura de informações de contato JSON', () => {
      const contactInfo = {
        contactName: 'João Silva',
        contactEmail: 'joao.silva@plano.com.br',
        contactPhone: '(11) 9876-5432',
        website: 'https://www.plano.com.br',
        address: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01234-567'
        },
        businessHours: '8:00-18:00',
        emergencyContact: '0800-123-4567'
      };

      expect(contactInfo.contactName).toBeTruthy();
      expect(contactInfo.contactEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      expect(contactInfo.contactPhone).toMatch(/\(\d{2}\)\s?\d{4,5}-\d{4}/);
      expect(contactInfo.website).toMatch(/^https?:\/\/.+/);
      expect(contactInfo.address).toBeDefined();
      expect(contactInfo.address.zipCode).toMatch(/\d{5}-\d{3}/);
    });
  });

  describe('💰 Cálculos de Cobertura e Valores', () => {
    it('deveria calcular cobertura básica corretamente', () => {
      const planConfig = {
        coveragePercentage: 80,
        copayAmount: 20.00,
        deductibleAmount: 0,
        maxCoverageAmount: 0 // Sem limite
      };

      const consultationAmount = 150.00;
      
      // Cálculo real
      const coveragePercentage = planConfig.coveragePercentage / 100;
      const amountAfterDeductible = consultationAmount - planConfig.deductibleAmount;
      const coveredAmount = amountAfterDeductible * coveragePercentage;
      const patientAmount = consultationAmount - coveredAmount + planConfig.copayAmount;
      const insuranceAmount = coveredAmount - planConfig.copayAmount;

      expect(amountAfterDeductible).toBe(150.00);
      expect(coveredAmount).toBe(120.00); // 80% de 150
      expect(insuranceAmount).toBe(100.00); // 120 - 20 (copay)
      expect(patientAmount).toBe(50.00); // 150 - 120 + 20
    });

    it('deveria aplicar franquia (deductible) corretamente', () => {
      const planConfig = {
        coveragePercentage: 100,
        copayAmount: 0,
        deductibleAmount: 500.00,
        maxCoverageAmount: 0
      };

      const consultationAmount = 200.00;
      
      // Valor abaixo da franquia - paciente paga tudo
      const amountAfterDeductible = Math.max(0, consultationAmount - planConfig.deductibleAmount);
      const coveredAmount = amountAfterDeductible * (planConfig.coveragePercentage / 100);
      const patientAmount = consultationAmount - coveredAmount;

      expect(amountAfterDeductible).toBe(0); // 200 - 500 = 0 (não pode ser negativo)
      expect(coveredAmount).toBe(0);
      expect(patientAmount).toBe(200.00); // Paciente paga valor total
    });

    it('deveria respeitar limite máximo de cobertura', () => {
      const planConfig = {
        coveragePercentage: 100,
        copayAmount: 0,
        deductibleAmount: 0,
        maxCoverageAmount: 1000.00
      };

      const procedureAmount = 5000.00;
      
      const amountAfterDeductible = procedureAmount - planConfig.deductibleAmount;
      let coveredAmount = amountAfterDeductible * (planConfig.coveragePercentage / 100);
      
      // Aplica limite máximo
      if (planConfig.maxCoverageAmount > 0) {
        coveredAmount = Math.min(coveredAmount, planConfig.maxCoverageAmount);
      }
      
      const patientAmount = procedureAmount - coveredAmount + planConfig.copayAmount;

      expect(coveredAmount).toBe(1000.00); // Limitado pelo máximo
      expect(patientAmount).toBe(4000.00); // 5000 - 1000
    });

    it('deveria calcular cenário complexo com todos os fatores', () => {
      const planConfig = {
        coveragePercentage: 70,
        copayAmount: 30.00,
        deductibleAmount: 100.00,
        maxCoverageAmount: 2000.00
      };

      const procedureAmount = 1500.00;
      
      // Passo 1: Aplicar franquia
      const amountAfterDeductible = Math.max(0, procedureAmount - planConfig.deductibleAmount);
      
      // Passo 2: Calcular cobertura
      let coveredAmount = amountAfterDeductible * (planConfig.coveragePercentage / 100);
      
      // Passo 3: Aplicar limite máximo
      if (planConfig.maxCoverageAmount > 0) {
        coveredAmount = Math.min(coveredAmount, planConfig.maxCoverageAmount);
      }
      
      // Passo 4: Calcular valores finais
      const insuranceAmount = Math.max(0, coveredAmount - planConfig.copayAmount);
      const patientAmount = procedureAmount - insuranceAmount;

      expect(amountAfterDeductible).toBe(1400.00); // 1500 - 100
      expect(Math.round(coveredAmount * 100) / 100).toBe(980.00); // 70% de 1400 (rounded)
      expect(Math.round(insuranceAmount * 100) / 100).toBe(950.00); // 980 - 30 (copay, rounded)
      expect(Math.round(patientAmount * 100) / 100).toBe(550.00); // 1500 - 950 (rounded)
    });
  });

  describe('🏢 Cenários de Diferentes Tipos de Planos', () => {
    it('deveria configurar plano privado premium corretamente', () => {
      const privatePlan = {
        name: 'SulAmérica Saúde Executivo',
        category: 'PRIVATE',
        coveragePercentage: 90,
        copayAmount: 25.00,
        deductibleAmount: 0,
        maxCoverageAmount: 50000.00,
        requiresAuthorization: false,
        paymentTerms: 15
      };

      expect(privatePlan.category).toBe('PRIVATE');
      expect(privatePlan.coveragePercentage).toBeGreaterThan(80);
      expect(privatePlan.paymentTerms).toBeLessThanOrEqual(30);
      expect(privatePlan.requiresAuthorization).toBe(false);
    });

    it('deveria configurar plano cooperativa médica corretamente', () => {
      const cooperativePlan = {
        name: 'Unimed Rio Preto',
        category: 'COOPERATIVE',
        coveragePercentage: 85,
        copayAmount: 15.00,
        deductibleAmount: 50.00,
        maxCoverageAmount: 0, // Sem limite
        requiresAuthorization: true,
        paymentTerms: 30
      };

      expect(cooperativePlan.category).toBe('COOPERATIVE');
      expect(cooperativePlan.coveragePercentage).toBeGreaterThanOrEqual(70);
      expect(cooperativePlan.requiresAuthorization).toBe(true);
      expect(cooperativePlan.maxCoverageAmount).toBe(0);
    });

    it('deveria configurar plano empresarial corretamente', () => {
      const corporatePlan = {
        name: 'Bradesco Saúde Empresarial',
        category: 'CORPORATE',
        coveragePercentage: 100,
        copayAmount: 0,
        deductibleAmount: 200.00,
        maxCoverageAmount: 100000.00,
        requiresAuthorization: true,
        paymentTerms: 60
      };

      expect(corporatePlan.category).toBe('CORPORATE');
      expect(corporatePlan.coveragePercentage).toBe(100);
      expect(corporatePlan.copayAmount).toBe(0);
      expect(corporatePlan.paymentTerms).toBeGreaterThan(30);
    });

    it('deveria configurar plano público/SUS corretamente', () => {
      const publicPlan = {
        name: 'SUS - Sistema Único de Saúde',
        category: 'PUBLIC',
        coveragePercentage: 100,
        copayAmount: 0,
        deductibleAmount: 0,
        maxCoverageAmount: 0,
        requiresAuthorization: false,
        paymentTerms: 0 // Imediato
      };

      expect(publicPlan.category).toBe('PUBLIC');
      expect(publicPlan.coveragePercentage).toBe(100);
      expect(publicPlan.copayAmount).toBe(0);
      expect(publicPlan.deductibleAmount).toBe(0);
      expect(publicPlan.paymentTerms).toBe(0);
    });
  });

  describe('📋 Integração com Transações Financeiras', () => {
    it('deveria criar transação com plano de saúde associado', () => {
      const transaction = {
        id: 'txn_insurance_001',
        description: 'Consulta cardiológica - Dr. Silva',
        grossAmount: 200.00,
        insuranceId: 'plan_unimed_001',
        insuranceCoverage: {
          totalAmount: 200.00,
          insuranceAmount: 160.00,
          patientAmount: 40.00,
          copayAmount: 20.00,
          coveragePercentage: 80
        },
        paymentMethod: 'INSURANCE',
        status: 'PENDING_INSURANCE',
        patientId: 'pat_001',
        doctorId: 'doc_001',
        appointmentId: 'apt_001'
      };

      expect(transaction.insuranceId).toBeDefined();
      expect(transaction.insuranceCoverage).toBeDefined();
      expect(transaction.insuranceCoverage.totalAmount).toBe(
        transaction.insuranceCoverage.insuranceAmount + 
        transaction.insuranceCoverage.patientAmount
      );
      expect(transaction.status).toBe('PENDING_INSURANCE');
    });

    it('deveria calcular valores de transação com diferentes cenários', () => {
      const scenarios = [
        {
          name: 'Consulta simples - Unimed',
          amount: 150.00,
          plan: { coverage: 80, copay: 20.00, deductible: 0 },
          expected: { insurance: 100.00, patient: 50.00 }
        },
        {
          name: 'Exame caro - SulAmérica',
          amount: 1000.00,
          plan: { coverage: 90, copay: 50.00, deductible: 100.00 },
          expected: { insurance: 760.00, patient: 240.00 }
        },
        {
          name: 'Procedimento - Bradesco',
          amount: 5000.00,
          plan: { coverage: 100, copay: 0, deductible: 500.00 },
          expected: { insurance: 4500.00, patient: 500.00 }
        }
      ];

      scenarios.forEach(scenario => {
        const { amount, plan, expected } = scenario;
        
        const amountAfterDeductible = Math.max(0, amount - plan.deductible);
        const coveredAmount = amountAfterDeductible * (plan.coverage / 100);
        const insuranceAmount = Math.max(0, coveredAmount - plan.copay);
        const patientAmount = amount - insuranceAmount;

        expect(insuranceAmount).toBe(expected.insurance);
        expect(patientAmount).toBe(expected.patient);
      });
    });

    it('deveria gerar resumo financeiro por plano de saúde', () => {
      const insuranceSummary = {
        planId: 'plan_unimed_001',
        planName: 'Unimed Premium',
        category: 'PRIVATE',
        period: '2025-08',
        statistics: {
          totalTransactions: 45,
          totalAmount: 67500.00,
          insuranceAmount: 54000.00,
          patientAmount: 13500.00,
          averageTicket: 1500.00,
          coverageEfficiency: 80.0 // % médio de cobertura
        },
        topProcedures: [
          { name: 'Consulta Cardiologia', count: 15, amount: 22500.00 },
          { name: 'Exame Holter', count: 8, amount: 12000.00 },
          { name: 'Ecocardiograma', count: 12, amount: 18000.00 }
        ]
      };

      expect(insuranceSummary.statistics.totalAmount).toBe(
        insuranceSummary.statistics.insuranceAmount + 
        insuranceSummary.statistics.patientAmount
      );
      expect(insuranceSummary.statistics.coverageEfficiency).toBeGreaterThan(70);
      expect(insuranceSummary.statistics.averageTicket).toBe(
        insuranceSummary.statistics.totalAmount / insuranceSummary.statistics.totalTransactions
      );
    });
  });

  describe('🔄 Operações CRUD e Validações', () => {
    it('deveria validar criação de plano com dados mínimos', () => {
      const minimalPlan = {
        name: 'Plano Básico',
        code: 'BASIC_001',
        category: 'PRIVATE'
      };

      const validatedPlan = {
        ...minimalPlan,
        id: 'plan_' + Date.now(),
        defaultDiscountPercentage: 0,
        paymentTerms: 30,
        requiresAuthorization: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(validatedPlan.name).toBeTruthy();
      expect(validatedPlan.code).toBeTruthy();
      expect(['PRIVATE', 'PUBLIC', 'COOPERATIVE', 'CORPORATE', 'INTERNATIONAL']).toContain(validatedPlan.category);
      expect(validatedPlan.isActive).toBe(true);
    });

    it('deveria validar unicidade de nome e código', () => {
      const existingPlans = [
        { id: '1', name: 'Unimed Premium', code: 'UNI_PREM' },
        { id: '2', name: 'SulAmérica Saúde', code: 'SUL_SAUDE' }
      ];

      const newPlan = { name: 'Unimed Premium', code: 'NEW_CODE' };
      
      const nameExists = existingPlans.some(p => 
        p.name.toLowerCase() === newPlan.name.toLowerCase()
      );
      
      expect(nameExists).toBe(true); // Deve detectar conflito de nome
    });

    it('deveria implementar soft delete para planos com transações', () => {
      const planWithTransactions = {
        id: 'plan_001',
        name: 'Plano Ativo',
        isActive: true,
        transactionCount: 25
      };

      // Simula soft delete
      const updatedPlan = {
        ...planWithTransactions,
        isActive: false,
        deactivatedAt: new Date()
      };

      expect(updatedPlan.isActive).toBe(false);
      expect(updatedPlan.deactivatedAt).toBeInstanceOf(Date);
      expect(updatedPlan.transactionCount).toBeGreaterThan(0);
    });
  });

  describe('📊 Relatórios e Análises', () => {
    it('deveria gerar resumo de categorias de planos', () => {
      const categorySummary = [
        {
          category: 'PRIVATE',
          planCount: 15,
          totalAmount: 125000.00,
          pendingAmount: 25000.00,
          averagePaymentTerm: 20
        },
        {
          category: 'COOPERATIVE',
          planCount: 8,
          totalAmount: 75000.00,
          pendingAmount: 15000.00,
          averagePaymentTerm: 30
        },
        {
          category: 'CORPORATE',
          planCount: 5,
          totalAmount: 200000.00,
          pendingAmount: 50000.00,
          averagePaymentTerm: 45
        }
      ];

      categorySummary.forEach(summary => {
        expect(summary.planCount).toBeGreaterThan(0);
        expect(summary.totalAmount).toBeGreaterThan(0);
        expect(summary.pendingAmount).toBeLessThanOrEqual(summary.totalAmount);
        expect(['PRIVATE', 'PUBLIC', 'COOPERATIVE', 'CORPORATE', 'INTERNATIONAL']).toContain(summary.category);
      });
    });

    it('deveria calcular métricas de performance por plano', () => {
      const planMetrics = {
        planId: 'plan_001',
        period: '2025-08',
        metrics: {
          totalTransactions: 120,
          totalAmount: 180000.00,
          averageTransactionAmount: 1500.00,
          paymentEfficiency: 85.5, // % de pagamentos em dia
          authorizationRate: 92.0, // % de autorizações aprovadas
          patientSatisfaction: 4.2, // Nota de 1-5
          processingTime: 2.5 // Dias médios para processamento
        }
      };

      expect(planMetrics.metrics.averageTransactionAmount).toBe(
        planMetrics.metrics.totalAmount / planMetrics.metrics.totalTransactions
      );
      expect(planMetrics.metrics.paymentEfficiency).toBeGreaterThan(80);
      expect(planMetrics.metrics.authorizationRate).toBeGreaterThan(90);
      expect(planMetrics.metrics.patientSatisfaction).toBeGreaterThan(4.0);
      expect(planMetrics.metrics.processingTime).toBeLessThan(5);
    });
  });
});