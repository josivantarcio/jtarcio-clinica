/**
 * Brazilian CPF validation utilities for backend
 */

/**
 * Validates Brazilian CPF format and checksum
 * @param cpf - CPF string (with or without formatting)
 * @returns boolean indicating if CPF is valid
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false;

  // Remove formatting
  const cleanCpf = cpf.replace(/\D/g, '');

  // Check length
  if (cleanCpf.length !== 11) return false;

  // Check for known invalid patterns
  const invalidPatterns = [
    '00000000000',
    '11111111111',
    '22222222222',
    '33333333333',
    '44444444444',
    '55555555555',
    '66666666666',
    '77777777777',
    '88888888888',
    '99999999999',
  ];

  if (invalidPatterns.includes(cleanCpf)) return false;

  // Validate checksum digits
  let sum = 0;
  let remainder;

  // Validate first digit
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false;

  // Validate second digit
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false;

  return true;
}

/**
 * Formats CPF with standard Brazilian formatting
 * @param cpf - CPF string
 * @returns Formatted CPF (000.000.000-00) or original if invalid
 */
export function formatCPF(cpf: string): string {
  const cleanCpf = cpf.replace(/\D/g, '');

  if (cleanCpf.length !== 11) return cpf;

  return cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Removes CPF formatting
 * @param cpf - Formatted CPF string
 * @returns Clean CPF digits only
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Check if CPF already exists in database
 * @param cpf - CPF to check
 * @param prisma - Prisma client instance
 * @param excludeUserId - User ID to exclude from check (for updates)
 * @returns Promise<{exists: boolean, user?: User}>
 */
export async function checkCPFExists(
  cpf: string,
  prisma: any,
  excludeUserId?: string,
): Promise<{ exists: boolean; user?: any }> {
  if (!cpf) return { exists: false };

  const cleanedCpf = cleanCPF(cpf);
  const formattedCpf = formatCPF(cleanedCpf);

  // Search for both clean and formatted versions
  const whereClause = {
    OR: [{ cpf: cleanedCpf }, { cpf: formattedCpf }],
    ...(excludeUserId && {
      NOT: { id: excludeUserId },
    }),
  };

  const existingUser = await prisma.user.findFirst({
    where: whereClause,
    select: {
      id: true,
      fullName: true,
      email: true,
      cpf: true,
    },
  });

  return {
    exists: !!existingUser,
    user: existingUser,
  };
}
