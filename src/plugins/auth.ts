import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

export interface JWTPayload {
  userId: string;
  role: string;
  type: 'access' | 'refresh';
  iss: string;
  aud: string;
}

export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header is required',
        },
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN_FORMAT',
          message: 'Authorization header must start with "Bearer "',
        },
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'JWT token is required',
        },
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    // Check token type
    if (decoded.type !== 'access') {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Access token required',
        },
      });
    }

    // Attach user info to request
    (request as any).user = {
      userId: decoded.userId,
      role: decoded.role,
    };
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'JWT token has expired',
        },
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid JWT token',
        },
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'TOKEN_VERIFICATION_ERROR',
        message: 'Error verifying JWT token',
      },
    });
  }
}

export function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply,
  next: () => void,
) {
  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

      if (decoded.type === 'access') {
        (request as any).user = {
          userId: decoded.userId,
          role: decoded.role,
        };
      }
    } catch (error) {
      // Ignore errors in optional auth
    }
  }

  next();
}

export function requireRole(allowedRoles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    if (!user) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required',
        },
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        },
      });
    }
  };
}
