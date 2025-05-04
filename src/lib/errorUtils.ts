/**
 * Error Utilities
 * 
 * Utility functions to standardize error handling throughout the application.
 * This provides consistent error patterns for both client and server components.
 */

import { 
  AppError, 
  ApiError, 
  ValidationError, 
  NetworkError,
  AuthError,
  DataError,
  NotFoundError,
  enhanceError
} from './errors';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';
import { logError, logWarn } from './logger';

/**
 * Configuration for try/catch error handlers
 */
export interface ErrorHandlerConfig {
  /** 
   * Context information to include with error 
   */
  context?: Record<string, unknown>;
  
  /** 
   * Custom error message 
   */
  message?: string;
  
  /** 
   * Error category for classification 
   */
  category?: ErrorCategory;
  
  /** 
   * Error severity 
   */
  severity?: ErrorSeverity;
  
  /** 
   * Function name or component for context 
   */
  source?: string;
  
  /** 
   * Whether to return null/default instead of throwing 
   */
  swallowError?: boolean;
  
  /** 
   * Default value to return if swallowing error 
   */
  defaultValue?: unknown;
  
  /** 
   * Whether to log the error 
   */
  logError?: boolean;
}

/**
 * Safely executes a function with standardized error handling
 * 
 * @example
 * // Basic usage with default error handling
 * const result = await withErrorHandling(
 *   () => fetchUserData(userId)
 * );
 * 
 * // With custom configuration
 * const result = await withErrorHandling(
 *   () => fetchUserData(userId),
 *   {
 *     context: { userId },
 *     message: 'Failed to load user data',
 *     category: 'data',
 *     swallowError: true,
 *     defaultValue: { name: 'Unknown User' }
 *   }
 * );
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  config: ErrorHandlerConfig = {}
): Promise<T> {
  const {
    context = {},
    message,
    category,
    severity,
    source = 'unknown',
    swallowError = false,
    defaultValue = null,
    logError: shouldLog = true,
  } = config;

  try {
    return await fn();
  } catch (error) {
    // Create standardized error
    const standardError = normalizeError(error, {
      message,
      category,
      severity,
      context: {
        ...context,
        source,
      },
    });

    // Log error if configured to do so
    if (shouldLog) {
      logError(`Error in ${source}`, {
        error: standardError,
        ...context,
      });
    }

    // Either throw or return default value
    if (swallowError) {
      return defaultValue as T;
    } else {
      throw standardError;
    }
  }
}

/**
 * Synchronous version of withErrorHandling
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  config: ErrorHandlerConfig = {}
): T {
  const {
    context = {},
    message,
    category,
    severity,
    source = 'unknown',
    swallowError = false,
    defaultValue = null,
    logError: shouldLog = true,
  } = config;

  try {
    return fn();
  } catch (error) {
    // Create standardized error
    const standardError = normalizeError(error, {
      message,
      category,
      severity,
      context: {
        ...context,
        source,
      },
    });

    // Log error if configured to do so
    if (shouldLog) {
      logError(`Error in ${source}`, {
        error: standardError,
        ...context,
      });
    }

    // Either throw or return default value
    if (swallowError) {
      return defaultValue as T;
    } else {
      throw standardError;
    }
  }
}

/**
 * Convert any error type to a standardized AppError
 */
export function normalizeError(
  error: unknown,
  options: {
    message?: string;
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    context?: Record<string, unknown>;
  } = {}
): AppError {
  // If already an AppError, just add additional context
  if (error instanceof AppError) {
    if (options.context) {
      Object.entries(options.context).forEach(([key, value]) => {
        error.addContext(key, value);
      });
    }
    return error;
  }
  
  // Try to determine the most specific error type based on the error
  if (error instanceof Error) {
    const errorName = error.name.toLowerCase();
    const errorMessage = error.message.toLowerCase();
    
    // Network related errors
    if (
      errorName.includes('network') ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('offline')
    ) {
      return new NetworkError(
        options.message || error.message,
        {
          context: { ...options.context, originalError: error },
          severity: options.severity,
        }
      );
    }
    
    // Auth related errors
    if (
      errorName.includes('auth') ||
      errorMessage.includes('auth') ||
      errorMessage.includes('login') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden')
    ) {
      return new AuthError(
        options.message || error.message,
        {
          context: { ...options.context, originalError: error },
          severity: options.severity,
        }
      );
    }
    
    // Validation errors
    if (
      errorName.includes('validation') ||
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('format')
    ) {
      return new ValidationError(
        options.message || error.message,
        {
          context: { ...options.context, originalError: error },
          severity: options.severity || 'warning',
        }
      );
    }
    
    // Not found errors
    if (
      errorName.includes('notfound') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('missing')
    ) {
      return new NotFoundError(
        options.message || error.message,
        {
          context: { ...options.context, originalError: error },
          severity: options.severity,
        }
      );
    }
    
    // Data errors
    if (
      errorName.includes('data') ||
      errorMessage.includes('data') ||
      errorMessage.includes('database') ||
      errorMessage.includes('query')
    ) {
      return new DataError(
        options.message || error.message,
        {
          context: { ...options.context, originalError: error },
          severity: options.severity,
        }
      );
    }
    
    // API errors
    if (
      errorName.includes('api') ||
      errorMessage.includes('api') ||
      errorMessage.includes('server') ||
      errorMessage.includes('request')
    ) {
      return new ApiError(
        options.message || error.message,
        {
          context: { ...options.context, originalError: error },
          severity: options.severity,
          status: 'status' in error ? (error as any).status : undefined,
        }
      );
    }
  }
  
  // Use enhanceError for anything else
  return enhanceError(error, {
    message: options.message,
    category: options.category,
    severity: options.severity,
    context: options.context,
  });
}

/**
 * Extract a user-friendly message from any error type
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
  }
  
  return 'An unknown error occurred';
}

/**
 * Try to extract a status code from an error
 */
export function getStatusCodeFromError(error: unknown): number | undefined {
  if (error instanceof ApiError) {
    return error.status;
  }
  
  if (error && typeof error === 'object') {
    if ('status' in error && typeof error.status === 'number') {
      return error.status;
    }
    
    if ('statusCode' in error && typeof error.statusCode === 'number') {
      return error.statusCode;
    }
    
    if ('code' in error && typeof error.code === 'number') {
      return error.code;
    }
  }
  
  return undefined;
} 