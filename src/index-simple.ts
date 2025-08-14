import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma } from './config/database';

// Criar instância do Fastify
const fastify = Fastify({
  logger: {
    level: 'info'
  }
});

// Registrar CORS
fastify.register(cors, {
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
});

// Manifest.json for PWA
fastify.get('/manifest.json', async (request, reply) => {
  reply.type('application/json');
  return {
    name: 'EO Clínica',
    short_name: 'EO Clínica',
    description: 'Sistema de Agendamento Médico com IA',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0066cc',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon'
      }
    ]
  };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    message: 'EO Clínica API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  };
});

// Login endpoint básico para teste
fastify.post('/api/v1/auth/login', async (request, reply) => {
  try {
    console.log('Raw body:', request.body);
    const { email, password } = request.body as any;
    
    if (!email || !password) {
      reply.status(400);
      return {
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Email e senha são obrigatórios'
        }
      };
    }
    
    console.log('Login attempt:', { email, password });
  
  // Login básico para teste - usando as credenciais criadas no seed
  if (email === 'admin@eoclinica.com.br' && (password === 'Admin123!' || password === 'Admin123')) {
    return {
      success: true,
      data: {
        user: {
          id: 'cme4damyf001614bkc7980k98',
          email: 'admin@eoclinica.com.br',
          role: 'ADMIN',
          name: 'Administrador Sistema',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        accessToken: 'fake-jwt-token-for-testing',
        refreshToken: 'fake-refresh-token-for-testing'
      }
    };
  }
  
  // Only admin login is available now
  
    reply.status(401);
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha inválidos'
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    reply.status(400);
    return {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Dados inválidos'
      }
    };
  }
});

// Outros endpoints básicos
fastify.get('/api/v1/auth/me', async (request, reply) => {
  return {
    success: true,
    data: {
      id: '1',
      email: 'admin@eoclinica.com',
      role: 'ADMIN',
      name: 'Administrador Sistema',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  };
});

// Usuários/Pacientes - agora retorna lista vazia (somente admin existe)
fastify.get('/api/v1/users', async (request, reply) => {
  const query = request.query as any;
  const role = query?.role;
  
  // Lista vazia - não há mais dados fictícios
  const allUsers: any[] = [];
  
  // Filtrar por role se especificado
  let filteredUsers = allUsers;
  if (role) {
    filteredUsers = allUsers.filter(user => user.role === role);
  }
  
  return {
    success: true,
    data: filteredUsers,
    pagination: {
      page: 1,
      pageSize: 10,
      total: filteredUsers.length,
      totalPages: 1
    }
  };
});

// Criar novo usuário/paciente
fastify.post('/api/v1/users', async (request, reply) => {
  try {
    const userData = request.body as any;
    console.log('Creating user with data:', userData);
    
    // Validações básicas
    if (!userData.firstName || !userData.lastName || !userData.email) {
      reply.status(400);
      return {
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Nome, sobrenome e email são obrigatórios'
        }
      };
    }
    
    // Criar o usuário no banco
    const user = await prisma.user.create({
      data: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: `${userData.firstName} ${userData.lastName}`,
        email: userData.email,
        password: userData.password || 'TempPassword123!', // Senha temporária
        role: userData.role || 'PATIENT',
        phone: userData.phone || null,
        cpf: userData.cpf || null,
        dateOfBirth: userData.dateOfBirth ? new Date(userData.dateOfBirth) : null,
        gender: userData.gender || null
      }
    });
    
    // Se for um paciente, criar o registro de paciente
    if (userData.role === 'PATIENT' || !userData.role) {
      await prisma.patient.create({
        data: {
          userId: user.id,
          emergencyContactName: userData.emergencyContactName || null,
          emergencyContactPhone: userData.emergencyContactPhone || null,
          allergies: userData.allergies || [],
          medications: userData.medications || [],
          medicalHistory: {
            allergies: userData.allergies || [],
            medications: userData.medications || [],
            conditions: []
          },
          address: userData.address ? {
            street: userData.address.street || '',
            neighborhood: userData.address.neighborhood || '',
            city: userData.address.city || '',
            state: userData.address.state || '',
            zipCode: userData.address.zipCode || ''
          } : null
        }
      });
    }
    
    // Retornar usuário criado (sem senha)
    const { password, ...userResponse } = user;
    
    return {
      success: true,
      data: userResponse,
      message: 'Usuário criado com sucesso'
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    
    // Verificar se é erro de email duplicado
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      reply.status(409);
      return {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Este email já está em uso'
        }
      };
    }
    
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: 'Erro ao criar usuário'
      }
    };
  }
});

// Especialidades - agora usando dados reais do banco
fastify.get('/api/v1/specialties', async (request, reply) => {
  try {
    const specialties = await prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    
    return {
      success: true,
      data: specialties
    };
  } catch (error) {
    console.error('Error fetching specialties:', error);
    return {
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch specialties'
      }
    };
  }
});

// Criar nova especialidade (admin)
fastify.post('/api/v1/specialties', async (request, reply) => {
  try {
    const { name, description, duration, price } = request.body as any;
    
    const specialty = await prisma.specialty.create({
      data: {
        name,
        description,
        duration: duration || 30,
        price: price || null
      }
    });
    
    return {
      success: true,
      data: specialty
    };
  } catch (error) {
    console.error('Error creating specialty:', error);
    return {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: 'Failed to create specialty'
      }
    };
  }
});

// Atualizar especialidade (admin)
fastify.patch('/api/v1/specialties/:id', async (request, reply) => {
  try {
    const { id } = request.params as any;
    const updateData = request.body as any;
    
    const specialty = await prisma.specialty.update({
      where: { id },
      data: updateData
    });
    
    return {
      success: true,
      data: specialty
    };
  } catch (error) {
    console.error('Error updating specialty:', error);
    return {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update specialty'
      }
    };
  }
});

// Appointments
fastify.get('/api/v1/appointments', async (request, reply) => {
  return {
    success: true,
    data: [],
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0
    }
  };
});

// Availability
fastify.get('/api/v1/availability', async (request, reply) => {
  return {
    success: true,
    data: []
  };
});

// Analytics
fastify.get('/api/v1/analytics', async (request, reply) => {
  return {
    success: true,
    data: {
      overview: {
        totalRevenue: 0,
        totalAppointments: 0,
        totalPatients: 0,
        averageRating: 0,
        revenueGrowth: 0,
        appointmentGrowth: 0,
        patientGrowth: 0,
        satisfactionGrowth: 0
      },
      advanced: {
        conversionRate: 0,
        churnRate: 0,
        customerLifetimeValue: 0,
        averageSessionTime: 0,
        bounceRate: 0,
        retentionRate: 0,
        npsScore: 0,
        operationalEfficiency: 0
      },
      predictions: {
        nextMonthRevenue: 0,
        nextMonthAppointments: 0,
        capacity: 0,
        demandForecast: 'Baixo',
        seasonalTrends: ['Nenhum dado histórico disponível']
      },
      realTime: {
        activeUsers: 0,
        todayBookings: 0,
        systemLoad: 0,
        responseTime: 0
      }
    }
  };
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  console.error('Error:', error);
  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor'
    }
  });
});

// Iniciar servidor
const start = async () => {
  try {
    await fastify.listen({ 
      port: Number(process.env.PORT) || 3000, 
      host: '0.0.0.0' 
    });
    
    console.log('[SUCCESS] EO Clínica Server running on port', process.env.PORT || 3000);
    console.log('[INFO] API ready for authentication');
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
