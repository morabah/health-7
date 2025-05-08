'use client';

/**
 * LRU Cache Implementation
 *
 * A more sophisticated implementation of an LRU (Least Recently Used) cache
 * with configurable size limits, TTL, and priorities.
 */

import { logInfo } from './logger';

// Type Definitions
export interface CacheOptions {
  /**
   * Maximum time (in ms) an item should remain in the cache
   */
  ttl?: number;

  /**
   * Priority level for cache eviction decisions
   */
  priority?: 'high' | 'normal' | 'low';

  /**
   * Force refresh the data instead of using cache
   */
  forceRefresh?: boolean;

  /**
   * Custom tag for categorizing cache entries
   */
  tag?: string;
}

export interface CacheEntry<T> {
  /**
   * The cached data
   */
  data: T;

  /**
   * When the entry was added or last accessed
   */
  lastAccessed: number;

  /**
   * When the entry was first created
   */
  created: number;

  /**
   * When the entry expires
   */
  expiresAt: number;

  /**
   * Priority level of the entry
   */
  priority: string;

  /**
   * Size of the entry in bytes (approximate)
   */
  size: number;

  /**
   * Optional tag for grouping or categorizing
   */
  tag?: string;
}

export interface CacheStats {
  /**
   * Number of successful cache hits
   */
  hits: number;

  /**
   * Number of cache misses
   */
  misses: number;

  /**
   * Number of entries evicted
   */
  evictions: number;

  /**
   * Current number of entries in the cache
   */
  entries: number;

  /**
   * Total size of all cached data (in bytes)
   */
  totalSize: number;

  /**
   * Number of expired entries removed
   */
  expirations: number;

  /**
   * Cache hit ratio (hits / (hits + misses))
   */
  hitRatio: number;
}

// Default settings
const DEFAULT_TTL = 20000; // reduced from 30000ms to 20000ms (20 seconds)
const DEFAULT_MAX_SIZE = 15 * 1024 * 1024; // increased from 10MB to 15MB
const DEFAULT_MAX_ENTRIES = 750; // increased from 500 to 750
const DEFAULT_PRIORITY = 'normal';

/**
 * LRU Cache implementation with size and count limits
 */
export class LRUCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private lruOrder: string[] = [];
  private maxSize: number;
  private maxEntries: number;
  private defaultTtl: number;

  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    entries: 0,
    totalSize: 0,
    expirations: 0,
    created: Date.now(),
  };

  /**
   * Create a new LRU cache
   */
  constructor(
    options: {
      maxSize?: number;
      maxEntries?: number;
      defaultTtl?: number;
    } = {}
  ) {
    this.maxSize = options.maxSize || DEFAULT_MAX_SIZE;
    this.maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
    this.defaultTtl = options.defaultTtl || DEFAULT_TTL;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, options: CacheOptions = {}): void {
    const now = Date.now();

    // Calculate size of data (rough approximation)
    const size = this.estimateSize(value);

    // Check if we need to evict items due to size or count limits
    if (this.stats.totalSize + size > this.maxSize || this.cache.size >= this.maxEntries) {
      this.evictEntries(Math.ceil((this.stats.totalSize + size - this.maxSize * 0.8) / 1024), 3);
    }

    // Update LRU order if entry already exists
    const existingIndex = this.lruOrder.indexOf(key);
    if (existingIndex >= 0) {
      this.lruOrder.splice(existingIndex, 1);

      // Deduct existing entry's size from total
      const existing = this.cache.get(key);
      if (existing) {
        this.stats.totalSize -= existing.size;
      }
    }

    // Create new cache entry
    const ttl = options.ttl || this.defaultTtl;
    const entry: CacheEntry<T> = {
      data: value,
      lastAccessed: now,
      created: now,
      expiresAt: now + ttl,
      priority: options.priority || DEFAULT_PRIORITY,
      size,
      tag: options.tag,
    };

    // Store in cache
    this.cache.set(key, entry);

    // Add to end of LRU list (most recently used)
    this.lruOrder.push(key);

    // Update stats
    this.stats.entries = this.cache.size;
    this.stats.totalSize += size;
  }

  /**
   * Get a value from the cache
   */
  get(key: string, options: CacheOptions = {}): T | undefined {
    // Skip cache if force refresh is requested
    if (options.forceRefresh) {
      this.stats.misses++;
      return undefined;
    }

    const entry = this.cache.get(key);
    const now = Date.now();

    // Check if entry exists and isn't expired
    if (entry && entry.expiresAt > now) {
      // Update LRU order - move to end (most recently used)
      const index = this.lruOrder.indexOf(key);
      if (index >= 0) {
        this.lruOrder.splice(index, 1);
        this.lruOrder.push(key);
      }

      // Update last accessed time
      entry.lastAccessed = now;

      // Update stats
      this.stats.hits++;

      return entry.data;
    }

    // Remove expired entry
    if (entry) {
      this.delete(key);
      this.stats.expirations++;
    }

    this.stats.misses++;
    return undefined;
  }

  /**
   * Check if an entry exists in the cache (doesn't update LRU order)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    return !!entry && entry.expiresAt > Date.now();
  }

  /**
   * Delete an entry from the cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);

    if (entry) {
      // Remove from cache
      this.cache.delete(key);

      // Update size tracking
      this.stats.totalSize -= entry.size;

      // Remove from LRU list
      const index = this.lruOrder.indexOf(key);
      if (index >= 0) {
        this.lruOrder.splice(index, 1);
      }

      // Update stats
      this.stats.entries = this.cache.size;

      return true;
    }

    return false;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
    this.lruOrder = [];
    this.stats.entries = 0;
    this.stats.totalSize = 0;
  }

  /**
   * Clear entries with a specific tag
   */
  clearByTag(tag: string): number {
    let count = 0;

    // Use Array.from to convert Map entries to an array before iterating
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.tag === tag) {
        this.delete(key);
        count++;
      }
    });

    return count;
  }

  /**
   * Evict least recently used entries to free up space
   */
  private evictEntries(sizeToFreeKB: number, minEntries: number): void {
    let bytesFreed = 0;
    let entriesEvicted = 0;

    // First try to evict by priority (low priority first)
    const priorityOrder = { low: 0, normal: 1, high: 2 };

    // Start with low priority items
    for (const priority of ['low', 'normal', 'high']) {
      // If we've freed enough space and entries, stop
      if (bytesFreed >= sizeToFreeKB * 1024 && entriesEvicted >= minEntries) {
        break;
      }

      // Find items with this priority, starting from least recently used
      for (let i = 0; i < this.lruOrder.length; i++) {
        const key = this.lruOrder[i];
        const entry = this.cache.get(key);

        // Skip if entry not found or has higher priority
        if (
          !entry ||
          priorityOrder[entry.priority as keyof typeof priorityOrder] >
            priorityOrder[priority as keyof typeof priorityOrder]
        ) {
          continue;
        }

        // Evict this entry
        bytesFreed += entry.size;
        this.delete(key);
        entriesEvicted++;
        this.stats.evictions++;

        // If we've freed enough space and entries, stop
        if (bytesFreed >= sizeToFreeKB * 1024 && entriesEvicted >= minEntries) {
          break;
        }
      }
    }

    // If we still need to free more space, evict by LRU order regardless of priority
    while (
      (bytesFreed < sizeToFreeKB * 1024 || entriesEvicted < minEntries) &&
      this.lruOrder.length > 0
    ) {
      const key = this.lruOrder[0]; // Get oldest used item
      const entry = this.cache.get(key);

      if (entry) {
        bytesFreed += entry.size;
        this.delete(key);
        entriesEvicted++;
        this.stats.evictions++;
      } else {
        // If entry not found, just remove from LRU list
        this.lruOrder.shift();
      }
    }

    if (entriesEvicted > 0) {
      logInfo(
        `LRU cache eviction: freed ${Math.round(bytesFreed / 1024)}KB from ${entriesEvicted} entries`
      );
    }
  }

  /**
   * Estimates the size of a value in bytes (approximation)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private estimateSize(value: unknown): number {
    if (value === null || value === undefined) return 0;

    if (typeof value === 'boolean') {
      return 4;
    }

    if (typeof value === 'number') {
      return 8;
    }

    if (typeof value === 'string') {
      return value.length * 2; // UTF-16 characters are 2 bytes each
    }

    if (Array.isArray(value)) {
      return value.reduce((size, item) => size + this.estimateSize(item), 0) + 40;
    }

    if (typeof value === 'object') {
      try {
        // Use JSON stringification as a rough estimate
        const jsonString = JSON.stringify(value);
        return jsonString.length * 2;
      } catch {
        // Fallback for objects that can't be stringified
        return 1024; // arbitrary fallback
      }
    }

    return 8; // Fallback for other types
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRatio = total > 0 ? this.stats.hits / total : 0;

    return {
      ...this.stats,
      hitRatio,
    };
  }

  /**
   * Manually prune expired entries
   * Useful to call periodically if the cache doesn't get accessed often
   */
  pruneExpired(): number {
    const now = Date.now();
    let count = 0;

    // Use Array.from to convert Map entries to an array before iterating
    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (entry.expiresAt <= now) {
        this.delete(key);
        count++;
        this.stats.expirations++;
      }
    });

    return count;
  }

  /**
   * Get all keys in the cache
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }
}

// Create a global shared cache instance
export const globalCache = new LRUCache();

export default LRUCache;
