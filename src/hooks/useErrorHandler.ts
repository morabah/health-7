'use client';

import { useState, useCallback, useEffect, ReactElement } from 'react';
import { reportError, errorMonitor } from '@/lib/errorMonitoring';
import ErrorDisplay, { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';
import { useRouter } from 'next/navigation';
import { logError } from '@/lib/logger';

/**
 * Enhanced error state with metadata
 */
interface ErrorState {
  error: Error | unknown | null;
  message?: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  errorId?: string;
  context?: Record<string, any>;
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
    context?: Record<string, any>;
    retryable?: boolean;
    action?: string;
  }) => ErrorState | undefined;
  clearError: () => void;
  tryCatch: <T>(fn: () => Promise<T> | T, opts?: {
    action?: string;
    message?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: Record<string, any>;
    retryable?: boolean;
  }) => Promise<T | null>;
  withErrorHandling: <T extends unknown[], R>(
    fn: (...args: T) => Promise<R> | R,
    opts?: {
      action?: string;
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, any>;
      retryable?: boolean;
    }
  ) => (...args: T) => Promise<R | null>;
  ErrorComponent: () => ReactElement | null;
  startSpan: (name: string, metadata?: Record<string, any>) => {
    finish: () => void;
    addMetadata: (key: string, value: any) => void;
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
      context?: Record<string, any>;
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
   * Clear the current error
   */
  const clearError = useCallback(() => {
    setError(null);
    setIsErrorVisible(false);
  }, []);
  
  /**
   * Start a performance span/transaction for measuring operations
   */
  const startSpan = useCallback((name: string, metadata: Record<string, any> = {}) => {
    // Include component name in metadata
    const enhancedMetadata = {
      ...metadata,
      ...(component ? { component } : {}),
    };
    
    return errorMonitor.startSpan(name, enhancedMetadata);
  }, [component]);
  
  /**
   * Try to execute a function, capturing any errors
   */
  const tryCatch = useCallback(async <T extends unknown>(
    fn: () => Promise<T> | T,
    opts: {
      action?: string;
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, any>;
      retryable?: boolean;
    } = {}
  ): Promise<T | null> => {
    // Start a span for this operation if action is provided
    const span = opts.action ? startSpan(opts.action, opts.context) : null;
    
    try {
      // Call the function and return the result
      const result = await fn();
      
      // Finish the span
      if (span) span.finish();
      
      return result;
    } catch (err) {
      // Handle the error
      handleError(err, {
        action: opts.action,
        message: opts.message,
        category: opts.category,
        severity: opts.severity,
        context: opts.context,
        retryable: opts.retryable,
      });
      
      // Finish the span with error
      if (span) {
        span.addMetadata('error', true);
        span.finish();
      }
      
      return null;
    }
  }, [handleError, startSpan]);
  
  /**
   * Wrap a function with error handling
   */
  const withErrorHandling = useCallback(<T extends unknown[], R extends unknown>(
    fn: (...args: T) => Promise<R> | R,
    opts: {
      action?: string;
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, any>;
      retryable?: boolean;
    } = {}
  ) => {
    return async (...args: T): Promise<R | null> => {
      return tryCatch(() => fn(...args), opts);
    };
  }, [tryCatch]);
  
  // Auto-dismiss error after timeout if autoDismiss is true
  useEffect(() => {
    if (autoDismiss && isErrorVisible && error) {
      const timer = setTimeout(() => {
        setIsErrorVisible(false);
      }, autoDismissTimeout);
      
      return () => clearTimeout(timer);
    }
  }, [autoDismiss, isErrorVisible, error, autoDismissTimeout]);
  
  /**
   * Function to render an error display component
   * Note: We're not actually returning JSX here, just a function
   * that will return JSX when called
   */
  const ErrorComponent = useCallback(() => {
    if (!error || !isErrorVisible) return null;
    
    // The actual JSX will be created when this function is called in the component
    return ErrorDisplay({
      error: error.error,
      message: error.userMessage || error.message,
      severity: error.severity,
      category: error.category, 
      onDismiss: clearError,
      onRetry: error.retryable ? () => setIsErrorVisible(false) : undefined,
      context: error.context,
      errorId: error.errorId
    });
  }, [error, isErrorVisible, clearError]);
  
  // Return tuple for simple mode (original API)
  if (simpleMode || (options === undefined)) {
    // If we have an error and in simple mode, throw it for the boundary
    if (error?.error instanceof Error) {
      throw error.error;
    }
    
    return [null, handleError] as SimpleErrorHandler;
  }
  
  // Return enhanced API with all utilities
  return {
    error,
    isErrorVisible,
    handleError,
    clearError,
    tryCatch,
    withErrorHandling,
    ErrorComponent,
    startSpan,
  } as EnhancedErrorHandler;
}

export default useErrorHandler; 