import { appEventBus, LogLevel, LogEventPayload, ValidationEventPayload } from './eventBus';

/**
 * Base logging function that handles both console output and event emission
 * @param level - The log level (info, warn, error, debug)
 * @param message - The log message
 * @param data - Optional data to include with the log
 */
const log = (level: LogLevel, message: string, data?: any): void => {
  // Create timestamp
  const timestamp = Date.now();
  
  // Create log payload
  const logPayload: LogEventPayload = {
    level,
    message,
    data,
    timestamp,
  };
  
  // Output to console based on level
  switch (level) {
    case LogLevel.INFO:
      console.info(`[INFO] ${message}`, data || '');
      break;
    case LogLevel.WARN:
      console.warn(`[WARN] ${message}`, data || '');
      break;
    case LogLevel.ERROR:
      console.error(`[ERROR] ${message}`, data || '');
      break;
    case LogLevel.DEBUG:
      console.debug(`[DEBUG] ${message}`, data || '');
      break;
  }
  
  // Emit event through the event bus
  appEventBus.emit('log_event', logPayload);
};

/**
 * Log informational message
 * @param message - The message to log
 * @param data - Optional data to include
 */
export const logInfo = (message: string, data?: any): void => {
  log(LogLevel.INFO, message, data);
};

/**
 * Log warning message
 * @param message - The message to log
 * @param data - Optional data to include
 */
export const logWarn = (message: string, data?: any): void => {
  log(LogLevel.WARN, message, data);
};

/**
 * Log error message
 * @param message - The message to log
 * @param data - Optional data to include
 */
export const logError = (message: string, data?: any): void => {
  log(LogLevel.ERROR, message, data);
};

/**
 * Log debug message
 * @param message - The message to log
 * @param data - Optional data to include
 */
export const logDebug = (message: string, data?: any): void => {
  log(LogLevel.DEBUG, message, data);
};

/**
 * Log validation event
 * This function logs the validation event to the console and emits it through the event bus
 * 
 * @param taskId - The ID of the task being validated
 * @param status - The validation status ('success' or 'failure')
 * @param message - Optional additional message
 */
export const logValidation = (taskId: string, status: 'success' | 'failure', message?: string): void => {
  // Log to console
  const logMessage = `Validation for task ${taskId}: ${status}${message ? ` - ${message}` : ''}`;
  
  if (status === 'success') {
    logInfo(logMessage);
  } else {
    logError(logMessage);
  }
  
  // Create validation payload
  const validationPayload: ValidationEventPayload = {
    taskId,
    status,
    message,
    timestamp: Date.now(),
  };
  
  // Emit validation event
  appEventBus.emit('validation_event', validationPayload);
}; 