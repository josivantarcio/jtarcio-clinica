import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import supertest from 'supertest';
import { buildFastifyApp } from '../../src/app';
import { FastifyInstance } from 'fastify';

describe('Authentication Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let redis: Redis;
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(async () => {
    // Initialize test database
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL,
        },
      },
    });

    // Initialize test Redis
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 1, // Use test database
    });

    // Initialize Fastify app
    app = await buildFastifyApp({ prisma, redis });
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await redis.quit();
    await app.close();
  });

  beforeEach(async () => {
    // Clean test data before each test
    await prisma.message.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.user.deleteMany();
    await redis.flushdb();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register new patient successfully', async () => {
      // Arrange
      const registerData = {
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao.silva@test.com',
        password: 'Password123!',
        cpf: '123.456.789-01',
        phone: '11999887766',
        role: 'PATIENT',
      };

      // Act
      const response = await request
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          user: {
            id: expect.any(String),
            email: registerData.email,
            fullName: 'João Silva',
            role: 'PATIENT',
          },
        },
      });

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: registerData.email },
        include: { patient: true },
      });

      expect(user).toBeTruthy();
      expect(user?.email).toBe(registerData.email);
      expect(user?.patient).toBeTruthy();
    });

    it('should reject registration with existing email', async () => {
      // Arrange
      const userData = {
        firstName: 'Existing',
        lastName: 'User',
        email: 'existing@test.com',
        password: 'Password123!',
        role: 'PATIENT',
      };

      // Create user first
      await request.post('/api/v1/auth/register').send(userData);

      // Act - Try to register with same email
      const response = await request
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(400);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: expect.stringContaining('Email já cadastrado'),
        },
      });
    });

    it('should validate required fields', async () => {
      // Act
      const response = await request
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate password strength', async () => {
      // Arrange
      const weakPasswordData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: '123',
        role: 'PATIENT',
      };

      // Act
      const response = await request
        .post('/api/v1/auth/register')
        .send(weakPasswordData)
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('senha');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request.post('/api/v1/auth/register').send({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'Password123!',
        role: 'PATIENT',
      });
    });

    it('should login with valid credentials', async () => {
      // Act
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'Password123!',
        })
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
          user: {
            email: 'test@test.com',
            fullName: 'Test User',
            role: 'PATIENT',
          },
        },
      });

      // Verify JWT token structure
      const token = response.body.data.accessToken;
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should reject login with invalid password', async () => {
      // Act
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: 'test@test.com',
          password: 'WrongPassword123!',
        })
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Email ou senha inválidos',
        },
      });
    });

    it('should reject login with non-existent email', async () => {
      // Act
      const response = await request
        .post('/api/v1/auth/login')
        .send({
          email: 'notfound@test.com',
          password: 'Password123!',
        })
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should validate required fields for login', async () => {
      // Act
      const response = await request
        .post('/api/v1/auth/login')
        .send({})
        .expect(400);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login to get token
      const registerResponse = await request
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          password: 'Password123!',
          role: 'PATIENT',
        });

      authToken = registerResponse.body.data.accessToken;
    });

    it('should return user profile with valid token', async () => {
      // Act
      const response = await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: expect.any(String),
          email: 'test@test.com',
          fullName: 'Test User',
          role: 'PATIENT',
          patient: expect.any(Object),
        },
      });
    });

    it('should reject request without token', async () => {
      // Act
      const response = await request
        .get('/api/v1/auth/me')
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'AUTH_REQUIRED',
          message: 'Token de acesso obrigatório',
        },
      });
    });

    it('should reject request with invalid token', async () => {
      // Act
      const response = await request
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid_token_here')
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Register and login to get refresh token
      const registerResponse = await request
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@test.com',
          password: 'Password123!',
          role: 'PATIENT',
        });

      // Assuming refresh token is returned in registration/login
      refreshToken = registerResponse.body.data.refreshToken || 'mock_refresh_token';
    });

    it('should refresh access token with valid refresh token', async () => {
      // Act
      const response = await request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        data: {
          accessToken: expect.any(String),
        },
      });
    });

    it('should reject invalid refresh token', async () => {
      // Act
      const response = await request
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid_refresh_token' })
        .expect(401);

      // Assert
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('Role-based Access Control', () => {
    let patientToken: string;
    let adminToken: string;

    beforeEach(async () => {
      // Create patient
      const patientResponse = await request
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Patient',
          lastName: 'User',
          email: 'patient@test.com',
          password: 'Password123!',
          role: 'PATIENT',
        });
      patientToken = patientResponse.body.data.accessToken;

      // Create admin user directly in database
      const adminUser = await prisma.user.create({
        data: {
          firstName: 'Admin',
          lastName: 'User',
          fullName: 'Admin User',
          email: 'admin@test.com',
          password: await require('bcryptjs').hash('Password123!', 12),
          role: 'ADMIN',
          status: 'ACTIVE',
        },
      });

      // Login as admin
      const adminLoginResponse = await request
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'Password123!',
        });
      adminToken = adminLoginResponse.body.data.accessToken;
    });

    it('should allow admin access to protected routes', async () => {
      // Act
      const response = await request
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should deny patient access to admin routes', async () => {
      // Act
      const response = await request
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: expect.stringContaining('permissão'),
        },
      });
    });
  });

  describe('Session Management', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      const registerResponse = await request
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Session',
          lastName: 'User',
          email: 'session@test.com',
          password: 'Password123!',
          role: 'PATIENT',
        });

      authToken = registerResponse.body.data.accessToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should track user sessions in Redis', async () => {
      // Act - Make authenticated request
      await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      // Assert - Check Redis for session data
      const sessionKey = `session:${userId}`;
      const sessionData = await redis.get(sessionKey);
      expect(sessionData).toBeTruthy();
    });

    it('should invalidate session on logout', async () => {
      // Arrange - Create session
      await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      // Act - Logout
      await request
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert - Token should be invalid
      await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to login attempts', async () => {
      const loginData = {
        email: 'test@test.com',
        password: 'wrong_password',
      };

      // Make multiple failed login attempts
      const attempts = [];
      for (let i = 0; i < 6; i++) {
        attempts.push(
          request.post('/api/v1/auth/login').send(loginData)
        );
      }

      const responses = await Promise.all(attempts);

      // First few should return 401 (unauthorized)
      expect(responses[0].status).toBe(401);
      expect(responses[1].status).toBe(401);

      // Last one should return 429 (rate limited)
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
      expect(lastResponse.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('Password Security', () => {
    it('should not return password hash in responses', async () => {
      // Act
      const response = await request
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Secure',
          lastName: 'User',
          email: 'secure@test.com',
          password: 'Password123!',
          role: 'PATIENT',
        });

      // Assert
      expect(response.body.data.user.password).toBeUndefined();
      
      // Also check profile endpoint
      const profileResponse = await request
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${response.body.data.accessToken}`);
      
      expect(profileResponse.body.data.password).toBeUndefined();
    });

    it('should hash passwords securely', async () => {
      // Arrange
      const password = 'TestPassword123!';
      
      await request
        .post('/api/v1/auth/register')
        .send({
          firstName: 'Hash',
          lastName: 'Test',
          email: 'hash@test.com',
          password: password,
          role: 'PATIENT',
        });

      // Act - Get user from database
      const user = await prisma.user.findUnique({
        where: { email: 'hash@test.com' },
      });

      // Assert
      expect(user?.password).toBeDefined();
      expect(user?.password).not.toBe(password); // Should be hashed
      expect(user?.password?.length).toBeGreaterThan(50); // Bcrypt hash length
    });
  });
});
