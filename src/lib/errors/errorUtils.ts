/**
 * Error Utilities
 * 
 * This file contains utility functions for handling errors consistently
 * throughout the application. These utilities make it easier to safely
 * execute functions with standardized error handling.
 */

import { AppError, ApiError, ValidationError } from './errorClasses';
import { reportError } from './errorMonitoring';

export interface ErrorHandlingConfig {
  /** Whether to log the error */
  logError?: boolean;
  
  /** Whether to report the error to monitoring service */
  reportError?: boolean;
  
  /** Custom error transformation function */
  transformError?: (error: unknown) => Error;
  
  /** Default error message if none provided */
  defaultMessage?: string;
  
  /** Additional context to add to the error */
  context?: Record<string, unknown>;
}

/**
 * Wraps an async function with standardized error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  config: ErrorHandlingConfig = {}
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const normalizedError = normalizeError(error, {
      defaultMessage: config.defaultMessage,
      context: config.context,
    });
    
    // Optionally report the error to monitoring
    if (config.reportError !== false) {
      reportError(normalizedError);
    }
    
    // Apply custom error transformation if provided
    if (config.transformError) {
      throw config.transformError(normalizedError);
    }
    
    throw normalizedError;
  }
}

/**
 * Wraps a synchronous function with standardized error handling
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  config: ErrorHandlingConfig = {}
): T {
  try {
    return fn();
  } catch (error) {
    const normalizedError = normalizeError(error, {
      defaultMessage: config.defaultMessage,
      context: config.context,
    });
    
    // Optionally report the error to monitoring
    if (config.reportError !== false) {
      reportError(normalizedError);
    }
    
    // Apply custom error transformation if provided
    if (config.transformError) {
      throw config.transformError(normalizedError);
    }
    
    throw normalizedError;
  }
}

export interface NormalizeErrorOptions {
  /** Default error message if none provided */
  defaultMessage?: string;
  
  /** Additional context to add to the error */
  context?: Record<string, unknown>;
}

/**
 * Converts any error to a standardized AppError
 */
export function normalizeError(
  error: unknown, 
  options: NormalizeErrorOptions = {}
): Error {
  // If it's already an AppError, just add any additional context
  if (error instanceof AppError) {
    if (options.context) {
      Object.entries(options.context).forEach(([key, value]) => {
        error.addContext(key, value);
      });
    }
    return error;
  }
  
  // If it's a standard Error, convert to AppError and preserve the stack
  if (error instanceof Error) {
    const appError = new AppError(
      error.message || options.defaultMessage || 'An unexpected error occurred',
      { 
        cause: error,
        context: options.context
      }
    );
    
    // Try to preserve the original stack trace
    if (error.stack) {
      appError.stack = error.stack;
    }
    
    return appError;
  }
  
  // For non-Error objects or primitives
  const errorMessage = 
    typeof error === 'string' ? error :
    error && typeof error === 'object' && 'message' in error ? String(error.message) :
    options.defaultMessage || 'An unexpected error occurred';
  
  return new AppError(errorMessage, { 
    context: {
      ...(options.context || {}),
      originalError: error
    }
  });
}

/**
 * Get a user-friendly error message from any error
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    // For validation errors, format field errors
    const fieldErrors = Object.entries(error.validationErrors)
      .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
      .join('; ');
    
    return fieldErrors || error.message;
  }
  
  if (error instanceof AppError) {
    // For app errors, use the message directly
    return error.message;
  }
  
  if (error instanceof Error) {
    // For standard errors, use the message
    return error.message;
  }
  
  // For non-Error objects or primitives
  return typeof error === 'string' 
    ? error 
    : 'An unexpected error occurred. Please try again later.';
}

/**
 * Safely extract an error message from any value
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  
  return 'Unknown error';
}

/**
 * Safely extract a status code from an error if available
 */
export function getErrorStatusCode(error: unknown): number | undefined {
  if (error instanceof ApiError && error.statusCode) {
    return error.statusCode;
  }
  
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as any).statusCode;
    if (typeof statusCode === 'number') {
      return statusCode;
    }
  }
  
  return undefined;
} 