import { PrismaClient, UserRole, UserStatus, Prisma } from '@prisma/client';
import { logger } from '@/config/logger';
import bcrypt from 'bcryptjs';
import { env } from '@/config/env';

export class UserService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async findAll(
    params: {
      page?: number;
      limit?: number;
      role?: UserRole;
      status?: UserStatus;
      search?: string;
    } = {},
  ) {
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
              id: true,
              crm: true,
              specialtyId: true,
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
      logger.info(
        `Updated user ${id} status to ${status}${reason ? `, reason: ${reason}` : ''}`,
      );

      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user status ${id}:`, error);
      throw error;
    }
  }

  async getUserAppointments(
    userId: string,
    params: {
      page?: number;
      limit?: number;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
  ) {
    const { page = 1, limit = 20, status, dateFrom, dateTo } = params;

    const where: any = {
      OR: [{ patientId: userId }, { doctorId: userId }],
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

  async createDoctor(doctorData: {
    user: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: string;
    };
    crm: string;
    phone?: string;
    cpf?: string;
    specialtyId: string;
    subSpecialties?: string[];
    graduationDate: string;
    crmRegistrationDate?: string;
    education?: string;
    bio?: string;
    consultationFee?: string;
  }) {
    try {
      logger.info(`Creating doctor: ${doctorData.user.email}`);

      // Hash the password
      const hashedPassword = await bcrypt.hash(
        doctorData.user.password,
        env.SALT_ROUNDS,
      );

      // Calculate experience based on graduation date
      const graduationDate = new Date(doctorData.graduationDate);
      const currentDate = new Date();
      const experience = Math.floor(
        (currentDate.getTime() - graduationDate.getTime()) /
          (1000 * 60 * 60 * 24 * 365),
      );

      // Create user and doctor profile in a transaction
      const result = await this.prisma.$transaction(async prisma => {
        // Create user
        const user = await prisma.user.create({
          data: {
            firstName: doctorData.user.firstName,
            lastName: doctorData.user.lastName,
            fullName: `${doctorData.user.firstName} ${doctorData.user.lastName}`,
            email: doctorData.user.email,
            password: hashedPassword,
            phone: doctorData.phone,
            cpf: doctorData.cpf,
            role: 'DOCTOR',
            status: 'ACTIVE', // Set as active by default
          },
        });

        // Create doctor profile
        const doctorProfile = await prisma.doctor.create({
          data: {
            userId: user.id,
            crm: doctorData.crm,
            specialtyId: doctorData.specialtyId,
            subSpecialties: doctorData.subSpecialties || [],
            biography: doctorData.bio || '',
            graduationDate: graduationDate,
            crmRegistrationDate: doctorData.crmRegistrationDate
              ? new Date(doctorData.crmRegistrationDate)
              : null,
            experience: experience,
            consultationFee: doctorData.consultationFee || '0',
            consultationDuration: 30, // Default 30 minutes
            isActive: true,
            acceptsNewPatients: true,
          },
        });

        return { user, doctorProfile };
      });

      logger.info(
        `Doctor created successfully: ${result.user.email} (${result.doctorProfile.crm})`,
      );

      // Return user with doctor profile
      return await this.findById(result.user.id);
    } catch (error) {
      logger.error(`Error creating doctor:`, error);
      throw error;
    }
  }

  /**
   * Create a new user (patient or other roles)
   */
  async create(userData: {
    firstName: string;
    lastName: string;
    fullName?: string;
    email: string;
    password?: string;
    phone?: string;
    cpf?: string;
    dateOfBirth?: string;
    gender?: string;
    role: UserRole;
    status?: UserStatus;
    allergies?: string[];
    medications?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    address?: any;
  }) {
    try {
      // Hash password if provided
      let hashedPassword = undefined;
      if (userData.password) {
        const saltRounds = Number(env.BCRYPT_SALT_ROUNDS) || 12;
        hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      }

      // Set default fullName if not provided
      const fullName =
        userData.fullName || `${userData.firstName} ${userData.lastName}`;

      // Create user in transaction to ensure consistency
      const result = await this.prisma.$transaction(async prisma => {
        // Create user
        const user = await prisma.user.create({
          data: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            fullName,
            email: userData.email,
            password: hashedPassword,
            phone: userData.phone,
            cpf: userData.cpf,
            dateOfBirth: userData.dateOfBirth
              ? new Date(userData.dateOfBirth)
              : undefined,
            gender: userData.gender,
            role: userData.role,
            status: userData.status || 'PENDING_VERIFICATION',
            timezone: 'America/Sao_Paulo',
          },
        });

        // If creating a patient, create patient profile
        if (userData.role === 'PATIENT') {
          await prisma.patient.create({
            data: {
              userId: user.id,
              emergencyContactName: userData.emergencyContactName,
              emergencyContactPhone: userData.emergencyContactPhone,
              allergies: userData.allergies || [],
              medications: userData.medications || [],
              address: userData.address || undefined,
            },
          });
        }

        return user;
      });

      logger.info(
        `User created successfully: ${result.email} (${result.role})`,
      );

      // Return full user data with profile
      return await this.findById(result.id);
    } catch (error) {
      logger.error(`Error creating user:`, error);
      throw error;
    }
  }
}
