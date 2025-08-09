import { FastifyRequest, FastifyReply } from 'fastify';
import { AuditService } from './audit.service';
import { PrismaClient } from '../../database/generated/client';

export interface AuditableRequest extends FastifyRequest {
  audit?: {
    resource: string;
    action: string;
    resourceId?: string;
    skipAudit?: boolean;
    oldValues?: any;
    newValues?: any;
  };
}

export class AuditRequestMiddleware {
  private auditService: AuditService;

  constructor(prisma: PrismaClient) {
    this.auditService = new AuditService(prisma);
  }

  /**
   * Middleware to automatically log API requests
   */
  createAuditMiddleware() {
    return async (request: AuditableRequest, reply: FastifyReply) => {
      // Skip audit if explicitly disabled or for certain routes
      if (
        request.audit?.skipAudit ||
        this.shouldSkipAudit(request.routerPath || request.url)
      ) {
        return;
      }

      const startTime = Date.now();

      // Extract user information
      const user = (request as any).user;
      const userId = user?.id;
      const userEmail = user?.email;

      // Extract request metadata
      const ipAddress = this.extractClientIP(request);
      const userAgent = request.headers['user-agent'];
      
      // Determine action from HTTP method
      const action = this.mapHttpMethodToAction(request.method);
      
      // Extract resource from route
      const resource = request.audit?.resource || this.extractResourceFromRoute(request.routerPath || request.url);
      const resourceId = request.audit?.resourceId || this.extractResourceId(request);

      // Log the request if it's a significant action
      if (this.isSignificantAction(action, resource)) {
        await this.auditService.createAuditLog({
          userId,
          userEmail,
          ipAddress,
          userAgent,
          action: `API_${action}`,
          resource,
          resourceId,
          newValues: {
            method: request.method,
            path: request.routerPath || request.url,
            query: request.query,
            params: request.params,
            timestamp: new Date().toISOString(),
            responseTime: Date.now() - startTime,
          },
        });
      }
    };
  }

  /**
   * Middleware to log data modifications
   */
  createDataModificationMiddleware() {
    return async (request: AuditableRequest, reply: FastifyReply, done: Function) => {
      // Only log for modification methods
      if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        return done();
      }

      const user = (request as any).user;
      if (!user) return done();

      // Store original body for comparison
      const originalBody = request.body;
      
      // Hook into the reply to capture the response
      reply.raw.on('finish', async () => {
        if (reply.statusCode >= 200 && reply.statusCode < 300) {
          const resource = request.audit?.resource || this.extractResourceFromRoute(request.routerPath || request.url);
          const resourceId = request.audit?.resourceId || this.extractResourceId(request);
          const action = this.mapHttpMethodToAction(request.method);

          await this.auditService.createAuditLog({
            userId: user.id,
            userEmail: user.email,
            ipAddress: this.extractClientIP(request),
            userAgent: request.headers['user-agent'],
            action,
            resource,
            resourceId,
            oldValues: request.audit?.oldValues,
            newValues: request.audit?.newValues || originalBody,
          });
        }
      });

      done();
    };
  }

  /**
   * Create middleware for specific resource auditing
   */
  createResourceAuditMiddleware(resource: string, action?: string) {
    return async (request: AuditableRequest, reply: FastifyReply, done: Function) => {
      request.audit = {
        ...request.audit,
        resource,
        action: action || this.mapHttpMethodToAction(request.method),
      };
      done();
    };
  }

  /**
   * Middleware to log authentication events
   */
  createAuthAuditMiddleware() {
    return async (request: FastifyRequest, reply: FastifyReply, done: Function) => {
      const ipAddress = this.extractClientIP(request);
      const userAgent = request.headers['user-agent'];

      // Hook into reply to log based on response
      reply.raw.on('finish', async () => {
        const body = request.body as any;
        const email = body?.email;

        if (request.url.includes('/login')) {
          const action = reply.statusCode === 200 ? 'LOGIN' : 'LOGIN_FAILED';
          await this.auditService.createAuditLog({
            userEmail: email,
            ipAddress,
            userAgent,
            action,
            resource: 'authentication',
            newValues: {
              success: reply.statusCode === 200,
              statusCode: reply.statusCode,
            },
          });
        } else if (request.url.includes('/logout')) {
          const user = (request as any).user;
          await this.auditService.createAuditLog({
            userId: user?.id,
            userEmail: user?.email || email,
            ipAddress,
            userAgent,
            action: 'LOGOUT',
            resource: 'authentication',
          });
        }
      });

      done();
    };
  }

  /**
   * Extract client IP address
   */
  private extractClientIP(request: FastifyRequest): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      'unknown'
    );
  }

  /**
   * Map HTTP method to audit action
   */
  private mapHttpMethodToAction(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST': return 'CREATE';
      case 'GET': return 'READ';
      case 'PUT': 
      case 'PATCH': return 'UPDATE';
      case 'DELETE': return 'DELETE';
      default: return method.toUpperCase();
    }
  }

  /**
   * Extract resource name from route path
   */
  private extractResourceFromRoute(path: string): string {
    // Remove query parameters
    const cleanPath = path.split('?')[0];
    
    // Extract from API path like /api/v1/appointments -> appointments
    const pathParts = cleanPath.split('/').filter(Boolean);
    
    // Look for the resource part (usually after /api/v1/)
    const apiIndex = pathParts.findIndex(part => part === 'api');
    if (apiIndex >= 0 && pathParts.length > apiIndex + 2) {
      return pathParts[apiIndex + 2];
    }
    
    // Fallback to first meaningful path segment
    return pathParts[pathParts.length - 1] || 'unknown';
  }

  /**
   * Extract resource ID from request
   */
  private extractResourceId(request: FastifyRequest): string | undefined {
    const params = request.params as any;
    
    // Common ID parameter names
    const idFields = ['id', 'userId', 'appointmentId', 'doctorId', 'patientId'];
    
    for (const field of idFields) {
      if (params[field]) {
        return params[field];
      }
    }
    
    return undefined;
  }

  /**
   * Determine if audit should be skipped for this route
   */
  private shouldSkipAudit(path: string): boolean {
    const skipPaths = [
      '/health',
      '/metrics',
      '/documentation',
      '/audit', // Don't audit audit endpoints to avoid recursion
      '/static',
      '/favicon.ico',
    ];

    return skipPaths.some(skipPath => path.includes(skipPath));
  }

  /**
   * Determine if this is a significant action to log
   */
  private isSignificantAction(action: string, resource: string): boolean {
    // Always log modifications
    if (['CREATE', 'UPDATE', 'DELETE'].includes(action)) {
      return true;
    }
    
    // Log reads for sensitive resources
    const sensitiveResources = [
      'users',
      'patients', 
      'appointments',
      'medical-records',
      'audit',
    ];
    
    if (action === 'READ' && sensitiveResources.includes(resource)) {
      return true;
    }

    return false;
  }
}

// Predefined audit decorators for common resources
export const auditDecorators = {
  appointments: (action?: string) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    descriptor.value = async function(request: AuditableRequest, reply: FastifyReply) {
      request.audit = {
        resource: 'appointments',
        action: action || 'UNKNOWN',
      };
      return method.call(this, request, reply);
    };
  },

  users: (action?: string) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    descriptor.value = async function(request: AuditableRequest, reply: FastifyReply) {
      request.audit = {
        resource: 'users',
        action: action || 'UNKNOWN',
      };
      return method.call(this, request, reply);
    };
  },

  patients: (action?: string) => (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;
    descriptor.value = async function(request: AuditableRequest, reply: FastifyReply) {
      request.audit = {
        resource: 'patients',
        action: action || 'UNKNOWN',
      };
      return method.call(this, request, reply);
    };
  },
};