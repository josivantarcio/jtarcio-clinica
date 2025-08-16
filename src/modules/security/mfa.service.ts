import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import * as crypto from 'crypto';
import { PrismaClient } from '../../database/generated/client';
import { encryptionService } from './encryption.service';
import { logger } from '../../config/logger';

export interface TOTPSetup {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface SMSCodeResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

export interface MFAVerificationResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
}

export class MFAService {
  private prisma: PrismaClient;
  private maxAttempts = 3;
  private lockoutDuration = 15 * 60 * 1000; // 15 minutes
  private codeExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Enable TOTP for a user
   */
  async enableTOTP(userId: string, userEmail: string): Promise<TOTPSetup> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `EO Clínica (${userEmail})`,
        issuer: 'EO Clínica',
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store encrypted secret and backup codes in database
      const encryptedSecret = await encryptionService.encryptPII(secret.base32);
      const encryptedBackupCodes = await encryptionService.encryptPII(
        JSON.stringify(backupCodes),
      );

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          encryptedData: {
            ...(await this.getUserEncryptedData(userId)),
            mfaSecret: encryptedSecret,
            backupCodes: encryptedBackupCodes,
            mfaEnabled: false, // Will be enabled after verification
          },
        },
      });

      logger.info('TOTP setup initiated', { userId, userEmail });

      return {
        secret: secret.base32,
        qrCodeUrl,
        manualEntryKey: secret.base32,
        backupCodes,
      };
    } catch (error) {
      logger.error('Failed to enable TOTP', { error, userId, userEmail });
      throw new Error('Failed to setup TOTP authentication');
    }
  }

  /**
   * Verify TOTP token and enable MFA
   */
  async verifyAndEnableTOTP(
    userId: string,
    token: string,
  ): Promise<MFAVerificationResult> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { encryptedData: true },
      });

      if (!user?.encryptedData) {
        return { success: false, message: 'MFA setup not found' };
      }

      const encryptedData = user.encryptedData as any;
      if (!encryptedData.mfaSecret) {
        return { success: false, message: 'TOTP not configured' };
      }

      // Decrypt secret
      const secret = await encryptionService.decryptPII(
        encryptedData.mfaSecret,
      );

      // Verify token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2, // Allow 2 time steps of drift
      });

      if (verified) {
        // Enable MFA
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            encryptedData: {
              ...encryptedData,
              mfaEnabled: true,
            },
          },
        });

        logger.info('TOTP enabled successfully', { userId });
        return {
          success: true,
          message: 'TOTP authentication enabled successfully',
        };
      } else {
        logger.warn('Invalid TOTP token provided', { userId });
        return { success: false, message: 'Invalid authentication code' };
      }
    } catch (error) {
      logger.error('Failed to verify TOTP', { error, userId });
      return { success: false, message: 'Authentication verification failed' };
    }
  }

  /**
   * Verify TOTP token for authentication
   */
  async verifyTOTP(
    userId: string,
    token: string,
  ): Promise<MFAVerificationResult> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { encryptedData: true },
      });

      if (!user?.encryptedData) {
        return { success: false, message: 'MFA not configured' };
      }

      const encryptedData = user.encryptedData as any;
      if (!encryptedData.mfaEnabled || !encryptedData.mfaSecret) {
        return { success: false, message: 'MFA not enabled' };
      }

      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(userId, 'totp');
      if (!rateLimitResult.success) {
        return rateLimitResult;
      }

      // Decrypt secret
      const secret = await encryptionService.decryptPII(
        encryptedData.mfaSecret,
      );

      // Verify token
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (verified) {
        await this.clearRateLimit(userId, 'totp');
        logger.info('TOTP verification successful', { userId });
        return { success: true, message: 'Authentication successful' };
      } else {
        await this.recordFailedAttempt(userId, 'totp');
        const remainingAttempts = await this.getRemainingAttempts(
          userId,
          'totp',
        );

        logger.warn('Invalid TOTP token', { userId, remainingAttempts });
        return {
          success: false,
          message: 'Invalid authentication code',
          remainingAttempts,
        };
      }
    } catch (error) {
      logger.error('Failed to verify TOTP', { error, userId });
      return { success: false, message: 'Authentication verification failed' };
    }
  }

  /**
   * Send SMS code for MFA
   */
  async sendSMSCode(
    userId: string,
    phoneNumber: string,
  ): Promise<SMSCodeResult> {
    try {
      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(userId, 'sms');
      if (!rateLimitResult.success) {
        return {
          success: false,
          message: rateLimitResult.message,
        };
      }

      // Generate code
      const code = this.generateSMSCode();
      const expiresAt = new Date(Date.now() + this.codeExpiry);

      // Store encrypted code
      const encryptedCode = await encryptionService.encryptPII(code);
      await this.storeSMSCode(userId, encryptedCode, expiresAt);

      // TODO: Integrate with SMS provider (Twilio, AWS SNS, etc.)
      // For now, log the code (remove in production)
      logger.info('SMS code generated', { userId, code: '****', expiresAt });

      return {
        success: true,
        message: 'Authentication code sent successfully',
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to send SMS code', { error, userId, phoneNumber });
      return {
        success: false,
        message: 'Failed to send authentication code',
      };
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(
    userId: string,
    code: string,
  ): Promise<MFAVerificationResult> {
    try {
      // Check rate limiting
      const rateLimitResult = await this.checkRateLimit(userId, 'sms');
      if (!rateLimitResult.success) {
        return rateLimitResult;
      }

      // Get stored code
      const storedCode = await this.getSMSCode(userId);
      if (!storedCode) {
        return {
          success: false,
          message: 'No authentication code found or expired',
        };
      }

      // Verify code
      if (storedCode.code === code && storedCode.expiresAt > new Date()) {
        await this.clearSMSCode(userId);
        await this.clearRateLimit(userId, 'sms');

        logger.info('SMS code verification successful', { userId });
        return { success: true, message: 'Authentication successful' };
      } else {
        await this.recordFailedAttempt(userId, 'sms');
        const remainingAttempts = await this.getRemainingAttempts(
          userId,
          'sms',
        );

        logger.warn('Invalid SMS code', { userId, remainingAttempts });
        return {
          success: false,
          message: 'Invalid or expired authentication code',
          remainingAttempts,
        };
      }
    } catch (error) {
      logger.error('Failed to verify SMS code', { error, userId });
      return { success: false, message: 'Authentication verification failed' };
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(
    userId: string,
    code: string,
  ): Promise<MFAVerificationResult> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { encryptedData: true },
      });

      if (!user?.encryptedData) {
        return { success: false, message: 'MFA not configured' };
      }

      const encryptedData = user.encryptedData as any;
      if (!encryptedData.backupCodes) {
        return { success: false, message: 'Backup codes not available' };
      }

      // Decrypt backup codes
      const backupCodesJson = await encryptionService.decryptPII(
        encryptedData.backupCodes,
      );
      const backupCodes: string[] = JSON.parse(backupCodesJson);

      // Check if code is valid and unused
      const codeIndex = backupCodes.indexOf(code);
      if (codeIndex === -1) {
        logger.warn('Invalid backup code used', { userId });
        return { success: false, message: 'Invalid backup code' };
      }

      // Remove used code
      backupCodes.splice(codeIndex, 1);
      const updatedEncryptedCodes = await encryptionService.encryptPII(
        JSON.stringify(backupCodes),
      );

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          encryptedData: {
            ...encryptedData,
            backupCodes: updatedEncryptedCodes,
          },
        },
      });

      logger.info('Backup code used successfully', {
        userId,
        remainingCodes: backupCodes.length,
      });
      return {
        success: true,
        message: `Authentication successful. ${backupCodes.length} backup codes remaining.`,
      };
    } catch (error) {
      logger.error('Failed to verify backup code', { error, userId });
      return { success: false, message: 'Authentication verification failed' };
    }
  }

  /**
   * Disable MFA for a user
   */
  async disableMFA(userId: string): Promise<boolean> {
    try {
      const encryptedData = await this.getUserEncryptedData(userId);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          encryptedData: {
            ...encryptedData,
            mfaEnabled: false,
            mfaSecret: null,
            backupCodes: null,
          },
        },
      });

      // Clear any stored SMS codes and rate limiting
      await this.clearSMSCode(userId);
      await this.clearRateLimit(userId, 'totp');
      await this.clearRateLimit(userId, 'sms');

      logger.info('MFA disabled', { userId });
      return true;
    } catch (error) {
      logger.error('Failed to disable MFA', { error, userId });
      return false;
    }
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();
      const encryptedBackupCodes = await encryptionService.encryptPII(
        JSON.stringify(backupCodes),
      );

      const encryptedData = await this.getUserEncryptedData(userId);

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          encryptedData: {
            ...encryptedData,
            backupCodes: encryptedBackupCodes,
          },
        },
      });

      logger.info('New backup codes generated', { userId });
      return backupCodes;
    } catch (error) {
      logger.error('Failed to generate new backup codes', { error, userId });
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { encryptedData: true },
      });

      const encryptedData = user?.encryptedData as any;
      return encryptedData?.mfaEnabled === true;
    } catch (error) {
      logger.error('Failed to check MFA status', { error, userId });
      return false;
    }
  }

  // Private helper methods

  private generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private generateSMSCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async getUserEncryptedData(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { encryptedData: true },
    });
    return (user?.encryptedData as any) || {};
  }

  private async storeSMSCode(
    userId: string,
    encryptedCode: string,
    expiresAt: Date,
  ): Promise<void> {
    // Store in a temporary table or cache (Redis)
    // For now, we'll use the user's encrypted data
    const encryptedData = await this.getUserEncryptedData(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        encryptedData: {
          ...encryptedData,
          smsCode: encryptedCode,
          smsCodeExpiresAt: expiresAt.toISOString(),
        },
      },
    });
  }

  private async getSMSCode(
    userId: string,
  ): Promise<{ code: string; expiresAt: Date } | null> {
    const encryptedData = await this.getUserEncryptedData(userId);

    if (!encryptedData.smsCode || !encryptedData.smsCodeExpiresAt) {
      return null;
    }

    const code = await encryptionService.decryptPII(encryptedData.smsCode);
    const expiresAt = new Date(encryptedData.smsCodeExpiresAt);

    return { code, expiresAt };
  }

  private async clearSMSCode(userId: string): Promise<void> {
    const encryptedData = await this.getUserEncryptedData(userId);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        encryptedData: {
          ...encryptedData,
          smsCode: null,
          smsCodeExpiresAt: null,
        },
      },
    });
  }

  private async checkRateLimit(
    userId: string,
    type: 'totp' | 'sms',
  ): Promise<MFAVerificationResult> {
    const encryptedData = await this.getUserEncryptedData(userId);
    const rateLimitKey = `${type}RateLimit`;
    const rateLimitData = encryptedData[rateLimitKey];

    if (rateLimitData) {
      const { attempts, lastAttempt } = rateLimitData;
      const timeSinceLastAttempt = Date.now() - new Date(lastAttempt).getTime();

      if (
        attempts >= this.maxAttempts &&
        timeSinceLastAttempt < this.lockoutDuration
      ) {
        const remainingTime = Math.ceil(
          (this.lockoutDuration - timeSinceLastAttempt) / 1000 / 60,
        );
        return {
          success: false,
          message: `Too many failed attempts. Try again in ${remainingTime} minutes.`,
        };
      }
    }

    return { success: true, message: 'Rate limit OK' };
  }

  private async recordFailedAttempt(
    userId: string,
    type: 'totp' | 'sms',
  ): Promise<void> {
    const encryptedData = await this.getUserEncryptedData(userId);
    const rateLimitKey = `${type}RateLimit`;
    const currentRateLimit = encryptedData[rateLimitKey] || { attempts: 0 };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        encryptedData: {
          ...encryptedData,
          [rateLimitKey]: {
            attempts: currentRateLimit.attempts + 1,
            lastAttempt: new Date().toISOString(),
          },
        },
      },
    });
  }

  private async clearRateLimit(
    userId: string,
    type: 'totp' | 'sms',
  ): Promise<void> {
    const encryptedData = await this.getUserEncryptedData(userId);
    const rateLimitKey = `${type}RateLimit`;

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        encryptedData: {
          ...encryptedData,
          [rateLimitKey]: null,
        },
      },
    });
  }

  private async getRemainingAttempts(
    userId: string,
    type: 'totp' | 'sms',
  ): Promise<number> {
    const encryptedData = await this.getUserEncryptedData(userId);
    const rateLimitKey = `${type}RateLimit`;
    const rateLimitData = encryptedData[rateLimitKey];

    if (rateLimitData) {
      return Math.max(0, this.maxAttempts - rateLimitData.attempts);
    }

    return this.maxAttempts;
  }
}
