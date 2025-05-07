'use client';

/**
 * Error System Hook
 *
 * This is the main entry point for the application's error handling system.
 * It provides a unified interface for error handling, combining the functionality
 * of useErrorHandler and useAppErrorHandler in a consistent way.
 */

import useErrorHandler from './useErrorHandler';
import useAppErrorHandler from './useAppErrorHandler';
import {
  isOnline,
  initNetworkStateMonitoring,
  useNetworkState,
  executeWhenOnline,
} from '@/lib/errors/networkUtils';
import {
  persistError,
  getPersistedErrors,
  sendPersistedErrors,
  initErrorPersistence,
} from '@/lib/errors/errorPersistence';
import { AppError } from '@/lib/errors/errorClasses';
import { normalizeError, getUserFriendlyMessage, withErrorHandling } from '@/lib/errors/errorUtils';
import { reportError } from '@/lib/errors/errorMonitoring';

import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';

/**
 * Options for configuring the error system hook
 */
export interface ErrorSystemOptions {
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
   * Default error category if not specified
   */
  defaultCategory?: ErrorCategory;

  /**
   * Default error severity if not specified
   */
  defaultSeverity?: ErrorSeverity;

  /**
   * Whether to use the simple error handler (tuple return)
   */
  simpleMode?: boolean;

  /**
   * Whether to automatically report errors
   */
  autoReport?: boolean;

  /**
   * Default error message if none provided
   */
  defaultMessage?: string;

  /**
   * Additional context to add to errors
   */
  context?: Record<string, unknown>;

  /**
   * Whether to use the enhanced error handler
   */
  enhanced?: boolean;
}

/**
 * Initialize the error system with the app
 * Call this at the application root to set up error monitoring and persistence
 */
export function initErrorSystem() {
  initNetworkStateMonitoring();
  initErrorPersistence();
}

/**
 * Unified error system hook - main entry point for error handling
 */
export function useErrorSystem(options: ErrorSystemOptions = {}) {
  const { enhanced = false, ...restOptions } = options;

  // Call both hooks unconditionally
  const errorHandlerResult = useErrorHandler(restOptions);
  const appErrorHandlerResult = useAppErrorHandler(restOptions);

  // Return the appropriate result based on the flag
  if (enhanced) {
    return errorHandlerResult;
  } else {
    return appErrorHandlerResult;
  }
}

/**
 * Export utility functions for convenience
 */
export {
  // Core error utilities
  normalizeError,
  getUserFriendlyMessage,
  withErrorHandling,
  reportError,

  // Network utilities
  isOnline,
  useNetworkState,
  executeWhenOnline,

  // Error persistence
  persistError,
  getPersistedErrors,
  sendPersistedErrors,

  // Key classes
  AppError,
};

export default useErrorSystem;
