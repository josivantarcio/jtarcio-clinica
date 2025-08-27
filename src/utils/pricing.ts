/**
 * 💰 Sistema de Cálculo de Preços - EO Clínica
 * 
 * Resolve o problema de duplicação de preços entre Doctor.consultationFee e Specialty.price
 * Permite configurar qual valor usar através das configurações do sistema.
 */

import { prisma } from '@/config/database';

export type PricingMode = 'doctor' | 'specialty';

export interface PricingConfig {
  consultationPricingMode: PricingMode;
  defaultCurrency: string;
  taxRate: number;
}

export interface PriceCalculation {
  basePrice: number;
  taxAmount: number;
  finalPrice: number;
  source: 'doctor' | 'specialty' | 'default';
  currency: string;
}

/**
 * Obtém a configuração de preços do sistema
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const configs = await prisma.systemConfiguration.findMany({
      where: {
        key: {
          in: ['CONSULTATION_PRICING_MODE', 'DEFAULT_CURRENCY', 'TAX_RATE']
        }
      }
    });

    const configMap = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, string>);

    return {
      consultationPricingMode: (configMap.CONSULTATION_PRICING_MODE as PricingMode) || 'specialty',
      defaultCurrency: configMap.DEFAULT_CURRENCY || 'BRL',
      taxRate: parseFloat(configMap.TAX_RATE || '0')
    };
  } catch (error) {
    console.warn('⚠️ Erro ao obter configuração de preços, usando padrões:', error);
    return {
      consultationPricingMode: 'specialty',
      defaultCurrency: 'BRL',
      taxRate: 0
    };
  }
}

/**
 * Calcula o preço final da consulta baseado na configuração
 */
export async function calculateConsultationPrice(
  doctorId: string,
  specialtyId: string
): Promise<PriceCalculation> {
  const config = await getPricingConfig();

  try {
    let basePrice = 150.0; // Preço padrão fallback
    let source: 'doctor' | 'specialty' | 'default' = 'default';

    if (config.consultationPricingMode === 'doctor') {
      // Priorizar valor individual do médico
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
        select: { consultationFee: true }
      });

      if (doctor?.consultationFee) {
        basePrice = parseFloat(doctor.consultationFee.toString());
        source = 'doctor';
      } else {
        // Fallback para preço da especialidade
        const specialty = await prisma.specialty.findUnique({
          where: { id: specialtyId },
          select: { price: true }
        });

        if (specialty?.price) {
          basePrice = specialty.price;
          source = 'specialty';
        }
      }
    } else {
      // Priorizar valor da especialidade
      const specialty = await prisma.specialty.findUnique({
        where: { id: specialtyId },
        select: { price: true }
      });

      if (specialty?.price) {
        basePrice = specialty.price;
        source = 'specialty';
      } else {
        // Fallback para preço individual do médico
        const doctor = await prisma.doctor.findUnique({
          where: { id: doctorId },
          select: { consultationFee: true }
        });

        if (doctor?.consultationFee) {
          basePrice = parseFloat(doctor.consultationFee.toString());
          source = 'doctor';
        }
      }
    }

    // Calcular impostos
    const taxAmount = basePrice * (config.taxRate / 100);
    const finalPrice = basePrice + taxAmount;

    return {
      basePrice,
      taxAmount,
      finalPrice,
      source,
      currency: config.defaultCurrency
    };

  } catch (error) {
    console.error('❌ Erro ao calcular preço da consulta:', error);
    
    // Retornar valores padrão em caso de erro
    return {
      basePrice: 150.0,
      taxAmount: 0,
      finalPrice: 150.0,
      source: 'default',
      currency: 'BRL'
    };
  }
}

/**
 * Atualiza as configurações de preços do sistema
 */
export async function updatePricingConfig(config: Partial<PricingConfig>): Promise<boolean> {
  try {
    const updates = [];

    if (config.consultationPricingMode) {
      updates.push(
        prisma.systemConfiguration.upsert({
          where: { key: 'CONSULTATION_PRICING_MODE' },
          update: { value: config.consultationPricingMode },
          create: {
            key: 'CONSULTATION_PRICING_MODE',
            value: config.consultationPricingMode,
            description: 'Modo de precificação das consultas (doctor ou specialty)',
            category: 'PRICING'
          }
        })
      );
    }

    if (config.defaultCurrency) {
      updates.push(
        prisma.systemConfiguration.upsert({
          where: { key: 'DEFAULT_CURRENCY' },
          update: { value: config.defaultCurrency },
          create: {
            key: 'DEFAULT_CURRENCY',
            value: config.defaultCurrency,
            description: 'Moeda padrão do sistema',
            category: 'PRICING'
          }
        })
      );
    }

    if (config.taxRate !== undefined) {
      updates.push(
        prisma.systemConfiguration.upsert({
          where: { key: 'TAX_RATE' },
          update: { value: config.taxRate.toString() },
          create: {
            key: 'TAX_RATE',
            value: config.taxRate.toString(),
            description: 'Taxa de imposto em percentual',
            category: 'PRICING'
          }
        })
      );
    }

    await Promise.all(updates);
    return true;

  } catch (error) {
    console.error('❌ Erro ao atualizar configurações de preços:', error);
    return false;
  }
}

/**
 * Formata valor monetário de acordo com a configuração
 */
export function formatCurrency(amount: number, currency: string = 'BRL'): string {
  try {
    const formatter = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return formatter.format(amount);
  } catch (error) {
    // Fallback para formato brasileiro
    return `R$ ${amount.toFixed(2).replace('.', ',')}`;
  }
}