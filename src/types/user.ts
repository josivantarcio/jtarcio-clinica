import { z } from 'zod';
import { emailSchema, phoneSchema, cpfSchema, uuidSchema } from './common';

// User role and status enums
export const UserRoleSchema = z.enum(['PATIENT', 'DOCTOR', 'ADMIN', 'RECEPTIONIST']);
export const UserStatusSchema = z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION']);

export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserStatus = z.infer<typeof UserStatusSchema>;

// Base user schema
export const userSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  phone: phoneSchema.optional(),
  cpf: cpfSchema.optional(),
  rg: z.string().optional(),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  fullName: z.string(),
  dateOfBirth: z.date().optional(),
  gender: z.enum(['M', 'F', 'OTHER']).optional(),
  role: UserRoleSchema,
  status: UserStatusSchema,
  avatar: z.string().url().optional(),
  emailVerifiedAt: z.date().optional(),
  phoneVerifiedAt: z.date().optional(),
  lastLoginAt: z.date().optional(),
  timezone: z.string().default('America/Sao_Paulo'),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type User = z.infer<typeof userSchema>;

// Create user DTO
export const createUserSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
  cpf: cpfSchema.optional(),
  rg: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  dateOfBirth: z.string().transform(str => new Date(str)).optional(),
  gender: z.enum(['M', 'F', 'OTHER']).optional(),
  role: UserRoleSchema.default('PATIENT'),
  timezone: z.string().default('America/Sao_Paulo'),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;

// Update user DTO
export const updateUserSchema = z.object({
  phone: phoneSchema.optional(),
  firstName: z.string().min(2).optional(),
  lastName: z.string().min(2).optional(),
  dateOfBirth: z.string().transform(str => new Date(str)).optional(),
  gender: z.enum(['M', 'F', 'OTHER']).optional(),
  avatar: z.string().url().optional(),
  timezone: z.string().optional(),
}).partial();

export type UpdateUserDto = z.infer<typeof updateUserSchema>;

// Login DTO
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginDto = z.infer<typeof loginSchema>;

// Change password DTO
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;

// Reset password DTO
export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

// Verify email DTO
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export type VerifyEmailDto = z.infer<typeof verifyEmailSchema>;

// User response DTO (without sensitive data)
export const userResponseSchema = userSchema.omit({
  encryptedData: true,
}).transform(data => ({
  ...data,
  // Remove password hash from response
}));

export type UserResponse = z.infer<typeof userResponseSchema>;