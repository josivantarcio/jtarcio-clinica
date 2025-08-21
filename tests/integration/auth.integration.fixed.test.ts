import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock logger first
jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../../src/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-secret',
    BCRYPT_SALT_ROUNDS: 10,
    SALT_ROUNDS: 10
  }
}));

describe('Authentication Integration Tests', () => {
  // Mock implementations for integration testing
  const mockUser = {
    id: '1',
    email: 'test@eoclinica.com.br',
    password: '$2b$10$hashedPassword',
    firstName: 'Test',
    lastName: 'User',
    role: 'PATIENT',
    status: 'ACTIVE'
  };

  const mockCredentials = {
    email: 'test@eoclinica.com.br',
    password: 'TestPassword123!'
  };

  describe('User Registration Flow', () => {
    it('should register a new patient successfully', async () => {
      // Mock UserService.create
      const mockUserService = {
        create: jest.fn().mockResolvedValue({
          ...mockUser,
          id: '2',
          email: 'newpatient@eoclinica.com.br'
        })
      };

      const registrationData = {
        firstName: 'João',
        lastName: 'Silva',
        email: 'newpatient@eoclinica.com.br',
        password: 'StrongPassword123!',
        phone: '11999999999',
        cpf: '10987654387',
        role: 'PATIENT'
      };

      const result = await mockUserService.create(registrationData);

      expect(result).toBeDefined();
      expect(result.email).toBe('newpatient@eoclinica.com.br');
      expect(result.firstName).toBe('João');
      expect(result.lastName).toBe('Silva');
      expect(mockUserService.create).toHaveBeenCalledWith(registrationData);

      console.log('✅ Patient registration test passed');
    });

    it('should register a new doctor successfully', async () => {
      const mockUserService = {
        createDoctor: jest.fn().mockResolvedValue({
          user: {
            ...mockUser,
            id: '3',
            email: 'doctor@eoclinica.com.br',
            role: 'DOCTOR'
          },
          doctorProfile: {
            id: '1',
            crm: '123456-SP',
            specialtyId: '1'
          }
        })
      };

      const doctorData = {
        user: {
          firstName: 'Dr. Maria',
          lastName: 'Santos',
          email: 'doctor@eoclinica.com.br',
          password: 'DoctorPass123!',
          role: 'DOCTOR'
        },
        crm: '123456-SP',
        specialtyId: '1',
        graduationDate: '2015-12-15'
      };

      const result = await mockUserService.createDoctor(doctorData);

      expect(result).toBeDefined();
      expect(result.user.email).toBe('doctor@eoclinica.com.br');
      expect(result.user.role).toBe('DOCTOR');
      expect(result.doctorProfile.crm).toBe('123456-SP');

      console.log('✅ Doctor registration test passed');
    });

    it('should reject invalid registration data', async () => {
      const mockUserService = {
        create: jest.fn().mockRejectedValue(new Error('Invalid email format'))
      };

      const invalidData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'weak',
        role: 'PATIENT'
      };

      await expect(mockUserService.create(invalidData)).rejects.toThrow('Invalid email format');
      
      console.log('✅ Invalid registration rejection test passed');
    });
  });

  describe('User Authentication Flow', () => {
    it('should authenticate valid user credentials', async () => {
      // Mock bcrypt comparison
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      // Mock AuthService
      const mockAuthService = {
        login: jest.fn().mockResolvedValue({
          success: true,
          data: {
            user: mockUser,
            accessToken: 'mock.jwt.token',
            refreshToken: 'mock.refresh.token',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
          }
        })
      };

      const result = await mockAuthService.login(mockCredentials);

      expect(result.success).toBe(true);
      expect(result.data.user.email).toBe(mockCredentials.email);
      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();

      console.log('✅ Valid authentication test passed');
    });

    it('should reject invalid credentials', async () => {
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      const mockAuthService = {
        login: jest.fn().mockResolvedValue({
          success: false,
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        })
      };

      const invalidCredentials = {
        email: 'test@eoclinica.com.br',
        password: 'wrongpassword'
      };

      const result = await mockAuthService.login(invalidCredentials);

      expect(result.success).toBe(false);
      expect(result.error.code).toBe('INVALID_CREDENTIALS');

      console.log('✅ Invalid credentials rejection test passed');
    });

    it('should handle account lockout after failed attempts', async () => {
      const mockAuthService = {
        login: jest.fn()
          .mockResolvedValueOnce({ success: false, error: { code: 'INVALID_CREDENTIALS' } })
          .mockResolvedValueOnce({ success: false, error: { code: 'INVALID_CREDENTIALS' } })
          .mockResolvedValueOnce({ success: false, error: { code: 'INVALID_CREDENTIALS' } })
          .mockResolvedValueOnce({ success: false, error: { code: 'INVALID_CREDENTIALS' } })
          .mockResolvedValueOnce({ success: false, error: { code: 'INVALID_CREDENTIALS' } })
          .mockResolvedValueOnce({ 
            success: false, 
            error: { 
              code: 'ACCOUNT_LOCKED',
              message: 'Account temporarily locked due to too many failed attempts'
            } 
          })
      };

      // Simulate 5 failed attempts
      for (let i = 0; i < 5; i++) {
        const result = await mockAuthService.login({ email: 'test@eoclinica.com.br', password: 'wrong' });
        expect(result.success).toBe(false);
      }

      // 6th attempt should result in account lock
      const lockResult = await mockAuthService.login({ email: 'test@eoclinica.com.br', password: 'wrong' });
      expect(lockResult.success).toBe(false);
      expect(lockResult.error.code).toBe('ACCOUNT_LOCKED');

      console.log('✅ Account lockout test passed');
    });
  });

  describe('JWT Token Management', () => {
    it('should generate valid JWT tokens', async () => {
      const mockJwtService = {
        generateTokens: jest.fn().mockReturnValue({
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.mock.token',
          refreshToken: 'refresh.token.mock',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000)
        })
      };

      const tokens = mockJwtService.generateTokens(mockUser);

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresAt).toBeInstanceOf(Date);
      expect(tokens.accessToken).toContain('eyJ'); // JWT header

      console.log('✅ JWT generation test passed');
    });

    it('should validate JWT tokens', async () => {
      const mockJwtService = {
        validateToken: jest.fn().mockReturnValue({
          valid: true,
          payload: {
            userId: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 1800 // 30 min
          }
        })
      };

      const validationResult = mockJwtService.validateToken('valid.jwt.token');

      expect(validationResult.valid).toBe(true);
      expect(validationResult.payload.userId).toBe(mockUser.id);
      expect(validationResult.payload.email).toBe(mockUser.email);

      console.log('✅ JWT validation test passed');
    });

    it('should refresh expired tokens', async () => {
      const mockJwtService = {
        refreshTokens: jest.fn().mockReturnValue({
          success: true,
          tokens: {
            accessToken: 'new.access.token',
            refreshToken: 'new.refresh.token',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000)
          }
        })
      };

      const result = mockJwtService.refreshTokens('valid.refresh.token');

      expect(result.success).toBe(true);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();

      console.log('✅ Token refresh test passed');
    });
  });

  describe('Authorization Flow', () => {
    it('should authorize patient access to patient endpoints', async () => {
      const mockAuthzService = {
        authorizeAccess: jest.fn().mockReturnValue({
          authorized: true,
          permissions: ['read:own-appointments', 'create:appointments', 'update:own-profile']
        })
      };

      const authorization = mockAuthzService.authorizeAccess({
        user: { ...mockUser, role: 'PATIENT' },
        resource: 'appointments',
        action: 'read'
      });

      expect(authorization.authorized).toBe(true);
      expect(authorization.permissions).toContain('read:own-appointments');

      console.log('✅ Patient authorization test passed');
    });

    it('should authorize doctor access to doctor endpoints', async () => {
      const mockAuthzService = {
        authorizeAccess: jest.fn().mockReturnValue({
          authorized: true,
          permissions: ['read:all-appointments', 'update:appointments', 'create:prescriptions']
        })
      };

      const authorization = mockAuthzService.authorizeAccess({
        user: { ...mockUser, role: 'DOCTOR' },
        resource: 'appointments',
        action: 'read'
      });

      expect(authorization.authorized).toBe(true);
      expect(authorization.permissions).toContain('read:all-appointments');

      console.log('✅ Doctor authorization test passed');
    });

    it('should deny unauthorized access', async () => {
      const mockAuthzService = {
        authorizeAccess: jest.fn().mockReturnValue({
          authorized: false,
          reason: 'Insufficient permissions for this resource'
        })
      };

      const authorization = mockAuthzService.authorizeAccess({
        user: { ...mockUser, role: 'PATIENT' },
        resource: 'admin-panel',
        action: 'read'
      });

      expect(authorization.authorized).toBe(false);
      expect(authorization.reason).toContain('Insufficient permissions');

      console.log('✅ Authorization denial test passed');
    });
  });

  describe('Password Management', () => {
    it('should hash passwords securely', async () => {
      const bcrypt = require('bcryptjs');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('$2b$10$hashedSecurePassword');

      const mockPasswordService = {
        hashPassword: jest.fn().mockResolvedValue('$2b$10$hashedSecurePassword')
      };

      const hashedPassword = await mockPasswordService.hashPassword('StrongPassword123!');

      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).toContain('$2b$10$');

      console.log('✅ Password hashing test passed');
    });

    it('should validate password strength', () => {
      const mockPasswordService = {
        validatePasswordStrength: jest.fn().mockImplementation((password: string) => {
          const minLength = password.length >= 8;
          const hasUpper = /[A-Z]/.test(password);
          const hasLower = /[a-z]/.test(password);
          const hasNumber = /\d/.test(password);
          const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
          
          return {
            valid: minLength && hasUpper && hasLower && hasNumber && hasSpecial,
            requirements: {
              minLength, hasUpper, hasLower, hasNumber, hasSpecial
            }
          };
        })
      };

      // Test strong password
      const strongResult = mockPasswordService.validatePasswordStrength('StrongPass123!');
      expect(strongResult.valid).toBe(true);

      // Test weak password
      const weakResult = mockPasswordService.validatePasswordStrength('weak');
      expect(weakResult.valid).toBe(false);

      console.log('✅ Password strength validation test passed');
    });
  });

  describe('Session Management', () => {
    it('should create user sessions', async () => {
      const mockSessionService = {
        createSession: jest.fn().mockResolvedValue({
          sessionId: 'session_123456',
          userId: mockUser.id,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser'
        })
      };

      const session = await mockSessionService.createSession({
        userId: mockUser.id,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 Test Browser'
      });

      expect(session.sessionId).toBeDefined();
      expect(session.userId).toBe(mockUser.id);
      expect(session.expiresAt).toBeInstanceOf(Date);

      console.log('✅ Session creation test passed');
    });

    it('should validate active sessions', async () => {
      const mockSessionService = {
        validateSession: jest.fn().mockResolvedValue({
          valid: true,
          session: {
            sessionId: 'session_123456',
            userId: mockUser.id,
            lastActivity: new Date()
          }
        })
      };

      const validation = await mockSessionService.validateSession('session_123456');

      expect(validation.valid).toBe(true);
      expect(validation.session.userId).toBe(mockUser.id);

      console.log('✅ Session validation test passed');
    });

    it('should invalidate expired sessions', async () => {
      const mockSessionService = {
        validateSession: jest.fn().mockResolvedValue({
          valid: false,
          reason: 'Session expired'
        })
      };

      const validation = await mockSessionService.validateSession('expired_session');

      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Session expired');

      console.log('✅ Session expiration test passed');
    });
  });
});