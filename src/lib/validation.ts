import { appEventBus } from './eventBus';
import { logInfo, logError } from './logger';

export type ValidationStatus = 'success' | 'failure';

/**
 * ValidationStep interface for tracking data validation steps
 */
export interface ValidationStep {
  taskId: string;
  status: ValidationStatus;
  message?: string;
  timestamp: number;
}

/**
 * Log validation event
 * This function logs the validation event and emits it through the event bus
 * 
 * @param taskId - The ID of the task being validated
 * @param status - The validation status ('success' or 'failure')
 * @param message - Optional additional message
 */
export const logValidation = (taskId: string, status: ValidationStatus, message?: string): void => {
  // Log to console based on status
  const logMessage = `Validation for task ${taskId}: ${status}${message ? ` - ${message}` : ''}`;
  
  if (status === 'success') {
    console.info(`[VALIDATION SUCCESS] ${logMessage}`);
    logInfo(logMessage);
  } else {
    console.error(`[VALIDATION FAILURE] ${logMessage}`);
    logError(logMessage);
  }
  
  // Create validation payload
  const validationPayload: ValidationStep = {
    taskId,
    status,
    message,
    timestamp: Date.now(),
  };
  
  // Emit validation event
  appEventBus.emit('validation_event', validationPayload);
}; 