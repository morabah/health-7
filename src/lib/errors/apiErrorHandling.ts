/**
 * API Error Handling
 * 
 * This file contains utility functions for handling API errors consistently
 * throughout the application. These utilities make it easier to handle
 * API responses and errors in a standardized way.
 */

import { 
  ApiError, 
  ApiResponseError, 
  ValidationError, 
  SessionExpiredError, 
  UnauthorizedError,
  NotFoundError
} from './errorClasses';
import { normalizeError } from './errorUtils';
import { reportError } from './errorMonitoring';

/**
 * Interface for API error handling configuration
 */
export interface ApiErrorHandlingOptions {
  /** Whether to retry on retryable errors */
  retry?: boolean;
  
  /** Maximum number of retries */
  maxRetries?: number;
  
  /** Base delay between retries in ms */
  retryDelay?: number;
  
  /** Whether to report errors to monitoring */
  reportErrors?: boolean;
  
  /** Context to add to reported errors */
  errorContext?: Record<string, unknown>;
}

/**
 * Default options for API error handling
 */
const DEFAULT_API_ERROR_OPTIONS: ApiErrorHandlingOptions = {
  retry: true,
  maxRetries: 3,
  retryDelay: 1000,
  reportErrors: true,
};

/**
 * Calls an API function with standardized error handling
 */
export async function callApiWithErrorHandling<T>(
  fn: () => Promise<T>,
  options: ApiErrorHandlingOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_API_ERROR_OPTIONS, ...options };
  let retryCount = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const normalizedError = normalizeError(error);
      
      // Report the error if configured to do so
      if (config.reportErrors) {
        reportError(normalizedError, config.errorContext);
      }
      
      // Check if we should retry
      const shouldRetry = 
        config.retry && 
        retryCount < (config.maxRetries || 0) && 
        isRetryableError(normalizedError);
      
      if (shouldRetry) {
        retryCount++;
        
        // Calculate exponential backoff delay
        const delay = (config.retryDelay || 0) * Math.pow(2, retryCount - 1);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If we shouldn't retry, rethrow the error
      throw normalizedError;
    }
  }
}

/**
 * Checks if an error should trigger a retry
 */
export function isRetryableError(error: Error): boolean {
  // App errors have a retryable flag
  if ('retryable' in error && typeof (error as any).retryable === 'boolean') {
    return (error as any).retryable;
  }
  
  // Network errors are generally retryable
  if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
    return true;
  }
  
  // Check for specific status codes that are retryable
  if (error instanceof ApiError && error.statusCode) {
    return [408, 429, 500, 502, 503, 504].includes(error.statusCode);
  }
  
  // By default, don't retry
  return false;
}

/**
 * Parse error from API response
 */
export async function parseApiError(response: Response): Promise<Error> {
  try {
    // Try to parse the response body as JSON
    const data = await response.json();
    
    // Handle validation errors
    if (response.status === 422 && data.errors) {
      return new ValidationError(
        data.message || 'Validation failed',
        { 
          validationErrors: data.errors,
          statusCode: response.status 
        }
      );
    }
    
    // Handle authentication errors
    if (response.status === 401) {
      if (data.code === 'SESSION_EXPIRED') {
        return new SessionExpiredError(data.message || 'Your session has expired');
      }
      return new UnauthorizedError(data.message || 'Unauthorized');
    }
    
    // Handle forbidden errors
    if (response.status === 403) {
      return new UnauthorizedError(
        data.message || 'You do not have permission to perform this action'
      );
    }
    
    // Handle not found errors
    if (response.status === 404) {
      return new NotFoundError(data.message || 'Resource not found');
    }
    
    // Generic API error with the parsed data
    return new ApiResponseError(
      data.message || `API Error: ${response.status}`,
      { 
        statusCode: response.status,
        response,
        data,
        retryable: response.status >= 500 || response.status === 429
      }
    );
  } catch (parseError) {
    // If we can't parse the JSON, return a generic API error
    return new ApiResponseError(
      `API Error: ${response.status}`,
      { 
        statusCode: response.status,
        response,
        retryable: response.status >= 500 || response.status === 429
      }
    );
  }
}

/**
 * Handles Next.js API route errors
 */
export function handleApiRouteError(error: unknown): { 
  status: number; 
  message: string; 
  errors?: Record<string, string[]>;
} {
  if (error instanceof ValidationError) {
    return {
      status: 422,
      message: error.message,
      errors: error.validationErrors,
    };
  }
  
  if (error instanceof UnauthorizedError) {
    return {
      status: 403,
      message: error.message,
    };
  }
  
  if (error instanceof NotFoundError) {
    return {
      status: 404,
      message: error.message,
    };
  }
  
  if (error instanceof ApiError && error.statusCode) {
    return {
      status: error.statusCode,
      message: error.message,
    };
  }
  
  // Log unexpected errors in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Unhandled API error:', error);
  }
  
  // Default to 500 Internal Server Error
  return {
    status: 500,
    message: 'Internal Server Error',
  };
} 