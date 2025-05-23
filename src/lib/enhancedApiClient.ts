'use client';

import { callApi } from './apiClient';
import { cacheKeys, cacheManager } from './queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { logError } from './logger';

/**
 * Enhanced API client that uses React Query for data fetching and caching
 */

// Define type for batch queue item
interface BatchQueueItem<T = unknown> {
  params: unknown[];
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
  timestamp: number;
}

// Batch queue for common high-frequency API calls
const batchQueues: Record<string, BatchQueueItem<unknown>[]> = {
  notifications: [],
  doctors: [],
  appointments: [],
  users: [],
};

// Track timers for each batch type
const batchTimers: Record<string, NodeJS.Timeout | null> = {
  notifications: null,
  doctors: null,
  appointments: null,
  users: null,
};

// Configure batch timing
const BATCH_DELAYS: Record<string, number> = {
  notifications: 100, // 100ms
  doctors: 150, // 150ms
  appointments: 150, // 150ms
  users: 200, // 200ms
};

// Map API methods to batch queues
const METHOD_TO_BATCH: Record<string, string> = {
  getMyNotifications: 'notifications',
  getAllNotifications: 'notifications',
  findDoctors: 'doctors',
  getAllDoctors: 'doctors',
  getDoctorPublicProfile: 'doctors',
  getMyAppointments: 'appointments',
  getPatientAppointments: 'appointments',
  getDoctorAppointments: 'appointments',
  getAvailableSlots: 'appointments',
  getAllUsers: 'users',
  getMyUserProfile: 'users',
  getUserProfile: 'users',
};

/**
 * Process a batch of queued API calls
 */
function processBatch(batchType: string) {
  const queue = batchQueues[batchType];
  if (!queue || queue.length === 0) return;

  // Clear the timer
  if (batchTimers[batchType]) {
    clearTimeout(batchTimers[batchType]!);
    batchTimers[batchType] = null;
  }

  // Create a copy of the queue and clear the original
  const batchToProcess = [...queue];
  batchQueues[batchType] = [];

  // Group by method name to process each method separately
  const batchesByMethod: Record<string, BatchQueueItem<unknown>[]> = {};

  for (const item of batchToProcess) {
    const methodName = item.params[0] as string;
    if (!batchesByMethod[methodName]) {
      batchesByMethod[methodName] = [];
    }
    batchesByMethod[methodName].push(item);
  }

  // Process each method batch
  for (const [method, items] of Object.entries(batchesByMethod)) {
    processBatchForMethod(method, items);
  }
}

/**
 * Process a batch of queued API calls for a specific method
 */
async function processBatchForMethod(method: string, batch: BatchQueueItem<unknown>[]) {
  if (batch.length === 0) return;

  try {
    // For single item batches, just process normally
    if (batch.length === 1) {
      const item = batch[0];
      const result = await callApi(method, ...item.params.slice(1));
      item.resolve(result);
      return;
    }

    // For multiple items, process according to method
    if (method === 'getMyNotifications' || method === 'getAllNotifications') {
      // Special case for notifications - we can make a single call
      // and distribute results to all requesters
      const firstItem = batch[0];
      const result = await callApi(method, ...firstItem.params.slice(1));

      // Resolve all promises with the same result
      for (const item of batch) {
        item.resolve(result);
      }
    } else {
      // For other methods, process each item individually
      // but avoid thundering herd by adding small delays
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        try {
          const result = await callApi(method, ...item.params.slice(1));
          item.resolve(result);
        } catch (error) {
          item.reject(error);
        }

        // Add a small delay between calls except for the last one
        if (i < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
  } catch (error) {
    // If batch processing fails, reject all promises
    logError('Batch processing failed', { method, error, batchSize: batch.length });
    for (const item of batch) {
      item.reject(error);
    }
  }
}

/**
 * Queue an API call for batching
 */
function queueBatchedCall<T>(method: string, params: unknown[]): Promise<T> {
  const batchType = METHOD_TO_BATCH[method];

  // If method isn't configured for batching, execute directly
  if (!batchType || !batchQueues[batchType]) {
    return callApi<T>(method, ...params);
  }

  return new Promise<T>((resolve, reject) => {
    // Add to queue
    batchQueues[batchType].push({
      params: [method, ...params],
      resolve: resolve as (value: unknown) => void,
      reject,
      timestamp: Date.now(),
    });

    // Set a timer to process the batch if not already set
    if (!batchTimers[batchType]) {
      batchTimers[batchType] = setTimeout(() => {
        processBatch(batchType);
      }, BATCH_DELAYS[batchType] || 150);
    }
  });
}

/**
 * Enhanced API client that automatically handles batching and caching
 * for high-frequency API calls
 */
export function useEnhancedApi() {
  /**
   * Call API with automatic batching for supported methods
   */
  const callEnhancedApi = useCallback(<T>(method: string, ...params: unknown[]): Promise<T> => {
    // Check if this method should be batched
    if (METHOD_TO_BATCH[method]) {
      return queueBatchedCall<T>(method, params);
    }

    // Default to regular API call
    return callApi<T>(method, ...params);
  }, []);

  return {
    callApi: callEnhancedApi,
  };
}

// Also export a non-hook version for server components
export const enhancedApiCall = <T>(method: string, ...params: unknown[]): Promise<T> => {
  // Check if this method should be batched
  if (METHOD_TO_BATCH[method]) {
    return queueBatchedCall<T>(method, params);
  }

  // Default to regular API call
  return callApi<T>(method, ...params);
};

/**
 * Get data with advanced caching via React Query
 * @param method API method name
 * @param queryKey Cache key array
 * @param args Arguments to pass to the API method
 * @param options Additional React Query options
 */
export function useApiQuery<TData, TError = Error>(
  method: string,
  queryKey: unknown[],
  args: unknown[] = [],
  options: Omit<UseQueryOptions<TData, TError, TData>, 'queryKey' | 'queryFn'> = {}
) {
  // Create default options with improved caching
  const defaultOptions = {
    staleTime: 5 * 60 * 1000, // 5 minutes by default
    cacheTime: 10 * 60 * 1000, // 10 minutes by default
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
  };

  // Merge with user-provided options, but allow overrides
  const mergedOptions = { ...defaultOptions, ...options };

  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      try {
        // Try to get data from the cache first
        const cachedData = cacheManager.getQueryData<TData>(queryKey);
        if (cachedData) {
          // Check if we should still use cached data
          if (!mergedOptions.refetchOnMount && !mergedOptions.refetchOnWindowFocus) {
            return cachedData;
          }
        }

        // Get the data from the API
        // Use batching if appropriate for this method
        const canBatch = ['getUsers', 'getDoctors', 'getNotifications'].includes(method);

        const result = canBatch
          ? await queueBatchedCall<TData>(method, args)
          : await callApi<TData>(method, ...args);

        return result;
      } catch (error) {
        logError(`API query error in ${method}:`, error);
        throw error;
      }
    },
    ...mergedOptions,
  });
}

/**
 * Mutation with cache invalidation via React Query
 * @param method API method name
 * @param invalidateQueries Array of query keys to invalidate on success
 * @param options Additional React Query options
 */
export function useApiMutation<TData, TVariables, TError = Error>(
  method: string,
  invalidateQueries:
    | Array<Array<string | unknown>>
    | ((data: TData) => Array<Array<string | unknown>>) = [],
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: async variables => {
      // We assume variables is the args array for the API call
      return callApi<TData>(method, ...(Array.isArray(variables) ? variables : [variables]));
    },
    onSuccess: async (data, variables, context) => {
      // Call the original onSuccess if it exists
      if (options.onSuccess) {
        await options.onSuccess(data, variables, context);
      }

      // Invalidate queries
      const queriesToInvalidate =
        typeof invalidateQueries === 'function' ? invalidateQueries(data) : invalidateQueries;

      // Invalidate each query
      for (const queryKey of queriesToInvalidate) {
        await cacheManager.invalidateQueries(queryKey as Array<string>);
      }
    },
    ...options,
  });
}

/**
 * Prefetch data and store in cache
 * @param method API method name
 * @param queryKey Cache key array
 * @param args Arguments to pass to the API method (context should be first argument if required)
 */
export async function prefetchApiQuery<TData>(
  method: string,
  queryKey: unknown[],
  args: unknown[] = []
): Promise<void> {
  await cacheManager.prefetchQuery<TData>(queryKey, async () => {
    // For public API methods that can work without authentication,
    // ensure proper context handling
    const publicMethods = ['findDoctors', 'getDoctorPublicProfile', 'getAvailableSlots'];

    if (publicMethods.includes(method)) {
      // For public methods, ensure the first argument is a proper context or undefined
      if (args.length === 0) {
        // No arguments provided, call with undefined context
        return callApi<TData>(method, undefined);
      } else if (args.length === 1) {
        // One argument provided, assume it's the payload and add undefined context
        return callApi<TData>(method, undefined, args[0]);
      } else {
        // Multiple arguments, check if first one is a valid context
        const [potentialContext, ...restArgs] = args;
        if (
          !potentialContext ||
          typeof potentialContext !== 'object' ||
          !('uid' in potentialContext)
        ) {
          // First argument is not a valid context, use undefined context and treat first arg as payload
          return callApi<TData>(method, undefined, ...restArgs);
        } else {
          // First argument looks like a valid context, use as-is
          return callApi<TData>(method, ...args);
        }
      }
    }

    // For non-public methods, use arguments as-is
    return callApi<TData>(method, ...args);
  });
}

/**
 * Cache and preload hook - use on key pages to preload related data
 * @param preloads Array of preload configurations
 */
export function usePreloadData(
  preloads: {
    method: string;
    queryKey: unknown[];
    args: unknown[];
    enabled?: boolean;
  }[]
) {
  useEffect(() => {
    preloads.forEach(({ method, queryKey, args, enabled = true }) => {
      if (enabled) {
        prefetchApiQuery(method, queryKey, args).catch(err =>
          logError(`Error preloading ${method}:`, err)
        );
      }
    });
  }, [preloads]);
}

/**
 * Utility hooks for common data fetching patterns
 */

// Get current user profile
export function useMyUserProfile(options = {}) {
  return useApiQuery('getMyUserProfile', cacheKeys.myUserProfile(), [], options);
}

// Get user by ID
export function useUserProfile(userId: string, options = {}) {
  return useApiQuery('getUserProfile', cacheKeys.userProfile(userId), [{ userId }], options);
}

// Get doctor profile
export function useDoctorProfile(doctorId: string, options = {}) {
  return useApiQuery('getDoctorPublicProfile', cacheKeys.doctor(doctorId), [{ doctorId }], options);
}

// Get available slots
export function useAvailableSlots(doctorId: string, date: string, options = {}) {
  return useApiQuery(
    'getAvailableSlots',
    cacheKeys.availableSlots(doctorId, date),
    [{ doctorId, date }],
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      ...options,
    }
  );
}

// Get my appointments
export function useMyAppointments(options = {}) {
  return useApiQuery('getMyAppointments', cacheKeys.appointments(), [], options);
}

// Get my notifications
export function useMyNotifications(options = {}) {
  return useApiQuery('getMyNotifications', cacheKeys.notifications(), [], {
    refetchInterval: 30000, // 30 seconds
    ...options,
  });
}

// Book appointment mutation
export function useBookAppointment(options = {}) {
  return useApiMutation(
    'bookAppointment',
    [cacheKeys.appointments(), cacheKeys.doctors(), cacheKeys.notifications()],
    options
  );
}

// Cancel appointment mutation
export function useCancelAppointment(options = {}) {
  return useApiMutation(
    'cancelAppointment',
    [cacheKeys.appointments(), cacheKeys.notifications()],
    options
  );
}

// Update user profile mutation
export function useUpdateProfile(options = {}) {
  return useApiMutation('updateMyUserProfile', [cacheKeys.myUserProfile()], options);
}
