/**
 * 🏥 Testes da API de Médicos - EO Clínica
 * 
 * Testes para validar o funcionamento completo do endpoint /api/v1/doctors
 * Verifica criação, listagem e validação de dados de médicos
 */

import { expect, describe, test, beforeAll, afterAll } from '@jest/globals'

const API_BASE_URL = 'http://localhost:3000'
const TEST_TOKEN = 'fake-jwt-token-for-testing'

// Helper function para fazer requisições HTTP
async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TEST_TOKEN}`,
      ...options.headers,
    },
  })
  
  const data = await response.json()
  return { response, data }
}

// Dados de teste
const testDoctor = {
  user: {
    firstName: 'Dr. Teste',
    lastName: 'API',
    email: `teste.api.${Date.now()}@example.com`,
    password: '123456',
    role: 'DOCTOR'
  },
  crm: `${Math.floor(Math.random() * 90000) + 10000}-SP`,
  specialtyId: 'cmepxoqk1000uqt1brmoos6bq', // Clínica Geral
  graduationDate: '2020-01-01',
  phone: '(11) 99999-9999',
  consultationFee: '200.00'
}

describe('🏥 API de Médicos - /api/v1/doctors', () => {
  let createdDoctorId: string

  describe('POST /api/v1/doctors - Criação de Médico', () => {
    test('✅ Deve criar um médico com dados válidos', async () => {
      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(testDoctor),
      })

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.id).toBeDefined()
      expect(data.data.firstName).toBe(testDoctor.user.firstName)
      expect(data.data.lastName).toBe(testDoctor.user.lastName)
      expect(data.data.email).toBe(testDoctor.user.email)
      expect(data.data.role).toBe('DOCTOR')
      expect(data.message).toContain('sucesso')

      createdDoctorId = data.data.id
    })

    test('❌ Deve retornar erro para dados inválidos', async () => {
      const invalidDoctor = {
        ...testDoctor,
        user: {
          ...testDoctor.user,
          email: 'email-invalido' // Email inválido
        }
      }

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(invalidDoctor),
      })

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    test('❌ Deve retornar erro para email duplicado', async () => {
      // Tentar criar médico com mesmo email
      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(testDoctor),
      })

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error?.code).toBe('EMAIL_ALREADY_EXISTS')
    })

    test('❌ Deve retornar erro sem campos obrigatórios', async () => {
      const incompleteDoctor = {
        user: {
          firstName: 'Dr. Incompleto'
          // Faltando campos obrigatórios
        }
      }

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(incompleteDoctor),
      })

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  describe('GET /api/v1/users?role=DOCTOR - Listagem de Médicos', () => {
    test('✅ Deve listar médicos existentes', async () => {
      const { response, data } = await apiRequest('/api/v1/users?role=DOCTOR')

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      
      // Deve incluir médicos com role DOCTOR
      if (createdDoctorId) {
        const createdDoctor = data.data.find((doctor: any) => doctor.id === createdDoctorId)
        expect(createdDoctor).toBeDefined()
        if (createdDoctor) {
          expect(createdDoctor.role).toBe('DOCTOR')
        }
      }
      
      // Verificar que pelo menos existe médicos na lista
      const doctors = data.data.filter((user: any) => user.role === 'DOCTOR')
      expect(doctors.length).toBeGreaterThan(0)
    })

    test('✅ Deve retornar paginação correta', async () => {
      const { response, data } = await apiRequest('/api/v1/users?role=DOCTOR&limit=1&page=1')

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.limit).toBe(1)
      expect(data.pagination.page).toBe(1)
      expect(data.pagination.total).toBeGreaterThan(0)
    })
  })

  describe('🔍 Validação de Especialidades', () => {
    test('✅ Deve validar especialtyId existente', async () => {
      // Buscar especialidades disponíveis
      const { response: specResponse, data: specData } = await apiRequest('/api/v1/specialties')
      
      expect(specResponse.status).toBe(200)
      expect(specData.success).toBe(true)
      expect(Array.isArray(specData.data)).toBe(true)
      expect(specData.data.length).toBeGreaterThan(0)

      // Verificar se a especialidade usada no teste existe
      const specialty = specData.data.find((s: any) => s.id === testDoctor.specialtyId)
      expect(specialty).toBeDefined()
      expect(specialty.name).toBeDefined()
    })
  })

  describe('🛡️ Validação de Segurança', () => {
    test('❌ Deve retornar 401 sem token de autenticação', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testDoctor),
      })

      expect(response.status).toBe(401)
    })

    test('❌ Deve retornar 401 com token inválido', async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/doctors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token-invalido',
        },
        body: JSON.stringify(testDoctor),
      })

      expect(response.status).toBe(401)
    })
  })

  describe('📊 Validação de Dados', () => {
    test('✅ Deve validar formato de CRM', async () => {
      const doctorWithValidCRM = {
        ...testDoctor,
        crm: '12345-SP',
        user: {
          ...testDoctor.user,
          email: `crm.test.${Date.now()}@example.com`
        }
      }

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctorWithValidCRM),
      })

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
    })

    test('✅ Deve validar formato de email', async () => {
      const doctorWithInvalidEmail = {
        ...testDoctor,
        user: {
          ...testDoctor.user,
          email: 'email-sem-arroba-nem-ponto'
        }
      }

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctorWithInvalidEmail),
      })

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  describe('🆔 Validação de CPF - Fix para Issue #CPF-400-Error', () => {
    // Helper para gerar CPF válido
    function generateValidCPF(): string {
      const firstNineDigits = Math.floor(Math.random() * 999999999).toString().padStart(9, '0')
      
      let sum = 0
      for (let i = 0; i < 9; i++) {
        sum += parseInt(firstNineDigits[i]) * (10 - i)
      }
      let firstDigit = (sum * 10) % 11
      if (firstDigit >= 10) firstDigit = 0
      
      sum = 0
      const withFirstDigit = firstNineDigits + firstDigit
      for (let i = 0; i < 10; i++) {
        sum += parseInt(withFirstDigit[i]) * (11 - i)
      }
      let secondDigit = (sum * 10) % 11
      if (secondDigit >= 10) secondDigit = 0
      
      return firstNineDigits + firstDigit + secondDigit
    }

    test('✅ Deve aceitar CPF válido', async () => {
      const doctorWithValidCPF = {
        ...testDoctor,
        cpf: generateValidCPF(),
        crm: `${Math.floor(Math.random() * 90000) + 10000}-RJ`,
        user: {
          ...testDoctor.user,
          email: `cpf.valid.${Date.now()}@example.com`
        }
      }

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctorWithValidCPF),
      })

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.cpf).toBe(doctorWithValidCPF.cpf)
    })

    test('✅ Deve aceitar CPF como string vazia (opcional)', async () => {
      const doctorWithEmptyCPF = {
        ...testDoctor,
        cpf: '', // CPF vazio deve ser aceito
        crm: `${Math.floor(Math.random() * 90000) + 10000}-MG`,
        user: {
          ...testDoctor.user,
          email: `cpf.empty.${Date.now()}@example.com`
        }
      }

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctorWithEmptyCPF),
      })

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      // CPF vazio deve ser convertido para null no banco
      expect(data.data.cpf).toBeNull()
    })

    test('✅ Deve aceitar médico sem campo CPF (undefined)', async () => {
      const doctorWithoutCPF = {
        ...testDoctor,
        // CPF não enviado (undefined)
        crm: `${Math.floor(Math.random() * 90000) + 10000}-RS`,
        user: {
          ...testDoctor.user,
          email: `cpf.undefined.${Date.now()}@example.com`
        }
      }
      delete (doctorWithoutCPF as any).cpf // Remover campo completamente

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctorWithoutCPF),
      })

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.cpf).toBeNull()
    })

    test('✅ Deve aceitar CPF como null', async () => {
      const doctorWithNullCPF = {
        ...testDoctor,
        cpf: null, // CPF null deve ser aceito
        crm: `${Math.floor(Math.random() * 90000) + 10000}-PR`,
        user: {
          ...testDoctor.user,
          email: `cpf.null.${Date.now()}@example.com`
        }
      }

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctorWithNullCPF),
      })

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.cpf).toBeNull()
    })

    test('✅ Deve permitir múltiplos médicos com CPF vazio/null (sem violação de constraint)', async () => {
      // Primeiro médico com CPF vazio
      const doctor1 = {
        ...testDoctor,
        cpf: '',
        crm: `${Math.floor(Math.random() * 90000) + 10000}-SC`,
        user: {
          ...testDoctor.user,
          email: `cpf.multi1.${Date.now()}@example.com`
        }
      }

      const { response: response1, data: data1 } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctor1),
      })

      expect(response1.status).toBe(201)
      expect(data1.success).toBe(true)

      // Segundo médico com CPF null
      const doctor2 = {
        ...testDoctor,
        cpf: null,
        crm: `${Math.floor(Math.random() * 90000) + 10000}-BA`,
        user: {
          ...testDoctor.user,
          email: `cpf.multi2.${Date.now()}@example.com`
        }
      }

      const { response: response2, data: data2 } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctor2),
      })

      expect(response2.status).toBe(201)
      expect(data2.success).toBe(true)

      // Ambos devem ter CPF null no banco
      expect(data1.data.cpf).toBeNull()
      expect(data2.data.cpf).toBeNull()
    })

    test('❌ Deve rejeitar CPF duplicado (constraint única para CPFs válidos)', async () => {
      const validCPF = generateValidCPF()

      // Primeiro médico com CPF válido
      const doctor1 = {
        ...testDoctor,
        cpf: validCPF,
        crm: `${Math.floor(Math.random() * 90000) + 10000}-CE`,
        user: {
          ...testDoctor.user,
          email: `cpf.dup1.${Date.now()}@example.com`
        }
      }

      const { response: response1, data: data1 } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctor1),
      })

      expect(response1.status).toBe(201)
      expect(data1.success).toBe(true)

      // Segundo médico com mesmo CPF deve falhar
      const doctor2 = {
        ...testDoctor,
        cpf: validCPF, // Mesmo CPF
        crm: `${Math.floor(Math.random() * 90000) + 10000}-PE`,
        user: {
          ...testDoctor.user,
          email: `cpf.dup2.${Date.now()}@example.com`
        }
      }

      const { response: response2, data: data2 } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctor2),
      })

      expect(response2.status).toBe(400)
      expect(data2.success).toBe(false)
      expect(data2.error?.message).toContain('CPF')
    })

    test('❌ Deve rejeitar CPF com formato inválido', async () => {
      const doctorWithInvalidCPF = {
        ...testDoctor,
        cpf: '123', // CPF muito curto
        crm: `${Math.floor(Math.random() * 90000) + 10000}-GO`,
        user: {
          ...testDoctor.user,
          email: `cpf.invalid.${Date.now()}@example.com`
        }
      }

      const { response, data } = await apiRequest('/api/v1/doctors', {
        method: 'POST',
        body: JSON.stringify(doctorWithInvalidCPF),
      })

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })
})

// Cleanup após os testes
afterAll(async () => {
  console.log('🧹 Testes de médicos concluídos')
})