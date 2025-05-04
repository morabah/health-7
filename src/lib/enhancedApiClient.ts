'use client';

import { callApi } from './apiClient';
import { cacheKeys, cacheManager } from './queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';

// Type for different entity types
type EntityType = 'user' | 'doctor' | 'appointment' | 'notification';

/**
 * Enhanced API client that uses React Query for data fetching and caching
 */

/**
 * Get data with caching via React Query
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
  return useQuery<TData, TError>({
    queryKey,
    queryFn: async () => {
      // Try to get data from the cache first
      const cachedData = cacheManager.getQueryData<TData>(queryKey);
      if (cachedData) {
        return cachedData;
      }
      return callApi<TData>(method, ...args);
    },
    ...options,
  });
}

/**
 * Mutation with automatic cache invalidation
 * @param method API method name
 * @param invalidateEntities Entities to invalidate after successful mutation
 * @param options Additional React Query options
 */
export function useApiMutation<TData, TVariables, TError = Error>(
  method: string,
  invalidateEntities: { type: EntityType; id?: string }[] = [],
  options: Omit<UseMutationOptions<TData, TError, TVariables>, 'mutationFn'> = {}
) {
  const queryClient = useQueryClient();
  
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      return callApi<TData>(method, variables);
    },
    onSuccess: async (data, variables, context) => {
      // Handle all cache invalidations
      for (const entity of invalidateEntities) {
        switch (entity.type) {
          case 'user':
            await cacheManager.invalidateUserData(entity.id);
            break;
          case 'doctor':
            await cacheManager.invalidateDoctorData(entity.id);
            break;
          case 'appointment':
            await cacheManager.invalidateAppointmentData(entity.id);
            break;
          case 'notification':
            await queryClient.invalidateQueries({ 
              queryKey: cacheKeys.notifications(entity.id) 
            });
            break;
        }
      }
      
      // Call the original onSuccess if provided
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
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
      { type: 'appointment' },
      { type: 'doctor' },
      { type: 'notification' }
    ],
    options
  );
}

// Cancel appointment mutation
export function useCancelAppointment(options = {}) {
  return useApiMutation(
    'cancelAppointment',
    [
      { type: 'appointment' },
      { type: 'notification' }
    ],
    options
  );
}

// Update user profile mutation
export function useUpdateProfile(options = {}) {
  return useApiMutation(
    'updateMyUserProfile',
    [
      { type: 'user' },
    ],
    options
  );
} 