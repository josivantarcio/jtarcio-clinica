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
  
  return firstDigit === parseInt(cleaned[9]) && secondDigit === parseInt(cleaned[10]);
}

/**
 * Valida formato de email seguro
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Valida senha forte (8+ caracteres, maiúscula, minúscula, número, especial)
 */
export function isStrongPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false;  // Maiúscula
  if (!/[a-z]/.test(password)) return false;  // Minúscula
  if (!/\d/.test(password)) return false;     // Número
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false; // Caractere especial
  return true;
}

/**
 * Sanitiza entrada contra XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
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
  timeWindow: number = 60000
): boolean {
  const now = Date.now();
  const recentFailedAttempts = attempts.filter(attempt => 
    !attempt.success && 
    (now - attempt.timestamp) < timeWindow
  );
  
  return recentFailedAttempts.length >= threshold;
}