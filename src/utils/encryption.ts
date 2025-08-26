import crypto from 'crypto';

/**
 * 🔐 UTILITÁRIOS DE CRIPTOGRAFIA - EO CLÍNICA
 *
 * Implementações seguras baseadas nos testes de segurança
 */

const ALGORITHM = 'aes-256-cbc';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits

/**
 * Gera chave de criptografia segura
 */
export function generateEncryptionKey(): Buffer {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Criptografa dados sensíveis usando AES-256-CBC
 */
export function encryptSensitiveData(data: string, key?: Buffer): string {
  const encryptionKey = key || generateEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Retorna IV + dados criptografados + chave (base64)
  return (
    iv.toString('hex') + ':' + encrypted + ':' + encryptionKey.toString('hex')
  );
}

/**
 * Descriptografa dados sensíveis
 */
export function decryptSensitiveData(encryptedData: string): string {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de dados criptografados inválido');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Gera token seguro para sessões
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Gera UUID seguro
 */
export function generateSecureId(): string {
  return crypto.randomUUID();
}

/**
 * Hash seguro com bcrypt (para uso em serviços)
 */
export async function hashPassword(
  password: string,
  saltRounds: number = 12,
): Promise<string> {
  const bcrypt = await import('bcrypt');
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verifica password com bcrypt
 */
export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  const bcrypt = await import('bcrypt');
  return bcrypt.compare(password, hash);
}

/**
 * Wrapper para operações com timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs),
    ),
  ]);
}
