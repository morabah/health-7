/**
 * React Query Client with Extended Cache Management
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createElement, useEffect } from 'react';
import { browserCache, CacheCategory } from './browserCacheManager';
import { logInfo } from './logger';

// Use a reference to access while avoiding circular imports
let enhancedCacheRef: unknown = null;

// Create a fresh Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 3 * 60 * 1000, // 3 minutes (reduced from 5 minutes)
      gcTime: 5 * 60 * 1000, // 5 minutes (reduced from 10 minutes)
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: false, // changed from 'always' to false
      refetchOnReconnect: false, // added to reduce unnecessary refetches
    },
  },
});

// Cache key builder helper
export const cacheKeys = {
  // User related keys
  user: (userId?: string) => ['user', userId],
  users: (filters?: Record<string, unknown>) => ['users', filters],
  userProfile: (userId?: string) => ['userProfile', userId],
  myUserProfile: () => ['myUserProfile'],

  // Doctor related keys
  doctor: (doctorId?: string) => ['doctor', doctorId],
  doctors: (filters?: Record<string, unknown>) => ['doctors', filters],
  doctorAvailability: (doctorId?: string, date?: string) => ['doctorAvailability', doctorId, date],
  doctorSchedule: (doctorId?: string) => ['doctorSchedule', doctorId],

  // Appointment related keys
  appointment: (appointmentId?: string) => ['appointment', appointmentId],
  appointments: (userId?: string, role?: string) => ['appointments', userId, role],
  availableSlots: (doctorId?: string, date?: string) => ['availableSlots', doctorId, date],

  // Notification related keys
  notifications: (userId?: string) => ['notifications', userId],
};

// Request deduplication tracking
const pendingRequeries = new Map<string, Promise<unknown>>();

// Function to set the enhancedCache reference to avoid circular dependencies
export function setEnhancedCacheRef(cacheInstance: unknown) {
  enhancedCacheRef = cacheInstance;
}

// Cache manager with utility functions
export const cacheManager = {
  // Invalidate all queries with the given prefix
  invalidateQueries: async (prefix: string[]) => {
    await queryClient.invalidateQueries({ queryKey: prefix });
  },

  // Set data in cache without fetching
  setQueryData: <T>(key: unknown[], data: T) => {
    queryClient.setQueryData(key, data);

    // Also store in enhanced cache for cross-query reuse if available
    if (
      enhancedCacheRef &&
      typeof enhancedCacheRef === 'object' &&
      'set' in enhancedCacheRef &&
      typeof enhancedCacheRef.set === 'function'
    ) {
      const cacheKey = key
        .map(k => (typeof k === 'object' ? JSON.stringify(k) : String(k)))
        .join('::');

      // Determine category based on key
      let category = CacheCategory.OTHER;
      const keyStr = String(key[0] || '');

      if (keyStr.includes('user')) category = CacheCategory.USERS;
      else if (keyStr.includes('doctor')) category = CacheCategory.DOCTORS;
      else if (keyStr.includes('appointment')) category = CacheCategory.APPOINTMENTS;
      else if (keyStr.includes('notification')) category = CacheCategory.NOTIFICATIONS;

      enhancedCacheRef.set(category, cacheKey, data, { ttl: 3 * 60 * 1000 });
    }
  },

  // Utility to set doctor data specifically
  setDoctorData: (doctorId: string, data: unknown) => {
    const key = cacheKeys.doctor(doctorId);
    queryClient.setQueryData(key, { success: true, doctor: data });

    // Also cache in enhanced cache if available
    if (
      enhancedCacheRef &&
      typeof enhancedCacheRef === 'object' &&
      'set' in enhancedCacheRef &&
      typeof enhancedCacheRef.set === 'function'
    ) {
      const cacheKey = doctorId ? `doctor-${doctorId}` : '';
      enhancedCacheRef.set(CacheCategory.DOCTORS, cacheKey, data);
    } else {
      // Fall back to browser cache if enhanced cache not yet available
      browserCache.setDoctor(doctorId, data);
    }
  },

  // Get data from cache without fetching
  getQueryData: <T>(key: unknown[]): T | undefined => {
    // Try React Query cache first
    const data = queryClient.getQueryData<T>(key);
    if (data) return data;

    // Fall back to enhanced cache if not found and available
    if (
      enhancedCacheRef &&
      typeof enhancedCacheRef === 'object' &&
      'get' in enhancedCacheRef &&
      typeof enhancedCacheRef.get === 'function'
    ) {
      const cacheKey = key
        .map(k => (typeof k === 'object' ? JSON.stringify(k) : String(k)))
        .join('::');

      // Try all categories
      for (const category of Object.values(CacheCategory)) {
        const cachedData = enhancedCacheRef.get(category, cacheKey) as T | undefined;
        if (cachedData) {
          // If found in enhanced cache, populate React Query cache too
          queryClient.setQueryData(key, cachedData);
          return cachedData;
        }
      }
    }

    return undefined;
  },

  // Prefetch and cache data with deduplication
  prefetchQuery: async <T>(key: unknown[], queryFn: () => Promise<T>) => {
    const cacheKey = JSON.stringify(key);

    // Check if this exact query is already in flight
    const pendingQuery = pendingRequeries.get(cacheKey) as Promise<T> | undefined;
    if (pendingQuery) {
      return pendingQuery;
    }

    // Create a new query and track it
    const promise = queryClient.prefetchQuery({
      queryKey: key,
      queryFn,
      staleTime: 3 * 60 * 1000, // 3 minutes
    });

    // Store the pending query
    pendingRequeries.set(cacheKey, promise);

    // Clean up when done
    promise.finally(() => {
      pendingRequeries.delete(cacheKey);
    });

    return promise;
  },

  // Clear entire cache
  clearCache: () => {
    queryClient.clear();
    if (
      enhancedCacheRef &&
      typeof enhancedCacheRef === 'object' &&
      'clearAll' in enhancedCacheRef &&
      typeof enhancedCacheRef.clearAll === 'function'
    ) {
      enhancedCacheRef.clearAll();
    }
  },

  // Invalidate common entity groups
  invalidateUserData: async (userId?: string) => {
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: ['user', userId] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['user'] });
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  },

  invalidateAppointmentData: async (userId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    if (userId) {
      await queryClient.invalidateQueries({ queryKey: ['appointments', userId] });
    }
  },

  invalidateDoctorData: async (doctorId?: string) => {
    if (doctorId) {
      await queryClient.invalidateQueries({ queryKey: ['doctor', doctorId] });
    } else {
      await queryClient.invalidateQueries({ queryKey: ['doctors'] });
    }
  },
};

export { queryClient };

// Provider wrapper component with persistance
export function QueryProvider({ children }: { children: ReactNode }) {
  // Only sync with enhanced cache once on mount
  useEffect(() => {
    // Initialize browser cache
    if (typeof window !== 'undefined') {
      // Initialize browser cache
      browserCache.init();

      // Make cache manager accessible to window for debugging/testing
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__REACT_QUERY_CACHE__ = cacheManager;
    }

    // Periodically sync data between caches
    const syncInterval = setInterval(() => {
      // Check query cache for refreshed data
      const queryCache = queryClient.getQueryCache();
      const queryCacheSize = queryCache.getAll().length;

      // Prune expired browser cache entries every 10 minutes
      if (typeof window !== 'undefined') {
        browserCache.prune();
      }

      // Limit logging to prevent console noise
      logInfo(`Syncing ${queryCacheSize} queries with enhanced cache`);
    }, 30000); // Every 30 seconds

    // Clean up
    return () => {
      clearInterval(syncInterval);
    };
  }, []);

  return createElement(QueryClientProvider, { client: queryClient }, children);
}
