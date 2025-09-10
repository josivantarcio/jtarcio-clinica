import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import Fastify from 'fastify';

// Initialize Firebase Admin
const app = initializeApp();
const db = getFirestore(app);

// Create Fastify instance
const fastify = Fastify({
  logger: true,
});

// Register CORS
await fastify.register(import('@fastify/cors'), {
  origin: true,
  credentials: true,
});

// Register Helmet for security
await fastify.register(import('@fastify/helmet'), {
  contentSecurityPolicy: false,
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'EO Clínica Firebase API',
    version: '2.1.1',
  };
});

// Basic auth routes
fastify.post('/api/auth/login', async (request, reply) => {
  try {
    const { email, password } = request.body as { email: string; password: string };

    // Demo authentication for testing
    if (email === 'admin@eoclinica.com.br' && password === 'Admin123!') {
      return {
        success: true,
        data: {
          user: {
            id: 'firebase-demo-admin',
            email: 'admin@eoclinica.com.br',
            firstName: 'Admin',
            lastName: 'Firebase',
            fullName: 'Admin Firebase',
            role: 'ADMIN',
            status: 'ACTIVE',
          },
          accessToken: 'firebase-demo-token',
          refreshToken: 'firebase-demo-refresh',
        },
      };
    }

    return reply.status(401).send({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha inválidos',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'LOGIN_FAILED',
        message: 'Erro interno do servidor',
      },
    });
  }
});

// Get current user profile
fastify.get('/api/auth/me', async (request, reply) => {
  // Simple demo authentication check
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.includes('firebase-demo-token')) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Token não fornecido ou inválido',
      },
    });
  }

  return {
    success: true,
    data: {
      id: 'firebase-demo-admin',
      email: 'admin@eoclinica.com.br',
      name: 'Admin Firebase',
      firstName: 'Admin',
      lastName: 'Firebase',
      role: 'ADMIN',
      status: 'ACTIVE',
      phone: '(11) 99999-9999',
      timezone: 'America/Sao_Paulo',
      avatar: null,
      settings: {
        notifications: {
          email: true,
          sms: true,
          push: true,
          appointmentReminders: true,
          cancellationAlerts: true,
          promotionalEmails: false,
          systemUpdates: true,
          reminderTiming: 24,
        },
        privacy: {
          profileVisibility: 'contacts',
          shareActivityStatus: true,
          allowDirectMessages: true,
          showOnlineStatus: true,
        },
        appearance: {
          theme: 'dark',
          fontSize: 'medium',
          reducedMotion: false,
          highContrast: false,
        },
        security: {
          twoFactorEnabled: false,
          loginNotifications: true,
          sessionTimeout: 60,
        },
      },
      bio: 'Administrador de teste do Firebase',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
});

// Demo appointments endpoint
fastify.get('/api/appointments', async (request, reply) => {
  return {
    success: true,
    data: {
      appointments: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
    },
  };
});

// Demo patients endpoint
fastify.get('/api/patients', async (request, reply) => {
  return {
    success: true,
    data: {
      patients: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
    },
  };
});

// Demo doctors endpoint
fastify.get('/api/doctors', async (request, reply) => {
  return {
    success: true,
    data: {
      doctors: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
    },
  };
});

// Export the Firebase Function
export const api = onRequest(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
  },
  async (req, res) => {
    await fastify.ready();
    fastify.server.emit('request', req, res);
  }
);