import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { UserService } from '../../src/services/user.service';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('bcryptjs');

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  patient: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
} as unknown as PrismaClient;

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService - Unit Tests', () => {
  let userService: UserService;

  beforeEach(() => {
    jest.clearAllMocks();
    userService = new UserService(mockPrisma);
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      // Arrange
      const userData = {
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao@test.com',
        password: 'password123',
        role: 'PATIENT' as const,
      };

      const hashedPassword = 'hashed_password_123';
      const createdUser = {
        id: 'user_123',
        ...userData,
        password: hashedPassword,
        fullName: 'João Silva',
      };

      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockPrisma.user.findUnique.mockResolvedValue(null); // Email doesn't exist
      mockPrisma.user.create.mockResolvedValue(createdUser);

      // Act
      const result = await userService.create(userData);

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          ...userData,
          password: hashedPassword,
          fullName: 'João Silva',
        },
      });
      expect(result).toEqual(createdUser);
    });

    it('should throw error if email already exists', async () => {
      // Arrange
      const userData = {
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao@test.com',
        password: 'password123',
        role: 'PATIENT' as const,
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing_user' });

      // Act & Assert
      await expect(userService.create(userData)).rejects.toThrow('Email já cadastrado');
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should generate fullName if not provided', async () => {
      // Arrange
      const userData = {
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria@test.com',
        password: 'password123',
        role: 'PATIENT' as const,
      };

      mockBcrypt.hash.mockResolvedValue('hashed_password');
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({ ...userData, id: 'user_123' });

      // Act
      await userService.create(userData);

      // Assert
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fullName: 'Maria Santos',
        }),
      });
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      // Arrange
      const email = 'test@test.com';
      const user = { id: 'user_123', email, fullName: 'Test User' };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      // Act
      const result = await userService.findByEmail(email);

      // Assert
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email },
        include: expect.any(Object),
      });
      expect(result).toEqual(user);
    });

    it('should return null if user not found', async () => {
      // Arrange
      const email = 'notfound@test.com';
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await userService.findByEmail(email);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return true for correct password', async () => {
      // Arrange
      const password = 'correct_password';
      const hashedPassword = 'hashed_password_123';
      mockBcrypt.compare.mockResolvedValue(true);

      // Act
      const result = await userService.validatePassword(password, hashedPassword);

      // Assert
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      // Arrange
      const password = 'wrong_password';
      const hashedPassword = 'hashed_password_123';
      mockBcrypt.compare.mockResolvedValue(false);

      // Act
      const result = await userService.validatePassword(password, hashedPassword);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      // Arrange
      const userId = 'user_123';
      const updateData = {
        firstName: 'João Updated',
        phone: '11999887766',
      };

      const updatedUser = {
        id: userId,
        ...updateData,
        fullName: 'João Updated Silva',
      };

      mockPrisma.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.update(userId, updateData);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        include: expect.any(Object),
      });
      expect(result).toEqual(updatedUser);
    });

    it('should hash password if provided in update', async () => {
      // Arrange
      const userId = 'user_123';
      const updateData = {
        password: 'new_password_123',
      };

      const hashedPassword = 'new_hashed_password';
      mockBcrypt.hash.mockResolvedValue(hashedPassword);
      mockPrisma.user.update.mockResolvedValue({ id: userId });

      // Act
      await userService.update(userId, updateData);

      // Assert
      expect(mockBcrypt.hash).toHaveBeenCalledWith('new_password_123', 12);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { password: hashedPassword },
        include: expect.any(Object),
      });
    });
  });

  describe('softDelete', () => {
    it('should mark user as inactive', async () => {
      // Arrange
      const userId = 'user_123';
      const deletedUser = {
        id: userId,
        status: 'INACTIVE',
        deletedAt: new Date(),
      };

      mockPrisma.user.update.mockResolvedValue(deletedUser);

      // Act
      const result = await userService.softDelete(userId);

      // Assert
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          status: 'INACTIVE',
          deletedAt: expect.any(Date),
        },
      });
      expect(result).toEqual(deletedUser);
    });
  });

  describe('validation methods', () => {
    describe('validateEmail', () => {
      it('should return true for valid email', () => {
        const validEmails = [
          'test@test.com',
          'user.name@domain.co.uk',
          'user+tag@domain.com',
        ];

        validEmails.forEach(email => {
          expect(userService.validateEmail(email)).toBe(true);
        });
      });

      it('should return false for invalid email', () => {
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          'user..name@domain.com',
        ];

        invalidEmails.forEach(email => {
          expect(userService.validateEmail(email)).toBe(false);
        });
      });
    });

    describe('validatePassword', () => {
      it('should return true for strong password', () => {
        const strongPasswords = [
          'StrongPass123!',
          'Myp@ssw0rd2024',
          'Secure#Pass1',
        ];

        strongPasswords.forEach(password => {
          expect(userService.validatePasswordStrength(password)).toBe(true);
        });
      });

      it('should return false for weak password', () => {
        const weakPasswords = [
          '123456',
          'password',
          'abc',
          'PASSWORD123',
          'password123',
        ];

        weakPasswords.forEach(password => {
          expect(userService.validatePasswordStrength(password)).toBe(false);
        });
      });
    });

    describe('validateCPF', () => {
      it('should return true for valid CPF', () => {
        const validCPFs = [
          '123.456.789-01',
          '12345678901',
          '111.444.777-35',
        ];

        validCPFs.forEach(cpf => {
          expect(userService.validateCPF(cpf)).toBe(true);
        });
      });

      it('should return false for invalid CPF', () => {
        const invalidCPFs = [
          '123.456.789-00',
          '111.111.111-11',
          '123456789',
          'abc.def.ghi-jk',
        ];

        invalidCPFs.forEach(cpf => {
          expect(userService.validateCPF(cpf)).toBe(false);
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'password123',
        role: 'PATIENT' as const,
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed_password');
      mockPrisma.user.create.mockRejectedValue(new Error('Database connection failed'));

      // Act & Assert
      await expect(userService.create(userData)).rejects.toThrow('Database connection failed');
    });

    it('should handle bcrypt errors gracefully', async () => {
      // Arrange
      const userData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@test.com',
        password: 'password123',
        role: 'PATIENT' as const,
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockRejectedValue(new Error('Bcrypt error'));

      // Act & Assert
      await expect(userService.create(userData)).rejects.toThrow('Bcrypt error');
    });
  });
});
