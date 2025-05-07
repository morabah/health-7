'use client';

import type { ReactElement } from 'react';
import { useState, useCallback, useEffect } from 'react';
import { reportError, addBreadcrumb } from '@/lib/errors/errorMonitoring';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';
import ErrorDisplay from '@/components/ui/ErrorDisplay';
import React from 'react';
import { normalizeError, getUserFriendlyMessage } from '@/lib/errors/errorUtils';
import { AppError } from '@/lib/errors/errorClasses';

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

  /** Whether to automatically report errors */
  autoReport?: boolean;

  /** Default error message if none provided */
  defaultMessage?: string;

  /** Additional context to add to errors */
  context?: Record<string, unknown>;
}

// Define return types
type SimpleErrorHandler = [Error | null, (error: unknown) => void];

interface EnhancedErrorHandler {
  error: ErrorState | null;
  isErrorVisible: boolean;
  handleError: (
    err: Error | unknown,
    opts?: {
      message?: string;
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      context?: Record<string, unknown>;
      retryable?: boolean;
      action?: string;
    }
  ) => ErrorState | undefined;
  clearError: () => void;
  tryCatch: <T>(fn: () => Promise<T> | T) => Promise<T | null>;
  withErrorHandling: <T extends unknown[], R>(
    fn: (...args: T) => Promise<R> | R
  ) => (...args: T) => Promise<R | null>;
  ErrorComponent: () => ReactElement | null;
  startSpan: (
    name: string,
    metadata?: Record<string, unknown>
  ) => {
    finish: () => void;
    addMetadata: (key: string, value: unknown) => void;
  };
}

/**
 * Error Handler Hook
 *
 * A React hook for handling errors in UI components.
 * Provides a consistent way to handle, display, and report errors.
 */

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
    autoDismiss = false,
    autoDismissTimeout = 5000,
    defaultCategory = 'unknown',
    defaultSeverity = 'error',
    simpleMode = false,
    autoReport = true,
    defaultMessage = '',
    context = {},
  } = options || {};

  const [error, setError] = useState<ErrorState | null>(null);
  const [isErrorVisible, setIsErrorVisible] = useState(false);

  /**
   * Handle an error
   */
  const handleError = useCallback(
    (
      err: unknown,
      opts?: {
        message?: string;
        category?: ErrorCategory;
        severity?: ErrorSeverity;
        context?: Record<string, unknown>;
        retryable?: boolean;
        action?: string;
      }
    ): ErrorState | undefined => {
      // Normalize the error to ensure consistent properties
      const normalizedError = normalizeError(err, {
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

      // Create error state
      const errorState: ErrorState = {
        error: normalizedError,
        message,
        category,
        severity,
        errorId: isAppError ? normalizedError.errorId : undefined,
        context: isAppError ? { ...normalizedError.context } : undefined,
        timestamp: Date.now(),
        userMessage: message,
        retryable: isRetryable,
      };

      // Update the error state
      setError(errorState);
      setIsErrorVisible(true);

      // Optionally report the error
      if (autoReport !== false) {
        reportError(normalizedError);
      }

      return errorState;
    },
    [autoReport, context, defaultMessage, defaultCategory, defaultSeverity]
  );

  /**
   * Clear the current error
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
  const tryCatch = useCallback(
    async <T>(fn: () => Promise<T> | T): Promise<T | null> => {
      try {
        return await fn();
      } catch (err) {
        handleError(err);
        return null;
      }
    },
    [handleError]
  );

  /**
   * Create a wrapped version of a function that handles errors
   */
  const withErrorHandling = useCallback(
    <T extends unknown[], R>(fn: (...args: T) => Promise<R> | R) => {
      return async (...args: T): Promise<R | null> => {
        try {
          return await fn(...args);
        } catch (err) {
          handleError(err);
          return null;
        }
      };
    },
    [handleError]
  );

  /**
   * Component to display the current error
   */
  const ErrorComponent = useCallback((): ReactElement | null => {
    if (!error || !isErrorVisible) return null;

    // Create an Error object if the error isn't already one
    const errorObj = error.error instanceof Error ? error.error : new Error(String(error.error));

    // Return the ErrorDisplay component
    return React.createElement(ErrorDisplay, {
      error: errorObj,
      message: error.message,
      category: error.category || defaultCategory,
      severity: error.severity || defaultSeverity,
      errorId: error.errorId,
      context: error.context as Record<string, unknown>,
      onDismiss: clearError,
      onRetry: error.retryable ? () => setIsErrorVisible(false) : undefined,
    });
  }, [error, isErrorVisible, defaultCategory, defaultSeverity, clearError]);

  /**
   * Start a performance monitoring span
   */
  const startSpan = useCallback((name: string, metadata?: Record<string, unknown>) => {
    // Add breadcrumb for error context instead of using the removed span functionality
    addBreadcrumb(`Span started: ${name}`, 'performance', metadata || {});

    return {
      finish: () => {
        addBreadcrumb(`Span finished: ${name}`, 'performance', metadata || {});
      },
      addMetadata: (key: string, value: unknown) => {
        addBreadcrumb(`Span metadata: ${name}`, 'performance', { [key]: value });
      },
    };
  }, []);

  // Return type depends on simpleMode option
  if (simpleMode) {
    const simpleErrorSetter = (err: unknown) => {
      handleError(err);
    };

    return [
      error?.error instanceof Error ? error.error : null,
      simpleErrorSetter,
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
    startSpan,
  };
}

export default useErrorHandler;
