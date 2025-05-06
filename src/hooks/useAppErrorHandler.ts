/**
 * App Error Handler Hook
 * 
 * A React hook for handling errors in UI components.
 * Provides a consistent way to handle, display, and report errors from our error system.
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  normalizeError, 
  getUserFriendlyMessage 
} from '@/lib/errors/errorUtils';
import { AppError } from '@/lib/errors/errorClasses';
import { reportError } from '@/lib/errors/errorMonitoring';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';

interface ErrorHandlerOptions {
  /** Whether to automatically report errors */
  autoReport?: boolean;
  
  /** Default error message if none provided */
  defaultMessage?: string;
  
  /** Additional context to add to errors */
  context?: Record<string, unknown>;
  
  /** Default error category */
  defaultCategory?: ErrorCategory;
  
  /** Default error severity */
  defaultSeverity?: ErrorSeverity;
  
  /** Whether to automatically dismiss errors after a timeout */
  autoDismiss?: boolean;
  
  /** Timeout in ms for auto-dismissing errors */
  autoDismissTimeout?: number;
}

interface ErrorState {
  /** Whether there is an active error */
  hasError: boolean;
  
  /** The current error object */
  error: Error | null;
  
  /** User-friendly error message */
  message: string;
  
  /** Error details (for debugging) */
  details: string;
  
  /** Whether the error is retryable */
  isRetryable: boolean;
  
  /** Error category (if available) */
  category?: ErrorCategory;
  
  /** Error severity (if available) */
  severity?: ErrorSeverity;
  
  /** Error ID for tracking */
  errorId?: string;
  
  /** Error context */
  context?: Record<string, unknown>;
  
  /** Timestamp when the error occurred */
  timestamp?: number;
}

/**
 * A hook for handling errors in React components
 */
export function useAppErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    autoReport = true,
    defaultMessage = '',
    context = {},
    defaultCategory = 'unknown',
    defaultSeverity = 'error',
    autoDismiss = false,
    autoDismissTimeout = 5000,
  } = options;
  
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    message: '',
    details: '',
    isRetryable: false,
  });
  
  /**
   * Handle an error
   */
  const handleError = useCallback((error: unknown, opts?: {
    message?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
    retryable?: boolean;
    action?: string;
  }) => {
    // Normalize the error to ensure consistent properties
    const normalizedError = normalizeError(error, {
      defaultMessage: opts?.message || defaultMessage,
      context: { ...context, ...opts?.context },
    });
    
    // Get a user-friendly message
    const message = getUserFriendlyMessage(normalizedError);
    
    // Extract additional information if it's an AppError
    const isAppError = normalizedError instanceof AppError;
    const isRetryable = opts?.retryable ?? (isAppError ? normalizedError.retryable : false);
    const category = opts?.category || (isAppError ? normalizedError.category : defaultCategory);
    const severity = opts?.severity || (isAppError ? normalizedError.severity : defaultSeverity);
    
    // Update the error state
    setErrorState({
      hasError: true,
      error: normalizedError,
      message,
      details: normalizedError.stack || normalizedError.message,
      isRetryable,
      category,
      severity,
      errorId: isAppError ? normalizedError.errorId : undefined,
      context: isAppError ? { ...normalizedError.context } : undefined,
      timestamp: Date.now(),
    });
    
    // Optionally report the error
    if (autoReport) {
      reportError(normalizedError);
    }
    
    return normalizedError;
  }, [autoReport, context, defaultMessage, defaultCategory, defaultSeverity]);
  
  /**
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      message: '',
      details: '',
      isRetryable: false,
    });
  }, []);
  
  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(<T>(fn: () => Promise<T>): Promise<T> => {
    return fn().catch(error => {
      handleError(error);
      throw error;
    });
  }, [handleError]);
  
  /**
   * Execute an async function with error handling and return the result
   */
  const executeWithErrorHandling = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      handleError(error);
      return null;
    }
  }, [handleError]);
  
  /**
   * Auto-dismiss the error after a timeout
   */
  useEffect(() => {
    if (autoDismiss && errorState.hasError) {
      const timer = setTimeout(() => {
        clearError();
      }, autoDismissTimeout);
      
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissTimeout, errorState.hasError, clearError]);
  
  return {
    // Error state
    ...errorState,
    
    // Error handling functions
    handleError,
    clearError,
    withErrorHandling,
    executeWithErrorHandling,
  };
}

export default useAppErrorHandler; 