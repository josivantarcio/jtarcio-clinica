import { FastifyInstance } from 'fastify';
import { AuditController } from '../modules/audit/audit.controller';
import { prisma } from '../config/database';

export async function auditRoutes(fastify: FastifyInstance) {
  const auditController = new AuditController(prisma);

  // Register all audit routes
  await auditController.register(fastify);
}
