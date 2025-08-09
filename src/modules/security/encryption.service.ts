import * as crypto from 'crypto';
import { logger } from '../../config/logger';

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  authTag: string;
  salt: string;
}

export interface EncryptedFile {
  encryptedBuffer: Buffer;
  iv: string;
  authTag: string;
  originalMimeType: string;
  originalName: string;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyDerivation = 'pbkdf2';
  private readonly iterations = 100000;
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 12; // 96 bits for GCM
  private readonly saltLength = 16;
  private readonly tagLength = 16;

  private masterKey: string;

  constructor() {
    this.masterKey = process.env.MASTER_ENCRYPTION_KEY || this.generateMasterKey();
    if (!process.env.MASTER_ENCRYPTION_KEY) {
      logger.warn('No MASTER_ENCRYPTION_KEY found in environment, using generated key');
    }
  }

  /**
   * Encrypt sensitive PII data
   */
  async encryptPII(data: string): Promise<string> {
    try {
      const encrypted = await this.encryptData(data, 'pii-data');
      return this.serializeEncryptedData(encrypted);
    } catch (error) {
      logger.error('Failed to encrypt PII data', { error });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt PII data
   */
  async decryptPII(encryptedData: string): Promise<string> {
    try {
      const data = this.deserializeEncryptedData(encryptedData);
      return await this.decryptData(data, 'pii-data');
    } catch (error) {
      logger.error('Failed to decrypt PII data', { error });
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt medical data with stronger protection
   */
  async encryptMedicalData(data: any): Promise<string> {
    try {
      const jsonData = JSON.stringify(data);
      const encrypted = await this.encryptData(jsonData, 'medical-data');
      return this.serializeEncryptedData(encrypted);
    } catch (error) {
      logger.error('Failed to encrypt medical data', { error });
      throw new Error('Medical data encryption failed');
    }
  }

  /**
   * Decrypt medical data
   */
  async decryptMedicalData(encryptedData: string): Promise<any> {
    try {
      const data = this.deserializeEncryptedData(encryptedData);
      const decryptedJson = await this.decryptData(data, 'medical-data');
      return JSON.parse(decryptedJson);
    } catch (error) {
      logger.error('Failed to decrypt medical data', { error });
      throw new Error('Medical data decryption failed');
    }
  }

  /**
   * Encrypt file
   */
  async encryptFile(fileBuffer: Buffer, originalName: string, mimeType: string): Promise<EncryptedFile> {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = await this.deriveKey(this.masterKey, salt);

      const cipher = crypto.createCipher(this.algorithm, key);
      cipher.setAAD(Buffer.from('file-data'));

      const encrypted = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      return {
        encryptedBuffer: encrypted,
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
        originalMimeType: mimeType,
        originalName: originalName,
      };
    } catch (error) {
      logger.error('Failed to encrypt file', { error, originalName, mimeType });
      throw new Error('File encryption failed');
    }
  }

  /**
   * Decrypt file
   */
  async decryptFile(encryptedFile: EncryptedFile): Promise<Buffer> {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const key = await this.deriveKey(this.masterKey, salt);
      const iv = Buffer.from(encryptedFile.iv, 'base64');
      const authTag = Buffer.from(encryptedFile.authTag, 'base64');

      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from('file-data'));

      const decrypted = Buffer.concat([
        decipher.update(encryptedFile.encryptedBuffer),
        decipher.final(),
      ]);

      return decrypted;
    } catch (error) {
      logger.error('Failed to decrypt file', { error });
      throw new Error('File decryption failed');
    }
  }

  /**
   * Hash password with salt
   */
  async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16);
    const hash = await this.pbkdf2(password, salt, this.iterations, 64, 'sha512');
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  /**
   * Verify password against hash
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    try {
      const [saltHex, hashHex] = hashedPassword.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const hash = Buffer.from(hashHex, 'hex');

      const computedHash = await this.pbkdf2(password, salt, this.iterations, 64, 'sha512');
      return crypto.timingSafeEqual(hash, computedHash);
    } catch (error) {
      logger.error('Password verification failed', { error });
      return false;
    }
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate HMAC for data integrity
   */
  generateHMAC(data: string, secret?: string): string {
    const hmacSecret = secret || this.masterKey;
    return crypto.createHmac('sha256', hmacSecret).update(data).digest('hex');
  }

  /**
   * Verify HMAC
   */
  verifyHMAC(data: string, hmac: string, secret?: string): boolean {
    const hmacSecret = secret || this.masterKey;
    const computedHmac = crypto.createHmac('sha256', hmacSecret).update(data).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(computedHmac, 'hex'));
  }

  /**
   * Encrypt data with additional authenticated data
   */
  private async encryptData(data: string, aad: string): Promise<EncryptedData> {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    const key = await this.deriveKey(this.masterKey, salt);

    const cipher = crypto.createCipher(this.algorithm, key);
    cipher.setAAD(Buffer.from(aad));

    const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      encryptedData: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
    };
  }

  /**
   * Decrypt data with AAD verification
   */
  private async decryptData(data: EncryptedData, aad: string): Promise<string> {
    const salt = Buffer.from(data.salt, 'base64');
    const iv = Buffer.from(data.iv, 'base64');
    const authTag = Buffer.from(data.authTag, 'base64');
    const key = await this.deriveKey(this.masterKey, salt);

    const decipher = crypto.createDecipher(this.algorithm, key);
    decipher.setAuthTag(authTag);
    decipher.setAAD(Buffer.from(aad));

    return decipher.update(data.encryptedData, 'hex', 'utf8') + decipher.final('utf8');
  }

  /**
   * Derive key from master key and salt
   */
  private async deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(masterKey, salt, this.iterations, this.keyLength, 'sha256', (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  /**
   * PBKDF2 promise wrapper
   */
  private async pbkdf2(password: string, salt: Buffer, iterations: number, keylen: number, digest: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }

  /**
   * Serialize encrypted data to string
   */
  private serializeEncryptedData(data: EncryptedData): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * Deserialize encrypted data from string
   */
  private deserializeEncryptedData(data: string): EncryptedData {
    return JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
  }

  /**
   * Generate master key (for development only)
   */
  private generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();