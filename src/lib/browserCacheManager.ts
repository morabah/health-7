/**
 * Browser Cache Manager
 * 
 * Provides persistent caching capabilities using localStorage
 * for improved performance across sessions.
 */

import { logInfo, logError } from './logger';

// Define CacheCategory here to avoid circular dependency with cacheManager.ts
export enum CacheCategory {
  USERS = 'users',
  DOCTORS = 'doctors',
  APPOINTMENTS = 'appointments',
  NOTIFICATIONS = 'notifications',
  OTHER = 'other'
}

// Storage keys 
const STORAGE_KEY_PREFIX = 'health-cache-';
const VERSION_KEY = 'health-cache-version';
const CURRENT_CACHE_VERSION = '1.0.0';

// Set maximum storage size (rough estimate in characters)
const MAX_STORAGE_SIZE = 2 * 1024 * 1024; // 2MB

// Set TTL for localStorage entries in ms
const STORAGE_TTL = {
  [CacheCategory.USERS]: 24 * 60 * 60 * 1000,    // 24 hours
  [CacheCategory.DOCTORS]: 12 * 60 * 60 * 1000,  // 12 hours
  [CacheCategory.APPOINTMENTS]: 3 * 60 * 60 * 1000, // 3 hours
  [CacheCategory.NOTIFICATIONS]: 30 * 60 * 1000, // 30 minutes
  [CacheCategory.OTHER]: 6 * 60 * 60 * 1000      // 6 hours
};

// Item stored in localStorage cache
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expires: number;
  category: CacheCategory;
  version: string;
}

/**
 * Initialize the browser cache
 * Checks for version and clears cache if version has changed
 */
export function initBrowserCache(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    
    if (storedVersion !== CURRENT_CACHE_VERSION) {
      // Clear cache if version has changed (schema updates, etc.)
      clearAllBrowserCache();
      localStorage.setItem(VERSION_KEY, CURRENT_CACHE_VERSION);
      logInfo('Browser cache initialized with new version', { version: CURRENT_CACHE_VERSION });
    } else {
      // Prune expired entries on startup
      const prunedCount = pruneExpiredEntries();
      if (prunedCount > 0) {
        logInfo(`Pruned ${prunedCount} expired browser cache entries`);
      }
    }
  } catch (error) {
    logError('Error initializing browser cache', error);
  }
}

/**
 * Set data in browser cache
 */
export function setBrowserCacheData<T>(
  category: CacheCategory,
  key: string,
  data: T
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${category}-${key}`;
    const now = Date.now();
    
    // Create cache item with expiration
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: now,
      expires: now + (STORAGE_TTL[category] || STORAGE_TTL[CacheCategory.OTHER]),
      category,
      version: CURRENT_CACHE_VERSION
    };
    
    // Serialize to JSON
    const serialized = JSON.stringify(cacheItem);
    
    // Check size constraints
    if (serialized.length > MAX_STORAGE_SIZE / 4) {
      // Skip if item is too large (1/4 of max storage)
      logInfo('Item too large for browser cache', { key, size: serialized.length });
      return false;
    }
    
    // Clean up space if needed
    checkAndCleanupStorage();
    
    // Store in localStorage
    localStorage.setItem(storageKey, serialized);
    return true;
  } catch (error) {
    logError('Error setting browser cache data', { category, key, error });
    return false;
  }
}

/**
 * Get data from browser cache if not expired
 */
export function getBrowserCacheData<T>(
  category: CacheCategory,
  key: string
): T | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  
  try {
    const storageKey = `${STORAGE_KEY_PREFIX}${category}-${key}`;
    const serialized = localStorage.getItem(storageKey);
    
    if (!serialized) {
      return undefined;
    }
    
    const cacheItem = JSON.parse(serialized) as CacheItem<T>;
    
    // Check expiration
    if (cacheItem.expires < Date.now() || cacheItem.version !== CURRENT_CACHE_VERSION) {
      // Remove expired item
      localStorage.removeItem(storageKey);
      return undefined;
    }
    
    return cacheItem.data;
  } catch (error) {
    logError('Error getting browser cache data', { category, key, error });
    return undefined;
  }
}

/**
 * Set doctor data in browser cache
 */
export function setDoctorDataInBrowser(doctorId: string, data: unknown): boolean {
  return setBrowserCacheData(CacheCategory.DOCTORS, `doctor-${doctorId}`, data);
}

/**
 * Get doctor data from browser cache
 */
export function getDoctorDataFromBrowser<T>(doctorId: string): T | undefined {
  return getBrowserCacheData<T>(CacheCategory.DOCTORS, `doctor-${doctorId}`);
}

/**
 * Clear all data in browser cache
 */
export function clearAllBrowserCache(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
    logInfo('Browser cache cleared');
  } catch (error) {
    logError('Error clearing browser cache', error);
  }
}

/**
 * Remove expired entries from browser cache
 * @returns Number of entries removed
 */
export function pruneExpiredEntries(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  
  let removedCount = 0;
  const now = Date.now();
  
  try {
    const keysToRemove: string[] = [];
    
    // Collect keys to remove (avoid modifying while iterating)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        try {
          const serialized = localStorage.getItem(key);
          if (serialized) {
            const cacheItem = JSON.parse(serialized) as CacheItem<unknown>;
            if (cacheItem.expires < now || cacheItem.version !== CURRENT_CACHE_VERSION) {
              keysToRemove.push(key);
            }
          }
        } catch (e) {
          // If we can't parse it, consider it invalid
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove collected keys
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      removedCount++;
    });
    
    return removedCount;
  } catch (error) {
    logError('Error pruning expired browser cache entries', error);
    return 0;
  }
}

/**
 * Check storage usage and clean up if necessary
 */
function checkAndCleanupStorage(): void {
  try {
    // Simple heuristic: if we have more than 100 items or localStorage is becoming full
    // clean up oldest entries first
    if (localStorage.length > 100) {
      const entries: { key: string; time: number }[] = [];
      
      // Collect cache entries
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
          try {
            const serialized = localStorage.getItem(key);
            if (serialized) {
              const cacheItem = JSON.parse(serialized) as CacheItem<unknown>;
              entries.push({ key, time: cacheItem.timestamp });
            }
          } catch (e) {
            // Skip invalid entries
          }
        }
      }
      
      // Sort by timestamp (oldest first)
      entries.sort((a, b) => a.time - b.time);
      
      // Remove oldest 20% of entries
      const removeCount = Math.ceil(entries.length * 0.2);
      entries.slice(0, removeCount).forEach(entry => {
        localStorage.removeItem(entry.key);
      });
      
      if (removeCount > 0) {
        logInfo(`Cleaned up ${removeCount} old browser cache entries`);
      }
    }
  } catch (error) {
    logError('Error cleaning up browser cache', error);
  }
}

// Create a unified browser cache interface
export const browserCache = {
  // Initialize the browser cache
  init: initBrowserCache,
  
  // Get data from browser cache
  get: getBrowserCacheData,
  
  // Set data in browser cache
  set: setBrowserCacheData,
  
  // Set doctor data specifically
  setDoctor: setDoctorDataInBrowser,
  
  // Get doctor data specifically
  getDoctor: getDoctorDataFromBrowser,
  
  // Clear all browser cache
  clear: clearAllBrowserCache,
  
  // Prune expired entries
  prune: pruneExpiredEntries
}; 