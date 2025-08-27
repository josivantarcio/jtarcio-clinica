# 💰 Sistema de Preços EO Clínica

> **Sistema flexível de configuração de preços de consultas médicas**

## 🎯 **Visão Geral**

O Sistema de Preços do EO Clínica resolve o problema comum de duplicação de valores entre preços por médico (`Doctor.consultationFee`) e preços por especialidade (`Specialty.price`), permitindo que administradores configurem qual valor será utilizado no sistema.

## ✨ **Funcionalidades**

### 🔧 **Configuração Flexível**
- **Modo Médico**: Usa o valor individual de cada médico (`consultationFee`)
- **Modo Especialidade**: Usa o valor padrão da especialidade (`price`)
- **Fallback Inteligente**: Se um valor não existir, usa automaticamente o outro
- **Taxa de Impostos**: Configurável por administrador
- **Moeda**: Suporte a diferentes moedas (padrão: BRL)

### ⚙️ **Interface Administrativa**
- **Nova aba "Sistema"** na página de Configurações
- **Seleção intuitiva** entre os modos de precificação
- **Configuração de impostos** com percentual
- **Preview dos cálculos** em tempo real

## 🏗️ **Arquitetura Técnica**

### 📊 **Estrutura de Dados**
```typescript
// Tabela: system_configurations
{
  key: 'CONSULTATION_PRICING_MODE',
  value: 'doctor' | 'specialty',
  category: 'PRICING'
}

// Configurações disponíveis:
- CONSULTATION_PRICING_MODE: 'doctor' | 'specialty'
- DEFAULT_CURRENCY: string (ex: 'BRL', 'USD')
- TAX_RATE: number (percentual de impostos)
```

### 🔄 **Lógica de Cálculo**
```typescript
// Modo DOCTOR (prioridade médico → fallback especialidade)
if (mode === 'doctor') {
  price = doctor.consultationFee || specialty.price || 150.0
}

// Modo SPECIALTY (prioridade especialidade → fallback médico)  
if (mode === 'specialty') {
  price = specialty.price || doctor.consultationFee || 150.0
}

// Cálculo final com impostos
finalPrice = basePrice + (basePrice * taxRate / 100)
```

## 🚀 **Implementação**

### 📁 **Arquivos Criados/Modificados**

#### **Frontend**
```
frontend/src/app/settings/page.tsx
├── Nova aba "Sistema" adicionada
├── Interface de configuração de preços
└── Integração com API de configurações
```

#### **Backend**
```
src/utils/pricing.ts
├── getPricingConfig()           # Busca configurações
├── calculateConsultationPrice() # Calcula preço final
├── updatePricingConfig()        # Salva configurações
└── formatCurrency()             # Formata moeda

src/routes/auth.ts
└── PUT /system-settings         # Endpoint de configuração
```

#### **Database**
```sql
-- Configurações salvas na tabela system_configurations
INSERT INTO system_configurations 
(key, value, category, description) VALUES
('CONSULTATION_PRICING_MODE', 'specialty', 'PRICING', 'Modo de precificação'),
('DEFAULT_CURRENCY', 'BRL', 'PRICING', 'Moeda padrão'),
('TAX_RATE', '5', 'PRICING', 'Taxa de impostos em %');
```

## 📋 **Como Usar**

### 👨‍💻 **Para Administradores**

1. **Acesse Configurações**
   ```
   Login → Menu → Configurações → Aba "Sistema"
   ```

2. **Configure o Modo de Preços**
   - **Médico**: Cada médico define seu valor individual
   - **Especialidade**: Valor fixo por tipo de especialidade

3. **Defina Impostos e Moeda**
   - Taxa de impostos em percentual (ex: 5%)
   - Moeda padrão (BRL, USD, EUR...)

4. **Salve as Configurações**
   - Clique em "Salvar Configurações"
   - Sistema aplica imediatamente nos novos cálculos

### 👨‍💻 **Para Desenvolvedores**

1. **Usar o Sistema de Preços**
   ```typescript
   import { calculateConsultationPrice } from '@/utils/pricing';
   
   const priceInfo = await calculateConsultationPrice(
     doctorId, 
     specialtyId
   );
   
   console.log(priceInfo);
   // {
   //   basePrice: 150.0,
   //   taxAmount: 7.5,
   //   finalPrice: 157.5,
   //   source: 'specialty',
   //   currency: 'BRL'
   // }
   ```

2. **Atualizar Configurações via API**
   ```bash
   curl -X PUT http://localhost:3000/api/v1/auth/system-settings \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "system": {
         "consultationPricingMode": "doctor",
         "defaultCurrency": "BRL", 
         "taxRate": 10.0
       }
     }'
   ```

## ✅ **Testes Realizados**

### 🧪 **Validações de Funcionalidade**
- ✅ Endpoint `/system-settings` funcionando
- ✅ Configurações salvas corretamente no banco
- ✅ Alternância entre modos "doctor" e "specialty"
- ✅ Cálculo de impostos aplicado corretamente
- ✅ Sistema de fallback funcionando
- ✅ Interface de configurações responsiva

### 🔧 **Testes de Integração**
- ✅ Frontend comunica com backend
- ✅ Configurações persistem no PostgreSQL
- ✅ API retorna valores corretos
- ✅ Validação de dados de entrada

## 🚨 **Resolução de Problemas**

### **Problema Original**
```
❌ Duplicação de preços entre Doctor.consultationFee e Specialty.price
❌ Sistema não sabia qual valor usar para cálculos
❌ Inconsistência nos valores de consultas
```

### **Solução Implementada**
```
✅ Sistema de configuração unificado
✅ Escolha clara entre fonte de preços
✅ Fallback automático para valores ausentes
✅ Interface administrativa intuitiva
✅ Cálculos consistentes e transparentes
```

## 📈 **Benefícios**

1. **Flexibilidade Total**: Escolha entre precificação individual ou por especialidade
2. **Fallback Inteligente**: Nunca fica sem preço definido
3. **Interface Intuitiva**: Configuração via interface web
4. **Transparência**: Mostra origem do preço (médico/especialidade/padrão)
5. **Escalabilidade**: Sistema preparado para múltiplas moedas e impostos

## 🔮 **Roadmap Futuro**

- [ ] **Preços Dinâmicos**: Valores baseados em demanda/horário
- [ ] **Descontos Configuráveis**: Sistema de promoções
- [ ] **Múltiplas Moedas**: Conversão automática
- [ ] **Histórico de Preços**: Auditoria de mudanças
- [ ] **API Pública**: Integração com sistemas externos

---

**📚 Documentação Técnica:** [PRICING_API.md](./PRICING_API.md)  
**🔧 Guia de Configuração:** [ADMIN_GUIDE.md](./ADMIN_GUIDE.md)  
**💻 Exemplos de Código:** [CODE_EXAMPLES.md](./CODE_EXAMPLES.md)

---
*Sistema implementado em 2025 com foco em qualidade e pensamento estratégico* ✨