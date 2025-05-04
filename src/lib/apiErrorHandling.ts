'use client';

import { reportError } from './errorMonitoring';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';
import { logError, logInfo, logWarn } from './logger';
import { 
  getFirebaseErrorMessage, 
  getFirebaseErrorCategory,
  getFirebaseErrorSeverity,
  createFirebaseError
} from './firebaseErrorMapping';

/**
 * Configuration options for API calls
 */
interface ApiOptions {
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Base delay in milliseconds between retries (will be exponentially increased)
   */
  retryDelay?: number;
  
  /**
   * Whether to apply jitter to retry delays to prevent thundering herd
   */
  retryJitter?: boolean;
  
  /**
   * Error category for error monitoring
   */
  errorCategory?: ErrorCategory;
  
  /**
   * Error severity for error monitoring
   */
  errorSeverity?: ErrorSeverity;
  
  /**
   * Custom error message to show to users
   */
  errorMessage?: string;
  
  /**
   * HTTP status codes that should trigger retries
   */
  retryStatusCodes?: number[];
  
  /**
   * Error types that should trigger retries
   */
  retryErrorTypes?: string[];
  
  /**
   * Callback to execute before each retry
   */
  onRetry?: (error: unknown, attempt: number) => void;
  
  /**
   * Context data to include in error reports
   */
  errorContext?: Record<string, any>;
  
  /**
   * Whether the operation can be retried by the user
   */
  retryable?: boolean;
  
  /**
   * Whether to automatically handle 401 errors by redirecting to login
   */
  handleAuth?: boolean;
  
  /**
   * API endpoint path (for logging/tracking)
   */
  endpoint?: string;
  
  /**
   * API method (for logging/tracking)
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

/**
 * Default options for API calls
 */
const defaultApiOptions: Required<ApiOptions> = {
  maxRetries: 3,
  retryDelay: 300,
  retryJitter: true,
  errorCategory: 'api',
  errorSeverity: 'error',
  errorMessage: 'There was an error processing your request',
  retryStatusCodes: [408, 429, 500, 502, 503, 504],
  retryErrorTypes: ['NetworkError', 'TimeoutError'],
  onRetry: () => {},
  errorContext: {},
  retryable: true,
  handleAuth: true,
  endpoint: 'unknown',
  method: 'GET',
};

/**
 * Calculate retry delay with exponential backoff and optional jitter
 * 
 * @param attempt Current retry attempt (0-based)
 * @param baseDelay Base delay in milliseconds
 * @param useJitter Whether to apply jitter
 * @returns Delay in milliseconds before next retry
 */
function calculateRetryDelay(attempt: number, baseDelay: number, useJitter: boolean): number {
  // Exponential backoff: baseDelay * 2^attempt
  const delay = baseDelay * Math.pow(2, attempt);
  
  // Add jitter if enabled (±25% randomization)
  if (useJitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5; // 0.75 to 1.25
    return Math.floor(delay * jitterFactor);
  }
  
  return delay;
}

/**
 * Check if an error is retryable based on its type and status code
 * 
 * @param error Error object or response
 * @param retryStatusCodes HTTP status codes that should trigger retries
 * @param retryErrorTypes Error types that should trigger retries
 * @returns Whether the error should trigger a retry
 */
function isRetryableError(
  error: unknown,
  retryStatusCodes: number[],
  retryErrorTypes: string[]
): boolean {
  // Check if it's a Response object with a status code
  if (error instanceof Response) {
    return retryStatusCodes.includes(error.status);
  }
  
  // Check if it's an error with a status code
  if (
    error && 
    typeof error === 'object' && 
    'status' in error && 
    typeof error.status === 'number'
  ) {
    return retryStatusCodes.includes(error.status);
  }
  
  // Check error types
  if (error instanceof Error) {
    return retryErrorTypes.includes(error.name) || 
           error.message.includes('network') ||
           error.message.includes('timeout');
  }
  
  return false;
}

/**
 * Extract error message and status from various error types
 * 
 * @param error Error object
 * @returns Extracted error details
 */
function extractErrorDetails(error: unknown): { 
  message: string; 
  status?: number;
  code?: string;
} {
  // Handle Response objects
  if (error instanceof Response) {
    return {
      message: `API error: ${error.statusText}`,
      status: error.status,
    };
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    // Check for status and code properties
    const anyError = error as any;
    return {
      message: error.message,
      status: anyError.status || anyError.statusCode,
      code: anyError.code,
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return { message: error };
  }
  
  // Handle object errors with message property
  if (error && typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return { 
        message: error.message,
        status: 'status' in error && typeof error.status === 'number' ? error.status : undefined,
        code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
      };
    }
    
    // Handle object errors with error property
    if ('error' in error && typeof error.error === 'string') {
      return { 
        message: error.error,
        status: 'status' in error && typeof error.status === 'number' ? error.status : undefined,
        code: 'code' in error && typeof error.code === 'string' ? error.code : undefined,
      };
    }
  }
  
  // Default for unknown error types
  return { message: 'Unknown error' };
}

/**
 * Parse API error response to extract useful information
 * 
 * @param error API error response
 * @returns Parsed error object with details
 */
export async function parseApiError(error: Response): Promise<{
  message: string;
  status: number;
  data?: any;
}> {
  let data: any = null;
  let message = error.statusText || 'API request failed';
  
  try {
    // Try to parse JSON response
    data = await error.json();
    
    // Use error message from response if available
    if (data && typeof data === 'object') {
      if (data.message) {
        message = data.message;
      } else if (data.error) {
        message = typeof data.error === 'string' ? data.error : 'API request failed';
      }
    }
  } catch (e) {
    // JSON parsing failed, use status text
    message = `${error.status} ${error.statusText}`;
  }
  
  return {
    message,
    status: error.status,
    data,
  };
}

/**
 * Check if the browser is currently offline
 * 
 * @returns True if the browser is offline
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Monitor online/offline status changes
 * 
 * @param onlineCallback Function to call when coming online
 * @param offlineCallback Function to call when going offline
 * @returns Cleanup function to remove listeners
 */
export function monitorOnlineStatus(
  onlineCallback: () => void, 
  offlineCallback: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {}; // No-op for SSR
  }
  
  window.addEventListener('online', onlineCallback);
  window.addEventListener('offline', offlineCallback);
  
  return () => {
    window.removeEventListener('online', onlineCallback);
    window.removeEventListener('offline', offlineCallback);
  };
}

/**
 * Categorize an error based on its type and properties
 * 
 * @param error Error object
 * @returns Error category
 */
export function categorizeError(error: unknown): ErrorCategory {
  // Check for offline status first
  if (isOffline()) {
    return 'network';
  }
  
  // Check for network errors
  if (
    error instanceof TypeError && 
    (error.message.includes('fetch') || error.message.includes('network'))
  ) {
    return 'network';
  }
  
  // Check for Firebase auth errors
  if (
    error instanceof Error && 
    ('code' in error) && 
    typeof (error as any).code === 'string' && 
    (error as any).code.startsWith('auth/')
  ) {
    return 'auth';
  }
  
  // Check for HTTP status codes
  if (error instanceof Response) {
    if (error.status === 401 || error.status === 403) {
      return 'auth';
    }
    if (error.status === 404) {
      return 'data';
    }
    if (error.status >= 500) {
      return 'server';
    }
    return 'api';
  }
  
  // Check for error objects with status
  if (
    error && 
    typeof error === 'object' && 
    'status' in error && 
    typeof (error as any).status === 'number'
  ) {
    const status = (error as any).status;
    if (status === 401 || status === 403) {
      return 'auth';
    }
    if (status === 404) {
      return 'data';
    }
    if (status >= 500) {
      return 'server';
    }
    return 'api';
  }
  
  // Default to 'api' for unrecognized errors
  return 'api';
}

/**
 * Check if an API error is related to network connectivity
 */
export function isNetworkError(error: unknown): boolean {
  // Offline browser status
  if (isOffline()) {
    return true;
  }
  
  // TypeError with network-related message
  if (
    error instanceof TypeError && 
    (error.message.includes('fetch') || 
     error.message.includes('network') ||
     error.message.includes('Failed to fetch'))
  ) {
    return true;
  }
  
  // Error with network-related message
  if (
    error instanceof Error && 
    (error.message.includes('network') || 
     error.message.includes('internet') || 
     error.message.includes('connection'))
  ) {
    return true;
  }
  
  // DOMException with network-related message
  if (
    error instanceof DOMException && 
    (error.name === 'NetworkError' || 
     error.message.includes('network'))
  ) {
    return true;
  }
  
  // Object with status indicating network error
  if (
    error && 
    typeof error === 'object' && 
    'status' in error && 
    ((error as any).status === 0 || (error as any).status === 'network_error')
  ) {
    return true;
  }
  
  return false;
}

/**
 * Enhance an async function with retry logic and error handling
 * 
 * @param fn Async function to enhance
 * @param options API options
 * @returns Enhanced function with retry logic and error handling
 */
export function withApiErrorHandling<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: ApiOptions = {}
): (...args: T) => Promise<R> {
  // Merge options with defaults
  const opts: Required<ApiOptions> = { ...defaultApiOptions, ...options };
  
  // Return a wrapped function with error handling
  return async (...args: T): Promise<R> => {
    let attempt = 0;
    
    while (true) {
      try {
        // Call the original function
        return await fn(...args);
      } catch (error) {
        // Extract error details
        const errorDetails = extractErrorDetails(error);
        
        // Create error context with operation details
        const errorContext = {
          ...opts.errorContext,
          endpoint: opts.endpoint,
          method: opts.method,
          attempt,
          status: errorDetails.status,
          errorCode: errorDetails.code,
        };
        
        // Check if we should retry
        const shouldRetry = 
          attempt < opts.maxRetries && 
          isRetryableError(error, opts.retryStatusCodes, opts.retryErrorTypes);
        
        // If this is a 401 Unauthorized and handleAuth is true, report as auth error
        if (errorDetails.status === 401 && opts.handleAuth) {
          // Report as auth error but don't retry
          reportError(error, {
            category: 'auth',
            severity: 'warning',
            message: 'Your session has expired. Please log in again.',
            context: errorContext,
          });
          
          // Rethrow with additional info
          throw new Error('Authentication required. Please log in again.');
        }
        
        // If we've exhausted retries or this isn't a retryable error, report and throw
        if (!shouldRetry) {
          // Report the error
          reportError(error, {
            category: opts.errorCategory,
            severity: opts.errorSeverity,
            message: opts.errorMessage,
            context: errorContext,
          });
          
          // For the last attempt, enhance the error with additional information
          if (error instanceof Error) {
            error.message = `${opts.errorMessage}: ${error.message}`;
            (error as any).retryable = opts.retryable;
            (error as any).context = errorContext;
          }
          
          // Rethrow the error
          throw error;
        }
        
        // If we get here, we should retry
        attempt++;
        
        // Log retry attempt
        logInfo(`Retrying API call (${attempt}/${opts.maxRetries})`, {
          endpoint: opts.endpoint,
          method: opts.method,
          error: errorDetails.message,
        });
        
        // Call onRetry callback
        opts.onRetry(error, attempt);
        
        // Calculate delay for this retry attempt
        const delay = calculateRetryDelay(
          attempt, 
          opts.retryDelay, 
          opts.retryJitter
        );
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  };
}

/**
 * Enhance fetch with error handling, retries, and improved error reporting
 * 
 * @param input Request info
 * @param init Request init options
 * @param options API options
 * @returns Fetch response with error handling
 */
export async function enhancedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  options: ApiOptions = {}
): Promise<Response> {
  // Determine endpoint for error reporting
  const endpoint = typeof input === 'string' 
    ? input 
    : input instanceof URL 
      ? input.pathname 
      : input instanceof Request 
        ? input.url 
        : 'unknown';
  
  // Merge options with defaults and add endpoint
  const opts: ApiOptions = { 
    ...options,
    endpoint,
    method: init?.method as ApiOptions['method'] || 'GET',
  };
  
  // Create enhanced fetch function with retries
  const fetchWithRetries = withApiErrorHandling(
    async () => {
      const response = await fetch(input, init);
      
      // If response is not ok, parse error and throw
      if (!response.ok) {
        const error = await parseApiError(response);
        
        // Create a custom error with the response data
        const customError = new Error(error.message);
        (customError as any).status = error.status;
        (customError as any).data = error.data;
        
        throw customError;
      }
      
      return response;
    },
    opts
  );
  
  // Execute the enhanced fetch
  return fetchWithRetries();
}

/**
 * API Error Handling
 * 
 * Utility functions for standardized API error handling with retry logic,
 * error categorization, and error mapping between local API and Firebase.
 */

// Retry configuration
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1000;
const EXPONENTIAL_BACKOFF_FACTOR = 1.5;

/**
 * Error handling options
 */
export interface ErrorHandlingOptions {
  /**
   * API endpoint name for logging
   */
  endpoint?: string;
  
  /**
   * Custom error message
   */
  errorMessage?: string;
  
  /**
   * Whether this operation is retryable
   */
  retryable?: boolean;
  
  /**
   * Maximum number of retries
   */
  maxRetries?: number;
  
  /**
   * Base delay before retry in ms (will increase with backoff)
   */
  retryDelayMs?: number;
  
  /**
   * Error category for classification
   */
  errorCategory?: ErrorCategory;
  
  /**
   * Error severity
   */
  errorSeverity?: ErrorSeverity;
  
  /**
   * Extra context data for error reporting
   */
  errorContext?: Record<string, unknown>;
}

/**
 * Call an API function with standardized error handling and retry logic
 * 
 * @param fn The function to call
 * @param args Arguments to pass to the function
 * @param options Error handling options
 * @returns Promise with the result of the function
 */
export async function callApiWithErrorHandling<T>(
  fn: (...args: unknown[]) => Promise<T>,
  args: unknown[] = [],
  options: ErrorHandlingOptions = {}
): Promise<T> {
  // Set default options
  const {
    endpoint = 'unknown-endpoint',
    errorMessage = 'API call failed',
    retryable = true,
    maxRetries = DEFAULT_MAX_RETRIES,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    errorCategory = 'api',
    errorSeverity = 'error',
    errorContext = {}
  } = options;
  
  // Initialize retry counter
  let retryCount = 0;
  
  // Check for offline status before making the API call
  if (isOffline()) {
    const offlineError = new Error('You appear to be offline. Please check your internet connection and try again.');
    (offlineError as any).isOffline = true;
    (offlineError as any).category = 'network';
    (offlineError as any).severity = 'warning';
    (offlineError as any).recoverable = true;
    reportError(offlineError, {
      category: 'network',
      severity: 'warning',
      context: { offline: true, ...options.errorContext }
    });
    throw offlineError;
  }
  
  // Keep trying until we succeed or exceed max retries
  while (true) {
    try {
      // Call the function with provided arguments
      return await fn(...args);
    } catch (error) {
      // Check if we should retry
      if (retryable && retryCount < maxRetries) {
        // Increment retry counter
        retryCount++;
        
        // Calculate delay with exponential backoff
        const delay = retryDelayMs * Math.pow(EXPONENTIAL_BACKOFF_FACTOR, retryCount - 1);
        
        // Log retry attempt
        logWarn(`API call to ${endpoint} failed. Retrying (${retryCount}/${maxRetries}) in ${delay}ms`, { 
          error,
          retryCount,
          maxRetries,
          delay,
          ...errorContext
        });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Retry the operation (continue to next loop iteration)
        continue;
      }
      
      // Add error handling - map Firebase errors to standard format
      if (error && typeof error === 'object' && 'code' in error) {
        // This is likely a Firebase error
        const firebaseError = error as { code: string; message: string };
  
        // Get user-friendly error details from our mapping
        const userMessage = getFirebaseErrorMessage(firebaseError.code, errorMessage);
        const category = getFirebaseErrorCategory(firebaseError.code) || errorCategory;
        const severity = getFirebaseErrorSeverity(firebaseError.code) || errorSeverity;
        
        // Map Firebase error codes to our standard error format
        logError(`Firebase API Error in ${endpoint}: ${firebaseError.code}`, {
          code: firebaseError.code,
          message: firebaseError.message,
          userMessage,
          endpoint,
          category,
          severity,
          ...errorContext
        });
        
        // Format as a standard error object with Firebase error properties
        const standardError = createFirebaseError(firebaseError);
        (standardError as any).endpoint = endpoint;
        (standardError as any).errorContext = errorContext;
        
        throw standardError;
      }
      
      // Standard error logging
      logError(`API Error in ${endpoint}: ${errorMessage}`, {
        error,
        endpoint,
        category: errorCategory,
        severity: errorSeverity,
        ...errorContext
      });
  
      // Rethrow with enhanced context
      if (error instanceof Error) {
        // Add metadata to existing error
        (error as any).category = errorCategory;
        (error as any).severity = errorSeverity;
        (error as any).context = errorContext;
        throw error;
      } else {
        // Wrap non-Error objects
        const standardError = new Error(errorMessage);
        (standardError as any).category = errorCategory;
        (standardError as any).severity = errorSeverity;
        (standardError as any).originalError = error;
        (standardError as any).context = errorContext;
        throw standardError;
      }
    }
  }
}

export default {
  withApiErrorHandling,
  enhancedFetch,
  callApiWithErrorHandling,
  parseApiError,
}; 