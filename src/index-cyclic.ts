import Fastify from 'fastify';
import path from 'path';
import fs from 'fs';
import { cyclicPrisma } from './config/database-cyclic';
import bcrypt from 'bcryptjs';

// Criar instância do Fastify específica para Cyclic
const fastify = Fastify({
  logger: true,
});

// Configuração específica para Cyclic
const isDevelopment = process.env.NODE_ENV === 'development';
const PORT = process.env.PORT || 3000;

// Função para registrar rotas da API
async function registerApiRoutes() {
  // Rota de login
  fastify.post('/api/auth/login', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      // Buscar usuário no mock database
      const user = await cyclicPrisma.user.findUnique({
        where: { email: email.toLowerCase() }
      });

      if (!user) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou senha inválidos',
          },
        });
      }

      // Verificar senha
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return reply.status(401).send({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Email ou senha inválidos',
          },
        });
      }

      // Atualizar último login
      await cyclicPrisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      return reply.send({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            status: user.status,
          },
          accessToken: 'cyclic-demo-token',
          refreshToken: 'cyclic-demo-refresh',
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

  // Rota para obter perfil do usuário
  fastify.get('/api/auth/me', async (request, reply) => {
    // Mock auth check
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.includes('cyclic-demo-token')) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token não fornecido ou inválido',
        },
      });
    }

    // Retornar usuário admin como padrão
    const user = await cyclicPrisma.user.findUnique({
      where: { email: 'admin@eoclinica.com.br' }
    });

    return reply.send({
      success: true,
      data: {
        id: user!.id,
        email: user!.email,
        name: user!.fullName,
        firstName: user!.firstName,
        lastName: user!.lastName,
        role: user!.role,
        status: user!.status,
        phone: user!.phone,
        timezone: user!.timezone,
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
        bio: 'Usuário demo do Cyclic',
        createdAt: user!.createdAt,
        updatedAt: user!.updatedAt,
      },
    });
  });

  // Rotas demo para endpoints principais
  fastify.get('/api/appointments', async (request, reply) => {
    const appointments = await cyclicPrisma.appointment.findMany();
    return reply.send({
      success: true,
      data: {
        appointments,
        totalCount: appointments.length,
        currentPage: 1,
        totalPages: 1,
      },
    });
  });

  fastify.get('/api/patients', async (request, reply) => {
    const patients = await cyclicPrisma.user.findMany({
      where: { role: 'PATIENT' }
    });
    return reply.send({
      success: true,
      data: {
        patients,
        totalCount: patients.length,
        currentPage: 1,
        totalPages: 1,
      },
    });
  });

  fastify.get('/api/doctors', async (request, reply) => {
    const doctors = await cyclicPrisma.user.findMany({
      where: { role: 'DOCTOR' }
    });
    return reply.send({
      success: true,
      data: {
        doctors,
        totalCount: doctors.length,
        currentPage: 1,
        totalPages: 1,
      },
    });
  });
}

async function startCyclicServer() {
  try {
    // Registrar plugins essenciais
    await fastify.register(import('@fastify/cors'), {
      origin: true,
      credentials: true,
    });

    await fastify.register(import('@fastify/helmet'), {
      contentSecurityPolicy: false,
    });

    // Registrar rotas da API
    await registerApiRoutes();
    
    // Registrar rotas estáticas para servir o frontend
    const frontendPath = path.join(__dirname, '..', 'frontend', 'out');
    
    // Verificar se o diretório do frontend existe
    if (fs.existsSync(frontendPath)) {
      console.log(`📁 Serving frontend from: ${frontendPath}`);
      
      // Registrar arquivos estáticos
      await fastify.register(import('@fastify/static'), {
        root: frontendPath,
        prefix: '/',
        decorateReply: false,
      });

      // Rota catch-all para SPA (Single Page Application)
      fastify.setNotFoundHandler(async (request, reply) => {
        const url = request.url;
        
        // Se for uma rota de API, deixar o handler padrão
        if (url.startsWith('/api/')) {
          reply.code(404).send({ 
            success: false, 
            error: { 
              code: 'NOT_FOUND', 
              message: 'API endpoint not found' 
            } 
          });
          return;
        }
        
        // Para outras rotas, servir o index.html (SPA)
        const indexPath = path.join(frontendPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          const stream = fs.createReadStream(indexPath);
          reply.type('text/html');
          return reply.send(stream);
        }
        
        // Se não encontrar o index.html, retornar 404
        reply.code(404).send('Page not found');
      });
    } else {
      console.log('⚠️ Frontend build not found. Serving API only.');
    }

    // Health check específico para Cyclic
    fastify.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'EO Clínica - Cyclic',
        version: '2.1.1',
        environment: process.env.NODE_ENV || 'production',
        port: PORT,
      };
    });

    // Iniciar servidor
    await fastify.listen({ 
      port: Number(PORT), 
      host: '0.0.0.0' 
    });

    console.log(`🚀 EO Clínica server running on Cyclic!`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'production'}`);
    console.log(`🔗 Health check: /health`);
    console.log(`🏥 API endpoints: /api/*`);
    
  } catch (error) {
    console.error('❌ Failed to start Cyclic server:', error);
    process.exit(1);
  }
}

// Tratar sinais de shutdown gracefully
process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

// Iniciar servidor
startCyclicServer();

// Export para compatibilidade com diferentes ambientes
export default startCyclicServer;
export { fastify };