import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UserService } from '../../src/services/user.service';
import { PrismaClient } from '../../src/database/generated/client';
import { UserRole, UserStatus } from '../../src/types/user';
import bcrypt from 'bcryptjs';

// Mock dependencies
jest.mock('bcryptjs');
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
    SALT_ROUNDS: 12,
    BCRYPT_SALT_ROUNDS: 12
  }
}));

const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('UserService - Testes Unitários', () => {
  let userService: UserService;
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    // Mock Prisma Client
    mockPrisma = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      appointment: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      patient: {
        create: jest.fn(),
      },
      doctor: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    } as any;

    userService = new UserService(mockPrisma);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('deveria retornar lista de usuários com paginação', async () => {
      const mockUsers = [
        {
          id: '1',
          firstName: 'João',
          lastName: 'Silva',
          email: 'joao@eoclinica.com.br',
          role: 'PATIENT' as UserRole,
          status: 'ACTIVE' as UserStatus,
          createdAt: new Date(),
          patientProfile: null,
          doctorProfile: null,
          appointments: []
        }
      ];

      mockPrisma.user.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await userService.findAll({ page: 1, limit: 10 });

      expect(result.users).toEqual(mockUsers);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1
      });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null }
      });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object)
      });
    });

    it('deveria filtrar usuários por role', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await userService.findAll({ role: 'DOCTOR' as UserRole });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: { deletedAt: null, role: 'DOCTOR' }
      });
    });

    it('deveria filtrar usuários por search', async () => {
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await userService.findAll({ search: 'João' });

      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          OR: [
            { firstName: { contains: 'João', mode: 'insensitive' } },
            { lastName: { contains: 'João', mode: 'insensitive' } },
            { fullName: { contains: 'João', mode: 'insensitive' } },
            { email: { contains: 'João', mode: 'insensitive' } },
            { phone: { contains: 'João' } },
            { cpf: { contains: 'João' } },
          ]
        }
      });
    });
  });

  describe('findById', () => {
    it('deveria retornar usuário quando encontrado', async () => {
      const mockUser = {
        id: '1',
        firstName: 'João',
        lastName: 'Silva',
        email: 'joao@eoclinica.com.br',
        role: 'PATIENT' as UserRole,
        status: 'ACTIVE' as UserStatus,
        patientProfile: null,
        doctorProfile: null,
        appointments: []
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      const result = await userService.findById('1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { id: '1', deletedAt: null },
        include: expect.any(Object)
      });
    });

    it('deveria lançar erro quando usuário não encontrado', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.findById('inexistente')).rejects.toThrow('User not found');
    });
  });

  describe('update', () => {
    it('deveria atualizar usuário existente', async () => {
      const existingUser = { id: '1', email: 'joao@eoclinica.com.br' };
      const updatedUser = { ...existingUser, firstName: 'João Atualizado' };

      mockPrisma.user.findFirst.mockResolvedValue(existingUser as any);
      mockPrisma.user.update.mockResolvedValue(updatedUser as any);

      const result = await userService.update('1', { firstName: 'João Atualizado' });

      expect(result).toEqual(updatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          firstName: 'João Atualizado',
          updatedAt: expect.any(Date)
        },
        include: expect.any(Object)
      });
    });

    it('deveria lançar erro quando usuário não encontrado para atualização', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.update('inexistente', { firstName: 'Teste' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('delete (soft delete)', () => {
    it('deveria fazer soft delete do usuário', async () => {
      const existingUser = { id: '1', email: 'joao@eoclinica.com.br' };

      mockPrisma.user.findFirst.mockResolvedValue(existingUser as any);
      mockPrisma.user.update.mockResolvedValue(undefined);

      await userService.delete('1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          deletedAt: expect.any(Date),
          status: 'INACTIVE'
        }
      });
    });

    it('deveria lançar erro quando usuário não encontrado para deletar', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userService.delete('inexistente')).rejects.toThrow('User not found');
    });
  });

  describe('create', () => {
    it('deveria criar novo usuário paciente', async () => {
      const userData = {
        firstName: 'Maria',
        lastName: 'Santos',
        email: 'maria@eoclinica.com.br',
        password: 'senha123',
        role: 'PATIENT' as UserRole,
        allergies: ['Penicilina'],
        emergencyContactName: 'João Santos',
        emergencyContactPhone: '11999999999'
      };

      const mockCreatedUser = {
        id: '2',
        ...userData,
        fullName: 'Maria Santos',
        password: 'hashedPassword',
        status: 'PENDING_VERIFICATION' as UserStatus
      };

      mockBcrypt.hash.mockResolvedValue('hashedPassword' as never);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue(mockCreatedUser) },
          patient: { create: jest.fn().mockResolvedValue({}) }
        });
      });

      // Mock findById para retornar o usuário criado
      const findByIdSpy = jest.spyOn(userService, 'findById').mockResolvedValue(mockCreatedUser as any);

      const result = await userService.create(userData);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('senha123', 12);
      expect(findByIdSpy).toHaveBeenCalledWith('2');
      expect(result).toEqual(mockCreatedUser);
    });

    it('deveria criar usuário sem senha', async () => {
      const userData = {
        firstName: 'Pedro',
        lastName: 'Costa',
        email: 'pedro@eoclinica.com.br',
        role: 'DOCTOR' as UserRole
      };

      const mockCreatedUser = {
        id: '3',
        ...userData,
        fullName: 'Pedro Costa',
        password: null,
        status: 'PENDING_VERIFICATION' as UserStatus
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          user: { create: jest.fn().mockResolvedValue(mockCreatedUser) }
        });
      });

      const findByIdSpy = jest.spyOn(userService, 'findById').mockResolvedValue(mockCreatedUser as any);

      await userService.create(userData);

      expect(mockBcrypt.hash).not.toHaveBeenCalled();
      expect(findByIdSpy).toHaveBeenCalledWith('3');
    });
  });

  describe('updateStatus', () => {
    it('deveria atualizar status do usuário', async () => {
      const mockUpdatedUser = {
        id: '1',
        status: 'SUSPENDED' as UserStatus
      };

      // Mock do método update que será chamado internamente
      const updateSpy = jest.spyOn(userService, 'update').mockResolvedValue(mockUpdatedUser as any);

      const result = await userService.updateStatus('1', 'SUSPENDED' as UserStatus);

      expect(updateSpy).toHaveBeenCalledWith('1', { status: 'SUSPENDED' });
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe('getUserAppointments', () => {
    it('deveria retornar appointments do usuário', async () => {
      const mockAppointments = [
        {
          id: 'app1',
          patientId: '1',
          doctorId: '2',
          status: 'SCHEDULED',
          scheduledAt: new Date(),
          specialty: { name: 'Cardiologia' }
        }
      ];

      mockPrisma.appointment.count.mockResolvedValue(1);
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);

      const result = await userService.getUserAppointments('1');

      expect(result.appointments).toEqual(mockAppointments);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1
      });

      expect(mockPrisma.appointment.count).toHaveBeenCalledWith({
        where: {
          OR: [{ patientId: '1' }, { doctorId: '1' }],
          deletedAt: null
        }
      });
    });
  });
});