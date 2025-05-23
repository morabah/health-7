'use client';

/**
 * Dashboard Data Loaders
 *
 * Provides hooks for loading dashboard data efficiently using
 * batched API calls to improve performance with aggressive caching strategies.
 */

import { useQuery, useQueryClient, QueryClient, QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { executeBatchOperations, createBatchOperation } from '@/lib/batchApiUtils';
import { UserType } from '@/types/enums';
import { logInfo } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';
import { useEffect, useState, useCallback, useRef } from 'react';
import { measureAsync } from '@/lib/performance';

// Import standardized cache durations
import { CACHE_DURATIONS } from '@/lib/cacheDurations';

// Store last successful batch result to prevent refetching if user navigates away and back
let lastBatchResults: Record<string, any> = {};

/**
 * Hook to fetch all dashboard data in a single batch request
 * based on the user's role with aggressive caching strategies.
 */
export function useDashboardBatch() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastFetchTimeRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(false);

  // Prefetch dashboard data when component mounts if we don't have cached data
  useEffect(() => {
    isMountedRef.current = true;
    const cacheKey = `dashboardBatch_${user?.uid}_${user?.role}`;

    // Try to use cached data from last session if available
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData);
        const age = Date.now() - timestamp;

        // If cache is still fresh, use it
        if (age < CACHE_DURATIONS.DASHBOARD) {
          lastBatchResults[cacheKey] = data;
          // Hydrate query cache with our persistent data
          queryClient.setQueryData(['dashboardBatch', user?.uid, user?.role], data);
          const perf = trackPerformance('Used cached dashboard data');
          // Log the age separately since we can't add metadata
          logInfo(`Dashboard cache age: ${Math.round(age / 1000)}s`);
          perf.stop();
        }
      } catch (e) {
        // If parsing fails, ignore cached data
        localStorage.removeItem(cacheKey);
      }
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [user?.uid, user?.role, queryClient]);

  return useQuery({
    queryKey: ['dashboardBatch', user?.uid, user?.role],
    queryFn: async () => {
      const startTime = performance.now();
      if (!user?.uid) {
        throw new Error('User not authenticated');
      }

      const cacheKey = `dashboardBatch_${user?.uid}_${user?.role}`;

      // Create operations array based on user role
      const operations = buildDashboardOperations(user.role);

      // Measure performance of the batch operation
      const result = await measureAsync('dashboardBatchFetch', async () => {
        return executeBatchOperations(operations, { uid: user.uid, role: user.role });
      });

      // Store in our memory cache and persistent storage
      if (result && isMountedRef.current) {
        lastBatchResults[cacheKey] = result;
        lastFetchTimeRef.current = Date.now();

        // Store in localStorage for persistence between sessions
        try {
          localStorage.setItem(
            cacheKey,
            JSON.stringify({
              data: result,
              timestamp: Date.now(),
            })
          );
        } catch (e) {
          // If storage fails (e.g., quota exceeded), just log and continue
          logInfo('Failed to cache dashboard data', { error: e });
        }
      }

      return result;
    },
    enabled: !!user?.uid,
    staleTime: CACHE_DURATIONS.DASHBOARD,
    gcTime: CACHE_DURATIONS.DASHBOARD * 2,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: () => {
      // Use in-memory cached results if available
      if (user?.uid && user?.role) {
        const cacheKey = `dashboardBatch_${user?.uid}_${user?.role}`;
        return lastBatchResults[cacheKey];
      }
      return undefined;
    },
  });
}

/**
 * Build the appropriate operations for the user's role
 */
function buildDashboardOperations(role: string): Array<ReturnType<typeof createBatchOperation>> {
  // Common operations for all users
  const operations = [
    createBatchOperation('getMyUserProfile', {}, 'userProfile'),
    createBatchOperation('getMyNotifications', { limit: 5, unreadOnly: true }, 'notifications'),
  ];

  // Add role-specific operations
  if (role === UserType.PATIENT) {
    operations.push(
      createBatchOperation(
        'getMyAppointments',
        { status: 'upcoming', limit: 5 },
        'upcomingAppointments'
      ),
      createBatchOperation('getMyDashboardStats', {}, 'stats')
    );
  } else if (role === UserType.DOCTOR) {
    operations.push(
      createBatchOperation('getMyAppointments', { limit: 10 }, 'todayAppointments'),
      createBatchOperation(
        'getMyAppointments',
        { status: 'upcoming', limit: 10 },
        'upcomingAppointments'
      ),
      createBatchOperation('getDoctorAvailability', {}, 'availability'),
      createBatchOperation('getMyDashboardStats', {}, 'stats')
    );
  } else if (role === UserType.ADMIN) {
    operations.push(
      createBatchOperation('adminGetDashboardData', {}, 'adminStats'),
      createBatchOperation('adminGetAllUsers', { limit: 100, page: 1 }, 'allUsers'),
      createBatchOperation('adminGetAllDoctors', { limit: 100, page: 1 }, 'allDoctors'),
      createBatchOperation('adminGetAllAppointments', { limit: 100, page: 1 }, 'allAppointments'),
      createBatchOperation(
        'adminGetAllDoctors',
        {
          limit: 5,
          verificationStatus: 'pending',
        },
        'pendingDoctors'
      )
    );
  }

  return operations;
}

/**
 * Hook to update React Query cache with data from batch response
 * with optimized caching strategy
 */
export function useBatchResultsCache(batchData: any) {
  const queryClient = useQueryClient();
  const processedDataRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!batchData || !batchData.data) return;

    const results = batchData.data.results || batchData.data; // Adapt to actual structure
    if (!results) return;

    // Measure cache update performance
    const start = performance.now();
    const updatedKeys: string[] = [];

    // Process user profile
    if (results.userProfile?.success && !processedDataRef.current.has('userProfile')) {
      queryClient.setQueryData(['userProfile'], results.userProfile, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('userProfile');
      updatedKeys.push('userProfile');
    }

    // Process notifications
    if (results.notifications?.success && !processedDataRef.current.has('notifications')) {
      queryClient.setQueryData(['notifications'], results.notifications, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('notifications');
      updatedKeys.push('notifications');
    }

    // Process upcoming appointments
    if (
      results.upcomingAppointments?.success &&
      !processedDataRef.current.has('upcomingAppointments')
    ) {
      queryClient.setQueryData(['appointments', 'upcoming'], results.upcomingAppointments, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('upcomingAppointments');
      updatedKeys.push('upcomingAppointments');
    }

    // Process today's appointments
    if (results.todayAppointments?.success && !processedDataRef.current.has('todayAppointments')) {
      queryClient.setQueryData(['appointments', 'today'], results.todayAppointments, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('todayAppointments');
      updatedKeys.push('todayAppointments');
    }

    // Process stats
    if (results.stats?.success && !processedDataRef.current.has('stats')) {
      queryClient.setQueryData(['stats'], results.stats, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('stats');
      updatedKeys.push('stats');
    }

    // Process availability
    if (results.availability?.success && !processedDataRef.current.has('availability')) {
      queryClient.setQueryData(['availability'], results.availability, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('availability');
      updatedKeys.push('availability');
    }

    // Process pending doctors
    if (results.pendingDoctors?.success && !processedDataRef.current.has('pendingDoctors')) {
      queryClient.setQueryData(
        ['admin', 'doctors', { verificationStatus: 'pending' }],
        results.pendingDoctors,
        { updatedAt: Date.now() }
      );
      processedDataRef.current.add('pendingDoctors');
      updatedKeys.push('pendingDoctors');
    }

    // Process admin stats
    if (results.adminStats?.success && !processedDataRef.current.has('adminStats')) {
      queryClient.setQueryData(['admin', 'dashboardStats'], results.adminStats, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('adminStats');
      updatedKeys.push('adminStats');
    }

    // Process all users
    if (results.allUsers?.success && !processedDataRef.current.has('allUsers')) {
      queryClient.setQueryData(['admin', 'users', 'all'], results.allUsers, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('allUsers');
      updatedKeys.push('allUsers');
    }

    // Process all doctors
    if (results.allDoctors?.success && !processedDataRef.current.has('allDoctors')) {
      queryClient.setQueryData(['admin', 'doctors', 'all'], results.allDoctors, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('allDoctors');
      updatedKeys.push('allDoctors');
    }

    // Process all appointments
    if (results.allAppointments?.success && !processedDataRef.current.has('allAppointments')) {
      queryClient.setQueryData(['admin', 'appointments', 'all'], results.allAppointments, {
        updatedAt: Date.now(),
      });
      processedDataRef.current.add('allAppointments');
      updatedKeys.push('allAppointments');
    }

    // Log performance metrics if any updates were made
    if (updatedKeys.length > 0) {
      const end = performance.now();
      const perf = trackPerformance('Updated React Query cache from batch data');
      // Log the details separately
      logInfo('Batch data cache update details', {
        duration: `${Math.round(end - start)}ms`,
        updatedKeys,
        totalKeys: updatedKeys.length,
      });
      perf.stop();
    }
  }, [batchData, queryClient]);
}
