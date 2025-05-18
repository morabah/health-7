/**
 * Appointment Cache Utilities
 * 
 * This module provides utilities for caching appointment data to improve performance
 * using a stale-while-revalidate pattern. This approach shows cached data immediately
 * while fetching fresh data in the background.
 */

import { Appointment } from '@/types/schemas';
import { AppointmentStatus } from '@/types/enums';
import { logInfo, logError } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';

// Cache storage for appointments
interface AppointmentCache {
  data: Appointment[];
  timestamp: number;
  expiryTime: number;
}

// Default cache expiry time (5 minutes)
const DEFAULT_CACHE_EXPIRY = 5 * 60 * 1000;

// In-memory cache store
const appointmentCacheStore: Record<string, AppointmentCache> = {};

/**
 * Generates a cache key based on filters
 */
export const generateAppointmentCacheKey = (
  userId?: string, 
  status?: string, 
  dateRange?: { start?: Date; end?: Date }
): string => {
  const statusKey = status || 'all';
  const dateKey = dateRange ? 
    `${dateRange.start?.toISOString().split('T')[0] || 'any'}-${dateRange.end?.toISOString().split('T')[0] || 'any'}` : 
    'all-dates';
  const userKey = userId || 'all-users';
  
  return `appointments-${userKey}-${statusKey}-${dateKey}`;
};

/**
 * Caches appointment data with the specified key
 */
export const cacheAppointments = (
  key: string, 
  data: Appointment[], 
  expiryTime: number = DEFAULT_CACHE_EXPIRY
): void => {
  appointmentCacheStore[key] = {
    data,
    timestamp: Date.now(),
    expiryTime
  };
  
  logInfo('AppointmentCache:Stored', {
    key,
    count: data.length,
    expiryTimeMs: expiryTime
  });
};

/**
 * Retrieves cached appointment data if available and not expired
 */
export const getCachedAppointments = (key: string): { data: Appointment[] | null; isFresh: boolean } => {
  const perf = trackPerformance('getCachedAppointments');
  const cache = appointmentCacheStore[key];
  
  if (!cache) {
    perf.stop();
    return { data: null, isFresh: false };
  }
  
  const now = Date.now();
  const age = now - cache.timestamp;
  const isFresh = age < cache.expiryTime;
  
  logInfo('AppointmentCache:Retrieved', {
    key,
    age: `${Math.round(age / 1000)}s`,
    isFresh,
    count: cache.data.length
  });
  
  perf.stop();
  return { 
    data: cache.data,
    isFresh
  };
};

/**
 * Invalidates specific appointment cache entries or all entries
 */
export const invalidateAppointmentCache = (key?: string): void => {
  if (key) {
    delete appointmentCacheStore[key];
    logInfo('AppointmentCache:Invalidated', { key });
  } else {
    // Clear all appointment caches
    Object.keys(appointmentCacheStore).forEach(cacheKey => {
      delete appointmentCacheStore[cacheKey];
    });
    logInfo('AppointmentCache:InvalidatedAll');
  }
};

/**
 * Fetches appointments with caching support
 * Uses stale-while-revalidate pattern:
 * 1. Returns cached data immediately if available
 * 2. Fetches fresh data in the background
 * 3. Updates the cache with fresh data
 */
export const fetchAppointmentsWithCache = async (
  fetchFn: () => Promise<Appointment[]>,
  cacheKey: string,
  options: {
    forceRefresh?: boolean;
    expiryTime?: number;
  } = {}
): Promise<{ data: Appointment[]; fromCache: boolean }> => {
  const perf = trackPerformance('fetchAppointmentsWithCache');
  const { forceRefresh = false, expiryTime = DEFAULT_CACHE_EXPIRY } = options;
  
  // Check cache first unless forced refresh
  if (!forceRefresh) {
    const { data: cachedData, isFresh } = getCachedAppointments(cacheKey);
    
    if (cachedData) {
      // If we have cached data, return it immediately
      const result = { data: cachedData, fromCache: true };
      
      // If the cache is stale, refresh in the background
      if (!isFresh) {
        logInfo('AppointmentCache:StaleWhileRevalidate', { key: cacheKey });
        
        // Fetch fresh data in the background
        fetchFn().then(freshData => {
          cacheAppointments(cacheKey, freshData, expiryTime);
        }).catch(error => {
          logError('AppointmentCache:RefreshError', { key: cacheKey, error });
        });
      }
      
      perf.stop();
      return result;
    }
  }
  
  // No cache or force refresh, fetch fresh data
  try {
    const freshData = await fetchFn();
    cacheAppointments(cacheKey, freshData, expiryTime);
    
    perf.stop();
    return { data: freshData, fromCache: false };
  } catch (error) {
    logError('AppointmentCache:FetchError', { key: cacheKey, error });
    perf.stop();
    throw error;
  }
};
