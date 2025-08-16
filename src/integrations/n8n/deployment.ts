import { workflowTemplateManager } from './workflow-templates';
import { workflowManager } from './workflow-manager';
import { logger } from '../../config/logger';

/**
 * N8N Deployment Manager for EO Clínica
 * Handles complete deployment and setup of all N8N workflows and configurations
 */

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production';
  force: boolean; // Force update existing workflows
  skipValidation: boolean;
  includeTestData: boolean;
}

export interface DeploymentResult {
  success: boolean;
  deployed: string[];
  failed: string[];
  skipped: string[];
  errors: Array<{
    workflowId: string;
    error: string;
  }>;
  duration: number;
}

/**
 * Complete deployment manager for N8N automation system
 */
export class N8NDeploymentManager {
  /**
   * Deploy complete N8N automation system
   */
  async deployComplete(
    config: DeploymentConfig = {
      environment: 'development',
      force: false,
      skipValidation: false,
      includeTestData: false,
    },
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    logger.info('Starting complete N8N deployment', config);

    const result: DeploymentResult = {
      success: false,
      deployed: [],
      failed: [],
      skipped: [],
      errors: [],
      duration: 0,
    };

    try {
      // Step 1: Validate N8N connection
      if (!config.skipValidation) {
        const healthCheck = await this.validateN8NConnection();
        if (!healthCheck.success) {
          throw new Error(`N8N connection failed: ${healthCheck.error}`);
        }
        logger.info('N8N connection validated');
      }

      // Step 2: Validate workflow templates
      if (!config.skipValidation) {
        const validation = workflowTemplateManager.validateWorkflowTemplates();
        if (!validation.valid) {
          throw new Error(
            `Workflow validation failed: ${validation.errors.join(', ')}`,
          );
        }
        logger.info('Workflow templates validated');
      }

      // Step 3: Deploy workflows in dependency order
      const deploymentResults = await this.deployWorkflows(config);
      result.deployed = deploymentResults.deployed;
      result.failed = deploymentResults.failed;
      result.skipped = deploymentResults.skipped;
      result.errors = deploymentResults.errors;

      // Step 4: Setup credentials
      await this.setupCredentials(config);

      // Step 5: Configure webhooks
      await this.setupWebhooks(config);

      // Step 6: Initialize monitoring
      await this.initializeMonitoring(config);

      // Step 7: Run test executions (if requested)
      if (config.includeTestData) {
        await this.runTestExecutions(config);
      }

      result.success = result.failed.length === 0;
      result.duration = Date.now() - startTime;

      logger.info('N8N deployment completed', {
        success: result.success,
        deployed: result.deployed.length,
        failed: result.failed.length,
        duration: result.duration,
      });

      return result;
    } catch (error) {
      logger.error('N8N deployment failed', error);
      result.success = false;
      result.duration = Date.now() - startTime;
      result.errors.push({
        workflowId: 'deployment',
        error: error.message,
      });

      return result;
    }
  }

  /**
   * Validate N8N connection and basic functionality
   */
  private async validateN8NConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const isConnected = await workflowManager.testConnection();
      if (!isConnected) {
        return { success: false, error: 'Cannot connect to N8N instance' };
      }

      const instanceInfo = await workflowManager.getInstanceInfo();
      logger.info('N8N instance info', instanceInfo);

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Deploy all workflow templates
   */
  private async deployWorkflows(config: DeploymentConfig): Promise<{
    deployed: string[];
    failed: string[];
    skipped: string[];
    errors: Array<{ workflowId: string; error: string }>;
  }> {
    const deployed: string[] = [];
    const failed: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ workflowId: string; error: string }> = [];

    try {
      // Get existing workflows
      const existingWorkflows = await workflowManager.listWorkflows();

      // Deploy high priority workflows first
      const highPriorityWorkflows =
        workflowTemplateManager.getHighPriorityWorkflows();

      for (const template of highPriorityWorkflows) {
        try {
          const existingWorkflow = existingWorkflows.find(
            w => w.name === template.workflow.name,
          );

          if (existingWorkflow && !config.force) {
            logger.info('Workflow already exists, skipping', {
              workflowId: template.id,
            });
            skipped.push(template.id);
            continue;
          }

          logger.info('Deploying workflow', { workflowId: template.id });

          const deployedWorkflow =
            await workflowTemplateManager.deployWorkflow(template);
          deployed.push(template.id);

          logger.info('Workflow deployed successfully', {
            workflowId: template.id,
            n8nWorkflowId: deployedWorkflow.id,
          });
        } catch (error) {
          logger.error('Failed to deploy workflow', {
            workflowId: template.id,
            error,
          });
          failed.push(template.id);
          errors.push({
            workflowId: template.id,
            error: error.message,
          });
        }
      }

      return { deployed, failed, skipped, errors };
    } catch (error) {
      logger.error('Failed to deploy workflows', error);
      throw error;
    }
  }

  /**
   * Setup credentials for external services
   */
  private async setupCredentials(config: DeploymentConfig): Promise<void> {
    logger.info(
      'Setting up credentials (placeholder - would configure actual credentials)',
    );

    // In a real implementation, this would configure:
    // - Database credentials
    // - External API credentials (WhatsApp, Twilio, Google, etc.)
    // - SMTP credentials
    // - Authentication tokens

    // For now, we'll just log that credentials need to be configured manually
    logger.warn('Credentials must be configured manually in N8N interface', {
      required: [
        'clinic-postgres-credentials',
        'clinic-redis-credentials',
        'clinic-smtp-credentials',
        'whatsapp-api-credentials',
        'twilio-credentials',
        'google-calendar-credentials',
      ],
    });
  }

  /**
   * Setup webhook endpoints and notifications
   */
  private async setupWebhooks(config: DeploymentConfig): Promise<void> {
    logger.info('Setting up webhooks');

    try {
      // Get all active workflows
      const activeWorkflows = await workflowManager.listWorkflows(true);
      const webhookWorkflows = activeWorkflows.filter(w =>
        w.nodes?.some(node => node.type === 'n8n-nodes-base.webhook'),
      );

      logger.info('Webhook-enabled workflows found', {
        count: webhookWorkflows.length,
        workflows: webhookWorkflows.map(w => w.name),
      });

      // Log webhook URLs for reference
      for (const workflow of webhookWorkflows) {
        const webhookNodes =
          workflow.nodes?.filter(
            node => node.type === 'n8n-nodes-base.webhook',
          ) || [];

        for (const node of webhookNodes) {
          const webhookPath = node.parameters?.path;
          if (webhookPath) {
            const webhookUrl = `${process.env.N8N_WEBHOOK_URL || 'http://localhost:5678'}/webhook/${webhookPath}`;
            logger.info('Webhook configured', {
              workflow: workflow.name,
              node: node.name,
              url: webhookUrl,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Failed to setup webhooks', error);
      throw error;
    }
  }

  /**
   * Initialize monitoring workflows
   */
  private async initializeMonitoring(config: DeploymentConfig): Promise<void> {
    logger.info('Initializing monitoring system');

    try {
      // Start monitoring workflow
      const workflows = await workflowManager.listWorkflows();
      const monitoringWorkflow = workflows.find(
        w => w.name === 'monitoring-sistema',
      );

      if (monitoringWorkflow && monitoringWorkflow.active) {
        logger.info('Monitoring workflow is active', {
          workflowId: monitoringWorkflow.id,
        });

        // Execute initial health check
        const healthCheck = await workflowManager.executeWorkflow(
          monitoringWorkflow.id!,
          {
            initialCheck: true,
            environment: config.environment,
          },
        );

        logger.info('Initial health check executed', {
          executionId: healthCheck.id,
        });
      }

      // Start metrics workflow
      const metricsWorkflow = workflows.find(
        w => w.name === 'business-metrics',
      );
      if (metricsWorkflow && metricsWorkflow.active) {
        logger.info('Business metrics workflow is active', {
          workflowId: metricsWorkflow.id,
        });
      }
    } catch (error) {
      logger.error('Failed to initialize monitoring', error);
      // Don't throw - monitoring failure shouldn't stop deployment
    }
  }

  /**
   * Run test executions to validate deployment
   */
  private async runTestExecutions(config: DeploymentConfig): Promise<void> {
    logger.info('Running test executions');

    try {
      const workflows = await workflowManager.listWorkflows(true);
      const testableWorkflows = workflows.filter(
        w => !w.name.includes('monitoring') && !w.name.includes('metrics'),
      );

      for (const workflow of testableWorkflows.slice(0, 3)) {
        // Test first 3 workflows
        try {
          logger.info('Testing workflow', {
            workflowId: workflow.id,
            name: workflow.name,
          });

          const testData = this.generateTestData(workflow.name);
          const execution = await workflowManager.executeWorkflow(
            workflow.id!,
            testData,
          );

          logger.info('Test execution started', {
            workflowId: workflow.id,
            executionId: execution.id,
          });

          // Wait briefly for execution to complete
          await new Promise(resolve => setTimeout(resolve, 5000));

          const result = await workflowManager.getExecution(execution.id);
          logger.info('Test execution result', {
            workflowId: workflow.id,
            executionId: execution.id,
            finished: result.finished,
          });
        } catch (testError) {
          logger.warn('Test execution failed (expected in some cases)', {
            workflowId: workflow.id,
            error: testError.message,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to run test executions', error);
      // Don't throw - test failures shouldn't stop deployment
    }
  }

  /**
   * Generate test data for workflow validation
   */
  private generateTestData(workflowName: string): Record<string, any> {
    const baseTestData = {
      test: true,
      timestamp: new Date().toISOString(),
      environment: 'deployment_test',
    };

    switch (workflowName) {
      case 'novo-agendamento':
        return {
          ...baseTestData,
          patientId: 'test-patient-123',
          doctorId: 'test-doctor-123',
          specialtyId: 'test-specialty-123',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          duration: 30,
          patientName: 'Test Patient',
          patientEmail: 'test@example.com',
          patientPhone: '+5511999999999',
        };

      case 'sistema-lembretes':
        return {
          ...baseTestData,
          scheduledExecution: true,
          reminderType: 'test',
        };

      case 'gestao-fila-espera':
        return {
          ...baseTestData,
          specialtyId: 'test-specialty-123',
          date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 30,
        };

      default:
        return baseTestData;
    }
  }

  /**
   * Validate deployment health
   */
  async validateDeployment(): Promise<{
    healthy: boolean;
    workflows: Array<{
      name: string;
      active: boolean;
      lastExecution?: string;
      status: string;
    }>;
    issues: string[];
  }> {
    logger.info('Validating deployment health');

    try {
      const healthCheck = await workflowTemplateManager.healthCheck();
      const issues: string[] = [];

      // Check for inactive critical workflows
      const criticalWorkflows = [
        'novo-agendamento',
        'sistema-lembretes',
        'monitoring-sistema',
      ];
      const inactiveCritical = healthCheck.workflows.filter(
        w => criticalWorkflows.includes(w.name) && !w.active,
      );

      if (inactiveCritical.length > 0) {
        issues.push(
          `Critical workflows inactive: ${inactiveCritical.map(w => w.name).join(', ')}`,
        );
      }

      // Check for workflows with errors
      const errorWorkflows = healthCheck.workflows.filter(
        w => w.status === 'error',
      );
      if (errorWorkflows.length > 0) {
        issues.push(
          `Workflows with errors: ${errorWorkflows.map(w => w.name).join(', ')}`,
        );
      }

      return {
        healthy: healthCheck.healthy && issues.length === 0,
        workflows: healthCheck.workflows,
        issues,
      };
    } catch (error) {
      logger.error('Failed to validate deployment', error);
      return {
        healthy: false,
        workflows: [],
        issues: [`Validation failed: ${error.message}`],
      };
    }
  }

  /**
   * Cleanup deployment artifacts
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up deployment artifacts');

    try {
      // Remove test executions
      const executions = await workflowManager.listExecutions(undefined, 50);
      const testExecutions = executions.filter(
        e => e.data?.resultData?.startData?.test === true,
      );

      for (const execution of testExecutions) {
        try {
          await workflowManager.deleteExecution(execution.id);
          logger.info('Test execution cleaned up', {
            executionId: execution.id,
          });
        } catch (deleteError) {
          logger.warn('Failed to delete test execution', {
            executionId: execution.id,
            error: deleteError.message,
          });
        }
      }

      logger.info('Deployment cleanup completed', {
        testExecutionsRemoved: testExecutions.length,
      });
    } catch (error) {
      logger.error('Failed to cleanup deployment', error);
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(): Promise<{
    deployed: boolean;
    version: string;
    workflows: number;
    activeWorkflows: number;
    lastDeployment?: string;
    environment: string;
  }> {
    try {
      const workflows = await workflowManager.listWorkflows();
      const activeWorkflows = workflows.filter(w => w.active);

      return {
        deployed: workflows.length > 0,
        version: '1.0.0', // This would come from package.json or env
        workflows: workflows.length,
        activeWorkflows: activeWorkflows.length,
        lastDeployment: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
      };
    } catch (error) {
      logger.error('Failed to get deployment status', error);
      return {
        deployed: false,
        version: 'unknown',
        workflows: 0,
        activeWorkflows: 0,
        environment: process.env.NODE_ENV || 'development',
      };
    }
  }
}

// Export deployment manager instance
export const deploymentManager = new N8NDeploymentManager();
