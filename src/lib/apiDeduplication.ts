'use client';

/**
 * API Request Deduplication
 *
 * Prevents duplicate API calls for the same method with the same arguments.
 * Particularly useful for high-frequency calls like getMyNotifications.
 */

import { CacheCategory } from './browserCacheManager';
import enhancedCache from './cacheManager';
import { logInfo } from './logger';

// Types
type RequestKey = string;
type ApiPromise<T> = Promise<T>;

interface PendingRequest<T> {
  promise: ApiPromise<T>;
  timestamp: number;
  args: unknown[];
  expiresAt: number;
}

interface DeduplicationOptions {
  /**
   * Time after which a cached promise should expire and not be reused
   */
  ttlMs?: number;

  /**
   * Whether to log deduplication events
   */
  verbose?: boolean;

  /**
   * Name/description for this deduplication entry
   */
  label?: string;
}

// Method-specific configuration for deduplication
interface MethodConfig {
  /**
   * Whether deduplication is enabled for this method
   */
  enabled: boolean;

  /**
   * TTL (time-to-live) in milliseconds for this method's deduplication
   */
  ttlMs: number;
}

// Storage for pending API requests
const pendingRequests = new Map<RequestKey, PendingRequest<unknown>>();

// Configure which methods to deduplicate and their TTLs
const DEDUPLICATION_CONFIG: Record<string, MethodConfig> = {
  // High-frequency methods with deduplication enabled
  getMyNotifications: { enabled: true, ttlMs: 1500 }, // reduced from 3000ms
  getMyDashboardStats: { enabled: true, ttlMs: 1500 }, // reduced from 3000ms
  getAvailableSlots: { enabled: true, ttlMs: 1000 }, // reduced from 2000ms
  findDoctors: { enabled: true, ttlMs: 1000 }, // reduced from 2000ms
  getAllDoctors: { enabled: true, ttlMs: 1500 }, // new method
  getDoctorPublicProfile: { enabled: true, ttlMs: 2000 }, // new method

  // Methods that should rarely be deduplicated but could be in some scenarios
  getMyUserProfile: { enabled: true, ttlMs: 500 }, // unchanged
  getMyAppointments: { enabled: true, ttlMs: 1000 }, // unchanged
  getAllUsers: { enabled: true, ttlMs: 1500 }, // new method
  getAllPatients: { enabled: true, ttlMs: 1500 }, // new method
  getPatientDetails: { enabled: true, ttlMs: 1000 }, // new method

  // Default configuration for any method not explicitly listed
  default: { enabled: false, ttlMs: 0 },
};

// Map API methods to cache categories for LRU cache integration
const METHOD_TO_CATEGORY: Record<string, CacheCategory> = {
  getMyNotifications: CacheCategory.NOTIFICATIONS,
  getMyDashboardStats: CacheCategory.OTHER,
  getAvailableSlots: CacheCategory.APPOINTMENTS,
  findDoctors: CacheCategory.DOCTORS,
  getMyUserProfile: CacheCategory.USERS,
  getMyAppointments: CacheCategory.APPOINTMENTS,
  getDoctorPublicProfile: CacheCategory.DOCTORS,
  getAllDoctors: CacheCategory.DOCTORS,
  getAllUsers: CacheCategory.USERS,
  getAllPatients: CacheCategory.USERS,
  getPatientDetails: CacheCategory.USERS,
};

// Statistics tracking for performance monitoring
const stats = {
  deduped: 0,
  total: 0,
  expired: 0,
  methodStats: {} as Record<string, { deduped: number; total: number }>,
};

/**
 * Create a unique key for a request based on the method name and arguments
 */
function createRequestKey(method: string, args: unknown[]): RequestKey {
  try {
    // Handle special case for auth context in first argument
    if (
      args.length > 0 &&
      typeof args[0] === 'object' &&
      args[0] !== null &&
      'uid' in args[0] &&
      'role' in args[0]
    ) {
      // Extract auth context from the first argument
      const [authCtx, ...restArgs] = args;
      const contextKey = authCtx ? `${(authCtx as Record<string, string>).uid}` : 'no-auth';

      // Use a simplified version of the args to create a stable key
      return `${method}:${contextKey}:${JSON.stringify(restArgs)}`;
    }

    // Regular case - stringify all arguments
    return `${method}:${JSON.stringify(args)}`;
  } catch {
    // Fallback for arguments that can't be stringified
    return `${method}:${args.length}:${Date.now()}`;
  }
}

/**
 * Clean up expired requests to prevent memory leaks
 */
function cleanupExpiredRequests() {
  const now = Date.now();

  // Use Array.from to convert Map entries to an array before iterating
  Array.from(pendingRequests.entries()).forEach(([key, request]) => {
    if (now > request.expiresAt) {
      pendingRequests.delete(key);
      stats.expired++;
    }
  });
}

/**
 * Get the configuration for a specific method
 */
function getMethodConfig(method: string): MethodConfig {
  return DEDUPLICATION_CONFIG[method] || DEDUPLICATION_CONFIG.default;
}

/**
 * Generate stats about deduplication effectiveness
 */
export function getDeduplicationStats() {
  return {
    ...stats,
    pendingCount: pendingRequests.size,
    savingsPercent: stats.total > 0 ? Math.round((stats.deduped / stats.total) * 100) : 0,
  };
}

/**
 * Reset deduplication stats
 */
export function resetDeduplicationStats() {
  stats.deduped = 0;
  stats.total = 0;
  stats.expired = 0;
  stats.methodStats = {};
}

/**
 * Clear all pending requests
 */
export function clearPendingRequests() {
  pendingRequests.clear();
}

/**
 * Execute an API call with deduplication
 *
 * If an identical call is already in progress, returns the existing promise
 * instead of making a new API call.
 *
 * @param method - The API method name
 * @param apiCallFn - Function that executes the actual API call
 * @param args - Arguments to pass to the API call
 * @param options - Deduplication options
 * @returns Promise with the API result
 */
export function deduplicatedApiCall<T>(
  method: string,
  apiCallFn: (...args: unknown[]) => Promise<T>,
  args: unknown[] = [],
  options: DeduplicationOptions = {}
): Promise<T> {
  // Update stats
  stats.total++;
  if (!stats.methodStats[method]) {
    stats.methodStats[method] = { deduped: 0, total: 1 };
  } else {
    stats.methodStats[method].total++;
  }

  // Get method configuration
  const methodConfig = getMethodConfig(method);

  // Skip deduplication if not enabled for this method
  if (!methodConfig.enabled) {
    return apiCallFn(...args);
  }

  // Clean up expired requests periodically
  if (stats.total % 50 === 0) {
    cleanupExpiredRequests();
  }

  // Create a unique key for this request
  const requestKey = createRequestKey(method, args);

  // TTL for the deduplication
  const ttlMs = options.ttlMs || methodConfig.ttlMs;

  // First, check if we have a result in the LRU cache
  const category = METHOD_TO_CATEGORY[method] || CacheCategory.OTHER;
  const cachedResult = enhancedCache?.get<T>(category, requestKey);

  if (cachedResult) {
    // Update stats for deduplication from LRU cache
    stats.deduped++;
    stats.methodStats[method].deduped++;

    if (options.verbose) {
      logInfo(`Deduplicating ${options.label || method} call from LRU cache`, {
        method,
        key: requestKey,
        category,
      });
    }

    return Promise.resolve(cachedResult);
  }

  // Check if we already have this exact request in progress
  const existingRequest = pendingRequests.get(requestKey) as PendingRequest<T> | undefined;

  if (existingRequest) {
    const now = Date.now();

    // Check if the request is still valid (not expired)
    if (now < existingRequest.expiresAt) {
      // Update stats for deduplication
      stats.deduped++;
      stats.methodStats[method].deduped++;

      if (options.verbose) {
        logInfo(`Deduplicating ${options.label || method} call from in-flight request`, {
          method,
          key: requestKey,
          ageMs: now - existingRequest.timestamp,
        });
      }

      // Return the existing promise
      return existingRequest.promise;
    }

    // If expired, remove it and make a new request
    pendingRequests.delete(requestKey);
  }

  // Make the actual API call
  const timestamp = Date.now();
  const promise = apiCallFn(...args);

  // Store the request for potential reuse
  pendingRequests.set(requestKey, {
    promise,
    timestamp,
    args,
    expiresAt: timestamp + ttlMs,
  });

  // Store the result in the LRU cache when it resolves
  promise
    .then(result => {
      enhancedCache?.set(category, requestKey, result, {
        ttl: ttlMs,
        priority: 'normal',
        tag: `api:${method}`,
      });
      return result;
    })
    .catch(() => {
      // Don't cache errors
    })
    .finally(() => {
      // Only delete if it's the same promise (could have been replaced)
      const current = pendingRequests.get(requestKey);
      if (current && current.timestamp === timestamp) {
        pendingRequests.delete(requestKey);
      }
    });

  return promise;
}
