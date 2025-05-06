'use client';

import { QueryClient, QueryClientProvider, dehydrate, hydrate } from '@tanstack/react-query';
import type { ReactNode} from 'react';
import { createElement, useRef, useEffect } from 'react';
import { enhancedCache, CacheCategory } from './cacheManager';
import { logInfo } from './logger';

// Create a client with enhanced caching options
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
  doctorAvailability: (doctorId?: string, date?: string) => 
    ['doctorAvailability', doctorId, date],
  doctorSchedule: (doctorId?: string) => ['doctorSchedule', doctorId],
  
  // Appointment related keys
  appointment: (appointmentId?: string) => ['appointment', appointmentId],
  appointments: (userId?: string, role?: string) => ['appointments', userId, role],
  availableSlots: (doctorId?: string, date?: string) => 
    ['availableSlots', doctorId, date],
  
  // Notification related keys
  notifications: (userId?: string) => ['notifications', userId],
};

// Request deduplication tracking
const pendingRequeries = new Map<string, Promise<unknown>>();

// Cache manager with utility functions
export const cacheManager = {
  // Invalidate all queries with the given prefix
  invalidateQueries: async (prefix: string[]) => {
    await queryClient.invalidateQueries({ queryKey: prefix });
  },
  
  // Set data in cache without fetching
  setQueryData: <T>(key: unknown[], data: T) => {
    queryClient.setQueryData(key, data);
    
    // Also store in enhanced cache for cross-query reuse
    const cacheKey = key.map(k => 
      typeof k === 'object' ? JSON.stringify(k) : String(k)
    ).join('::');
    
    // Determine category based on key
    let category = CacheCategory.OTHER;
    const keyStr = String(key[0] || '');
    
    if (keyStr.includes('user')) category = CacheCategory.USERS;
    else if (keyStr.includes('doctor')) category = CacheCategory.DOCTORS;
    else if (keyStr.includes('appointment')) category = CacheCategory.APPOINTMENTS;
    else if (keyStr.includes('notification')) category = CacheCategory.NOTIFICATIONS;
    
    enhancedCache.set(category, cacheKey, data, { ttl: 3 * 60 * 1000 });
  },
  
  // Get data from cache without fetching
  getQueryData: <T>(key: unknown[]): T | undefined => {
    // Try React Query cache first
    const data = queryClient.getQueryData<T>(key);
    if (data) return data;
    
    // Fall back to enhanced cache if not found
    const cacheKey = key.map(k => 
      typeof k === 'object' ? JSON.stringify(k) : String(k)
    ).join('::');
    
    // Try all categories
    for (const category of Object.values(CacheCategory)) {
      const cachedData = enhancedCache.get<T>(category, cacheKey);
      if (cachedData) {
        // If found in enhanced cache, populate React Query cache too
        queryClient.setQueryData(key, cachedData);
        return cachedData;
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
    enhancedCache.clearAll();
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
  }
};

export { queryClient };

// Provider wrapper component with persistance
export function QueryProvider({ children }: { children: ReactNode }) {
  // Only sync with enhanced cache once on mount
  useEffect(() => {
    // Periodically sync data between caches
    const syncInterval = setInterval(() => {
      // Check query cache for refreshed data
      const queryCache = queryClient.getQueryCache();
      const queryCacheSize = queryCache.getAll().length;
      
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