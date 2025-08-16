import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../../database/generated/client';

const prisma = new PrismaClient();

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: string;
    status: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  private readonly REFRESH_TOKEN_EXPIRES_IN =
    process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

  async login(loginData: LoginData): Promise<AuthResponse> {
    const { email, password } = loginData;

    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        password: true,
        firstName: true,
        lastName: true,
        fullName: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new Error('ACCOUNT_INACTIVE');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    // Update last login
    await prisma.users.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
      },
      accessToken,
      refreshToken,
    };
  }

  private generateAccessToken(userId: string, role: string): string {
    return jwt.sign(
      {
        userId,
        role,
        type: 'access',
      },
      this.JWT_SECRET,
      {
        expiresIn: this.JWT_EXPIRES_IN,
        issuer: 'eo-clinica',
        audience: 'eo-clinica-client',
      },
    );
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign(
      {
        userId,
        type: 'refresh',
      },
      this.JWT_SECRET,
      {
        expiresIn: this.REFRESH_TOKEN_EXPIRES_IN,
        issuer: 'eo-clinica',
        audience: 'eo-clinica-client',
      },
    );
  }

  async verifyToken(token: string): Promise<any> {
    try {
      return jwt.verify(token, this.JWT_SECRET);
    } catch (error) {
      throw new Error('INVALID_TOKEN');
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      const decoded = jwt.verify(refreshToken, this.JWT_SECRET) as any;

      if (decoded.type !== 'refresh') {
        throw new Error('INVALID_TOKEN_TYPE');
      }

      // Get user to check if still active
      const user = await prisma.users.findUnique({
        where: { id: decoded.userId },
        select: { id: true, role: true, status: true },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new Error('USER_INACTIVE');
      }

      const accessToken = this.generateAccessToken(user.id, user.role);

      return { accessToken };
    } catch (error) {
      throw new Error('INVALID_REFRESH_TOKEN');
    }
  }
}
