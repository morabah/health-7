/**
 * API Client
 *
 * Unified caller for local API functions or Firebase Cloud Functions.
 * All components must use this wrapper rather than importing functions directly.
 * This allows us to swap the backend implementation by changing only this file.
 */

import * as localAPI from './localApiFunctions';
import { isFirebaseEnabled, functions } from './firebaseConfig';
import { firebaseApi } from './firebaseFunctions';
import { getCurrentAuthCtx } from './apiAuthCtx';
import { logInfo, logError } from './logger';
import { callApiWithErrorHandling } from './apiErrorHandling';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';
import { createFirebaseError } from './firebaseErrorMapping';

// Get the appropriate API based on configuration
const api = isFirebaseEnabled ? firebaseApi : localAPI.localApi;

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
  errorContext?: Record<string, unknown>;
  
  /**
   * Force use of local API implementation regardless of configuration
   */
  forceLocal?: boolean;
}

/**
 * Call an API function with the provided arguments
 * This function will route to either local implementation or Firebase Functions
 * based on the isFirebaseEnabled flag and options
 *
 * @param method - The API method name to call
 * @param args - Arguments to pass to the API method
 * @returns Promise with the result of the API call
 */
export async function callApi<T = unknown>(
  method: string, 
  ...args: unknown[]
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

      // If Firebase is enabled, use Firebase Functions instead of local implementation
      if (isFirebaseEnabled) {
        return await callFirebaseFunction<T>(mappedMethod, ...args);
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
          args[0] !== null &&
          'email' in args[0] &&
          'password' in args[0]
        ) {
          // Args are in object format {email, password}
          const { email, password } = args[0] as { email: string; password: string };
          return (await localAPI.signIn(email, password)) as T;
        }
      }

      // Check if we have the method in our local API
      if (mappedMethod in api) {
        // @ts-ignore: dynamic method call
        const localApiMethod = api[mappedMethod];

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
            args[0] !== null &&
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
 * Call a Firebase Cloud Function
 * Used when isFirebaseEnabled is true
 * 
 * @param method Function name to call
 * @param args Arguments to pass to the function
 * @returns The result of the function call
 */
async function callFirebaseFunction<T>(method: string, ...args: unknown[]): Promise<T> {
  try {
    // Create a callable reference to the Firebase Function
    const callable = functions.httpsCallable(method);
    
    // Prepare payload - combine all arguments into a single object for Cloud Functions
    let payload: Record<string, unknown> = {};
    
    // Special handling for methods with context as first argument
    if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null && 'uid' in args[0] && 'role' in args[0]) {
      // Take context from first argument
      const [ctx, ...restArgs] = args;
      
      // If there's exactly one more argument and it's an object, use it as payload
      if (restArgs.length === 1 && typeof restArgs[0] === 'object' && restArgs[0] !== null) {
        payload = { 
          context: ctx,
          ...restArgs[0] as Record<string, unknown>
        };
      } else if (restArgs.length > 0) {
        // Multiple arguments, create a data property with the rest
        payload = {
          context: ctx,
          data: restArgs.length === 1 ? restArgs[0] : restArgs
        };
      } else {
        // Just context, no additional data
        payload = { context: ctx };
      }
    } else {
      // No context object, use first argument as payload or combine all
      if (args.length === 1) {
        if (typeof args[0] === 'object' && args[0] !== null) {
          payload = args[0] as Record<string, unknown>;
        } else {
          payload = { data: args[0] };
        }
      } else if (args.length > 1) {
        payload = { data: args };
      }
    }
    
    // Call the Firebase Function
    const result = await callable(payload);
    
    // Firebase Functions return { data: ... }
    return result.data as T;
  } catch (error) {
    // Transform Firebase errors to a standard format
    if (error && typeof error === 'object' && 'code' in error) {
      // This is a Firebase error, use our mapping to create a better error object
      const firebaseError = error as { code: string; message: string };
      logError(`Firebase function ${method} error: ${firebaseError.code}`, { 
        method, 
        code: firebaseError.code,
        message: firebaseError.message,
        args 
      });
      
      throw createFirebaseError(firebaseError);
    }
    
    // For non-Firebase errors, log and rethrow
    logError(`Error calling Firebase function ${method}:`, error);
    throw error;
  }
}

/**
 * Call an API with options for customizing error handling
 * 
 * @param method API method name
 * @param options Error handling options
 * @param args Arguments to pass to the API method
 * @returns Promise with the API result
 */
export async function callApiWithOptions<T = unknown>(
  method: string,
  options: CallApiOptions = {},
  ...args: unknown[]
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
  
  // Implement options handling here if needed
  // For now, just forward to callApi
  return callApi<T>(method, ...args);
}

export default { callApi, callApiWithOptions };
