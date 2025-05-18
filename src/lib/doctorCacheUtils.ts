'use client';

import { cacheManager } from './queryClient';
import { logInfo } from './logger';
import { trackPerformance } from './performance';

// Define Doctor interface here to avoid dependency issues
interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  location?: string;
  languages?: string[];
  yearsOfExperience?: number;
  consultationFee?: number;
  rating?: number;
  profilePictureUrl?: string;
}

/**
 * Utility functions for doctor data caching and performance optimization
 */

// Cache key prefix for doctor search results
const DOCTOR_SEARCH_CACHE_PREFIX = 'doctor-search';

// Cache expiration times (in milliseconds)
const CACHE_TIMES = {
  SEARCH_RESULTS: 5 * 60 * 1000, // 5 minutes
  DOCTOR_PROFILE: 10 * 60 * 1000, // 10 minutes
  DOCTOR_AVAILABILITY: 2 * 60 * 1000, // 2 minutes
};

/**
 * Generate a cache key for doctor search results
 */
export function getDoctorSearchCacheKey(searchParams: Record<string, unknown>): string {
  // Sort keys to ensure consistent cache keys
  const sortedKeys = Object.keys(searchParams).sort();
  
  // Build a string representation of the search parameters
  const paramsString = sortedKeys
    .filter(key => searchParams[key] !== undefined && searchParams[key] !== '')
    .map(key => `${key}:${String(searchParams[key])}`)
    .join('|');
  
  return `${DOCTOR_SEARCH_CACHE_PREFIX}:${paramsString || 'all'}`;
}

/**
 * Cache doctor search results
 */
export function cacheDoctorSearchResults(
  searchParams: Record<string, unknown>,
  doctors: Doctor[],
  totalCount: number
): void {
  const cacheKey = getDoctorSearchCacheKey(searchParams);
  
  // Store in cache with expiration
  cacheManager.setQueryData([cacheKey], {
    doctors,
    totalCount,
    timestamp: Date.now(),
    expiration: Date.now() + CACHE_TIMES.SEARCH_RESULTS
  });
  
  logInfo('Cached doctor search results', {
    cacheKey,
    count: doctors.length,
    totalCount,
    params: searchParams,
  });
}

// Define a longer stale tolerance period for doctor search results
const STALE_TOLERANCE = 15 * 60 * 1000; // 15 minutes

/**
 * Get cached doctor search results if available, with stale-while-revalidate pattern
 */
export function getCachedDoctorSearchResults(
  searchParams: Record<string, unknown>,
  revalidateCallback?: () => Promise<{ doctors: Doctor[]; totalCount: number }>
): { doctors: Doctor[]; totalCount: number; isStale: boolean } | null {
  const perf = trackPerformance('getCachedDoctorSearchResults');
  const cacheKey = getDoctorSearchCacheKey(searchParams);
  
  // Check if we have a cache entry
  const cachedData = cacheManager.getQueryData<{
    doctors: Doctor[];
    totalCount: number;
    timestamp: number;
    expiration?: number;
  }>([cacheKey]);
  
  if (cachedData) {
    const { doctors, totalCount, timestamp, expiration } = cachedData;
    const now = Date.now();
    const cacheAge = now - timestamp;
    const expirationTime = expiration || (timestamp + CACHE_TIMES.SEARCH_RESULTS);
    
    // Check if cache is still fresh
    if (now < expirationTime) {
      logInfo('Using fresh cached doctor search results', {
        cacheKey,
        count: doctors.length,
        totalCount,
        cacheAge: `${Math.round(cacheAge / 1000)}s`,
        freshness: 'fresh'
      });
      
      perf.stop();
      return { doctors, totalCount, isStale: false };
    }
    
    // Check if cache is stale but still usable
    if (now < expirationTime + STALE_TOLERANCE) {
      logInfo('Using stale cached doctor search results', {
        cacheKey,
        count: doctors.length,
        totalCount,
        cacheAge: `${Math.round(cacheAge / 1000)}s`,
        freshness: 'stale'
      });
      
      // If a revalidation callback is provided, trigger background refresh
      if (revalidateCallback) {
        // Use setTimeout to avoid blocking the main thread
        setTimeout(() => {
          revalidateCallback()
            .then(freshData => {
              // Update cache with fresh data
              cacheDoctorSearchResults(searchParams, freshData.doctors, freshData.totalCount);
              logInfo('Background revalidated doctor search results', {
                cacheKey,
                count: freshData.doctors.length,
                totalCount: freshData.totalCount
              });
            })
            .catch(error => {
              // Log error but don't throw - this is background revalidation
              logInfo('Error during background revalidation', {
                cacheKey,
                error: error instanceof Error ? error.message : String(error)
              });
            });
        }, 0);
      }
      
      perf.stop();
      return { doctors, totalCount, isStale: true };
    }
    
    // Cache expired beyond stale tolerance
    logInfo('Doctor search cache expired', {
      cacheKey,
      cacheAge: `${Math.round(cacheAge / 1000)}s`,
      freshness: 'expired'
    });
    cacheManager.invalidateQueries([cacheKey]);
  }
  
  perf.stop();
  return null;
}

/**
 * Prefetch and cache doctor profiles for search results with priority-based loading
 * This improves perceived performance when users view doctor details
 */
export function prefetchDoctorProfiles(doctors: Doctor[], options?: {
  priorityCount?: number;  // Number of high-priority doctors to prefetch immediately
  maxCount?: number;       // Maximum total number of doctors to prefetch
  delayBetweenBatches?: number; // Delay between batches in ms
}): void {
  const {
    priorityCount = 3,     // Default: prefetch top 3 immediately
    maxCount = 10,         // Default: prefetch up to 10 total
    delayBetweenBatches = 300 // Default: 300ms between batches
  } = options || {};
  
  if (doctors.length === 0) return;
  
  // Split into priority and secondary batches
  const priorityDoctors = doctors.slice(0, priorityCount);
  const secondaryDoctors = doctors.slice(priorityCount, maxCount);
  
  const perfTracker = trackPerformance('prefetchDoctorProfiles');
  
  logInfo('Prefetching doctor profiles', {
    priorityCount: priorityDoctors.length,
    secondaryCount: secondaryDoctors.length,
    totalCount: priorityDoctors.length + secondaryDoctors.length
  });
  
  // Function to prefetch a batch of doctors
  const prefetchBatch = (batchDoctors: Doctor[], batchName: string) => {
    import('./enhancedApiClient').then(({ prefetchApiQuery }) => {
      const batchPerf = trackPerformance(`prefetchDoctorProfiles_${batchName}`);
      
      // Use Promise.all to track completion of the entire batch
      Promise.all(
        batchDoctors.map(doctor => 
          prefetchApiQuery(
            'getDoctorPublicProfile',
            ['doctor', doctor.id],
            [{ doctorId: doctor.id }]
          )
          .then(() => ({ doctorId: doctor.id, success: true }))
          .catch(error => ({
            doctorId: doctor.id,
            success: false,
            error: error instanceof Error ? error.message : String(error)
          }))
        )
      ).then(results => {
        const successCount = results.filter(r => r.success).length;
        batchPerf.stop();
        
        logInfo(`Doctor profile ${batchName} batch prefetch complete`, {
          batchName,
          totalCount: batchDoctors.length,
          successCount,
          failureCount: batchDoctors.length - successCount,
          durationMs: batchPerf.getElapsedTime()
        });
      });
    });
  };
  
  // Prefetch priority doctors immediately
  if (priorityDoctors.length > 0) {
    // Use setTimeout with 0 delay to avoid blocking the main thread
    setTimeout(() => prefetchBatch(priorityDoctors, 'priority'), 0);
  }
  
  // Prefetch secondary doctors with a delay
  if (secondaryDoctors.length > 0) {
    setTimeout(() => prefetchBatch(secondaryDoctors, 'secondary'), delayBetweenBatches);
  }
  
  // Log overall prefetch operation completion
  setTimeout(() => {
    perfTracker.stop();
    logInfo('Doctor profile prefetch operation complete', {
      totalPrefetched: priorityDoctors.length + secondaryDoctors.length,
      totalDurationMs: perfTracker.getElapsedTime()
    });
  }, delayBetweenBatches + 100); // Add a small buffer to ensure logging after secondary batch
}

/**
 * Clear all doctor-related caches
 * Useful when doctor data is updated or when testing
 */
export function clearDoctorCaches(): void {
  // Invalidate all doctor search queries
  cacheManager.invalidateQueries([DOCTOR_SEARCH_CACHE_PREFIX]);
  
  // Invalidate all doctor profile data
  cacheManager.invalidateDoctorData();
  
  logInfo('Cleared doctor caches', {
    prefix: DOCTOR_SEARCH_CACHE_PREFIX,
  });
}
