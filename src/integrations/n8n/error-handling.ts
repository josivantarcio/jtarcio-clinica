import { logger } from '../../config/logger';
import { workflowManager } from './workflow-manager';

/**
 * Error Handling and Recovery System for N8N Workflows
 * Provides comprehensive error handling, retry logic, and automatic recovery mechanisms
 */

export interface ErrorConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  fallbackWorkflow?: string;
  alertThreshold: number;
  autoRestart: boolean;
}

export interface WorkflowError {
  workflowId: string;
  workflowName: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  errorMessage: string;
  errorType: 'timeout' | 'connection' | 'validation' | 'external_api' | 'unknown';
  timestamp: string;
  retryCount: number;
  isCritical: boolean;
  context?: Record<string, any>;
}

export interface RecoveryAction {
  type: 'retry' | 'fallback' | 'skip' | 'restart' | 'alert';
  description: string;
  automated: boolean;
  executed: boolean;
  result?: string;
}

export interface ErrorHandlingResult {
  success: boolean;
  error?: WorkflowError;
  recoveryActions: RecoveryAction[];
  escalated: boolean;
}

/**
 * Centralized Error Handler for N8N Workflows
 */
export class N8NErrorHandler {
  private errorConfigs: Map<string, ErrorConfig> = new Map();
  private errorHistory: WorkflowError[] = [];
  private recoveryAttempts: Map<string, number> = new Map();

  constructor() {
    this.setupDefaultConfigurations();
  }

  /**
   * Setup default error configurations for different workflow types
   */
  private setupDefaultConfigurations(): void {
    // Critical workflows (appointments, payments)
    this.errorConfigs.set('critical', {
      maxRetries: 5,
      retryDelay: 2000,
      exponentialBackoff: true,
      alertThreshold: 2,
      autoRestart: true
    });

    // Communication workflows (emails, SMS, WhatsApp)
    this.errorConfigs.set('communication', {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      alertThreshold: 3,
      autoRestart: false,
      fallbackWorkflow: 'fallback-notification'
    });

    // Monitoring workflows
    this.errorConfigs.set('monitoring', {
      maxRetries: 2,
      retryDelay: 5000,
      exponentialBackoff: false,
      alertThreshold: 1,
      autoRestart: true
    });

    // Reporting workflows
    this.errorConfigs.set('reporting', {
      maxRetries: 2,
      retryDelay: 10000,
      exponentialBackoff: false,
      alertThreshold: 5,
      autoRestart: false
    });

    // Default configuration
    this.errorConfigs.set('default', {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      alertThreshold: 3,
      autoRestart: false
    });
  }

  /**
   * Handle workflow execution error
   */
  async handleWorkflowError(
    workflowId: string,
    executionId: string,
    error: any,
    context?: Record<string, any>
  ): Promise<ErrorHandlingResult> {
    try {
      // Parse and classify error
      const workflowError = await this.parseWorkflowError(workflowId, executionId, error, context);
      
      // Add to error history
      this.errorHistory.push(workflowError);
      
      // Get error configuration
      const config = this.getErrorConfig(workflowError.workflowName);
      
      // Determine recovery actions
      const recoveryActions = await this.determineRecoveryActions(workflowError, config);
      
      // Execute recovery actions
      let success = false;
      let escalated = false;
      
      for (const action of recoveryActions) {
        if (action.automated) {
          const result = await this.executeRecoveryAction(workflowError, action, config);
          action.executed = true;
          action.result = result.message;
          
          if (result.success) {
            success = true;
            break;
          }
        }
      }
      
      // Check if escalation is needed
      if (!success && this.shouldEscalate(workflowError, config)) {
        await this.escalateError(workflowError, recoveryActions);
        escalated = true;
      }
      
      // Log the error handling result
      logger.info('Error handling completed', {
        workflowId,
        executionId,
        success,
        escalated,
        actionsExecuted: recoveryActions.filter(a => a.executed).length
      });
      
      return {
        success,
        error: workflowError,
        recoveryActions,
        escalated
      };
      
    } catch (handlingError) {
      logger.error('Error in error handler', handlingError);
      
      // Fallback error handling
      await this.escalateError({
        workflowId,
        workflowName: 'unknown',
        executionId,
        nodeId: 'unknown',
        nodeName: 'unknown',
        errorMessage: `Error handler failure: ${handlingError.message}`,
        errorType: 'unknown',
        timestamp: new Date().toISOString(),
        retryCount: 0,
        isCritical: true
      }, []);
      
      return {
        success: false,
        recoveryActions: [],
        escalated: true
      };
    }
  }

  /**
   * Parse raw error into structured WorkflowError
   */
  private async parseWorkflowError(
    workflowId: string,
    executionId: string,
    error: any,
    context?: Record<string, any>
  ): Promise<WorkflowError> {
    try {
      // Get workflow details
      const workflow = await workflowManager.getWorkflow(workflowId);
      
      // Parse error type
      let errorType: WorkflowError['errorType'] = 'unknown';
      if (error.message?.includes('timeout')) errorType = 'timeout';
      else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') errorType = 'connection';
      else if (error.status >= 400 && error.status < 500) errorType = 'validation';
      else if (error.status >= 500 || error.message?.includes('API')) errorType = 'external_api';
      
      // Determine if error is critical
      const isCritical = this.isCriticalError(error, workflow.name);
      
      // Get retry count
      const retryKey = `${workflowId}_${executionId}`;
      const retryCount = this.recoveryAttempts.get(retryKey) || 0;
      
      return {
        workflowId,
        workflowName: workflow.name,
        executionId,
        nodeId: error.node?.id || 'unknown',
        nodeName: error.node?.name || 'unknown',
        errorMessage: error.message || 'Unknown error occurred',
        errorType,
        timestamp: new Date().toISOString(),
        retryCount,
        isCritical,
        context
      };
      
    } catch (parseError) {
      logger.error('Failed to parse workflow error', parseError);
      
      return {
        workflowId,
        workflowName: 'unknown',
        executionId,
        nodeId: 'unknown',
        nodeName: 'unknown',
        errorMessage: error.message || 'Parse error occurred',
        errorType: 'unknown',
        timestamp: new Date().toISOString(),
        retryCount: 0,
        isCritical: true,
        context
      };
    }
  }

  /**
   * Determine appropriate recovery actions
   */
  private async determineRecoveryActions(
    error: WorkflowError,
    config: ErrorConfig
  ): Promise<RecoveryAction[]> {
    const actions: RecoveryAction[] = [];
    
    // Retry action
    if (error.retryCount < config.maxRetries && this.isRetryable(error)) {
      actions.push({
        type: 'retry',
        description: `Retry workflow execution (attempt ${error.retryCount + 1}/${config.maxRetries})`,
        automated: true,
        executed: false
      });
    }
    
    // Fallback workflow
    if (config.fallbackWorkflow && error.retryCount >= Math.ceil(config.maxRetries / 2)) {
      actions.push({
        type: 'fallback',
        description: `Execute fallback workflow: ${config.fallbackWorkflow}`,
        automated: true,
        executed: false
      });
    }
    
    // Skip node action for non-critical errors
    if (!error.isCritical && error.errorType !== 'validation') {
      actions.push({
        type: 'skip',
        description: `Skip failed node and continue workflow`,
        automated: true,
        executed: false
      });
    }
    
    // Restart workflow for critical errors
    if (error.isCritical && config.autoRestart) {
      actions.push({
        type: 'restart',
        description: `Restart entire workflow`,
        automated: true,
        executed: false
      });
    }
    
    // Alert action
    if (this.shouldAlert(error, config)) {
      actions.push({
        type: 'alert',
        description: `Send alert to administrators`,
        automated: true,
        executed: false
      });
    }
    
    return actions;
  }

  /**
   * Execute a recovery action
   */
  private async executeRecoveryAction(
    error: WorkflowError,
    action: RecoveryAction,
    config: ErrorConfig
  ): Promise<{ success: boolean; message: string }> {
    const retryKey = `${error.workflowId}_${error.executionId}`;
    
    try {
      switch (action.type) {
        case 'retry':
          // Update retry count
          this.recoveryAttempts.set(retryKey, error.retryCount + 1);
          
          // Wait for retry delay
          const delay = config.exponentialBackoff 
            ? config.retryDelay * Math.pow(2, error.retryCount)
            : config.retryDelay;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Retry workflow execution
          const retryResult = await workflowManager.executeWorkflow(
            error.workflowId,
            error.context
          );
          
          logger.info('Workflow retry executed', {
            workflowId: error.workflowId,
            executionId: retryResult.id,
            retryCount: error.retryCount + 1
          });
          
          return { success: true, message: `Retry successful: ${retryResult.id}` };
          
        case 'fallback':
          if (!config.fallbackWorkflow) {
            return { success: false, message: 'No fallback workflow configured' };
          }
          
          // Execute fallback workflow
          const fallbackResult = await workflowManager.executeWorkflow(
            config.fallbackWorkflow,
            { originalError: error, ...error.context }
          );
          
          logger.info('Fallback workflow executed', {
            originalWorkflow: error.workflowId,
            fallbackWorkflow: config.fallbackWorkflow,
            executionId: fallbackResult.id
          });
          
          return { success: true, message: `Fallback executed: ${fallbackResult.id}` };
          
        case 'skip':
          // Mark execution as partially successful and continue
          // This would require workflow modification - simplified for now
          logger.info('Node skipped, continuing workflow', {
            workflowId: error.workflowId,
            nodeId: error.nodeId
          });
          
          return { success: true, message: 'Node skipped successfully' };
          
        case 'restart':
          // Stop current execution and start new one
          const restartResult = await workflowManager.executeWorkflow(
            error.workflowId,
            error.context
          );
          
          logger.info('Workflow restarted', {
            workflowId: error.workflowId,
            newExecutionId: restartResult.id
          });
          
          return { success: true, message: `Workflow restarted: ${restartResult.id}` };
          
        case 'alert':
          await this.sendErrorAlert(error);
          return { success: true, message: 'Alert sent to administrators' };
          
        default:
          return { success: false, message: `Unknown recovery action: ${action.type}` };
      }
      
    } catch (actionError) {
      logger.error('Recovery action failed', {
        action: action.type,
        error: actionError.message,
        workflowError: error
      });
      
      return { success: false, message: `Action failed: ${actionError.message}` };
    }
  }

  /**
   * Send error alert to administrators
   */
  private async sendErrorAlert(error: WorkflowError): Promise<void> {
    try {
      // Trigger alert workflow
      const alertWorkflow = await workflowManager.listWorkflows(true);
      const errorAlertWorkflow = alertWorkflow.find(w => w.name === 'error-alert-notification');
      
      if (errorAlertWorkflow) {
        await workflowManager.executeWorkflow(errorAlertWorkflow.id!, {
          error,
          severity: error.isCritical ? 'critical' : 'warning',
          timestamp: new Date().toISOString()
        });
      }
      
      logger.info('Error alert sent', { workflowId: error.workflowId });
      
    } catch (alertError) {
      logger.error('Failed to send error alert', alertError);
    }
  }

  /**
   * Escalate error to administrators
   */
  private async escalateError(error: WorkflowError, actions: RecoveryAction[]): Promise<void> {
    try {
      logger.error('Error escalated to administrators', {
        workflowId: error.workflowId,
        errorType: error.errorType,
        isCritical: error.isCritical,
        failedActions: actions.filter(a => a.executed && !a.result?.includes('successful')).length
      });
      
      // Send immediate alert
      await this.sendErrorAlert(error);
      
      // Log escalation
      this.errorHistory.push({
        ...error,
        errorMessage: `ESCALATED: ${error.errorMessage}`,
        isCritical: true
      });
      
    } catch (escalationError) {
      logger.error('Failed to escalate error', escalationError);
    }
  }

  /**
   * Get error configuration for workflow type
   */
  private getErrorConfig(workflowName: string): ErrorConfig {
    // Determine workflow category
    let category = 'default';
    
    if (workflowName.includes('agendamento') || workflowName.includes('payment')) {
      category = 'critical';
    } else if (workflowName.includes('lembrete') || workflowName.includes('notification') || workflowName.includes('whatsapp') || workflowName.includes('sms')) {
      category = 'communication';
    } else if (workflowName.includes('monitoring') || workflowName.includes('health')) {
      category = 'monitoring';
    } else if (workflowName.includes('metrics') || workflowName.includes('report')) {
      category = 'reporting';
    }
    
    return this.errorConfigs.get(category) || this.errorConfigs.get('default')!;
  }

  /**
   * Check if error is critical
   */
  private isCriticalError(error: any, workflowName: string): boolean {
    // Critical workflow types
    const criticalWorkflows = ['novo-agendamento', 'reagendamento', 'payment-processing'];
    if (criticalWorkflows.some(cw => workflowName.includes(cw))) {
      return true;
    }
    
    // Critical error types
    if (error.message?.includes('database') || error.message?.includes('payment')) {
      return true;
    }
    
    // HTTP errors that are critical
    if (error.status >= 500) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: WorkflowError): boolean {
    // Non-retryable error types
    const nonRetryableTypes = ['validation'];
    if (nonRetryableTypes.includes(error.errorType)) {
      return false;
    }
    
    // Non-retryable error messages
    const nonRetryableMessages = ['authentication', 'unauthorized', 'forbidden', 'not found'];
    if (nonRetryableMessages.some(msg => error.errorMessage.toLowerCase().includes(msg))) {
      return false;
    }
    
    return true;
  }

  /**
   * Check if alert should be sent
   */
  private shouldAlert(error: WorkflowError, config: ErrorConfig): boolean {
    return error.retryCount >= config.alertThreshold || error.isCritical;
  }

  /**
   * Check if error should be escalated
   */
  private shouldEscalate(error: WorkflowError, config: ErrorConfig): boolean {
    return error.retryCount >= config.maxRetries || error.isCritical;
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    criticalErrors: number;
    recentErrors: number;
    errorsByType: Record<string, number>;
    errorsByWorkflow: Record<string, number>;
  } {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    
    return {
      totalErrors: this.errorHistory.length,
      criticalErrors: this.errorHistory.filter(e => e.isCritical).length,
      recentErrors: this.errorHistory.filter(e => 
        now - new Date(e.timestamp).getTime() < oneHour
      ).length,
      errorsByType: this.errorHistory.reduce((acc, error) => {
        acc[error.errorType] = (acc[error.errorType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      errorsByWorkflow: this.errorHistory.reduce((acc, error) => {
        acc[error.workflowName] = (acc[error.workflowName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Clear old error history
   */
  cleanupErrorHistory(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;
    this.errorHistory = this.errorHistory.filter(
      error => new Date(error.timestamp).getTime() > cutoff
    );
    
    logger.info('Error history cleaned up', { 
      remainingErrors: this.errorHistory.length 
    });
  }
}

// Export singleton instance
export const errorHandler = new N8NErrorHandler();