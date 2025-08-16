/**
 * N8N Workflow Templates for EO Clínica
 * Manages and exports all workflow template definitions
 */

import novoAgendamentoWorkflow from './novo-agendamento.json';
import reagendamentoWorkflow from './reagendamento.json';
import sistemaLembretesWorkflow from './sistema-lembretes.json';
import gestaoFilaEsperaWorkflow from './gestao-fila-espera.json';
import { WorkflowDefinition, N8NWorkflowManager } from '../workflow-manager';
import { logger } from '../../../config/logger';

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category:
    | 'scheduling'
    | 'notifications'
    | 'queue'
    | 'monitoring'
    | 'integration';
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  workflow: WorkflowDefinition;
}

/**
 * Core scheduling workflows
 */
export const schedulingWorkflows: WorkflowTemplate[] = [
  {
    id: 'novo-agendamento',
    name: 'Novo Agendamento',
    description:
      'Fluxo completo para criação de novos agendamentos com validações, integrações e notificações',
    category: 'scheduling',
    priority: 'high',
    dependencies: [],
    workflow: novoAgendamentoWorkflow as WorkflowDefinition,
  },
  {
    id: 'reagendamento',
    name: 'Reagendamento',
    description:
      'Processo automatizado para reagendamento de consultas com validações de política e notificações',
    category: 'scheduling',
    priority: 'high',
    dependencies: ['novo-agendamento', 'gestao-fila-espera'],
    workflow: reagendamentoWorkflow as WorkflowDefinition,
  },
];

/**
 * Notification and reminder workflows
 */
export const notificationWorkflows: WorkflowTemplate[] = [
  {
    id: 'sistema-lembretes',
    name: 'Sistema de Lembretes',
    description:
      'Sistema automatizado de lembretes multi-canal (24h, 4h, 1h antes da consulta)',
    category: 'notifications',
    priority: 'high',
    dependencies: [],
    workflow: sistemaLembretesWorkflow as WorkflowDefinition,
  },
];

/**
 * Queue management workflows
 */
export const queueWorkflows: WorkflowTemplate[] = [
  {
    id: 'gestao-fila-espera',
    name: 'Gestão de Fila de Espera',
    description:
      'Automação da fila de espera com notificações por prioridade e gestão de vagas liberadas',
    category: 'queue',
    priority: 'high',
    dependencies: [],
    workflow: gestaoFilaEsperaWorkflow as WorkflowDefinition,
  },
];

/**
 * All workflow templates organized by category
 */
export const allWorkflowTemplates: WorkflowTemplate[] = [
  ...schedulingWorkflows,
  ...notificationWorkflows,
  ...queueWorkflows,
];

/**
 * Workflow Template Manager
 * Manages deployment, updates, and lifecycle of N8N workflows
 */
export class WorkflowTemplateManager {
  private workflowManager: N8NWorkflowManager;

  constructor(workflowManager: N8NWorkflowManager) {
    this.workflowManager = workflowManager;
  }

  /**
   * Deploy all workflows in the correct dependency order
   */
  async deployAllWorkflows(): Promise<void> {
    logger.info('Starting deployment of all N8N workflows');

    try {
      // Sort workflows by dependency order
      const sortedWorkflows = this.sortWorkflowsByDependencies();

      // Deploy each workflow
      for (const template of sortedWorkflows) {
        await this.deployWorkflow(template);
      }

      logger.info('All workflows deployed successfully');
    } catch (error) {
      logger.error('Failed to deploy workflows', error);
      throw new Error(`Workflow deployment failed: ${error}`);
    }
  }

  /**
   * Deploy a single workflow template
   */
  async deployWorkflow(
    template: WorkflowTemplate,
  ): Promise<WorkflowDefinition> {
    try {
      logger.info('Deploying workflow', { workflowId: template.id });

      // Check if workflow already exists
      const existingWorkflows = await this.workflowManager.listWorkflows();
      const existingWorkflow = existingWorkflows.find(
        w => w.name === template.workflow.name,
      );

      let deployedWorkflow: WorkflowDefinition;

      if (existingWorkflow) {
        // Update existing workflow
        logger.info('Updating existing workflow', { workflowId: template.id });
        deployedWorkflow = await this.workflowManager.updateWorkflow(
          existingWorkflow.id!,
          template.workflow,
        );
      } else {
        // Create new workflow
        logger.info('Creating new workflow', { workflowId: template.id });
        deployedWorkflow = await this.workflowManager.createWorkflow(
          template.workflow,
        );
      }

      // Activate workflow if it should be active
      if (template.workflow.active) {
        await this.workflowManager.setWorkflowActive(
          deployedWorkflow.id!,
          true,
        );
      }

      logger.info('Workflow deployed successfully', {
        workflowId: template.id,
        n8nWorkflowId: deployedWorkflow.id,
      });

      return deployedWorkflow;
    } catch (error) {
      logger.error('Failed to deploy workflow', {
        workflowId: template.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Sort workflows by their dependencies
   */
  private sortWorkflowsByDependencies(): WorkflowTemplate[] {
    const sorted: WorkflowTemplate[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (template: WorkflowTemplate): void => {
      if (visiting.has(template.id)) {
        throw new Error(`Circular dependency detected: ${template.id}`);
      }

      if (visited.has(template.id)) {
        return;
      }

      visiting.add(template.id);

      // Visit all dependencies first
      for (const depId of template.dependencies) {
        const depTemplate = allWorkflowTemplates.find(t => t.id === depId);
        if (depTemplate) {
          visit(depTemplate);
        }
      }

      visiting.delete(template.id);
      visited.add(template.id);
      sorted.push(template);
    };

    // Visit all templates
    for (const template of allWorkflowTemplates) {
      visit(template);
    }

    return sorted;
  }

  /**
   * Get workflow template by ID
   */
  getWorkflowTemplate(id: string): WorkflowTemplate | undefined {
    return allWorkflowTemplates.find(template => template.id === id);
  }

  /**
   * Get workflows by category
   */
  getWorkflowsByCategory(
    category: WorkflowTemplate['category'],
  ): WorkflowTemplate[] {
    return allWorkflowTemplates.filter(
      template => template.category === category,
    );
  }

  /**
   * Get high priority workflows
   */
  getHighPriorityWorkflows(): WorkflowTemplate[] {
    return allWorkflowTemplates.filter(
      template => template.priority === 'high',
    );
  }

  /**
   * Validate all workflow templates
   */
  validateWorkflowTemplates(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const template of allWorkflowTemplates) {
      // Check required fields
      if (!template.id || !template.name || !template.workflow) {
        errors.push(
          `Template ${template.id || 'unknown'} is missing required fields`,
        );
      }

      // Check workflow structure
      if (!template.workflow.nodes || !Array.isArray(template.workflow.nodes)) {
        errors.push(`Template ${template.id} has invalid workflow structure`);
      }

      // Check dependencies exist
      for (const depId of template.dependencies) {
        if (!allWorkflowTemplates.find(t => t.id === depId)) {
          errors.push(
            `Template ${template.id} has unknown dependency: ${depId}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Export all workflows as JSON
   */
  exportAllWorkflows(): Record<string, WorkflowDefinition> {
    const exported: Record<string, WorkflowDefinition> = {};

    for (const template of allWorkflowTemplates) {
      exported[template.id] = template.workflow;
    }

    return exported;
  }

  /**
   * Import workflows from JSON
   */
  async importWorkflows(
    workflows: Record<string, WorkflowDefinition>,
  ): Promise<void> {
    logger.info('Importing workflows from JSON', {
      count: Object.keys(workflows).length,
    });

    try {
      for (const [id, workflow] of Object.entries(workflows)) {
        await this.workflowManager.createWorkflow(workflow);
        logger.info('Workflow imported successfully', { workflowId: id });
      }

      logger.info('All workflows imported successfully');
    } catch (error) {
      logger.error('Failed to import workflows', error);
      throw error;
    }
  }

  /**
   * Health check for all deployed workflows
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    workflows: Array<{
      id: string;
      name: string;
      active: boolean;
      lastExecution?: string;
      status: 'healthy' | 'inactive' | 'error';
    }>;
  }> {
    try {
      const deployedWorkflows = await this.workflowManager.listWorkflows();
      const results = [];
      let allHealthy = true;

      for (const workflow of deployedWorkflows) {
        let status: 'healthy' | 'inactive' | 'error' = 'healthy';

        if (!workflow.active) {
          status = 'inactive';
          allHealthy = false;
        }

        // Check recent executions
        try {
          const executions = await this.workflowManager.listExecutions(
            workflow.id,
            5,
          );
          const lastExecution = executions[0];

          if (lastExecution && !lastExecution.finished) {
            status = 'error';
            allHealthy = false;
          }

          results.push({
            id: workflow.id!,
            name: workflow.name,
            active: workflow.active,
            lastExecution: lastExecution?.startedAt.toISOString(),
            status,
          });
        } catch (error) {
          results.push({
            id: workflow.id!,
            name: workflow.name,
            active: workflow.active,
            status: 'error',
          });
          allHealthy = false;
        }
      }

      return {
        healthy: allHealthy,
        workflows: results,
      };
    } catch (error) {
      logger.error('Health check failed', error);
      return {
        healthy: false,
        workflows: [],
      };
    }
  }
}

export const workflowTemplateManager = new WorkflowTemplateManager(
  new N8NWorkflowManager(),
);
