'use client';

/**
 * Enhanced Cache Manager
 * 
 * Provides a unified interface for caching with LRU eviction policy.
 * Acts as a bridge between the application and different caching mechanisms.
 */

import { LRUCache, CacheOptions } from './lruCache';
import { logInfo, logError } from './logger';
import { cacheManager as reactQueryCache } from './queryClient';

// Cache categories for different data types
export enum CacheCategory {
  USERS = 'users',
  DOCTORS = 'doctors',
  APPOINTMENTS = 'appointments',
  NOTIFICATIONS = 'notifications',
  OTHER = 'other'
}

// TTL settings for different data types (in milliseconds)
const TTL_CONFIG = {
  [CacheCategory.USERS]: 60000,         // 1 minute
  [CacheCategory.DOCTORS]: 120000,      // 2 minutes
  [CacheCategory.APPOINTMENTS]: 30000,  // 30 seconds
  [CacheCategory.NOTIFICATIONS]: 15000, // 15 seconds
  [CacheCategory.OTHER]: 30000          // 30 seconds (default)
};

// Create cache instances (one per category for better isolation)
const caches: Record<CacheCategory, LRUCache> = {
  [CacheCategory.USERS]: new LRUCache({
    maxSize: 2 * 1024 * 1024,  // 2MB
    maxEntries: 100,
    defaultTtl: TTL_CONFIG[CacheCategory.USERS]
  }),
  [CacheCategory.DOCTORS]: new LRUCache({
    maxSize: 5 * 1024 * 1024,  // 5MB (doctors have more data)
    maxEntries: 200,
    defaultTtl: TTL_CONFIG[CacheCategory.DOCTORS]
  }),
  [CacheCategory.APPOINTMENTS]: new LRUCache({
    maxSize: 3 * 1024 * 1024,  // 3MB
    maxEntries: 300,
    defaultTtl: TTL_CONFIG[CacheCategory.APPOINTMENTS]
  }),
  [CacheCategory.NOTIFICATIONS]: new LRUCache({
    maxSize: 2 * 1024 * 1024,  // 2MB
    maxEntries: 500,           // Higher count for notifications
    defaultTtl: TTL_CONFIG[CacheCategory.NOTIFICATIONS]
  }),
  [CacheCategory.OTHER]: new LRUCache({
    maxSize: 2 * 1024 * 1024,  // 2MB
    maxEntries: 100,
    defaultTtl: TTL_CONFIG[CacheCategory.OTHER]
  })
};

/**
 * Set a value in the cache
 */
export function setCacheData<T>(
  category: CacheCategory,
  key: string,
  data: T,
  options: CacheOptions = {}
): void {
  try {
    // Use the appropriate cache based on category
    caches[category].set(key, data, {
      ttl: options.ttl || TTL_CONFIG[category],
      priority: options.priority,
      tag: options.tag
    });
  } catch (error) {
    logError('Error setting cache data', { category, key, error });
  }
}

/**
 * Get a value from the cache
 */
export function getCacheData<T>(
  category: CacheCategory,
  key: string,
  options: CacheOptions = {}
): T | undefined {
  try {
    return caches[category].get(key, options) as T | undefined;
  } catch (error) {
    logError('Error getting cache data', { category, key, error });
    return undefined;
  }
}

/**
 * Check if a key exists in the cache
 */
export function hasCacheData(
  category: CacheCategory,
  key: string
): boolean {
  try {
    return caches[category].has(key);
  } catch (error) {
    logError('Error checking cache data', { category, key, error });
    return false;
  }
}

/**
 * Delete a value from the cache
 */
export function deleteCacheData(
  category: CacheCategory,
  key: string
): boolean {
  try {
    return caches[category].delete(key);
  } catch (error) {
    logError('Error deleting cache data', { category, key, error });
    return false;
  }
}

/**
 * Clear all data in a category
 */
export function clearCacheCategory(category: CacheCategory): void {
  try {
    caches[category].clear();
    logInfo(`Cleared cache for category: ${category}`);
  } catch (error) {
    logError('Error clearing cache category', { category, error });
  }
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  try {
    Object.values(caches).forEach(cache => cache.clear());
    logInfo('Cleared all caches');
  } catch (error) {
    logError('Error clearing all caches', { error });
  }
}

/**
 * Get cache statistics for all categories
 */
export function getCacheStats(): Record<CacheCategory, ReturnType<LRUCache['getStats']>> {
  const stats: Record<string, ReturnType<LRUCache['getStats']>> = {};
  
  Object.entries(caches).forEach(([category, cache]) => {
    stats[category] = cache.getStats();
  });
  
  return stats;
}

/**
 * Prune expired entries from all caches
 */
export function pruneAllExpired(): Record<CacheCategory, number> {
  const results: Record<string, number> = {};
  
  Object.entries(caches).forEach(([category, cache]) => {
    results[category] = cache.pruneExpired();
  });
  
  return results;
}

// Helper function to periodically prune expired entries
let pruneInterval: number | NodeJS.Timeout | null = null;

/**
 * Start automatic pruning of expired cache entries
 */
export function startAutoPruning(intervalMs = 60000): void {
  if (pruneInterval) {
    stopAutoPruning();
  }
  
  pruneInterval = setInterval(() => {
    const pruned = pruneAllExpired();
    const total = Object.values(pruned).reduce((sum, count) => sum + count, 0);
    
    if (total > 0) {
      logInfo(`Auto-pruned ${total} expired cache entries`);
    }
  }, intervalMs);
}

/**
 * Stop automatic pruning of expired cache entries
 */
export function stopAutoPruning(): void {
  if (pruneInterval) {
    clearInterval(pruneInterval as NodeJS.Timeout);
    pruneInterval = null;
  }
}

// Additional helper functions

/**
 * Create a composite cache key from multiple parts
 */
export function createCacheKey(...parts: (string | number | undefined | null)[]): string {
  return parts
    .map(part => (part === undefined || part === null ? '' : String(part)))
    .filter(Boolean)
    .join('::');
}

/**
 * Migrate React Query cache data to our LRU cache system
 * Useful for transitioning to the new caching system
 */
export function migrateReactQueryToLRUCache<T>(
  reactQueryKey: unknown[],
  category: CacheCategory,
  lruKey: string
): T | undefined {
  try {
    // Try to get data from React Query cache
    const queryData = reactQueryCache.getQueryData(reactQueryKey);
    
    if (queryData) {
      // Store in our LRU cache
      setCacheData(category, lruKey, queryData);
      return queryData as T;
    }
    
    return undefined;
  } catch (error) {
    logError('Error migrating React Query data to LRU cache', { 
      reactQueryKey, category, lruKey, error 
    });
    return undefined;
  }
}

// Export a unified cache interface
export const enhancedCache = {
  set: setCacheData,
  get: getCacheData,
  has: hasCacheData,
  delete: deleteCacheData,
  clear: clearCacheCategory,
  clearAll: clearAllCaches,
  getStats: getCacheStats,
  pruneExpired: pruneAllExpired,
  startAutoPruning,
  stopAutoPruning,
  createKey: createCacheKey,
  migrateFromReactQuery: migrateReactQueryToLRUCache,
  category: CacheCategory
};

// Auto-start pruning when this module is loaded
startAutoPruning();

export default enhancedCache; 