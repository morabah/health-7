'use client';

import { callApi } from './apiClient';
import { cacheKeys, cacheManager } from './queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { useEffect } from 'react';
import { logInfo, logError } from './logger';

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

// Define type for API request batcher
interface BatchQueue {
  [key: string]: BatchQueueItem[];
}

// Batch API request queue
const batchQueue: BatchQueue = {};

// Current batch timers
const batchTimers: Record<string, NodeJS.Timeout> = {};

// Default batch window (ms)
const DEFAULT_BATCH_WINDOW = 50;

/**
 * Batch API requests for the same method call
 * @param method API method to batch
 * @param params Parameters for this specific call
 * @param batchWindow Time window to collect batches
 */
function batchApiCall<T>(
  method: string, 
  params: unknown[],
  batchWindow = DEFAULT_BATCH_WINDOW
): Promise<T> {
  // Create a new promise that will be resolved when the batch is processed
  return new Promise<T>((resolve, reject) => {
    // Initialize the batch queue for this method if it doesn't exist
    if (!batchQueue[method]) {
      batchQueue[method] = [];
    }
    
    // Add this request to the queue
    batchQueue[method].push({
      params,
      resolve: resolve as (value: unknown) => void,
      reject,
      timestamp: Date.now()
    });
    
    // Clear any existing batch timer for this method
    if (batchTimers[method]) {
      clearTimeout(batchTimers[method]);
    }
    
    // Set a new timer to process the batch
    batchTimers[method] = setTimeout(() => {
      processBatch(method);
    }, batchWindow);
  });
}

// Define type for batch result
interface BatchResult {
  index: number;
  result: unknown | null;
  error: unknown | null;
}

/**
 * Process a batch of API calls for the same method
 * @param method API method to process batch for
 */
async function processBatch(method: string): Promise<void> {
  // Get and clear the queue for this method
  const queue = batchQueue[method] || [];
  batchQueue[method] = [];
  delete batchTimers[method];
  
  if (queue.length === 0) return;
  
  if (queue.length === 1) {
    // If only one request, just make a normal API call
    try {
      const result = await callApi(method, ...queue[0].params);
      queue[0].resolve(result);
    } catch (error) {
      queue[0].reject(error);
    }
    return;
  }
  
  // TODO: Implement actual batching here, depending on your backend API support
  // For now, we'll just make individual calls in parallel
  
  const batchStart = Date.now();
  logInfo(`Processing batch of ${queue.length} calls for ${method}`);
  
  // Make all the API calls in parallel
  const promises = queue.map(async (request, index) => {
    try {
      return {
        index,
        result: await callApi(method, ...request.params),
        error: null
      } as BatchResult;
    } catch (error) {
      return {
        index,
        result: null,
        error
      } as BatchResult;
    }
  });
  
  // Wait for all calls to complete
  const results = await Promise.all(promises);
  
  // Process the results and resolve/reject the promises
  results.forEach(({ index, result, error }) => {
    if (error) {
      queue[index].reject(error);
    } else {
      queue[index].resolve(result);
    }
  });
  
  const batchEnd = Date.now();
  logInfo(`Completed batch of ${queue.length} calls for ${method} in ${batchEnd - batchStart}ms`);
}

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
          ? await batchApiCall<TData>(method, args)
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
  invalidateQueries: Array<Array<string | unknown>> | ((data: TData) => Array<Array<string | unknown>>) = [],
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      // We assume variables is the args array for the API call
      return callApi<TData>(method, ...(Array.isArray(variables) ? variables : [variables]));
    },
    onSuccess: async (data, variables, context) => {
      // Call the original onSuccess if it exists
      if (options.onSuccess) {
        await options.onSuccess(data, variables, context);
      }
      
      // Invalidate queries
      const queriesToInvalidate = typeof invalidateQueries === 'function'
        ? invalidateQueries(data)
        : invalidateQueries;
      
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
 * @param args Arguments to pass to the API method
 */
export async function prefetchApiQuery<TData>(
  method: string,
  queryKey: unknown[],
  args: unknown[] = []
): Promise<void> {
  await cacheManager.prefetchQuery<TData>(queryKey, async () => {
    return callApi<TData>(method, ...args);
  });
}

/**
 * Cache and preload hook - use on key pages to preload related data
 * @param preloads Array of preload configurations
 */
export function usePreloadData(preloads: {
  method: string;
  queryKey: unknown[];
  args: unknown[];
  enabled?: boolean;
}[]) {
  useEffect(() => {
    preloads.forEach(({ method, queryKey, args, enabled = true }) => {
      if (enabled) {
        prefetchApiQuery(method, queryKey, args)
          .catch(err => logError(`Error preloading ${method}:`, err));
      }
    });
  }, [preloads]);
}

/**
 * Utility hooks for common data fetching patterns
 */

// Get current user profile
export function useMyUserProfile(options = {}) {
  return useApiQuery(
    'getMyUserProfile',
    cacheKeys.myUserProfile(),
    [],
    options
  );
}

// Get user by ID
export function useUserProfile(userId: string, options = {}) {
  return useApiQuery(
    'getUserProfile',
    cacheKeys.userProfile(userId),
    [{ userId }],
    options
  );
}

// Get doctor profile
export function useDoctorProfile(doctorId: string, options = {}) {
  return useApiQuery(
    'getDoctorPublicProfile',
    cacheKeys.doctor(doctorId),
    [{ doctorId }],
    options
  );
}

// Get available slots
export function useAvailableSlots(doctorId: string, date: string, options = {}) {
  return useApiQuery(
    'getAvailableSlots',
    cacheKeys.availableSlots(doctorId, date),
    [{ doctorId, date }],
    { 
      staleTime: 2 * 60 * 1000, // 2 minutes
      ...options 
    }
  );
}

// Get my appointments
export function useMyAppointments(options = {}) {
  return useApiQuery(
    'getMyAppointments',
    cacheKeys.appointments(),
    [],
    options
  );
}

// Get my notifications
export function useMyNotifications(options = {}) {
  return useApiQuery(
    'getMyNotifications',
    cacheKeys.notifications(),
    [],
    { 
      refetchInterval: 30000, // 30 seconds
      ...options 
    }
  );
}

// Book appointment mutation
export function useBookAppointment(options = {}) {
  return useApiMutation(
    'bookAppointment',
    [
      cacheKeys.appointments(),
      cacheKeys.doctors(),
      cacheKeys.notifications()
    ],
    options
  );
}

// Cancel appointment mutation
export function useCancelAppointment(options = {}) {
  return useApiMutation(
    'cancelAppointment',
    [
      cacheKeys.appointments(),
      cacheKeys.notifications()
    ],
    options
  );
}

// Update user profile mutation
export function useUpdateProfile(options = {}) {
  return useApiMutation(
    'updateMyUserProfile',
    [
      cacheKeys.myUserProfile()
    ],
    options
  );
} 