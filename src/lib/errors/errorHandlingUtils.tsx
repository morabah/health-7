'use client';

/**
 * Error Handling Utilities
 * 
 * This file contains standardized error handling utilities that can be used across
 * the application to ensure consistent error handling patterns.
 */

import React from 'react';

import { logError } from '@/lib/logger';
import {
  AppError,
  ApiError,
  ValidationError,
  AuthError,
  DataError,
  AppointmentError,
  NetworkError,
  enhanceError,
} from './errorClasses';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';

/**
 * Extract a user-friendly error message from various error types
 * 
 * @param error - The error to extract a message from
 * @param fallbackMessage - Optional fallback message if no message could be extracted
 * @returns A user-friendly error message string
 */
export function extractErrorMessage(error: unknown, fallbackMessage = 'An unexpected error occurred'): string {
  // Handle specific error classes first
  if (error instanceof AppError) {
    return error.message;
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle error response objects with different possible structures
  if (error && typeof error === 'object') {
    // Check for common error fields
    if ('message' in error && typeof (error as any).message === 'string') {
      return (error as any).message;
    }
    
    if ('error' in error && typeof (error as any).error === 'string') {
      return (error as any).error;
    }
    
    if ('error' in error && typeof (error as any).error === 'object' && (error as any).error !== null) {
      const errorObj = (error as any).error;
      if ('message' in errorObj && typeof errorObj.message === 'string') {
        return errorObj.message;
      }
    }
    
    // Don't return stringified objects to end users in production
    if (process.env.NODE_ENV === 'development') {
      try {
        return `Error details: ${JSON.stringify(error)}`;
      } catch {
        // If JSON stringify fails, fall back to toString
        return `${error}`;
      }
    }
  }
  
  // For strings, return directly
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback for unknown error types
  return fallbackMessage;
}

/**
 * Handle and log an error with standardized approach
 * 
 * @param error - The error to handle
 * @param context - Additional context information
 * @param errorPrefix - Optional prefix for the error message
 * @returns A user-friendly error message string
 */
export function handleError(
  error: unknown, 
  context: Record<string, unknown> = {},
  errorPrefix?: string
): string {
  // Extract error message
  const errorMessage = extractErrorMessage(error);
  
  // Prefix if provided
  const finalMessage = errorPrefix ? `${errorPrefix}: ${errorMessage}` : errorMessage;
  
  // Log error with context
  logError(finalMessage, { error, ...context });
  
  // Return the message for UI display
  return finalMessage;
}

/**
 * React hook for standardized error handling in components
 * 
 * @param options - Configuration options for error handling
 * @returns Object with error state and error handling functions
 */
export function useErrorHandler(options: {
  context?: Record<string, unknown>;
  onError?: (error: Error) => void;
  logErrors?: boolean;
  componentName?: string;
} = {}) {
  const {
    context = {},
    onError,
    logErrors = true,
    componentName = 'UnknownComponent'
  } = options;
  
  const [error, setError] = React.useState<Error | null>(null);
  
  const handleErrorWithState = React.useCallback((err: unknown) => {
    // Convert to AppError for consistent handling
    const appError = toAppError(err, 'An error occurred', {
      component: componentName,
      ...context
    });
    
    // Set error state
    setError(appError);
    
    // Log error if enabled
    if (logErrors) {
      logError(`Error in ${componentName}`, {
        error: appError,
        context
      });
    }
    
    // Call custom error handler if provided
    if (onError) {
      onError(appError);
    }
    
    return appError;
  }, [context, logErrors, componentName, onError]);
  
  const clearError = React.useCallback(() => {
    setError(null);
  }, []);
  
  return {
    error,
    setError,
    handleError: handleErrorWithState,
    clearError
  };
}

/**
 * Higher-order component for standardized error handling
 * 
 * @param Component - Component to wrap with error handling
 * @param options - Error handling options
 * @returns Wrapped component with error handling
 */
export function withErrorHandling<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    fallback?: React.ReactNode | ((props: { error: Error; retry: () => void }) => React.ReactNode);
    context?: Record<string, unknown>;
    componentName?: string;
    category?: ErrorCategory;
  } = {}
) {
  const {
    fallback,
    context = {},
    componentName = Component.displayName || Component.name || 'UnknownComponent',
    category = 'ui'
  } = options;
  
  const displayName = `withErrorHandling(${componentName})`;
  
  const WrappedComponent = (props: P) => {
    const { error, handleError, clearError } = useErrorHandler({
      context: { ...context, props },
      componentName,
      logErrors: true
    });
    
    // If there's an error and a fallback is provided, render it
    if (error) {
      if (typeof fallback === 'function') {
        return fallback({ error, retry: clearError });
      }
      
      if (fallback) {
        return fallback;
      }
      
      // Default fallback
      return (
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <h3 className="text-sm font-medium text-red-800">Error in {componentName}</h3>
          <p className="mt-2 text-sm text-red-700">{extractErrorMessage(error)}</p>
          <button
            onClick={clearError}
            className="mt-3 text-sm font-medium text-red-600 hover:text-red-500"
          >
            Retry
          </button>
        </div>
      );
    }
    
    // Wrap the component in an error boundary
    try {
      return <Component {...props} onError={handleError} />;
    } catch (err) {
      handleError(err);
      return null; // This should never be reached in React 16+ due to error boundaries
    }
  };
  
  WrappedComponent.displayName = displayName;
  
  return WrappedComponent;
}

/**
 * Categorize an error for UI display
 * 
 * @param error - The error to categorize
 * @returns ErrorCategory and ErrorSeverity
 */
export function categorizeError(error: unknown): {
  category: ErrorCategory;
  severity: ErrorSeverity;
} {
  if (error instanceof AppError) {
    return {
      category: error.category,
      severity: error.severity,
    };
  }
  
  if (error instanceof Error) {
    // Categorize based on error name
    if (error.name === 'NetworkError' || error.name === 'AbortError') {
      return { category: 'network', severity: 'warning' };
    }
    
    if (error.name === 'SyntaxError' || error.name === 'TypeError') {
      return { category: 'technical', severity: 'danger' };
    }
  }
  
  // Default categorization for unknown errors
  return { category: 'unknown', severity: 'warning' };
}

/**
 * Convert unknown error to AppError
 * 
 * @param error - The error to convert
 * @param defaultMessage - Default message if none can be extracted
 * @param additionalContext - Additional context to add
 * @returns AppError instance
 */
export function toAppError(
  error: unknown,
  defaultMessage = 'An unexpected error occurred',
  additionalContext: Record<string, unknown> = {}
): AppError {
  // If already AppError, just add context if needed
  if (error instanceof AppError) {
    if (Object.keys(additionalContext).length > 0) {
      // Merge the contexts
      error.addContext(additionalContext);
    }
    return error;
  }
  
  // Extract message and create appropriate error type
  const message = extractErrorMessage(error, defaultMessage);
  
  // Create appropriate error type based on patterns
  if (typeof error === 'object' && error !== null) {
    if ('status' in error || 'statusCode' in error) {
      return new ApiError(message, { 
        statusCode: (error as any).status || (error as any).statusCode, 
        context: additionalContext 
      });
    }
    
    if ('validationErrors' in error || 'validation' in error) {
      return new ValidationError(message, { context: additionalContext });
    }
    
    if ('code' in error) {
      const code = (error as any).code;
      if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
        return new NetworkError(message, { context: additionalContext });
      }
    }
  }
  
  // Default to base AppError
  return new AppError(message, { context: additionalContext });
}

/**
 * Safe JSON stringify
 * 
 * @param obj - Object to stringify
 * @returns JSON string or error message
 */
export function safeStringify(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return '[Object cannot be serialized]';
  }
}
