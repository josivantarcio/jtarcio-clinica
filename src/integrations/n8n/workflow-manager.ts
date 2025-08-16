import axios, { AxiosInstance } from 'axios';
import { n8nConfig } from './n8n-config';
import { logger } from '../../config/logger';

/**
 * N8N Workflow Manager
 * Manages workflow creation, execution, and monitoring for EO Clínica automation
 */

export interface WorkflowDefinition {
  id?: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnections;
  settings?: WorkflowSettings;
  tags?: string[];
  meta?: Record<string, any>;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  credentials?: Record<string, string>;
  webhookId?: string;
  continueOnFail?: boolean;
  retryOnFail?: boolean;
  maxTries?: number;
  waitBetweenTries?: number;
}

export interface WorkflowConnections {
  [nodeId: string]: {
    [outputIndex: string]: Array<{
      node: string;
      type: string;
      index: number;
    }>;
  };
}

export interface WorkflowSettings {
  executionOrder: 'v0' | 'v1';
  saveDataErrorExecution: 'all' | 'none';
  saveDataSuccessExecution: 'all' | 'none';
  saveManualExecutions: boolean;
  callerPolicy: 'workflowsFromSameOwner' | 'workflowsFromAList';
  errorWorkflow?: string;
  timezone: string;
}

export interface WorkflowExecution {
  id: string;
  finished: boolean;
  mode: 'manual' | 'trigger' | 'webhook' | 'internal';
  retryOf?: string;
  retrySuccessId?: string;
  startedAt: Date;
  stoppedAt?: Date;
  workflowData: WorkflowDefinition;
  data: {
    resultData: {
      runData: Record<string, any>;
      executionData?: any;
      startData?: any;
    };
  };
}

export class N8NWorkflowManager {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: n8nConfig.baseUrl,
      auth: {
        username: n8nConfig.basicAuth.username,
        password: n8nConfig.basicAuth.password,
      },
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor for logging
    this.client.interceptors.request.use(
      config => {
        logger.info('N8N API Request', {
          method: config.method,
          url: config.url,
          params: config.params,
        });
        return config;
      },
      error => {
        logger.error('N8N API Request Error', error);
        return Promise.reject(error);
      },
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      response => {
        logger.info('N8N API Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      error => {
        logger.error('N8N API Response Error', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url,
        });
        return Promise.reject(error);
      },
    );
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    workflow: WorkflowDefinition,
  ): Promise<WorkflowDefinition> {
    try {
      const response = await this.client.post('/api/v1/workflows', workflow);
      logger.info('Workflow created successfully', {
        workflowId: response.data.id,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to create workflow', {
        workflowName: workflow.name,
        error,
      });
      throw new Error(`Failed to create workflow: ${error}`);
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    workflowId: string,
    workflow: Partial<WorkflowDefinition>,
  ): Promise<WorkflowDefinition> {
    try {
      const response = await this.client.put(
        `/api/v1/workflows/${workflowId}`,
        workflow,
      );
      logger.info('Workflow updated successfully', { workflowId });
      return response.data;
    } catch (error) {
      logger.error('Failed to update workflow', { workflowId, error });
      throw new Error(`Failed to update workflow: ${error}`);
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    try {
      const response = await this.client.get(`/api/v1/workflows/${workflowId}`);
      return response.data;
    } catch (error) {
      logger.error('Failed to get workflow', { workflowId, error });
      throw new Error(`Failed to get workflow: ${error}`);
    }
  }

  /**
   * List all workflows
   */
  async listWorkflows(
    active?: boolean,
    tags?: string[],
  ): Promise<WorkflowDefinition[]> {
    try {
      const params: any = {};
      if (active !== undefined) params.active = active;
      if (tags && tags.length > 0) params.tags = tags.join(',');

      const response = await this.client.get('/api/v1/workflows', { params });
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to list workflows', { error });
      throw new Error(`Failed to list workflows: ${error}`);
    }
  }

  /**
   * Activate/Deactivate a workflow
   */
  async setWorkflowActive(workflowId: string, active: boolean): Promise<void> {
    try {
      await this.client.patch(`/api/v1/workflows/${workflowId}/activate`, {
        active,
      });
      logger.info('Workflow activation status changed', { workflowId, active });
    } catch (error) {
      logger.error('Failed to change workflow activation status', {
        workflowId,
        active,
        error,
      });
      throw new Error(
        `Failed to ${active ? 'activate' : 'deactivate'} workflow: ${error}`,
      );
    }
  }

  /**
   * Execute a workflow manually
   */
  async executeWorkflow(
    workflowId: string,
    inputData?: Record<string, any>,
  ): Promise<WorkflowExecution> {
    try {
      const payload: any = {};
      if (inputData) payload.startNodes = inputData;

      const response = await this.client.post(
        `/api/v1/workflows/${workflowId}/execute`,
        payload,
      );
      logger.info('Workflow executed successfully', {
        workflowId,
        executionId: response.data.id,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to execute workflow', { workflowId, error });
      throw new Error(`Failed to execute workflow: ${error}`);
    }
  }

  /**
   * Get workflow execution details
   */
  async getExecution(
    executionId: string,
    includeData: boolean = false,
  ): Promise<WorkflowExecution> {
    try {
      const params = includeData ? { includeData: 'true' } : {};
      const response = await this.client.get(
        `/api/v1/executions/${executionId}`,
        { params },
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get execution', { executionId, error });
      throw new Error(`Failed to get execution: ${error}`);
    }
  }

  /**
   * List workflow executions
   */
  async listExecutions(
    workflowId?: string,
    limit: number = 20,
    includeData: boolean = false,
  ): Promise<WorkflowExecution[]> {
    try {
      const params: any = { limit };
      if (workflowId) params.workflowId = workflowId;
      if (includeData) params.includeData = 'true';

      const response = await this.client.get('/api/v1/executions', { params });
      return response.data.data || [];
    } catch (error) {
      logger.error('Failed to list executions', { error });
      throw new Error(`Failed to list executions: ${error}`);
    }
  }

  /**
   * Delete a workflow execution
   */
  async deleteExecution(executionId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/executions/${executionId}`);
      logger.info('Execution deleted successfully', { executionId });
    } catch (error) {
      logger.error('Failed to delete execution', { executionId, error });
      throw new Error(`Failed to delete execution: ${error}`);
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await this.client.delete(`/api/v1/workflows/${workflowId}`);
      logger.info('Workflow deleted successfully', { workflowId });
    } catch (error) {
      logger.error('Failed to delete workflow', { workflowId, error });
      throw new Error(`Failed to delete workflow: ${error}`);
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(workflowId: string): Promise<any> {
    try {
      const response = await this.client.get(
        `/api/v1/workflows/${workflowId}/statistics`,
      );
      return response.data;
    } catch (error) {
      logger.error('Failed to get workflow statistics', { workflowId, error });
      throw new Error(`Failed to get workflow statistics: ${error}`);
    }
  }

  /**
   * Test workflow connection to N8N instance
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/healthz');
      return response.status === 200;
    } catch (error) {
      logger.error('N8N connection test failed', { error });
      return false;
    }
  }

  /**
   * Get N8N instance information
   */
  async getInstanceInfo(): Promise<any> {
    try {
      const response = await this.client.get('/api/v1/about');
      return response.data;
    } catch (error) {
      logger.error('Failed to get N8N instance info', { error });
      throw new Error(`Failed to get N8N instance info: ${error}`);
    }
  }

  /**
   * Bulk activate/deactivate workflows
   */
  async bulkActivateWorkflows(
    workflowIds: string[],
    active: boolean,
  ): Promise<void> {
    const promises = workflowIds.map(id => this.setWorkflowActive(id, active));
    await Promise.allSettled(promises);
    logger.info('Bulk workflow activation completed', {
      count: workflowIds.length,
      active,
    });
  }

  /**
   * Export workflow as JSON
   */
  async exportWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    return this.getWorkflow(workflowId);
  }

  /**
   * Import workflow from JSON
   */
  async importWorkflow(
    workflowData: WorkflowDefinition,
  ): Promise<WorkflowDefinition> {
    // Remove ID to create a new workflow
    const { id, ...workflowWithoutId } = workflowData;
    return this.createWorkflow(workflowWithoutId);
  }

  /**
   * Clone an existing workflow
   */
  async cloneWorkflow(
    workflowId: string,
    newName: string,
  ): Promise<WorkflowDefinition> {
    try {
      const originalWorkflow = await this.getWorkflow(workflowId);
      const clonedWorkflow = {
        ...originalWorkflow,
        name: newName,
        active: false, // Start as inactive
      };
      delete clonedWorkflow.id;

      return this.createWorkflow(clonedWorkflow);
    } catch (error) {
      logger.error('Failed to clone workflow', { workflowId, newName, error });
      throw new Error(`Failed to clone workflow: ${error}`);
    }
  }
}

export const workflowManager = new N8NWorkflowManager();
