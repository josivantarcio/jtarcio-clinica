import { FastifyInstance } from 'fastify';
import { AuditController } from '../modules/audit/audit.controller';
import { PrismaClient } from '../../database/generated/client';

// Initialize prisma client
const prisma = new PrismaClient();

export async function auditRoutes(fastify: FastifyInstance) {
  const auditController = new AuditController(prisma);
  
  // Register all audit routes
  await auditController.register(fastify);
}