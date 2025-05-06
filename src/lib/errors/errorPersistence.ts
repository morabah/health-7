/**
 * Error Persistence
 * 
 * This file contains utilities for persisting errors for later analysis,
 * especially useful when running in offline mode or when the error reporting
 * service is unavailable.
 */

import { AppError } from './errorClasses';

/** 
 * Storage key for persisted errors
 */
const ERROR_STORAGE_KEY = 'app_persisted_errors';

/**
 * Maximum number of errors to store
 */
const MAX_STORED_ERRORS = 50;

/**
 * Persisted error interface
 */
interface PersistedError {
  /** Unique ID for the error */
  id: string;
  
  /** Error message */
  message: string;
  
  /** Error name/type */
  name: string;
  
  /** Stack trace */
  stack?: string;
  
  /** Error category */
  category?: string;
  
  /** Error severity */
  severity?: string;
  
  /** Error context */
  context?: Record<string, unknown>;
  
  /** Whether the error is retryable */
  retryable?: boolean;
  
  /** Timestamp when the error occurred */
  timestamp: number;
}

/**
 * Converts an Error object to a storable object
 */
function errorToStorable(error: Error): PersistedError {
  const timestamp = Date.now();
  
  // Basic error properties
  const persistedError: PersistedError = {
    id: `err_${timestamp}_${Math.random().toString(36).substring(2, 9)}`,
    message: error.message,
    name: error.name,
    stack: error.stack,
    timestamp,
  };
  
  // Add AppError properties if available
  if (error instanceof AppError) {
    persistedError.category = error.category;
    persistedError.severity = error.severity;
    persistedError.context = { ...error.context };
    persistedError.retryable = error.retryable;
  }
  
  return persistedError;
}

/**
 * Get all persisted errors from storage
 */
export function getPersistedErrors(): PersistedError[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }
  
  try {
    const storedErrors = localStorage.getItem(ERROR_STORAGE_KEY);
    return storedErrors ? JSON.parse(storedErrors) : [];
  } catch (e) {
    console.error('Failed to retrieve persisted errors:', e);
    return [];
  }
}

/**
 * Persist an error to storage
 */
export function persistError(error: Error): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    // Get existing errors
    const errors = getPersistedErrors();
    
    // Add new error
    const storableError = errorToStorable(error);
    
    // Limit the number of stored errors (FIFO)
    const updatedErrors = [storableError, ...errors].slice(0, MAX_STORED_ERRORS);
    
    // Save back to storage
    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(updatedErrors));
  } catch (e) {
    console.error('Failed to persist error:', e);
  }
}

/**
 * Clear all persisted errors
 */
export function clearPersistedErrors(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    localStorage.removeItem(ERROR_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear persisted errors:', e);
  }
}

/**
 * Remove a specific persisted error by ID
 */
export function removePersistedError(errorId: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  
  try {
    const errors = getPersistedErrors();
    const filteredErrors = errors.filter(error => error.id !== errorId);
    
    if (filteredErrors.length !== errors.length) {
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(filteredErrors));
    }
  } catch (e) {
    console.error('Failed to remove persisted error:', e);
  }
}

/**
 * Send persisted errors to the monitoring service
 */
export function sendPersistedErrors(
  sendFunction: (error: PersistedError) => Promise<boolean>,
  options: { removeOnSuccess?: boolean } = {}
): Promise<{ success: number; failed: number }> {
  const { removeOnSuccess = true } = options;
  
  return new Promise(async (resolve) => {
    if (typeof localStorage === 'undefined') {
      resolve({ success: 0, failed: 0 });
      return;
    }
    
    try {
      const errors = getPersistedErrors();
      
      if (errors.length === 0) {
        resolve({ success: 0, failed: 0 });
        return;
      }
      
      let successCount = 0;
      let failedCount = 0;
      const errorsToKeep: PersistedError[] = [];
      
      // Try to send each error
      for (const error of errors) {
        try {
          const success = await sendFunction(error);
          
          if (success) {
            successCount++;
          } else {
            failedCount++;
            if (!removeOnSuccess) {
              errorsToKeep.push(error);
            }
          }
        } catch (e) {
          failedCount++;
          // Keep errors that failed to send
          errorsToKeep.push(error);
        }
      }
      
      // Update storage
      localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(errorsToKeep));
      
      resolve({ success: successCount, failed: failedCount });
    } catch (e) {
      console.error('Failed to send persisted errors:', e);
      resolve({ success: 0, failed: 0 });
    }
  });
}

/**
 * Hooks into the error monitoring system to persist errors
 */
export function initErrorPersistence(): void {
  // Save original error handling mechanism
  const originalConsoleError = console.error;
  
  // Override console.error to capture and persist errors
  console.error = function(...args) {
    // Call original function
    originalConsoleError.apply(console, args);
    
    // Look for Error objects in the arguments
    for (const arg of args) {
      if (arg instanceof Error) {
        persistError(arg);
      }
    }
  };
  
  // Add window error event listener
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (event.error instanceof Error) {
        persistError(event.error);
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      if (event.reason instanceof Error) {
        persistError(event.reason);
      }
    });
  }
} 