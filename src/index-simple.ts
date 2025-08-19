import Fastify from 'fastify';
import cors from '@fastify/cors';
import { prisma, setupGracefulShutdown } from './config/database';

// Setup graceful shutdown handlers (only once)
setupGracefulShutdown();

// Criar instância do Fastify
const fastify = Fastify({
  logger: {
    level: 'info',
  },
});

// Registrar CORS
fastify.register(cors, {
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
});

// Simple logging hook instead of complex audit middleware
fastify.addHook('onRequest', async (request, reply) => {
  console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
});

// Utility function to create audit logs
const createAuditLog = async (logData: {
  action: string;
  resource: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  oldValues?: any;
  newValues?: any;
  resourceId?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action: logData.action,
        resource: logData.resource,
        userEmail: logData.userEmail || null,
        ipAddress: logData.ipAddress || '127.0.0.1',
        userAgent: logData.userAgent || 'EO Clinica System',
        oldValues: logData.oldValues || null,
        newValues: logData.newValues || null,
        resourceId: logData.resourceId || null,
      },
    });
  } catch (error) {
    console.log('Audit log creation failed:', error);
  }
};

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
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
        type: 'image/x-icon',
      },
    ],
  };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    message: 'EO Clínica API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
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
          message: 'Email e senha são obrigatórios',
        },
      };
    }

    console.log('Login attempt:', { email, password });

    // Login básico para teste - usando as credenciais criadas no seed
    if (
      email === 'admin@eoclinica.com.br' &&
      (password === 'Admin123!' || password === 'Admin123')
    ) {
      // Create audit log for successful login
      await createAuditLog({
        action: 'LOGIN_SUCCESS',
        resource: 'AUTHENTICATION',
        userEmail: email,
        ipAddress:
          request.headers['x-forwarded-for']?.toString() ||
          request.ip ||
          '127.0.0.1',
        userAgent: request.headers['user-agent'] || 'Unknown',
        newValues: {
          loginTime: new Date().toISOString(),
          role: 'ADMIN',
          success: true,
        },
      });

      return {
        success: true,
        data: {
          user: {
            id: 'cme4damyf001614bkc7980k98',
            email: 'admin@eoclinica.com.br',
            role: 'ADMIN',
            name: 'Administrador Sistema',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          accessToken: 'fake-jwt-token-for-testing',
          refreshToken: 'fake-refresh-token-for-testing',
        },
      };
    }

    // Only admin login is available now

    // Create audit log for failed login
    await createAuditLog({
      action: 'LOGIN_FAILED',
      resource: 'AUTHENTICATION',
      userEmail: email,
      ipAddress:
        request.headers['x-forwarded-for']?.toString() ||
        request.ip ||
        '127.0.0.1',
      userAgent: request.headers['user-agent'] || 'Unknown',
      newValues: {
        attemptTime: new Date().toISOString(),
        reason: 'Invalid credentials',
        success: false,
      },
    });

    reply.status(401);
    return {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Email ou senha inválidos',
      },
    };
  } catch (error) {
    console.error('Login error:', error);
    reply.status(400);
    return {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Dados inválidos',
      },
    };
  }
});

// Individual user by ID
fastify.get('/api/v1/users/:id', async (request, reply) => {
  try {
    const { id } = request.params as any;

    // Buscar usuário específico no banco
    const user = await prisma.user.findUnique({
      where: {
        id: id,
        deletedAt: null, // Não buscar usuários deletados
      },
      select: {
        id: true,
        email: true,
        phone: true,
        cpf: true,
        firstName: true,
        lastName: true,
        fullName: true,
        dateOfBirth: true,
        gender: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
        updatedAt: true,
        // Incluir dados do paciente se for paciente
        patientProfile: {
          select: {
            id: true,
            emergencyContactName: true,
            emergencyContactPhone: true,
            allergies: true,
            medications: true,
            address: true,
          },
        },
      },
    });

    if (!user) {
      reply.status(404);
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado',
        },
      };
    }

    return {
      success: true,
      data: user,
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Erro ao buscar usuário',
      },
    };
  }
});

// Update user by ID
fastify.patch('/api/v1/users/:id', async (request, reply) => {
  try {
    const { id } = request.params as any;
    const updateData = request.body as any;

    // Atualizar usuário no banco
    const user = await prisma.user.update({
      where: {
        id: id,
        deletedAt: null,
      },
      data: {
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        fullName: updateData.fullName,
        email: updateData.email,
        phone: updateData.phone,
        cpf: updateData.cpf,
        dateOfBirth: updateData.dateOfBirth
          ? new Date(updateData.dateOfBirth)
          : null,
        gender: updateData.gender,
        status: updateData.status,
      },
    });

    // Se existirem dados de paciente, atualizar tabela patients
    console.log('Checking patient data update:', {
      emergencyContactName: updateData.emergencyContactName,
      emergencyContactPhone: updateData.emergencyContactPhone,
      allergies: updateData.allergies,
      medications: updateData.medications,
      address: updateData.address,
    });

    if (
      updateData.emergencyContactName !== undefined ||
      updateData.emergencyContactPhone !== undefined ||
      updateData.allergies !== undefined ||
      updateData.medications !== undefined ||
      updateData.address !== undefined
    ) {
      console.log('Updating patient profile data...');

      // Verificar se já existe registro de paciente
      const existingPatient = await prisma.patient.findUnique({
        where: { userId: id },
      });

      if (existingPatient) {
        // Atualizar registro existente
        await prisma.patient.update({
          where: { userId: id },
          data: {
            emergencyContactName: updateData.emergencyContactName,
            emergencyContactPhone: updateData.emergencyContactPhone,
            allergies: updateData.allergies
              ? updateData.allergies
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : undefined,
            medications: updateData.medications
              ? updateData.medications
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : undefined,
            address: updateData.address
              ? {
                  street: updateData.address.street || '',
                  number: updateData.address.number || '',
                  complement: updateData.address.complement || '',
                  neighborhood: updateData.address.neighborhood || '',
                  city: updateData.address.city || '',
                  state: updateData.address.state || '',
                  zipCode: updateData.address.zipCode || '',
                }
              : undefined,
          },
        });
      } else if (user.role === 'PATIENT') {
        // Criar registro de paciente se não existir e user for PATIENT
        await prisma.patient.create({
          data: {
            userId: id,
            emergencyContactName: updateData.emergencyContactName || null,
            emergencyContactPhone: updateData.emergencyContactPhone || null,
            allergies: updateData.allergies
              ? updateData.allergies
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
            medications: updateData.medications
              ? updateData.medications
                  .split(',')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
            address: updateData.address
              ? {
                  street: updateData.address.street || '',
                  number: updateData.address.number || '',
                  complement: updateData.address.complement || '',
                  neighborhood: updateData.address.neighborhood || '',
                  city: updateData.address.city || '',
                  state: updateData.address.state || '',
                  zipCode: updateData.address.zipCode || '',
                }
              : null,
          },
        });
      }
    }

    // Se existirem dados de médico, atualizar tabela doctors
    if (updateData.doctorProfile && user.role === 'DOCTOR') {
      console.log('Updating doctor profile data...');

      const doctorData = updateData.doctorProfile.update;

      // Verificar se já existe registro de médico
      const existingDoctor = await prisma.doctor.findUnique({
        where: { userId: id },
      });

      if (existingDoctor) {
        // Atualizar registro existente
        await prisma.doctor.update({
          where: { userId: id },
          data: {
            crm: doctorData.crm,
            biography: doctorData.biography,
            consultationFee: doctorData.consultationFee,
            consultationDuration: doctorData.consultationDuration,
            acceptsNewPatients: doctorData.acceptsNewPatients,
            graduationDate: doctorData.graduationDate
              ? new Date(doctorData.graduationDate)
              : null,
            crmRegistrationDate: doctorData.crmRegistrationDate
              ? new Date(doctorData.crmRegistrationDate)
              : null,
            experience: doctorData.experience,
          },
        });
        console.log('Doctor profile updated successfully');
      }
    }

    return {
      success: true,
      data: user,
      message: 'Usuário atualizado com sucesso',
    };
  } catch (error: any) {
    console.error('Error updating user:', error);

    if (error.code === 'P2025') {
      reply.status(404);
      return {
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Usuário não encontrado',
        },
      };
    }

    reply.status(500);
    return {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Erro ao atualizar usuário',
      },
    };
  }
});

// Verificar CPF duplicado
fastify.get('/api/v1/users/check-cpf/:cpf', async (request, reply) => {
  try {
    const { cpf } = request.params as any;

    if (!cpf) {
      reply.status(400);
      return {
        success: false,
        error: {
          code: 'MISSING_CPF',
          message: 'CPF é obrigatório',
        },
      };
    }

    // Clean CPF (remove formatting)
    const cleanCpf = cpf.replace(/\D/g, '');

    // Format CPF for database comparison
    const formattedCpf = cleanCpf.replace(
      /(\d{3})(\d{3})(\d{3})(\d{2})/,
      '$1.$2.$3-$4',
    );

    // Buscar usuário com o CPF (both formats)
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ cpf: cpf }, { cpf: cleanCpf }, { cpf: formattedCpf }],
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        cpf: true,
      },
    });

    return {
      success: true,
      data: {
        exists: !!existingUser,
        user: existingUser || null,
      },
    };
  } catch (error) {
    console.error('Error checking CPF:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'CHECK_FAILED',
        message: 'Erro ao verificar CPF',
      },
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
      updatedAt: new Date().toISOString(),
    },
  };
});

// Usuários/Pacientes - buscar dados reais do banco
fastify.get('/api/v1/users', async (request, reply) => {
  try {
    const query = request.query as any;
    const role = query?.role;
    const page = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    // Configurar filtros
    const where: any = {
      deletedAt: null, // Não buscar usuários deletados
    };

    if (role) {
      where.role = role;
    }

    // Buscar usuários no banco com paginação
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          cpf: true,
          firstName: true,
          lastName: true,
          fullName: true,
          dateOfBirth: true,
          gender: true,
          role: true,
          status: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
          // Se for paciente, incluir dados do paciente
          patientProfile:
            role === 'PATIENT'
              ? {
                  select: {
                    id: true,
                    emergencyContactName: true,
                    emergencyContactPhone: true,
                    allergies: true,
                    medications: true,
                    address: true,
                  },
                }
              : false,
          // Se for médico, incluir dados do médico
          doctorProfile:
            role === 'DOCTOR'
              ? {
                  select: {
                    id: true,
                    crm: true,
                    subSpecialties: true,
                    biography: true,
                    graduationDate: true,
                    crmRegistrationDate: true,
                    experience: true,
                    consultationFee: true,
                    consultationDuration: true,
                    isActive: true,
                    acceptsNewPatients: true,
                    specialty: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        duration: true,
                        price: true,
                      },
                    },
                  },
                }
              : false,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      success: true,
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Erro ao buscar usuários',
      },
    };
  }
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
          message: 'Nome, sobrenome e email são obrigatórios',
        },
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
        dateOfBirth: userData.dateOfBirth
          ? new Date(userData.dateOfBirth)
          : null,
        gender: userData.gender || null,
      },
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
            conditions: [],
          },
          address: userData.address
            ? {
                street: userData.address.street || '',
                neighborhood: userData.address.neighborhood || '',
                city: userData.address.city || '',
                state: userData.address.state || '',
                zipCode: userData.address.zipCode || '',
              }
            : null,
        },
      });
    }

    // Retornar usuário criado (sem senha)
    const { password, ...userResponse } = user;

    return {
      success: true,
      data: userResponse,
      message: 'Usuário criado com sucesso',
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
          message: 'Este email já está em uso',
        },
      };
    }

    reply.status(500);
    return {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: 'Erro ao criar usuário',
      },
    };
  }
});

// Criar novo médico
fastify.post('/api/v1/doctors', async (request, reply) => {
  try {
    const doctorData = request.body as any;
    console.log(
      'Creating doctor with data:',
      JSON.stringify(doctorData, null, 2),
    );

    // Validações básicas
    if (
      !doctorData.user?.firstName ||
      !doctorData.user?.lastName ||
      !doctorData.user?.email ||
      !doctorData.crm
    ) {
      reply.status(400);
      return {
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message: 'Nome, sobrenome, email e CRM são obrigatórios',
        },
      };
    }

    // Criar o usuário primeiro
    const user = await prisma.user.create({
      data: {
        firstName: doctorData.user.firstName,
        lastName: doctorData.user.lastName,
        fullName: `${doctorData.user.firstName} ${doctorData.user.lastName}`,
        email: doctorData.user.email,
        password: doctorData.user.password || 'TempPassword123!', // Senha temporária
        role: 'DOCTOR',
        phone: doctorData.phone || null,
        cpf: doctorData.cpf || null,
        dateOfBirth: doctorData.dateOfBirth
          ? new Date(doctorData.dateOfBirth)
          : null,
        gender: doctorData.gender || null,
      },
    });

    // Criar o perfil de médico
    const doctor = await prisma.doctor.create({
      data: {
        userId: user.id,
        crm: doctorData.crm,
        specialtyId:
          doctorData.specialtyId ||
          doctorData.specialties?.[0] ||
          'cmebnka9q000uaj4w96eajstj', // Default to Clínica Geral
        subSpecialties: doctorData.specialties || [],
        biography: doctorData.bio || null,
        graduationDate: doctorData.graduationDate
          ? new Date(doctorData.graduationDate)
          : null,
        experience: doctorData.graduationDate
          ? Math.floor(
              (new Date().getTime() -
                new Date(doctorData.graduationDate).getTime()) /
                (1000 * 60 * 60 * 24 * 365.25),
            )
          : null,
        consultationFee: doctorData.consultationFee
          ? parseFloat(doctorData.consultationFee)
          : null,
        consultationDuration: doctorData.consultationDuration || 30,
      },
    });

    // Retornar médico criado com dados do usuário
    const newDoctor = await prisma.doctor.findUnique({
      where: { id: doctor.id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            phone: true,
            cpf: true,
            dateOfBirth: true,
            gender: true,
            role: true,
            status: true,
            avatar: true,
          },
        },
        specialty: {
          select: {
            id: true,
            name: true,
            description: true,
            duration: true,
            price: true,
          },
        },
      },
    });

    return {
      success: true,
      data: newDoctor,
      message: 'Médico criado com sucesso',
    };
  } catch (error: any) {
    console.error('Error creating doctor:', error);

    // Verificar se é erro de email duplicado
    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      reply.status(409);
      return {
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'Este email já está em uso',
        },
      };
    }

    // Verificar se é erro de CRM duplicado
    if (error.code === 'P2002' && error.meta?.target?.includes('crm')) {
      reply.status(409);
      return {
        success: false,
        error: {
          code: 'CRM_EXISTS',
          message: 'Este CRM já está em uso',
        },
      };
    }

    reply.status(500);
    return {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: 'Erro ao criar médico',
      },
    };
  }
});

// Especialidades - agora usando dados reais do banco
fastify.get('/api/v1/specialties', async (request, reply) => {
  try {
    const query = request.query as any;
    const withActiveDoctors = query?.withActiveDoctors === 'true';

    const where: any = { isActive: true };

    // Filter only specialties that have active doctors with specialty assigned
    if (withActiveDoctors) {
      where.doctors = {
        some: {
          isActive: true,
          user: {
            status: { in: ['ACTIVE', 'PENDING_VERIFICATION'] }, // Accept both active and pending verification doctors
            deletedAt: null,
          },
        },
      };
    }

    const specialties = await prisma.specialty.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      data: specialties,
    };
  } catch (error) {
    console.error('Error fetching specialties:', error);
    return {
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch specialties',
      },
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
        price: price || null,
      },
    });

    return {
      success: true,
      data: specialty,
    };
  } catch (error) {
    console.error('Error creating specialty:', error);
    return {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: 'Failed to create specialty',
      },
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
      data: updateData,
    });

    return {
      success: true,
      data: specialty,
    };
  } catch (error) {
    console.error('Error updating specialty:', error);
    return {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Failed to update specialty',
      },
    };
  }
});

// Appointments - Listar consultas com filtros
fastify.get('/api/v1/appointments', async (request, reply) => {
  try {
    const query = request.query as any;
    const doctorId = query?.doctorId;
    const patientId = query?.patientId;
    const status = query?.status;
    const date = query?.date;
    const page = parseInt(query?.page) || 1;
    const pageSize = parseInt(query?.pageSize) || 10;

    // Construir filtros
    const where: any = {
      deletedAt: null,
    };

    if (doctorId) where.doctorId = doctorId;
    if (patientId) where.patientId = patientId;
    if (status) {
      // Handle multiple status values (comma-separated)
      if (typeof status === 'string' && status.includes(',')) {
        where.status = { in: status.split(',') };
      } else if (Array.isArray(status)) {
        where.status = { in: status };
      } else {
        where.status = status;
      }
    }
    if (date) {
      // Filtrar por data específica
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      where.scheduledAt = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }

    // Buscar consultas
    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              cpf: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              // Get doctor profile if exists
              doctorProfile: {
                select: {
                  crm: true,
                  specialty: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          specialty: {
            select: {
              name: true,
              price: true,
            },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appointment.count({ where }),
    ]);

    return {
      success: true,
      data: appointments,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  } catch (error) {
    console.error('Error fetching appointments:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Erro ao buscar consultas',
      },
    };
  }
});

// Criar nova consulta
fastify.post('/api/v1/appointments', async (request, reply) => {
  try {
    const appointmentData = request.body as any;

    // Validações básicas
    if (
      !appointmentData.patientId ||
      !appointmentData.doctorId ||
      !appointmentData.specialtyId ||
      !appointmentData.scheduledAt
    ) {
      reply.status(400);
      return {
        success: false,
        error: {
          code: 'MISSING_FIELDS',
          message:
            'Paciente, médico, especialidade e data/hora são obrigatórios',
        },
      };
    }

    const scheduledAt = new Date(appointmentData.scheduledAt);
    const duration = appointmentData.duration || 30;
    const endTime = new Date(scheduledAt.getTime() + duration * 60000);

    // Verificar conflito de horário com o médico
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        doctorId: appointmentData.doctorId,
        deletedAt: null,
        status: {
          not: 'CANCELLED',
        },
        OR: [
          // Nova consulta começa durante uma existente
          {
            AND: [
              { scheduledAt: { lte: scheduledAt } },
              { endTime: { gt: scheduledAt } },
            ],
          },
          // Nova consulta termina durante uma existente
          {
            AND: [
              { scheduledAt: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          // Nova consulta engloba uma existente
          {
            AND: [
              { scheduledAt: { gte: scheduledAt } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingAppointment) {
      reply.status(409);
      return {
        success: false,
        error: {
          code: 'TIME_CONFLICT',
          message: 'Horário já ocupado para este médico',
          conflictingAppointment: {
            id: conflictingAppointment.id,
            scheduledAt: conflictingAppointment.scheduledAt,
            endTime: conflictingAppointment.endTime,
          },
        },
      };
    }

    // Verificar se a data não está no passado
    if (scheduledAt <= new Date()) {
      reply.status(400);
      return {
        success: false,
        error: {
          code: 'INVALID_DATE',
          message: 'Não é possível agendar consultas no passado',
        },
      };
    }

    // Criar a consulta
    const appointment = await prisma.appointment.create({
      data: {
        patientId: appointmentData.patientId,
        doctorId: appointmentData.doctorId,
        specialtyId: appointmentData.specialtyId,
        scheduledAt,
        duration,
        endTime,
        reason: appointmentData.reason,
        notes: appointmentData.notes,
        fee: appointmentData.fee,
      },
      include: {
        patient: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            fullName: true,
            doctorProfile: {
              select: {
                crm: true,
              },
            },
          },
        },
        specialty: {
          select: {
            name: true,
            price: true,
          },
        },
      },
    });

    return {
      success: true,
      data: appointment,
      message: 'Consulta agendada com sucesso',
    };
  } catch (error: any) {
    console.error('Error creating appointment:', error);

    if (error.code === 'P2002') {
      reply.status(409);
      return {
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'Conflito de dados na criação da consulta',
        },
      };
    }

    reply.status(500);
    return {
      success: false,
      error: {
        code: 'CREATE_FAILED',
        message: 'Erro ao criar consulta',
      },
    };
  }
});

// Atualizar consulta
fastify.patch('/api/v1/appointments/:id', async (request, reply) => {
  try {
    const { id } = request.params as any;
    const updateData = request.body as any;

    // Buscar consulta existente
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id, deletedAt: null },
    });

    if (!existingAppointment) {
      reply.status(404);
      return {
        success: false,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: 'Consulta não encontrada',
        },
      };
    }

    // Se está mudando horário, verificar conflitos
    if (
      updateData.scheduledAt &&
      updateData.scheduledAt !== existingAppointment.scheduledAt.toISOString()
    ) {
      const newScheduledAt = new Date(updateData.scheduledAt);
      const duration = updateData.duration || existingAppointment.duration;
      const newEndTime = new Date(newScheduledAt.getTime() + duration * 60000);

      const conflictingAppointment = await prisma.appointment.findFirst({
        where: {
          doctorId: existingAppointment.doctorId,
          deletedAt: null,
          status: { not: 'CANCELLED' },
          id: { not: id }, // Excluir a própria consulta
          OR: [
            {
              AND: [
                { scheduledAt: { lte: newScheduledAt } },
                { endTime: { gt: newScheduledAt } },
              ],
            },
            {
              AND: [
                { scheduledAt: { lt: newEndTime } },
                { endTime: { gte: newEndTime } },
              ],
            },
          ],
        },
      });

      if (conflictingAppointment) {
        reply.status(409);
        return {
          success: false,
          error: {
            code: 'TIME_CONFLICT',
            message: 'Novo horário conflita com consulta existente',
          },
        };
      }

      updateData.endTime = newEndTime;
    }

    // Atualizar consulta
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: {
        patient: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
        doctor: {
          select: {
            user: {
              select: { fullName: true },
            },
          },
        },
        specialty: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      success: true,
      data: updatedAppointment,
      message: 'Consulta atualizada com sucesso',
    };
  } catch (error) {
    console.error('Error updating appointment:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'UPDATE_FAILED',
        message: 'Erro ao atualizar consulta',
      },
    };
  }
});

// Cancelar consulta
fastify.patch('/api/v1/appointments/:id/cancel', async (request, reply) => {
  try {
    const { id } = request.params as any;
    const { reason } = request.body as any;

    const cancelledAppointment = await prisma.appointment.update({
      where: { id, deletedAt: null },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason: reason || 'Cancelamento solicitado',
        updatedAt: new Date(),
      },
    });

    return {
      success: true,
      data: cancelledAppointment,
      message: 'Consulta cancelada com sucesso',
    };
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'CANCEL_FAILED',
        message: 'Erro ao cancelar consulta',
      },
    };
  }
});

// Availability - Obter disponibilidade de médico
fastify.get('/api/v1/availability', async (request, reply) => {
  try {
    const query = request.query as any;
    const doctorId = query?.doctorId;
    const date = query?.date; // YYYY-MM-DD format

    if (!doctorId) {
      reply.status(400);
      return {
        success: false,
        error: {
          code: 'MISSING_DOCTOR_ID',
          message: 'ID do médico é obrigatório',
        },
      };
    }

    // Buscar disponibilidade base do médico
    const availability = await prisma.availability.findMany({
      where: {
        doctorId: doctorId,
        isActive: true,
      },
    });

    if (!date) {
      // Retornar disponibilidade geral (horários configurados)
      return {
        success: true,
        data: availability,
      };
    }

    // Para data específica, calcular slots disponíveis
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    const dayAvailability = availability.filter(
      avail => avail.dayOfWeek === dayOfWeek,
    );

    if (!dayAvailability.length) {
      return {
        success: true,
        data: [],
        message: 'Médico não tem disponibilidade neste dia da semana',
      };
    }

    // Buscar consultas já agendadas na data
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: doctorId,
        scheduledAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          not: 'CANCELLED',
        },
        deletedAt: null,
      },
      select: {
        scheduledAt: true,
        endTime: true,
      },
    });

    // Gerar slots disponíveis
    const availableSlots = [];

    for (const avail of dayAvailability) {
      const [startHour, startMinute] = avail.startTime.split(':').map(Number);
      const [endHour, endMinute] = avail.endTime.split(':').map(Number);

      let currentTime = new Date(targetDate);
      currentTime.setHours(startHour, startMinute, 0, 0);

      const endTime = new Date(targetDate);
      endTime.setHours(endHour, endMinute, 0, 0);

      while (currentTime < endTime) {
        const slotEnd = new Date(
          currentTime.getTime() + avail.slotDuration * 60000,
        );

        // Verificar se slot conflita com consulta existente
        const hasConflict = bookedAppointments.some(appointment => {
          const appointmentStart = new Date(appointment.scheduledAt);
          const appointmentEnd = new Date(appointment.endTime);

          return (
            (currentTime >= appointmentStart && currentTime < appointmentEnd) ||
            (slotEnd > appointmentStart && slotEnd <= appointmentEnd) ||
            (currentTime <= appointmentStart && slotEnd >= appointmentEnd)
          );
        });

        if (!hasConflict && currentTime > new Date()) {
          // Não incluir horários passados
          availableSlots.push({
            startTime: currentTime.toISOString(),
            endTime: slotEnd.toISOString(),
            duration: avail.slotDuration,
          });
        }

        currentTime = new Date(
          currentTime.getTime() + avail.slotDuration * 60000,
        );
      }
    }

    return {
      success: true,
      data: availableSlots,
    };
  } catch (error) {
    console.error('Error fetching availability:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'FETCH_FAILED',
        message: 'Erro ao buscar disponibilidade',
      },
    };
  }
});

// Analytics - Real data from database
fastify.get('/api/v1/analytics', async (request, reply) => {
  try {
    console.log('=== ANALYTICS ENDPOINT CALLED ===');

    // Log analytics access
    await createAuditLog({
      action: 'VIEW',
      resource: 'ANALYTICS_DASHBOARD',
      userEmail: 'admin@eoclinica.com.br',
      ipAddress:
        request.headers['x-forwarded-for']?.toString() ||
        request.ip ||
        '127.0.0.1',
      userAgent: request.headers['user-agent'] || 'Unknown',
      newValues: {
        accessTime: new Date().toISOString(),
        requestQuery: request.query,
      },
    });

    // Calculate date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPreviousMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
    );
    const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const startOfToday = new Date(now.toDateString());
    const endOfToday = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Get real data from database
    const [
      totalPatients,
      totalAppointments,
      todayAppointments,
      thisMonthPatients,
      previousMonthPatients,
      completedAppointments,
      cancelledAppointments,
      totalRevenue,
    ] = await Promise.all([
      // Total patients (all time)
      prisma.user.count({
        where: {
          role: 'PATIENT',
          deletedAt: null,
        },
      }),
      // Total appointments
      prisma.appointment.count({
        where: {
          deletedAt: null,
        },
      }),
      // Today's appointments
      prisma.appointment.count({
        where: {
          scheduledAt: {
            gte: startOfToday,
            lt: endOfToday,
          },
          deletedAt: null,
        },
      }),
      // This month new patients
      prisma.user.count({
        where: {
          role: 'PATIENT',
          createdAt: {
            gte: startOfMonth,
          },
          deletedAt: null,
        },
      }),
      // Previous month patients (for growth calculation)
      prisma.user.count({
        where: {
          role: 'PATIENT',
          createdAt: {
            gte: startOfPreviousMonth,
            lt: endOfPreviousMonth,
          },
          deletedAt: null,
        },
      }),
      // Completed appointments
      prisma.appointment.count({
        where: {
          status: 'COMPLETED',
          deletedAt: null,
        },
      }),
      // Cancelled appointments
      prisma.appointment.count({
        where: {
          status: 'CANCELLED',
          deletedAt: null,
        },
      }),
      // Total revenue from completed appointments
      prisma.appointment.aggregate({
        where: {
          status: 'COMPLETED',
          fee: { not: null },
          deletedAt: null,
        },
        _sum: {
          fee: true,
        },
      }),
    ]);

    // Calculate growth rates
    const patientGrowth =
      previousMonthPatients > 0
        ? ((thisMonthPatients - previousMonthPatients) /
            previousMonthPatients) *
          100
        : thisMonthPatients > 0
          ? 100
          : 0;

    // Calculate conversion and retention rates
    const totalScheduledAppointments = totalAppointments;
    const conversionRate =
      totalScheduledAppointments > 0
        ? (completedAppointments / totalScheduledAppointments) * 100
        : 0;

    const cancellationRate =
      totalScheduledAppointments > 0
        ? (cancelledAppointments / totalScheduledAppointments) * 100
        : 0;

    console.log('Analytics data:', {
      totalPatients,
      totalAppointments,
      todayAppointments,
      thisMonthPatients,
      completedAppointments,
      totalRevenue: totalRevenue._sum.fee || 0,
    });

    return {
      success: true,
      data: {
        overview: {
          totalRevenue: Number(totalRevenue._sum.fee || 0),
          totalAppointments,
          totalPatients,
          averageRating: 0, // No rating system implemented yet
          revenueGrowth: 0, // Would need previous month revenue to calculate
          appointmentGrowth: 0, // Would need previous month appointments to calculate
          patientGrowth: Number(patientGrowth.toFixed(1)),
          satisfactionGrowth: 0,
        },
        advanced: {
          conversionRate: Number(conversionRate.toFixed(1)),
          churnRate: Number(cancellationRate.toFixed(1)),
          customerLifetimeValue:
            totalPatients > 0
              ? Number((totalRevenue._sum.fee || 0) / totalPatients).toFixed(2)
              : 0,
          averageSessionTime: 0, // Not tracking session time yet
          bounceRate: 0, // Not tracking bounce rate yet
          retentionRate: Number((100 - cancellationRate).toFixed(1)),
          npsScore: 0, // No NPS survey implemented yet
          operationalEfficiency: Number((100 - cancellationRate).toFixed(1)),
        },
        predictions: {
          nextMonthRevenue: 0, // Would need historical data for prediction
          nextMonthAppointments: 0, // Would need historical data for prediction
          capacity: 0, // Would need doctor availability data
          demandForecast:
            thisMonthPatients > previousMonthPatients
              ? 'Crescente'
              : thisMonthPatients < previousMonthPatients
                ? 'Decrescente'
                : 'Estável',
          seasonalTrends:
            thisMonthPatients > 0
              ? [`Novos pacientes este mês: ${thisMonthPatients}`]
              : ['Nenhum dado disponível'],
        },
        realTime: {
          activeUsers: 0, // Not tracking active users yet
          todayBookings: todayAppointments,
          systemLoad: 0, // Not monitoring system load yet
          responseTime: 0, // Not monitoring response time yet
        },
      },
    };
  } catch (error) {
    console.error('Analytics error:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'ANALYTICS_ERROR',
        message: 'Erro ao buscar dados de analytics',
      },
    };
  }
});

// Revenue Chart Data - Real data for dashboard graphs
fastify.get('/api/v1/analytics/revenue-chart', async (request, reply) => {
  try {
    const query = request.query as any;
    const period = query?.period || 'month'; // week, month, quarter, year

    const now = new Date();
    let rangeStart: Date;

    switch (period) {
      case 'week':
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        rangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        rangeStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get completed appointments with fees in the period
    const appointments = await prisma.appointment.findMany({
      where: {
        status: 'COMPLETED',
        fee: { not: null },
        scheduledAt: {
          gte: rangeStart,
          lte: now,
        },
        deletedAt: null,
      },
      select: {
        scheduledAt: true,
        fee: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Group by date and sum revenue
    const revenueByDate = new Map<string, number>();

    appointments.forEach(appointment => {
      if (appointment.scheduledAt && appointment.fee) {
        const dateKey = appointment.scheduledAt.toISOString().split('T')[0];
        const currentRevenue = revenueByDate.get(dateKey) || 0;
        revenueByDate.set(dateKey, currentRevenue + Number(appointment.fee));
      }
    });

    // Convert to chart format
    const chartData = Array.from(revenueByDate.entries()).map(
      ([date, revenue]) => ({
        date,
        revenue,
      }),
    );

    return {
      success: true,
      data: chartData,
    };
  } catch (error) {
    console.error('Revenue chart error:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'CHART_ERROR',
        message: 'Erro ao buscar dados do gráfico',
      },
    };
  }
});

// Appointments Chart Data - Real data for appointment trends
fastify.get('/api/v1/analytics/appointments-chart', async (request, reply) => {
  try {
    const query = request.query as any;
    const period = query?.period || 'month';

    const now = new Date();
    let rangeStart: Date;

    switch (period) {
      case 'week':
        rangeStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        rangeStart = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        rangeStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        rangeStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get appointments grouped by date and status
    const appointments = await prisma.appointment.groupBy({
      by: ['scheduledAt', 'status'],
      where: {
        scheduledAt: {
          gte: rangeStart,
          lte: now,
        },
        deletedAt: null,
      },
      _count: {
        id: true,
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    // Group by date
    const appointmentsByDate = new Map<
      string,
      { scheduled: number; completed: number; cancelled: number }
    >();

    appointments.forEach(appointment => {
      const dateKey = appointment.scheduledAt.toISOString().split('T')[0];

      if (!appointmentsByDate.has(dateKey)) {
        appointmentsByDate.set(dateKey, {
          scheduled: 0,
          completed: 0,
          cancelled: 0,
        });
      }

      const dayData = appointmentsByDate.get(dateKey)!;

      switch (appointment.status) {
        case 'COMPLETED':
          dayData.completed += appointment._count.id;
          break;
        case 'CANCELLED':
          dayData.cancelled += appointment._count.id;
          break;
        default:
          dayData.scheduled += appointment._count.id;
      }
    });

    // Convert to chart format
    const chartData = Array.from(appointmentsByDate.entries()).map(
      ([date, counts]) => ({
        date,
        ...counts,
        total: counts.scheduled + counts.completed + counts.cancelled,
      }),
    );

    return {
      success: true,
      data: chartData,
    };
  } catch (error) {
    console.error('Appointments chart error:', error);
    reply.status(500);
    return {
      success: false,
      error: {
        code: 'CHART_ERROR',
        message: 'Erro ao buscar dados do gráfico de consultas',
      },
    };
  }
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  console.error('Error:', error);
  reply.status(500).send({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Erro interno do servidor',
    },
  });
});

// Iniciar servidor
const start = async () => {
  try {
    await fastify.listen({
      port: Number(process.env.PORT) || 3000,
      host: '0.0.0.0',
    });

    console.log(
      '[SUCCESS] EO Clínica Server running on port',
      process.env.PORT || 3000,
    );
    console.log('[INFO] API ready for authentication');
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

// Mock Audit Logs endpoint for development
fastify.get('/api/v1/audit/logs', async (request, reply) => {
  try {
    const query = request.query as any;
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;

    // Log access to audit logs
    await createAuditLog({
      action: 'VIEW',
      resource: 'AUDIT_LOGS',
      userEmail: 'admin@eoclinica.com.br',
      ipAddress:
        request.headers['x-forwarded-for']?.toString() ||
        request.ip ||
        '127.0.0.1',
      userAgent: request.headers['user-agent'] || 'Unknown',
      newValues: {
        page,
        limit,
        accessTime: new Date().toISOString(),
      },
    });

    // Get real audit logs from database
    const auditLogs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.auditLog.count();

    return {
      success: true,
      data: {
        logs: auditLogs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error('Audit logs error:', error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'AUDIT_ERROR',
        message: 'Error fetching audit logs',
      },
    });
  }
});

start();
