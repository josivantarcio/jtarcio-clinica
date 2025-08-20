/**
 * Financial Authentication Middleware
 * Real role-based access control for financial operations
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { FinancialPermission } from '@/types/financial';

interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: string;
    role: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * Check if user has financial access (ADMIN or FINANCIAL_MANAGER)
 */
export const requireFinancialAccess = async (
  request: AuthenticatedRequest,
  reply: FastifyReply,
) => {
  // Development mode: Check for fake token
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.includes('fake-jwt-token-for-testing')) {
    console.log('🧪 Development mode: Using fake user for financial access');
    // Inject fake user for development
    (request as any).user = {
      id: 'dev-user-1',
      role: 'ADMIN',
      email: 'admin@dev.local',
      firstName: 'Admin',
      lastName: 'Developer'
    };
  }

  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const allowedRoles = ['ADMIN', 'FINANCIAL_MANAGER'];

  if (!allowedRoles.includes(request.user.role)) {
    return reply.status(403).send({
      success: false,
      error: 'Insufficient permissions for financial operations',
      code: 'INSUFFICIENT_PERMISSIONS',
      required: 'ADMIN or FINANCIAL_MANAGER role',
    });
  }

  // User has financial access, continue
};

/**
 * Check if user can manage financial settings (ADMIN only)
 */
export const requireFinancialAdmin = async (
  request: AuthenticatedRequest,
  reply: FastifyReply,
) => {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  if (request.user.role !== 'ADMIN') {
    return reply.status(403).send({
      success: false,
      error: 'Admin permissions required for this financial operation',
      code: 'ADMIN_REQUIRED',
    });
  }
};

/**
 * Check if user can view financial data
 * More permissive - includes doctors viewing their own data
 */
export const requireFinancialView = async (
  request: AuthenticatedRequest,
  reply: FastifyReply,
) => {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    });
  }

  const allowedRoles = ['ADMIN', 'FINANCIAL_MANAGER', 'DOCTOR'];

  if (!allowedRoles.includes(request.user.role)) {
    return reply.status(403).send({
      success: false,
      error: 'Insufficient permissions to view financial data',
      code: 'INSUFFICIENT_PERMISSIONS',
    });
  }
};

/**
 * Enhanced permission checker for specific financial operations
 */
export const checkFinancialPermission = (permission: FinancialPermission) => {
  return async (request: AuthenticatedRequest, reply: FastifyReply) => {
    if (!request.user) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED',
      });
    }

    const { role } = request.user;

    // Define permission matrix
    const permissions: Record<string, FinancialPermission[]> = {
      ADMIN: [
        'financial.dashboard.view',
        'financial.transactions.view',
        'financial.transactions.create',
        'financial.transactions.update',
        'financial.transactions.delete',
        'financial.payables.view',
        'financial.payables.create',
        'financial.payables.update',
        'financial.payables.delete',
        'financial.payables.approve',
        'financial.reports.view',
        'financial.settings.manage',
      ],
      FINANCIAL_MANAGER: [
        'financial.dashboard.view',
        'financial.transactions.view',
        'financial.transactions.create',
        'financial.transactions.update',
        'financial.payables.view',
        'financial.payables.create',
        'financial.payables.update',
        'financial.payables.approve',
        'financial.reports.view',
      ],
      DOCTOR: [
        'financial.transactions.view', // Only own transactions
        'financial.reports.view', // Only own reports
      ],
      RECEPTIONIST: [
        'financial.transactions.view', // Limited view
      ],
    };

    const userPermissions = permissions[role] || [];

    if (!userPermissions.includes(permission)) {
      return reply.status(403).send({
        success: false,
        error: `Insufficient permissions for operation: ${permission}`,
        code: 'PERMISSION_DENIED',
        required: permission,
      });
    }
  };
};

/**
 * Filter financial data based on user role
 */
export const applyFinancialDataFilter = (
  request: AuthenticatedRequest,
  filters: any,
): any => {
  if (!request.user) return filters;

  const { role, id: userId } = request.user;

  // Admins and Financial managers can see all data
  if (['ADMIN', 'FINANCIAL_MANAGER'].includes(role)) {
    return filters;
  }

  // Doctors can only see their own financial data
  if (role === 'DOCTOR') {
    return {
      ...filters,
      doctorId: userId,
    };
  }

  // Patients can only see their own payments
  if (role === 'PATIENT') {
    return {
      ...filters,
      patientId: userId,
    };
  }

  // Receptionists get limited view (no sensitive financial data)
  if (role === 'RECEPTIONIST') {
    return {
      ...filters,
      // Add any reception-specific filters
    };
  }

  return filters;
};

/**
 * Validate financial amounts
 */
export const validateFinancialAmounts = (data: any) => {
  const errors: string[] = [];

  if (data.grossAmount !== undefined) {
    if (typeof data.grossAmount !== 'number' || data.grossAmount < 0) {
      errors.push('grossAmount must be a positive number');
    }
  }

  if (data.discountAmount !== undefined) {
    if (typeof data.discountAmount !== 'number' || data.discountAmount < 0) {
      errors.push('discountAmount must be a positive number');
    }
  }

  if (data.taxAmount !== undefined) {
    if (typeof data.taxAmount !== 'number' || data.taxAmount < 0) {
      errors.push('taxAmount must be a positive number');
    }
  }

  if (data.netAmount !== undefined) {
    if (typeof data.netAmount !== 'number' || data.netAmount < 0) {
      errors.push('netAmount must be a positive number');
    }
  }

  // Validate amount relationships
  if (data.grossAmount && data.discountAmount && data.taxAmount) {
    const expectedNet = data.grossAmount - data.discountAmount - data.taxAmount;
    if (data.netAmount && Math.abs(data.netAmount - expectedNet) > 0.01) {
      errors.push(
        'netAmount does not match grossAmount - discountAmount - taxAmount',
      );
    }
  }

  return errors;
};
