'use client';

import { useState, useCallback, useEffect, ReactElement } from 'react';
import { reportError, errorMonitor } from '@/lib/errorMonitoring';
import ErrorDisplay, { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';
import { useRouter } from 'next/navigation';
import { logError } from '@/lib/logger';
import React from 'react';

/**
 * Enhanced error state with metadata
 */
interface ErrorState {
  error: Error | unknown | null;
  message?: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  errorId?: string;
  context?: Record<string, unknown>;
  timestamp?: number;
  userMessage?: string;
  retryable?: boolean;
}

/**
 * Options for the useErrorHandler hook
 */
interface ErrorHandlerOptions {
  /**
   * Component or page name for error tracking
   */
  component?: string;
  
  /**
   * Whether to automatically dismiss errors after a timeout
   */
  autoDismiss?: boolean;
  
  /**
   * Timeout in ms for auto-dismissing errors
   */
  autoDismissTimeout?: number;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: ErrorState) => void;
  
  /**
   * Default error category if not specified
   */
  defaultCategory?: ErrorCategory;
  
  /**
   * Default error severity if not specified
   */
  defaultSeverity?: ErrorSeverity;
  
  /**
   * Whether to redirect to an error page on fatal errors
   */
  redirectOnFatal?: boolean;
  
  /**
   * Error page path to redirect to on fatal errors
   */
  errorPagePath?: string;
  
  /**
   * Whether to use the simple API mode (tuple return)
   */
  simpleMode?: boolean;
}

// Define return types
type SimpleErrorHandler = [Error | null, (error: unknown) => void];

interface EnhancedErrorHandler {
  error: ErrorState | null;
  isErrorVisible: boolean;
  handleError: (err: Error | unknown, opts?: {
    message?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
    retryable?: boolean;
    action?: string;
  }) => ErrorState | undefined;
  clearError: () => void;
  tryCatch: <T>(fn: () => Promise<T> | T, opts?: {
    action?: string;
    message?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
    retryable?: boolean;
  }) => Promise<T | null>;
  withErrorHandling: <T extends unknown[], R>(
    fn: (...args: T) => Promise<R> | R,
    opts?: {
      action?: string;
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      retryable?: boolean;
    }
  ) => (...args: T) => Promise<R | null>;
  ErrorComponent: () => ReactElement | null;
  startSpan: (name: string, metadata?: Record<string, unknown>) => {
    finish: () => void;
    addMetadata: (key: string, value: unknown) => void;
  };
}

/**
 * Error handler hook for React components
 * 
 * This unified hook provides two usage modes:
 * 1. Simple mode: returns [error, handleError] tuple for basic error handling
 * 2. Enhanced mode: returns an object with comprehensive error handling utilities
 *
 * @example Simple mode
 * ```
 * const [error, handleError] = useErrorHandler();
 * if (someCondition) handleError(new Error("Something went wrong"));
 * ```
 * 
 * @example Enhanced mode
 * ```
 * const { handleError, tryCatch, ErrorComponent } = useErrorHandler({ 
 *   component: 'MyComponent',
 *   defaultCategory: 'data'
 * });
 * ```
 */
function useErrorHandler(): SimpleErrorHandler;
function useErrorHandler(options: ErrorHandlerOptions & { simpleMode: true }): SimpleErrorHandler;
function useErrorHandler(options: ErrorHandlerOptions): EnhancedErrorHandler;
function useErrorHandler(options?: ErrorHandlerOptions): SimpleErrorHandler | EnhancedErrorHandler {
  const {
    component,
    autoDismiss = false,
    autoDismissTimeout = 5000,
    onError,
    defaultCategory = 'unknown',
    defaultSeverity = 'error',
    redirectOnFatal = false,
    errorPagePath = '/error',
    simpleMode = false
  } = options || {};
  
  const router = useRouter();
  const [error, setError] = useState<ErrorState | null>(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);
  
  /**
   * Handle and report an error
   */
  const handleError = useCallback((
    err: Error | unknown,
    opts: {
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      retryable?: boolean;
      action?: string;
    } = {}
  ) => {
    // If error is null or false, clear the error state
    if (err === null || err === false) {
      setError(null);
      setIsErrorVisible(false);
      return;
    }
    
    // Create context with component name if provided
    const errorContext = {
      ...(component ? { component } : {}),
      ...(opts.action ? { action: opts.action } : {}),
      ...(opts.context || {}),
    };
    
    // Add timestamp
    const timestamp = Date.now();
    
    // For simple mode, just log and set the error
    if (simpleMode) {
      // Ensure we're working with an Error object
      let errorObject: Error;
      if (err instanceof Error) {
        errorObject = err;
      } else if (typeof err === 'string') {
        errorObject = new Error(err);
      } else {
        errorObject = new Error('An unknown error occurred');
      }
      
      // Log the error
      logError('useErrorHandler caught an error', errorObject);
      
      // Set the error state which will throw in render phase and be caught by ErrorBoundary
      if (errorObject) {
        throw errorObject;
      }
      
      return undefined;
    }
    
    // For enhanced mode, report to monitoring system and handle more gracefully
    // Report the error to our error monitoring system
    const { errorId, userMessage, category, severity } = reportError(err, {
      ...errorContext,
      category: opts.category || defaultCategory,
      severity: opts.severity || defaultSeverity,
      message: opts.message,
    });
    
    // Create the error state
    const errorState: ErrorState = {
      error: err,
      message: opts.message,
      category: category,
      severity: severity,
      errorId,
      context: errorContext,
      timestamp,
      userMessage,
      retryable: opts.retryable,
    };
    
    // Set the error state
    setError(errorState);
    setIsErrorVisible(true);
    
    // Call onError callback if provided
    if (onError) {
      onError(errorState);
    }
    
    // Redirect to error page if the error is fatal and redirectOnFatal is true
    if (redirectOnFatal && severity === 'fatal') {
      router.push(`${errorPagePath}?id=${errorId}`);
    }
    
    // Return the error state so it can be used by the caller
    return errorState;
  }, [component, defaultCategory, defaultSeverity, onError, redirectOnFatal, errorPagePath, router, simpleMode]);
  
  /**
   * Clear the error state
   */
  const clearError = useCallback(() => {
    setError(null);
    setIsErrorVisible(false);
  }, []);
  
  /**
   * Auto-dismiss the error after a timeout
   */
  useEffect(() => {
    if (autoDismiss && error && isErrorVisible) {
      const timer = setTimeout(() => {
        setIsErrorVisible(false);
      }, autoDismissTimeout);
      
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, autoDismissTimeout, error, isErrorVisible]);
  
  /**
   * Execute a function and handle any errors
   */
  const tryCatch = useCallback(async <T>(
    fn: () => Promise<T> | T, 
    opts?: {
      action?: string;
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      retryable?: boolean;
    }
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (err) {
      handleError(err, opts);
      return null;
    }
  }, [handleError]);
  
  /**
   * Create a wrapped version of a function that handles errors
   */
  const withErrorHandling = useCallback(<T extends unknown[], R>(
    fn: (...args: T) => Promise<R> | R,
    opts?: {
      action?: string;
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      retryable?: boolean;
    }
  ) => {
    return async (...args: T): Promise<R | null> => {
      try {
        return await fn(...args);
      } catch (err) {
        handleError(err, opts);
        return null;
      }
    };
  }, [handleError]);
  
  /**
   * Component to display the current error
   */
  const ErrorComponent = useCallback((): ReactElement | null => {
    if (!error || !isErrorVisible) return null;
    
    // Create an Error object if the error isn't already one
    const errorObj = error.error instanceof Error 
      ? error.error 
      : new Error(String(error.error));
    
    // Return the ErrorDisplay component
    return React.createElement(ErrorDisplay, {
      error: errorObj,
      message: error.message,
      category: error.category || defaultCategory,
      severity: error.severity || defaultSeverity,
      errorId: error.errorId,
      context: error.context as Record<string, unknown>,
      onDismiss: clearError,
      onRetry: error.retryable ? () => setIsErrorVisible(false) : undefined
    });
  }, [error, isErrorVisible, defaultCategory, defaultSeverity, clearError]);
  
  /**
   * Start a performance/error span for tracking
   */
  const startSpan = useCallback((name: string, metadata?: Record<string, unknown>) => {
    const span = errorMonitor.startSpan(name, metadata || {});
    
    return {
      finish: () => {
        if (span && typeof span.finish === 'function') {
          span.finish();
        }
      },
      addMetadata: (key: string, value: unknown) => {
        if (span && typeof span.addMetadata === 'function') {
          span.addMetadata(key, value);
        }
      }
    };
  }, []);
  
  // Return type depends on simpleMode option
  if (simpleMode) {
    const simpleErrorSetter = (err: unknown) => {
      handleError(err);
    };
    
    return [
      error?.error instanceof Error ? error.error : null,
      simpleErrorSetter
    ] as SimpleErrorHandler;
  }
  
  // Return the enhanced error handler
  return {
    error,
    isErrorVisible,
    handleError,
    clearError,
    tryCatch,
    withErrorHandling,
    ErrorComponent,
    startSpan
  };
}

export default useErrorHandler; 