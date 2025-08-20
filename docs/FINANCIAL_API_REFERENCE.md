# 📚 Referência da API Financeira - EO Clínica

## 🌐 Base URL
```
http://localhost:3000/api/v1/financial
```

## 🔐 Autenticação

Todos os endpoints (exceto `/health`) requerem autenticação via JWT token:

```bash
Authorization: Bearer <jwt_token>
```

### Roles Suportados
- `ADMIN` - Acesso completo
- `FINANCIAL_MANAGER` - Gestão financeira
- `DOCTOR` - Visualização de dados próprios
- `RECEPTIONIST` - Visualização limitada
- `PATIENT` - Visualização de pagamentos próprios

---

## 🏥 Health Check

### GET `/health`
**Descrição**: Verifica status do módulo financeiro
**Autenticação**: Não requerida
**Permissões**: Público

#### Response
```json
{
  "status": "ok",
  "module": "financial", 
  "timestamp": "2025-08-20T09:00:00.000Z",
  "database": "connected"
}
```

---

## 📊 Dashboard

### GET `/dashboard`
**Descrição**: Dashboard financeiro com KPIs em tempo real
**Autenticação**: Requerida
**Permissões**: `financial.dashboard.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `period` | string | `month` | Período: `week`, `month`, `quarter`, `year` |

#### Response
```json
{
  "success": true,
  "data": {
    "totalRevenue": 45000.00,
    "totalExpenses": 12000.00,
    "netProfit": 33000.00,
    "cashBalance": 125000.00,
    "revenueGrowth": 15.5,
    "expenseGrowth": 8.2,
    "profitGrowth": 18.7,
    "recentTransactions": [...],
    "upcomingPayments": [...],
    "overdueReceivables": [...],
    "cashFlowData": [...],
    "revenueByPeriod": [...],
    "expensesByCategory": [...]
  }
}
```

### GET `/dashboard/kpi/:metric`
**Descrição**: KPI específico com dados históricos
**Autenticação**: Requerida
**Permissões**: `financial.dashboard.view`

#### Path Parameters
- `metric`: `revenue`, `expenses`, `profit`, `cash_balance`, `receivables`, `payables`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `period` | string | `month` | `day`, `week`, `month`, `quarter`, `year` |
| `startDate` | string | - | Data início (YYYY-MM-DD) |
| `endDate` | string | - | Data fim (YYYY-MM-DD) |

#### Response
```json
{
  "success": true,
  "data": {
    "metric": "revenue",
    "value": 45000.00,
    "period": "month",
    "startDate": "2025-08-01T00:00:00.000Z",
    "endDate": "2025-08-20T09:00:00.000Z",
    "formattedValue": "R$ 45.000,00"
  }
}
```

---

## 💳 Transações Financeiras

### GET `/transactions`
**Descrição**: Lista transações financeiras com filtros
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `patientId` | string | - | Filtrar por paciente |
| `doctorId` | string | - | Filtrar por médico |
| `status` | string | - | `PENDING`, `CONFIRMED`, `PAID`, `PARTIAL`, `CANCELLED`, `REFUNDED` |
| `transactionType` | string | - | `RECEIPT`, `PAYMENT`, `TRANSFER` |
| `paymentMethod` | string | - | Método de pagamento |
| `dateFrom` | string | - | Data início (YYYY-MM-DD) |
| `dateTo` | string | - | Data fim (YYYY-MM-DD) |
| `dueDateFrom` | string | - | Vencimento início |
| `dueDateTo` | string | - | Vencimento fim |
| `categoryId` | string | - | Filtrar por categoria |
| `insuranceId` | string | - | Filtrar por convênio |
| `page` | integer | 1 | Página (min: 1) |
| `limit` | integer | 50 | Itens por página (max: 100) |
| `sortBy` | string | `createdAt` | `createdAt`, `dueDate`, `paymentDate`, `netAmount` |
| `sortOrder` | string | `desc` | `asc`, `desc` |

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "trans_123",
      "appointmentId": "apt_456",
      "patient": {
        "id": "patient_789",
        "firstName": "João",
        "lastName": "Silva",
        "email": "joao@email.com"
      },
      "doctor": {
        "id": "doc_123",
        "firstName": "Dr. Maria",
        "lastName": "Santos"
      },
      "transactionType": "RECEIPT",
      "status": "PAID",
      "grossAmount": 200.00,
      "discountAmount": 10.00,
      "taxAmount": 0.00,
      "netAmount": 190.00,
      "paymentMethod": "CREDIT_CARD",
      "dueDate": "2025-08-20T00:00:00.000Z",
      "paymentDate": "2025-08-19T14:30:00.000Z",
      "description": "Consulta Cardiologia",
      "createdAt": "2025-08-19T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

### GET `/transactions/:id`
**Descrição**: Detalhes de uma transação específica
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Response
```json
{
  "success": true,
  "data": {
    "id": "trans_123",
    "appointmentId": "apt_456",
    "patient": {
      "id": "patient_789",
      "firstName": "João",
      "lastName": "Silva",
      "email": "joao@email.com"
    },
    "doctor": {
      "id": "doc_123",
      "firstName": "Dr. Maria",
      "lastName": "Santos"
    },
    "appointment": {
      "id": "apt_456",
      "scheduledAt": "2025-08-19T14:00:00.000Z"
    },
    "insurance": {
      "id": "ins_789",
      "name": "Unimed"
    },
    "category": {
      "id": "cat_456",
      "name": "Consultas",
      "type": "INCOME"
    },
    "transactionType": "RECEIPT",
    "status": "PAID",
    "grossAmount": 200.00,
    "discountAmount": 10.00,
    "taxAmount": 0.00,
    "netAmount": 190.00,
    "paymentMethod": "CREDIT_CARD",
    "installments": 1,
    "dueDate": "2025-08-20T00:00:00.000Z",
    "paymentDate": "2025-08-19T14:30:00.000Z",
    "insuranceAuth": "AUTH123456",
    "description": "Consulta Cardiologia",
    "notes": "Pagamento processado com sucesso",
    "createdAt": "2025-08-19T10:00:00.000Z",
    "updatedAt": "2025-08-19T14:30:00.000Z"
  }
}
```

### POST `/transactions`
**Descrição**: Criar nova transação financeira
**Autenticação**: Requerida
**Permissões**: `financial.transactions.create`

#### Request Body
```json
{
  "appointmentId": "apt_456", // Opcional
  "patientId": "patient_789", // Obrigatório
  "doctorId": "doc_123", // Opcional
  "transactionType": "RECEIPT", // Obrigatório: RECEIPT, PAYMENT, TRANSFER
  "categoryId": "cat_456", // Opcional
  "grossAmount": 200.00, // Obrigatório (min: 0)
  "discountAmount": 10.00, // Opcional (min: 0)
  "taxAmount": 0.00, // Opcional (min: 0)
  "paymentMethod": "CREDIT_CARD", // Opcional
  "dueDate": "2025-08-25T00:00:00.000Z", // Opcional
  "installments": 1, // Opcional (min: 1)
  "insuranceId": "ins_789", // Opcional
  "insuranceAuth": "AUTH123456", // Opcional
  "description": "Consulta Cardiologia", // Opcional (max: 500)
  "notes": "Observações adicionais" // Opcional (max: 1000)
}
```

#### Validações
- `patientId`, `transactionType`, `grossAmount` são obrigatórios
- Paciente deve existir e ter role `PATIENT`
- Se `appointmentId` fornecido, deve existir e pertencer ao paciente
- Valores monetários devem ser positivos
- `netAmount` é calculado automaticamente: `grossAmount - discountAmount - taxAmount`

### PUT `/transactions/:id`
**Descrição**: Atualizar transação existente
**Autenticação**: Requerida
**Permissões**: `financial.transactions.update`

#### Request Body
```json
{
  "status": "PAID", // PENDING, CONFIRMED, PAID, PARTIAL, CANCELLED, REFUNDED
  "paymentMethod": "PIX",
  "paymentDate": "2025-08-20T10:00:00.000Z",
  "notes": "Atualização de status"
}
```

### DELETE `/transactions/:id`
**Descrição**: Cancelar transação (soft delete)
**Autenticação**: Requerida
**Permissões**: `financial.transactions.delete`

#### Regras
- Só pode cancelar transações `PENDING` ou `CONFIRMED`
- Transações `PAID` não podem ser canceladas
- Status alterado para `CANCELLED`

---

## 📥 Contas a Receber

### GET `/receivables`
**Descrição**: Lista contas a receber (transações pendentes/confirmadas)
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Query Parameters
Similar ao `/transactions` mas filtra automaticamente por:
- `transactionType`: `RECEIPT`
- `status`: `PENDING` ou `CONFIRMED`

### GET `/receivables/overdue`
**Descrição**: Contas a receber em atraso
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `limit` | integer | 20 | Máximo de registros (max: 100) |

#### Response
```json
{
  "success": true,
  "data": {
    "receivables": [...],
    "totalAmount": 15000.00,
    "count": 25,
    "ageAnalysis": {
      "1-30": { "count": 10, "amount": 5000.00 },
      "31-60": { "count": 8, "amount": 4000.00 },
      "61-90": { "count": 5, "amount": 3000.00 },
      "90+": { "count": 2, "amount": 3000.00 }
    }
  }
}
```

### GET `/receivables/aging-analysis`
**Descrição**: Análise de aging detalhada
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Response
```json
{
  "success": true,
  "data": {
    "agingBuckets": [
      {
        "range": "Current",
        "amount": 8000.00,
        "count": 15,
        "percentage": 40.0
      },
      {
        "range": "1-30 days", 
        "amount": 5000.00,
        "count": 10,
        "percentage": 25.0
      }
    ],
    "totalAmount": 20000.00,
    "totalCount": 45
  }
}
```

### POST `/receivables/:id/mark-paid`
**Descrição**: Marcar recebível como pago
**Autenticação**: Requerida
**Permissões**: `financial.transactions.update`

#### Request Body
```json
{
  "paymentDate": "2025-08-20T14:30:00.000Z", // Opcional (padrão: agora)
  "paymentMethod": "PIX", // Opcional
  "notes": "Pagamento via PIX" // Opcional
}
```

---

## 📤 Contas a Pagar

### GET `/payables`
**Descrição**: Lista contas a pagar
**Autenticação**: Requerida
**Permissões**: `financial.payables.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `supplierId` | string | - | Filtrar por fornecedor |
| `status` | string | - | `PENDING`, `APPROVED`, `PAID`, `REJECTED`, `CANCELLED` |
| `categoryId` | string | - | Filtrar por categoria |
| `dueDateFrom` | string | - | Vencimento início |
| `dueDateTo` | string | - | Vencimento fim |
| `paymentDateFrom` | string | - | Pagamento início |
| `paymentDateTo` | string | - | Pagamento fim |
| `page` | integer | 1 | Página |
| `limit` | integer | 50 | Itens por página |
| `sortBy` | string | `dueDate` | Ordenação |
| `sortOrder` | string | `asc` | Ordem |

### POST `/payables`
**Descrição**: Criar nova conta a pagar
**Autenticação**: Requerida
**Permissões**: `financial.payables.create`

#### Request Body
```json
{
  "supplierId": "sup_123", // Opcional
  "categoryId": "cat_456", // Opcional
  "documentNumber": "NF001", // Opcional (max: 100)
  "description": "Material médico", // Obrigatório (max: 500)
  "grossAmount": 1000.00, // Obrigatório (min: 0)
  "discountAmount": 50.00, // Opcional (min: 0)
  "taxAmount": 100.00, // Opcional (min: 0)
  "issueDate": "2025-08-20T00:00:00.000Z", // Obrigatório
  "dueDate": "2025-09-20T00:00:00.000Z" // Obrigatório
}
```

#### Validações
- `dueDate` deve ser >= `issueDate`
- Fornecedor e categoria devem existir se fornecidos
- `netAmount` calculado automaticamente

### PUT `/payables/:id`
**Descrição**: Atualizar conta a pagar
**Autenticação**: Requerida
**Permissões**: `financial.payables.update`

#### Request Body
```json
{
  "status": "PAID",
  "paymentMethod": "BANK_TRANSFER",
  "paymentDate": "2025-08-20T16:00:00.000Z"
}
```

### POST `/payables/:id/approve`
**Descrição**: Aprovar conta para pagamento
**Autenticação**: Requerida
**Permissões**: `financial.payables.approve`

#### Regras
- Só pode aprovar contas com status `PENDING`
- Status alterado para `APPROVED`

### GET `/payables/overdue/list`
**Descrição**: Contas a pagar em atraso
**Autenticação**: Requerida
**Permissões**: `financial.payables.view`

### GET `/payables/upcoming/list`
**Descrição**: Próximos vencimentos (30 dias)
**Autenticação**: Requerida
**Permissões**: `financial.payables.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `days` | integer | 30 | Dias à frente (max: 90) |
| `limit` | integer | 20 | Máximo registros |

---

## 🏥 Planos de Convênio

### GET `/insurance`
**Descrição**: Lista planos de convênio
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `category` | string | - | `PRIVATE`, `PUBLIC`, `COOPERATIVE`, `CORPORATE`, `INTERNATIONAL` |
| `active` | boolean | - | Filtrar apenas ativos |
| `search` | string | - | Busca por nome/código/email (min: 2) |
| `page` | integer | 1 | Página |
| `limit` | integer | 50 | Itens por página |

### POST `/insurance`
**Descrição**: Criar novo plano de convênio
**Autenticação**: Requerida
**Permissões**: `ADMIN` (requireFinancialAdmin)

#### Request Body
```json
{
  "name": "Unimed Premium", // Obrigatório (max: 200)
  "code": "UNI001", // Obrigatório (2-20 chars)
  "category": "PRIVATE", // Obrigatório
  "coveragePercentage": 80.0, // Opcional (0-100)
  "copayAmount": 20.00, // Opcional (min: 0)
  "deductibleAmount": 50.00, // Opcional (min: 0)
  "maxCoverageAmount": 10000.00, // Opcional (min: 0)
  "contactName": "João Silva", // Opcional (max: 100)
  "contactEmail": "contato@unimed.com", // Opcional (email válido)
  "contactPhone": "(11) 9999-9999", // Opcional (max: 20)
  "website": "https://unimed.com.br", // Opcional (URL válida)
  "notes": "Plano premium com cobertura ampla", // Opcional (max: 1000)
  "isActive": true // Opcional (padrão: true)
}
```

### POST `/insurance/:id/calculate-coverage`
**Descrição**: Calcular cobertura para um valor
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Request Body
```json
{
  "totalAmount": 500.00, // Obrigatório (min: 0)
  "procedureCode": "PROC123" // Opcional
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "totalAmount": 500.00,
    "insuranceAmount": 350.00,
    "patientAmount": 170.00,
    "copayAmount": 20.00,
    "deductibleAmount": 50.00,
    "coveragePercentage": 80.0,
    "calculation": {
      "originalAmount": 500.00,
      "deductibleApplied": 50.00,
      "amountAfterDeductible": 450.00,
      "coveragePercentage": 80.0,
      "rawCoveredAmount": 360.00,
      "maxCoverageLimit": 10000.00,
      "finalCoveredAmount": 360.00,
      "copayAmount": 20.00,
      "patientResponsibility": 170.00
    }
  }
}
```

---

## 🏢 Fornecedores

### GET `/suppliers`
**Descrição**: Lista fornecedores
**Autenticação**: Requerida
**Permissões**: `financial.payables.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `category` | string | - | `MEDICAL_SUPPLIES`, `PHARMACEUTICAL`, `EQUIPMENT`, `SERVICES`, `UTILITIES`, `OTHER` |
| `active` | boolean | - | Filtrar apenas ativos |
| `search` | string | - | Busca por nome/email/documento (min: 2) |
| `page` | integer | 1 | Página |
| `limit` | integer | 50 | Itens por página |

### POST `/suppliers`
**Descrição**: Criar novo fornecedor
**Autenticação**: Requerida
**Permissões**: `ADMIN` (requireFinancialAdmin)

#### Request Body
```json
{
  "name": "Fornecedor Médico Ltda", // Obrigatório (max: 200)
  "category": "MEDICAL_SUPPLIES", // Obrigatório
  "documentNumber": "12.345.678/0001-90", // Opcional (max: 50)
  "contactName": "João Silva", // Opcional (max: 100)
  "contactEmail": "contato@fornecedor.com", // Opcional (email válido)
  "contactPhone": "(11) 9999-9999", // Opcional (max: 20)
  "address": "Rua das Flores, 123", // Opcional (max: 500)
  "website": "https://fornecedor.com", // Opcional (URL válida)
  "notes": "Fornecedor confiável", // Opcional (max: 1000)
  "isActive": true // Opcional (padrão: true)
}
```

### GET `/suppliers/top-suppliers`
**Descrição**: Top fornecedores por volume de transações
**Autenticação**: Requerida
**Permissões**: `financial.payables.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `limit` | integer | 10 | Máximo fornecedores (5-50) |
| `period` | string | `year` | `month`, `quarter`, `year` |

---

## 📁 Categorias Financeiras

### GET `/categories`
**Descrição**: Lista categorias financeiras
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `type` | string | - | `INCOME`, `EXPENSE`, `BOTH` |
| `parentId` | string | - | Filtrar por categoria pai |
| `includeChildren` | boolean | true | Incluir subcategorias |
| `active` | boolean | - | Filtrar apenas ativas |

### POST `/categories`
**Descrição**: Criar nova categoria
**Autenticação**: Requerida
**Permissões**: `ADMIN` (requireFinancialAdmin)

#### Request Body
```json
{
  "name": "Consultas Médicas", // Obrigatório (max: 100)
  "type": "INCOME", // Obrigatório: INCOME, EXPENSE, BOTH
  "description": "Receitas de consultas", // Opcional (max: 500)
  "parentId": "cat_parent_123", // Opcional (categoria pai)
  "color": "#FF5722", // Opcional (hex color)
  "isActive": true // Opcional (padrão: true)
}
```

### GET `/categories/tree/structure`
**Descrição**: Estrutura hierárquica das categorias
**Autenticação**: Requerida
**Permissões**: `financial.transactions.view`

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_123",
      "name": "Receitas",
      "type": "INCOME",
      "color": "#4CAF50",
      "isActive": true,
      "children": [
        {
          "id": "cat_456",
          "name": "Consultas",
          "type": "INCOME",
          "color": "#4CAF50",
          "isActive": true,
          "children": []
        }
      ]
    }
  ]
}
```

---

## 📈 Relatórios

### GET `/reports/cash-flow`
**Descrição**: Relatório de fluxo de caixa
**Autenticação**: Requerida
**Permissões**: `financial.reports.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `startDate` | string | Início do mês | Data início (YYYY-MM-DD) |
| `endDate` | string | Hoje | Data fim (YYYY-MM-DD) |
| `period` | string | `monthly` | `daily`, `weekly`, `monthly` |

#### Response
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2025-08-01T00:00:00.000Z",
      "endDate": "2025-08-20T23:59:59.999Z",
      "periodType": "monthly"
    },
    "summary": {
      "openingBalance": 100000.00,
      "totalIncome": 45000.00,
      "totalExpenses": 12000.00,
      "netCashFlow": 33000.00,
      "closingBalance": 133000.00
    },
    "transactions": {
      "income": [...],
      "expenses": [...]
    }
  }
}
```

### GET `/reports/profitability`
**Descrição**: Análise de lucratividade
**Autenticação**: Requerida
**Permissões**: `financial.reports.view`

#### Query Parameters
| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `startDate` | string | Início do ano | Data início |
| `endDate` | string | Hoje | Data fim |
| `groupBy` | string | `doctor` | `doctor`, `specialty`, `month` |

### GET `/reports/summary`
**Descrição**: Resumo financeiro geral
**Autenticação**: Requerida
**Permissões**: `financial.reports.view`

---

## ⚠️ Códigos de Erro

### Códigos Comuns
- `AUTH_REQUIRED` (401): Autenticação necessária
- `INSUFFICIENT_PERMISSIONS` (403): Permissões insuficientes
- `ACCESS_DENIED` (403): Acesso negado aos dados
- `VALIDATION_ERROR` (400): Erro de validação
- `NOT_FOUND` (404): Recurso não encontrado

### Códigos Financeiros Específicos
- `PATIENT_NOT_FOUND` (404): Paciente não encontrado
- `APPOINTMENT_NOT_FOUND` (404): Consulta não encontrada
- `TRANSACTION_NOT_FOUND` (404): Transação não encontrada
- `PAYABLE_NOT_FOUND` (404): Conta a pagar não encontrada
- `ALREADY_PAID` (400): Já foi pago
- `CANNOT_CANCEL_PAID` (400): Não pode cancelar transação paga
- `PAYMENT_DATE_REQUIRED` (400): Data de pagamento obrigatória
- `INVALID_DATE_RANGE` (400): Range de datas inválido

---

## 📊 Rate Limits

- **Dashboard**: 60 requests/minute
- **Transações**: 100 requests/minute
- **Relatórios**: 30 requests/minute
- **Outros endpoints**: 120 requests/minute

---

## 💡 Exemplos de Uso

### Criar Transação de Consulta
```bash
curl -X POST http://localhost:3000/api/v1/financial/transactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient_123",
    "doctorId": "doc_456",
    "transactionType": "RECEIPT",
    "grossAmount": 200.00,
    "description": "Consulta Cardiologia"
  }'
```

### Calcular Cobertura de Convênio
```bash
curl -X POST http://localhost:3000/api/v1/financial/insurance/ins_123/calculate-coverage \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 500.00
  }'
```

### Dashboard Financeiro
```bash
curl -X GET "http://localhost:3000/api/v1/financial/dashboard?period=month" \
  -H "Authorization: Bearer <token>"
```