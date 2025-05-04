/**
 * API Client
 *
 * Unified caller for local API functions.
 * All components must use this wrapper rather than importing localApiFunctions directly.
 * This allows us to swap the backend implementation later by changing only this file.
 */

import * as localAPI from './localApiFunctions';
import { getCurrentAuthCtx } from './apiAuthCtx';
import { logInfo, logError } from './logger';
import { callApiWithErrorHandling } from './apiErrorHandling';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';

// Low-noise API methods that should minimize logging
const LOW_NOISE_METHODS = ['getAvailableSlots', 'getMyNotifications', 'getMyDashboardStats'];

// Method mapping for backward compatibility
const METHOD_MAPPING: Record<string, string> = {
  login: 'signIn',
  registerPatient: 'registerUser',
  registerDoctor: 'registerUser',
};

/**
 * Options for callApi
 */
interface CallApiOptions {
  /**
   * Whether to retry on failure
   */
  retry?: boolean;
  
  /**
   * Maximum number of retries
   */
  maxRetries?: number;
  
  /**
   * Custom error message
   */
  errorMessage?: string;
  
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
  errorContext?: Record<string, any>;
}

/**
 * Call a local API function with the provided arguments
 *
 * @param method - The API method name to call
 * @param args - Arguments to pass to the API method
 * @returns Promise with the result of the API call
 */
export async function callApi<T = any>(
  method: string, 
  ...args: any[]
): Promise<T> {
  // Only log non-low-noise methods to prevent console flooding
  const shouldLog = !LOW_NOISE_METHODS.includes(method);

  if (shouldLog) {
    // Log API call for debugging
    console.log(`[callApi] Calling ${method} with args:`, args);
  }

  // Check if method needs mapping (e.g., login -> signIn)
  const mappedMethod = METHOD_MAPPING[method] || method;

  // Create a function to execute the actual API call
  const executeApiCall = async (): Promise<T> => {
    try {
      // Add artificial delay in development mode to expose loading states
      if (process.env.NODE_ENV === 'development' && !method.includes('get')) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Special handling for login/signIn
      if (method === 'login') {
        // Extract email and password from arguments for login
        if (args.length === 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
          // Args are already [email, password]
          return (await localAPI.signIn(args[0], args[1])) as T;
        } else if (
          args.length === 1 &&
          typeof args[0] === 'object' &&
          args[0].email &&
          args[0].password
        ) {
          // Args are in object format {email, password}
          return (await localAPI.signIn(args[0].email, args[0].password)) as T;
        }
      }

      // Check if we have the method in our local API
      if (mappedMethod in localAPI.localApi) {
        // @ts-ignore: dynamic method call
        const localApiMethod = localAPI.localApi[mappedMethod];

        // Special case for methods that need auth context
        if (
          mappedMethod.startsWith('get') ||
          mappedMethod === 'updateMyProfile' ||
          mappedMethod === 'bookAppointment' ||
          mappedMethod === 'cancelAppointment' ||
          mappedMethod === 'completeAppointment'
        ) {
          // Get current auth context
          const ctx = getCurrentAuthCtx();

          // For debug only - Log method called with args
          if (shouldLog) {
            logInfo(`Calling ${mappedMethod} with processed args`, args);
          }

          // Check if this is a method where the user explicitly passed context
          if (
            args.length > 0 &&
            args[0] &&
            typeof args[0] === 'object' &&
            'uid' in args[0] &&
            'role' in args[0]
          ) {
            // Use the explicitly provided context instead of the global one
            return await localApiMethod(args[0], ...args.slice(1));
          }

          // Return result from local API call with context
          return await localApiMethod(ctx, ...args);
        }

        // For debug only
        if (shouldLog) {
          logInfo(`Calling ${mappedMethod} with processed args`, args);
        }

        // Return result from local API call
        return await localApiMethod(...args);
      }
      
      // Fallback: check if core functions like registerUser are available directly
      if (mappedMethod === 'registerUser' && 'registerUser' in localAPI) {
        if (shouldLog) {
          logInfo(`Calling direct function registerUser for ${method}`, args);
        }
        // @ts-ignore: dynamic method call
        return await localAPI.registerUser(...args) as T;
      }

      throw new Error(`API method ${method} not found. Tried looking for '${method}' and '${mappedMethod}'`);
    } catch (err) {
      logError(`Error calling ${method}:`, err);
      throw err;
    }
  };

  // Determine API category based on method name
  let category: ErrorCategory = 'api';
  
  if (method.includes('login') || method.includes('register') || method.includes('auth')) {
    category = 'auth';
  } else if (method.includes('appointment') || method.includes('booking')) {
    category = 'appointment';
  } else if (method.includes('profile') || method.includes('user')) {
    category = 'data';
  }

  // Call the API with enhanced error handling
  return callApiWithErrorHandling(
    executeApiCall,
    [],
    {
      endpoint: method,
      errorCategory: category,
      errorMessage: `Error calling ${method}`,
      maxRetries: method.startsWith('get') ? 2 : 0, // Only retry GET methods
      retryable: true,
      errorContext: {
        method,
        mappedMethod,
        arguments: args,
      },
    }
  );
}

/**
 * Call an API with options for customizing error handling
 * 
 * @param method API method name
 * @param options Error handling options
 * @param args Arguments to pass to the API method
 * @returns Promise with the API result
 */
export async function callApiWithOptions<T = any>(
  method: string,
  options: CallApiOptions = {},
  ...args: any[]
): Promise<T> {
  // Determine API category based on method name if not specified
  let category = options.errorCategory || 'api';
  
  if (!options.errorCategory) {
    if (method.includes('login') || method.includes('register') || method.includes('auth')) {
      category = 'auth';
    } else if (method.includes('appointment') || method.includes('booking')) {
      category = 'appointment';
    } else if (method.includes('profile') || method.includes('user')) {
      category = 'data';
    }
  }
  
  return callApi<T>(method, ...args);
}

export default { callApi, callApiWithOptions };
