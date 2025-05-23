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
import { z } from 'zod';
import { cacheKeys, cacheManager } from './queryClient';
import { UserType } from '@/types/enums';
import { deduplicatedApiCall } from './apiDeduplication';
// Note: Validation temporarily disabled for development
// import {
//   validateApiResponse,
//   createApiResponseSchema,
//   isApiErrorResponse,
//   type ZodSchema,
// } from './validation/validateApiResponse';

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
 * @returns Promise with the validated API response data
 */
export async function callApi<T = unknown>(method: string, ...args: unknown[]): Promise<T> {
  return callApiWithOptions<T>(method, {}, ...args);
}

/**
 * Call an API function with options and arguments
 *
 * @param method - The API method name to call
 * @param options - Options for the API call including validation schema
 * @param args - Arguments to pass to the API method
 * @returns Promise with the validated API response data
 */
export interface CallApiWithOptions<T = unknown> extends CallApiOptions {
  /**
   * Zod schema to validate the API response against
   * If provided, the response will be validated before being returned
   */
  responseSchema?: any; // Temporarily any to fix build

  /**
   * Whether to validate the response against the schema
   * @default true
   */
  validateResponse?: boolean;

  /**
   * Custom error message for validation failures
   */
  validationErrorMessage?: string;
}

export async function callApiWithOptions<T = unknown>(
  method: string,
  options: CallApiWithOptions<T> = {},
  ...args: unknown[]
): Promise<T> {
  // Only log non-low-noise methods to prevent console flooding
  const shouldLog = !LOW_NOISE_METHODS.includes(method);
  const {
    responseSchema,
    validateResponse = true,
    validationErrorMessage,
    ...apiOptions
  } = options;

  if (shouldLog) {
    // Log API call for debugging
    logInfo(`[callApi] Calling ${method} with args:`, args);
  }

  // Check if method needs mapping (e.g., login -> signIn)
  const mappedMethod = METHOD_MAPPING[method] || method;

  try {
    // Get the appropriate API implementation based on configuration
    const result = isFirebaseEnabled
      ? await callFirebaseFunction(method, ...args)
      : await (api as ApiMethods)[mappedMethod](...args);

    if (shouldLog) {
      logInfo(`[callApi] ${method} response:`, result);
    }

    // Validate response if schema is provided and validation is enabled
    // Note: Response validation temporarily disabled for development
    if (validateResponse && responseSchema) {
      // TODO: Re-implement response validation
      logInfo(`Response validation temporarily skipped for ${method}`);
    }

    return result as T;
  } catch (error) {
    // Handle standard API error response format
    if (error && typeof error === 'object' && 'error' in error) {
      const apiError = error as { error: { message: string; code?: string; details?: unknown } };
      throw new ApiError(apiError.error.message, {
        code: apiError.error.code || 'API_ERROR',
        context: apiError.error.details as Record<string, unknown>,
        statusCode: 400, // Default status code for API errors
      });
    }

    // Re-throw the error if it's already an instance of AppError
    if (error instanceof Error && 'category' in error) {
      throw error;
    }

    // Wrap other errors in a generic API error
    throw new ApiError('An unexpected error occurred while making the API request', {
      code: 'API_REQUEST_FAILED',
      context: { originalError: error },
      statusCode: 500,
    });
  }
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
