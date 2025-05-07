'use client';

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
import { logInfo, logError, logWarn } from './logger';
import { callApiWithErrorHandling, ApiErrorHandlingOptions } from './errors/apiErrorHandling';
import type { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';
import { mapFirebaseError } from './errors/firebaseErrorMapping';
import { ApiError } from './errors/errorClasses';
import {
  getOptimizedDoctors,
  getOptimizedUsers,
  getOptimizedAppointments,
  getMemoryCacheData,
  setMemoryCacheData,
  clearMemoryCache,
} from './optimizedDataAccess';
import { cacheKeys, cacheManager } from './queryClient';
import { UserType } from '@/types/enums';
import { deduplicatedApiCall } from './apiDeduplication';

// Get the appropriate API based on configuration
const api = isFirebaseEnabled ? firebaseApi : localAPI.localApi;

// Type for dynamic API methods
type ApiMethods = Record<string, (...args: any[]) => Promise<unknown>>;

// Low-noise API methods that should minimize logging
const LOW_NOISE_METHODS = ['getAvailableSlots', 'getMyNotifications', 'getMyDashboardStats'];

// Interface for optimized method implementations
interface OptimizedMethod<T> {
  (options: {
    filters?: Record<string, unknown>;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<T[]>;
}

// Methods that can use optimized data access
const OPTIMIZED_METHODS: Record<string, OptimizedMethod<unknown> | null> = {
  findDoctors: getOptimizedDoctors,
  getAllDoctors: getOptimizedDoctors,
  getDoctorPublicProfile: null, // Special case handled in code
  getAllUsers: getOptimizedUsers,
  getMyAppointments: getOptimizedAppointments,
  getPatientAppointments: getOptimizedAppointments,
  getDoctorAppointments: getOptimizedAppointments,
};

// Method mapping for backward compatibility
const METHOD_MAPPING: Record<string, string> = {
  login: 'signIn',
  registerPatient: 'registerUser',
  registerDoctor: 'registerUser',
  getAllUsers: 'adminGetAllUsers', // Map getAllUsers to adminGetAllUsers which exists in the API
};

// Methods that should use deduplication
const DEDUPLICATION_ELIGIBLE_METHODS = [
  'getMyNotifications',
  'getMyDashboardStats',
  'getAvailableSlots',
  'findDoctors',
  'getMyUserProfile',
  'getMyAppointments',
  'getAllDoctors',
  'getAllUsers',
  'getPatientProfile',
  'getDoctorPublicProfile',
];

// Debounce requests mapping by method
const DEDUPE_DEBOUNCE_MS: Record<string, number> = {
  getMyNotifications: 300, // High frequency, aggressive debounce
  findDoctors: 200, // Search function, moderate debounce
  getAllDoctors: 300, // List view, aggressive debounce
  getAllUsers: 300, // List view, aggressive debounce
  getAvailableSlots: 150, // Time-sensitive data, light debounce
  getMyAppointments: 200, // Moderate debounce
};

// Track last request timestamp to implement debouncing
const lastRequestTimestamps: Record<string, number> = {};

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

  /**
   * Skip optimized data access and use the standard implementation
   */
  skipOptimized?: boolean;

  /**
   * Skip deduplication for this call
   */
  skipDeduplication?: boolean;
}

// Interface for auth context in API calls
interface AuthContext {
  uid: string;
  role: UserType;
}

// Standard API response structure
interface ApiResponse<T> {
  success: boolean;
  [key: string]: unknown;
}

// Doctor profile type for cache
interface DoctorProfile {
  id: string;
  userId: string;
  [key: string]: unknown;
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
export async function callApi<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
  return callApiWithOptions<T>(method, {}, ...args);
}

/**
 * Call an API function with options and arguments
 *
 * @param method - The API method name to call
 * @param options - Options for the API call
 * @param args - Arguments to pass to the API method
 * @returns Promise with the result of the API call
 */
export async function callApiWithOptions<T = unknown>(
  method: string,
  options: CallApiOptions = {},
  ...args: unknown[]
): Promise<T> {
  // Only log non-low-noise methods to prevent console flooding
  const shouldLog = !LOW_NOISE_METHODS.includes(method);

  if (shouldLog) {
    // Log API call for debugging
    logInfo(`[callApi] Calling ${method} with args:`, args);
  }

  // Check if method needs mapping (e.g., login -> signIn)
  const mappedMethod = METHOD_MAPPING[method] || method;

  // Create a function to execute the actual API call using standard implementation
  const executeApiCall = async (): Promise<T> => {
    try {
      // For Firebase, create a callable function
      if (isFirebaseEnabled && !options.forceLocal) {
        return await callFirebaseFunction<T>(mappedMethod, ...args);
      }

      // For local development, call local API directly
      console.log(`[apiClient.ts] Attempting to call local method: ${mappedMethod}`);
      console.log(`[apiClient.ts] Available local API keys: ${Object.keys(api).join(', ')}`);

      // Check if method exists
      if (!(mappedMethod in (api as ApiMethods))) {
        // If mapped method doesn't exist, check if original method exists
        if (method !== mappedMethod && method in (api as ApiMethods)) {
          // Use original method if mapped method doesn't exist
          return (await (api as ApiMethods)[method](...args)) as T;
        }
        throw new ApiError(`API method ${mappedMethod} not found`, {
          code: 'API_METHOD_NOT_FOUND',
          statusCode: 404,
          retryable: false,
          severity: 'error',
          context: { method: mappedMethod, originalMethod: method },
        });
      }

      // Special handling for login method to ensure correct parameter passing
      if (method === 'login' && args.length === 1 && args[0] && typeof args[0] === 'object') {
        const loginParams = args[0] as Record<string, unknown>;
        if ('email' in loginParams && 'password' in loginParams) {
          const email = loginParams.email;
          const password = loginParams.password;
          return (await (api as ApiMethods)[mappedMethod](email, password)) as T;
        }
      }

      // If no auth context provided but needed, get from session
      let callArgs = [...args];
      if (
        callArgs.length === 0 ||
        !callArgs[0] ||
        typeof callArgs[0] !== 'object' ||
        !('uid' in callArgs[0])
      ) {
        // Only inject auth context for methods that typically need it
        // Skip for public methods like register, login, etc.
        if (!['registerUser', 'signIn', 'login', 'requestPasswordReset'].includes(mappedMethod)) {
          const authCtx = getCurrentAuthCtx();
          if (authCtx && authCtx.uid) {
            callArgs.unshift(authCtx);
          }
        }
      }

      // Call the API method
      console.log(`[apiClient.ts] Executing local method: ${mappedMethod} with args:`, callArgs);
      const result = await (api as ApiMethods)[mappedMethod](...callArgs);

      if (shouldLog && result && typeof result === 'object') {
        // Use optional chaining for safety
        logInfo(`[callApi] Result from ${method}:`, {
          success: 'success' in result ? result.success : undefined,
          hasData: !!(
            ('data' in result && result.data) ||
            ('user' in result && result.user) ||
            ('users' in result && result.users) ||
            ('doctor' in result && result.doctor)
          ),
          error: 'error' in result ? result.error : undefined,
        });
      }

      return result as T;
    } catch (error) {
      logError(`Error calling API method: ${method}`, { error, args });
      throw error;
    }
  };

  // Check if we should use optimized data access
  if (!options.skipOptimized && method in OPTIMIZED_METHODS) {
    try {
      const optimizedFn = OPTIMIZED_METHODS[method];

      // Skip if no optimized implementation available
      if (!optimizedFn) {
        return executeApiCall();
      }

      // Special handling for getDoctorPublicProfile - direct get by ID
      if (method === 'getDoctorPublicProfile' && args.length > 0) {
        const doctorId =
          typeof args[0] === 'string'
            ? args[0]
            : args.length > 1 && typeof args[1] === 'string'
              ? args[1]
              : undefined;

        if (doctorId) {
          const doctors = await getOptimizedDoctors({});
          const doctor = doctors.find(d => d.id === doctorId || d.userId === doctorId);

          if (doctor) {
            return {
              success: true,
              doctor,
            } as unknown as T;
          }
        }
      }

      // For other methods that have an optimized implementation
      else if (optimizedFn) {
        // Convert args to filters
        const filters: Record<string, unknown> = {};

        // Process args into filter options
        if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null) {
          // Skip auth context if present
          const startIndex = 'uid' in args[0] && 'role' in args[0] ? 1 : 0;

          if (args[startIndex] && typeof args[startIndex] === 'object') {
            Object.assign(filters, args[startIndex]);
          }
        }

        const result = await optimizedFn({ filters });

        // Format the response to match the expected API response
        const responseKey = method.includes('Doctor')
          ? 'doctors'
          : method.includes('User')
            ? 'users'
            : 'appointments';

        return {
          success: true,
          [responseKey]: result,
        } as unknown as T;
      }
    } catch (error) {
      // If optimized access fails, fall back to standard implementation
      logError('Optimized data access failed, falling back to standard implementation', {
        method,
        error,
      });
    }
  }

  // Use deduplication for eligible methods if not explicitly skipped
  if (!options.skipDeduplication && DEDUPLICATION_ELIGIBLE_METHODS.includes(method)) {
    // Apply request debouncing for eligible methods
    const debounceMs = DEDUPE_DEBOUNCE_MS[method] || 0;
    if (debounceMs > 0) {
      const now = Date.now();
      const lastRequest = lastRequestTimestamps[method] || 0;

      // If a request was made very recently, use deduplication with the higher TTL
      if (now - lastRequest < debounceMs) {
        if (shouldLog) {
          logInfo(`Debouncing ${method} call (${now - lastRequest}ms < ${debounceMs}ms threshold)`);
        }
      }

      // Update last request timestamp
      lastRequestTimestamps[method] = now;
    }

    return deduplicatedApiCall<T>(
      method,
      () =>
        callApiWithErrorHandling<T>(executeApiCall, {
          retry: options.retry ?? false,
          maxRetries: options.maxRetries || 3,
          reportErrors: true,
          errorContext: {
            endpoint: method,
            errorMessage: options.errorMessage || `Error calling API method: ${method}`,
            errorCategory: options.errorCategory || 'api',
            errorSeverity: options.errorSeverity || 'error',
            method,
            args,
          },
        }),
      args,
      {
        label: `API:${method}`,
        verbose: shouldLog,
        // If debounced, use a longer TTL
        ttlMs: debounceMs > 0 ? Math.max(debounceMs * 5, 2000) : undefined,
      }
    );
  }

  // Fall back to standard implementation with proper error handling
  return callApiWithErrorHandling<T>(executeApiCall, {
    retry: options.retry ?? false,
    maxRetries: options.maxRetries || 3,
    reportErrors: true,
    errorContext: {
      endpoint: method,
      errorMessage: options.errorMessage || `Error calling API method: ${method}`,
      errorCategory: options.errorCategory || 'api',
      errorSeverity: options.errorSeverity || 'error',
      method,
      args,
    },
  });
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
    // Create a callable reference to the Firebase Function using the imported functions object
    const callable = functions.httpsCallable(method);

    // Prepare payload - combine all arguments into a single object for Cloud Functions
    let payload: Record<string, unknown> = {};

    // Special handling for methods with context as first argument
    if (
      args.length > 0 &&
      typeof args[0] === 'object' &&
      args[0] !== null &&
      'uid' in args[0] &&
      'role' in args[0]
    ) {
      // Take context from first argument
      const [ctx, ...restArgs] = args;

      // If there's exactly one more argument and it's an object, use it as payload
      if (restArgs.length === 1 && typeof restArgs[0] === 'object' && restArgs[0] !== null) {
        payload = {
          context: ctx,
          ...(restArgs[0] as Record<string, unknown>),
        };
      } else if (restArgs.length > 0) {
        // Multiple arguments, create a data property with the rest
        payload = {
          context: ctx,
          data: restArgs.length === 1 ? restArgs[0] : restArgs,
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
        args,
      });

      throw mapFirebaseError(firebaseError);
    }

    // For non-Firebase errors, log and rethrow
    logError(`Error calling Firebase function ${method}:`, error);
    throw error;
  }
}

export default { callApi, callApiWithOptions };
