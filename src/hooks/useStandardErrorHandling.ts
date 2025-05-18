'use client';

import { useState, useCallback } from 'react';
import { AppError, ApiError, ValidationError } from '@/lib/errors/errorClasses';
import { normalizeError, getUserFriendlyMessage } from '@/lib/errors/errorUtils';
import { reportError } from '@/lib/errors/errorMonitoring';
import { logError } from '@/lib/logger';
import { appEventBus, LogLevel } from '@/lib/eventBus';

export type ErrorCategory = 'api' | 'validation' | 'auth' | 'data' | 'ui' | 'network' | 'unknown';
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal';

interface ErrorState {
  error: Error | null;
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  isRetryable: boolean;
  timestamp: number;
}

interface ErrorHandlingOptions {
  componentName: string;
  defaultCategory?: ErrorCategory;
  defaultSeverity?: ErrorSeverity;
  autoReport?: boolean;
  defaultMessage?: string;
  context?: Record<string, unknown>;
}

/**
 * Custom hook for standardized error handling
 * 
 * This hook provides a consistent way to handle errors across the application,
 * with support for error categorization, reporting, and user-friendly messages.
 */
export function useStandardErrorHandling({
  componentName,
  defaultCategory = 'unknown',
  defaultSeverity = 'warning',
  autoReport = true,
  defaultMessage = 'An unexpected error occurred. Please try again later.',
  context = {},
}: ErrorHandlingOptions) {
  const [errorState, setErrorState] = useState<ErrorState | null>(null);

  /**
   * Handle an error with standardized approach
   */
  const handleError = useCallback((error: unknown, options: {
    message?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    isRetryable?: boolean;
    context?: Record<string, unknown>;
  } = {}) => {
    // Normalize the error
    const normalizedError = normalizeError(error);
    
    // Get user-friendly message
    const userMessage = options.message || 
      (normalizedError instanceof AppError ? normalizedError.message : getUserFriendlyMessage(normalizedError)) || 
      defaultMessage;
    
    // Determine error category and severity
    let category: ErrorCategory = options.category || defaultCategory;
    let severity: ErrorSeverity = options.severity || defaultSeverity;
    let isRetryable = options.isRetryable !== undefined ? options.isRetryable : true;
    
    // Categorize based on error type if not explicitly provided
    if (!options.category) {
      if (normalizedError instanceof ApiError) {
        category = 'api';
        // HTTP 5xx errors are usually retryable
        if (normalizedError.statusCode && normalizedError.statusCode >= 500) {
          isRetryable = true;
        }
        // HTTP 4xx errors are usually not retryable (except 408, 429)
        else if (normalizedError.statusCode && 
                normalizedError.statusCode >= 400 && 
                normalizedError.statusCode < 500 &&
                normalizedError.statusCode !== 408 && 
                normalizedError.statusCode !== 429) {
          isRetryable = false;
        }
      } else if (normalizedError instanceof ValidationError) {
        category = 'validation';
        isRetryable = true; // Validation errors are usually fixable by the user
      } else if (normalizedError.name === 'NetworkError' || 
                normalizedError.message.includes('network') || 
                normalizedError.message.includes('connection')) {
        category = 'network';
        isRetryable = true; // Network errors are usually retryable
      }
    }
    
    // Determine severity if not explicitly provided
    if (!options.severity) {
      if (normalizedError instanceof ApiError) {
        // HTTP 5xx errors are usually more severe
        if (normalizedError.statusCode && normalizedError.statusCode >= 500) {
          severity = 'error';
        }
        // Authentication errors
        else if (normalizedError.statusCode === 401 || normalizedError.statusCode === 403) {
          severity = 'warning';
        }
      }
    }
    
    // Create error state
    const newErrorState: ErrorState = {
      error: normalizedError,
      message: userMessage,
      category,
      severity,
      isRetryable,
      timestamp: Date.now(),
    };
    
    // Set the error state
    setErrorState(newErrorState);
    
    // Report the error if configured to do so
    if (autoReport) {
      reportError(normalizedError, {
        componentName,
        category,
        severity,
        ...context,
        ...options.context,
      });
    }
    
    // Log the error
    logError(`Error in ${componentName}: ${userMessage}`, {
      error: normalizedError,
      category,
      severity,
      ...context,
      ...options.context,
    });
    
    // Emit error event
    appEventBus.emit('log_event', {
      level: LogLevel.ERROR,
      message: `Error in ${componentName}: ${userMessage}`,
      data: {
        error: normalizedError,
        category,
        severity,
        ...context,
        ...options.context,
      },
      timestamp: Date.now(),
    });
    
    return normalizedError;
  }, [componentName, defaultCategory, defaultSeverity, defaultMessage, autoReport, context]);
  
  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);
  
  /**
   * Wrap an async function with error handling
   */
  const withErrorHandling = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => Promise<R>,
    options: {
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
    } = {}
  ) => {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error, options);
        throw error; // Re-throw to allow error boundaries to catch it
      }
    };
  }, [handleError]);

  return {
    error: errorState,
    handleError,
    clearError,
    withErrorHandling,
    hasError: !!errorState,
  };
}

export default useStandardErrorHandling;
