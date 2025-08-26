/**
 * 🔒 VALIDADORES DE SEGURANÇA - EO CLÍNICA
 *
 * Funções de validação implementadas baseadas nos testes de segurança
 */

/**
 * Valida CPF brasileiro com dígito verificador
 */
export function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/[^\d]/g, '');

  if (cleaned.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleaned)) return false; // Todos iguais

  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let firstDigit = (sum * 10) % 11;
  if (firstDigit >= 10) firstDigit = 0;

  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  let secondDigit = (sum * 10) % 11;
  if (secondDigit >= 10) secondDigit = 0;

  return (
    firstDigit === parseInt(cleaned[9]) && secondDigit === parseInt(cleaned[10])
  );
}

/**
 * Valida formato de email seguro
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Sanitiza entrada para prevenir XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '');
}

/**
 * Valida se string contém apenas caracteres seguros para SQL
 */
export function isSQLSafe(input: string): boolean {
  // Rejeita caracteres perigosos para SQL injection
  const dangerousChars = /['"\\;--\/*]/;
  return !dangerousChars.test(input);
}

/**
 * Valida senha forte (8+ caracteres, maiúscula, minúscula, número, especial)
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (password.length > 128) return false; // Previne DoS com senhas muito longas
  if (!/[A-Z]/.test(password)) return false; // Maiúscula
  if (!/[a-z]/.test(password)) return false; // Minúscula
  if (!/\d/.test(password)) return false; // Número
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false; // Caractere especial

  // Verifica se não é uma senha comum
  const commonPasswords = [
    'password',
    '123456789',
    'qwerty',
    'abc123',
    'password123',
    'admin',
    'letmein',
    'welcome',
    'monkey',
    '1234567890',
  ];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    return false;
  }

  return true;
}

/**
 * Valida se um IP está em uma lista de IPs suspeitos
 */
export function isSuspiciousIP(ip: string): boolean {
  // IPs privados/locais são sempre permitidos
  const privateRanges = [
    /^10\./,
    /^192\.168\./,
    /^172\.(1[6-9]|2[0-9]|3[01])\./,
    /^127\./,
    /^::1$/,
    /^localhost$/,
  ];

  if (privateRanges.some(range => range.test(ip))) {
    return false;
  }

  // Lista básica de IPs/ranges suspeitos conhecidos
  const suspiciousRanges = [/^0\.0\.0\.0$/, /^255\.255\.255\.255$/];

  return suspiciousRanges.some(range => range.test(ip));
}

/**
 * Valida limite de tentativas de login por IP
 */
export function validateLoginAttempts(
  attempts: number,
  timeWindow: number,
): boolean {
  const maxAttempts = process.env.NODE_ENV === 'production' ? 5 : 50;
  const windowMs =
    process.env.NODE_ENV === 'production' ? 15 * 60 * 1000 : timeWindow; // 15 min em produção

  return attempts < maxAttempts;
}

/**
 * Calcula delay exponencial para rate limiting
 */
export function calculateExponentialDelay(attemptNumber: number): number {
  return Math.min(1000 * Math.pow(2, attemptNumber), 30000); // Max 30s
}

/**
 * Detecta padrões de força bruta
 */
export function detectBruteForce(
  attempts: Array<{ timestamp: number; success: boolean }>,
  threshold: number = 5,
  timeWindow: number = 60000,
): boolean {
  const now = Date.now();
  const recentFailedAttempts = attempts.filter(
    attempt => !attempt.success && now - attempt.timestamp < timeWindow,
  );

  return recentFailedAttempts.length >= threshold;
}
