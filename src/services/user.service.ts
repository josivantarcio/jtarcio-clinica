import { PrismaClient, UserRole, UserStatus, Prisma } from '@prisma/client';
import { logger } from '@/config/logger';

export class UserService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    role?: UserRole;
    status?: UserStatus;
    search?: string;
  } = {}) {
    const { page = 1, limit = 20, role, status, search } = params;
    
    // Build where clause
    const where: Prisma.UserWhereInput = {
      deletedAt: null, // Only active users (not soft deleted)
    };

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { cpf: { contains: search } },
      ];
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    try {
      // Get total count for pagination
      const total = await this.prisma.user.count({ where });

      // Get users with related data
      const users = await this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patientProfile: {
            select: {
              emergencyContactName: true,
              emergencyContactPhone: true,
              allergies: true,
              medications: true,
              address: true,
            },
          },
          doctorProfile: {
            select: {
              crm: true,
              specialtyId: true,
            },
          },
          appointments: {
            where: { deletedAt: null },
            select: {
              id: true,
              status: true,
              scheduledAt: true,
            },
            orderBy: { scheduledAt: 'desc' },
            take: 5, // Get recent appointments
          },
        },
      });

      // Calculate total pages
      const totalPages = Math.ceil(total / limit);

      logger.info(`Found ${users.length} users (page ${page}/${totalPages})`);

      return {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error('Error fetching users:', error);
      throw new Error('Failed to fetch users');
    }
  }

  async findById(id: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          patientProfile: true,
          doctorProfile: {
            include: {
              specialty: true,
            },
          },
          appointments: {
            where: { deletedAt: null },
            include: {
              specialty: true,
            },
            orderBy: { scheduledAt: 'desc' },
          },
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`Found user: ${user.email}`);
      return user;
    } catch (error) {
      logger.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    try {
      // Check if user exists and is not deleted
      const existingUser = await this.prisma.user.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
        include: {
          patientProfile: true,
          doctorProfile: true,
        },
      });

      logger.info(`Updated user: ${updatedUser.email}`);
      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      // Check if user exists and is not already deleted
      const existingUser = await this.prisma.user.findFirst({
        where: {
          id,
          deletedAt: null,
        },
      });

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Soft delete the user
      await this.prisma.user.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          status: 'INACTIVE',
        },
      });

      logger.info(`Soft deleted user: ${existingUser.email}`);
    } catch (error) {
      logger.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  }

  async updateStatus(id: string, status: UserStatus, reason?: string) {
    try {
      const updatedUser = await this.update(id, { status });
      
      // Log the status change for audit purposes
      logger.info(`Updated user ${id} status to ${status}${reason ? `, reason: ${reason}` : ''}`);
      
      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user status ${id}:`, error);
      throw error;
    }
  }

  async getUserAppointments(userId: string, params: {
    page?: number;
    limit?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
  } = {}) {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = params;

    const where: any = {
      OR: [
        { patientId: userId },
        { doctorId: userId },
      ],
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.scheduledAt = {};
      if (dateFrom) where.scheduledAt.gte = dateFrom;
      if (dateTo) where.scheduledAt.lte = dateTo;
    }

    const skip = (page - 1) * limit;

    try {
      const total = await this.prisma.appointment.count({ where });
      
      const appointments = await this.prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
        include: {
          specialty: true,
        },
      });

      const totalPages = Math.ceil(total / limit);

      return {
        appointments,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error(`Error fetching appointments for user ${userId}:`, error);
      throw error;
    }
  }
}