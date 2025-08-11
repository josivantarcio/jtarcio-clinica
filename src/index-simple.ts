import Fastify from 'fastify';
import cors from '@fastify/cors';

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

// Especialidades
fastify.get('/api/v1/specialties', async (request, reply) => {
  return {
    success: true,
    data: [
      { id: '1', name: 'Cardiologia', description: 'Especialidade do coração' },
      { id: '2', name: 'Dermatologia', description: 'Especialidade da pele' },
      { id: '3', name: 'Ortopedia', description: 'Especialidade dos ossos' }
    ]
  };
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
    
    console.log('🚀 EO Clínica Server running on port', process.env.PORT || 3000);
    console.log('🏥 API ready for authentication');
    
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

start();
