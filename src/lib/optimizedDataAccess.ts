'use client';

/**
 * Optimized Data Access
 * 
 * Provides a unified interface for data access with memory caching.
 * This implementation focuses on performance and efficient memory usage.
 */

import { UserType as UserRole } from '@/types/enums';
import { logInfo, logError, logWarn } from './logger';
import { cacheKeys, cacheManager } from './queryClient';
import enhancedCache, { CacheCategory } from './cacheManager';
import { callApi } from './apiClient';
import { queryOptions } from '@tanstack/react-query';
import { DataError } from './errors/errorClasses';

// Import types from schemas
import type { 
  Appointment as AppointmentType,
  DoctorProfile as DoctorType, 
  Notification as NotificationType, 
  UserProfile as UserProfileType 
} from '@/types/schemas';

// Type for filtered data request options
export interface FilterOptions {
  filters?: Record<string, unknown>;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fields?: string[]; // Add fields property for column selection
}

// Interface for standardized API responses
export interface ApiResponse<T> {
  success: boolean;
  notifications?: T[];
  doctors?: T[];
  users?: T[];
  appointments?: T[];
  [key: string]: unknown;
}

// Enhanced Cache Options
interface CacheOptions {
  ttl?: number;         // Time to live in ms (default: 30000ms)
  priority?: 'high' | 'normal' | 'low'; // Cache priority for memory management
  forceRefresh?: boolean; // Bypass cache and force a fresh fetch
}

// Base entity interface
interface BaseEntity {
  id: string;
  [key: string]: unknown;
}

// User entity
interface User extends BaseEntity {
  firstName?: string;
  lastName?: string;
  email?: string | null;
  role?: string;
}

// Doctor entity
interface Doctor extends BaseEntity {
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  specialty?: string;
  verificationStatus?: string;
}

// Appointment entity
interface Appointment extends BaseEntity {
  patientId: string;
  doctorId: string;
  appointmentDate: string;
  status: string;
}

// Notification entity
interface Notification extends BaseEntity {
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

// Cache value type
interface MemoryCacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  priority: string;
  size?: number;
}

// Type for safe comparison of potentially unknown values
type Comparable = string | number | boolean | null | undefined;

// Helper function to safely compare values
function compareValues(a: unknown, b: unknown, descending = false): number {
  // Handle nullish values
  if (a == null && b == null) return 0;
  if (a == null) return descending ? 1 : -1;
  if (b == null) return descending ? -1 : 1;
  
  // Cast to comparable types if possible
  const aComp = a as Comparable;
  const bComp = b as Comparable;
  
  // Compare based on types
  if (typeof aComp === 'string' && typeof bComp === 'string') {
    return descending 
      ? bComp.localeCompare(aComp) 
      : aComp.localeCompare(bComp);
  }
  
  if (typeof aComp === 'number' && typeof bComp === 'number') {
    return descending 
      ? bComp - aComp 
      : aComp - bComp;
  }
  
  if (typeof aComp === 'boolean' && typeof bComp === 'boolean') {
    if (aComp === bComp) return 0;
    return (descending ? !aComp : aComp) ? 1 : -1;
  }
  
  // Fallback for mixed types (convert to string)
  const aStr = String(aComp);
  const bStr = String(bComp);
  return descending 
    ? bStr.localeCompare(aStr) 
    : aStr.localeCompare(bStr);
}

// Default cache options
const DEFAULT_CACHE_OPTIONS: Required<CacheOptions> = {
  ttl: 30000, // 30 seconds
  priority: 'normal',
  forceRefresh: false
};

// Configurable TTL settings for different entity types
const CACHE_TTL_CONFIG = {
  users: 60000,       // 1 minute
  doctors: 120000,    // 2 minutes
  patients: 120000,   // 2 minutes
  appointments: 30000, // 30 seconds
  notifications: 15000 // 15 seconds - shorter for notifications which change frequently
};

// Cache storage for in-memory data
const memoryCache: Record<string, MemoryCacheItem<unknown>> = {};

// Memory cache statistics
const memoryCacheStats = {
  hits: 0,
  misses: 0,
  evictions: 0,
  entries: 0,
  totalSize: 0
};

// Track notification requests to avoid excessive calls
const notificationRequestTracker = {
  lastRequestTime: 0,
  consecutiveRequests: 0,
  backoffInterval: 0, // Increases on failed or too frequent requests
  inMemoryCache: new Map<string, { data: Notification[], timestamp: number }>()
};

// Error types for better handling
interface DataAccessError extends Error {
  code: string;
  context?: Record<string, unknown>;
  retryable: boolean;
}

// Use the correctly imported DataError from errorClasses.ts
class DataFetchError extends DataError {
  constructor(message: string, code = 'DATA_FETCH_ERROR', context?: Record<string, unknown>, retryable = true) {
    super(message, {
      code,
      context,
      retryable
    });
  }
}

/**
 * Estimate size of object in bytes (rough approximation)
 */
function estimateObjectSize(obj: unknown): number {
  const jsonString = JSON.stringify(obj);
  return jsonString ? jsonString.length * 2 : 0; // Rough estimate: 2 bytes per character
}

/**
 * Set data in the memory cache with expiration
 */
function setMemoryCacheData<T>(
  key: string, 
  data: T, 
  options: Partial<CacheOptions> = {}
): void {
  const mergedOptions = { ...DEFAULT_CACHE_OPTIONS, ...options };
  const now = Date.now();
  
  // Basic memory management - evict items if too many entries
  const MAX_CACHE_ENTRIES = 100;
  if (Object.keys(memoryCache).length >= MAX_CACHE_ENTRIES) {
    evictCacheEntries(1);
  }
  
  // Store with metadata
  const size = estimateObjectSize(data);
  memoryCache[key] = {
    data,
    timestamp: now,
    expiresAt: now + mergedOptions.ttl,
    priority: mergedOptions.priority,
    size
  };
  
  // Update stats
  memoryCacheStats.entries = Object.keys(memoryCache).length;
  memoryCacheStats.totalSize += size;
}

/**
 * Get data from memory cache if not expired
 */
function getMemoryCacheData<T>(key: string, options: Partial<CacheOptions> = {}): T | null {
  const mergedOptions = { ...DEFAULT_CACHE_OPTIONS, ...options };
  
  // Bypass cache if forceRefresh is true
  if (mergedOptions.forceRefresh) {
    memoryCacheStats.misses++;
    return null;
  }
  
  const cached = memoryCache[key];
  if (cached && cached.expiresAt > Date.now()) {
    memoryCacheStats.hits++;
    return cached.data as T;
  }
  
  // Remove expired entry
  if (cached) {
    delete memoryCache[key];
    memoryCacheStats.entries--;
    if (cached.size) {
      memoryCacheStats.totalSize -= cached.size;
    }
  }
  
  memoryCacheStats.misses++;
  return null;
}

/**
 * Evict least important or oldest cache entries
 */
function evictCacheEntries(count: number): void {
  const entries = Object.entries(memoryCache);
  if (entries.length === 0) return;
  
  // Sort by priority first, then by expiration time
  const sortedEntries = entries.sort((a, b) => {
    // Compare priorities first
    const priorityOrder = { low: 0, normal: 1, high: 2 };
    const priorityA = priorityOrder[a[1].priority as keyof typeof priorityOrder] || 1;
    const priorityB = priorityOrder[b[1].priority as keyof typeof priorityOrder] || 1;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Evict lower priority first
    }
    
    // If same priority, evict ones expiring soonest
    return a[1].expiresAt - b[1].expiresAt;
  });
  
  // Evict the specified number of entries
  for (let i = 0; i < Math.min(count, sortedEntries.length); i++) {
    const [key, entry] = sortedEntries[i];
    delete memoryCache[key];
    memoryCacheStats.evictions++;
    memoryCacheStats.entries--;
    if (entry.size) {
      memoryCacheStats.totalSize -= entry.size;
    }
  }
}

/**
 * Clear a specific cache entry or all entries
 */
function clearMemoryCache(key?: string): void {
  if (key) {
    const entry = memoryCache[key];
    if (entry && entry.size) {
      memoryCacheStats.totalSize -= entry.size;
    }
    delete memoryCache[key];
    memoryCacheStats.entries = Object.keys(memoryCache).length;
  } else {
    Object.keys(memoryCache).forEach(k => delete memoryCache[k]);
    memoryCacheStats.entries = 0;
    memoryCacheStats.totalSize = 0;
  }
}

/**
 * Get memory cache statistics
 */
export function getMemoryCacheStats(): typeof memoryCacheStats {
  return { ...memoryCacheStats };
}

/**
 * Get optimized users with filtering and caching
 */
export async function getOptimizedUsers(options: FilterOptions = {}): Promise<User[]> {
  try {
    // Generate a cache key based on the options
    const cacheKey = enhancedCache?.createKey('users', JSON.stringify(options));
    
    // First check the LRU cache for a recent copy
    if (cacheKey) {
      const lruCachedData = enhancedCache?.get<User[]>(CacheCategory.USERS, cacheKey);
      if (lruCachedData) {
        logInfo('Retrieved users from LRU cache');
        return lruCachedData;
      }
    }
    
    // Try to get from memory cache
    const memoryCacheKey = `users:${JSON.stringify(options)}`;
    const cachedData = getMemoryCacheData<User[]>(memoryCacheKey);
    
    if (cachedData) {
      logInfo('Retrieved users from memory cache');
      
      // Also store in LRU cache for cross-component usage
      if (cacheKey) {
        enhancedCache?.set(CacheCategory.USERS, cacheKey, cachedData);
      }
      
      return cachedData;
    }
    
    // Fall back to API call
    const response = await callApi('getAllUsers', { 
      uid: 'admin',  // Admin-level operation
      role: 'admin'
    }, {
      filters: options.filters,
      limit: options.limit,
      offset: options.offset,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder
    });
    
    if (response && response.success && Array.isArray(response.users)) {
      // Process data to ensure consistent structure
      const processedData = processUsersData(response.users, options);
      
      // Cache data for future requests
      setMemoryCacheData(memoryCacheKey, processedData, {
        ttl: CACHE_TTL_CONFIG.users
      });
      
      // Also store in LRU cache for cross-component usage
      if (cacheKey) {
        enhancedCache?.set(CacheCategory.USERS, cacheKey, processedData);
      }
      
      return processedData;
    }
    
    // If no users data in response, return an empty array
    if (response && response.success) {
      const emptyData: User[] = [];
      
      // Cache the empty result (with shorter TTL)
      setMemoryCacheData(memoryCacheKey, emptyData, {
        ttl: 10000 // 10 seconds for empty responses
      });
      
      // Also store in LRU cache
      if (cacheKey) {
        enhancedCache?.set(CacheCategory.USERS, cacheKey, emptyData, { ttl: 10000 }); // 10 second TTL for empty results
      }
      
      return emptyData;
    }
    
    // Handle errors or invalid responses
    const fallbackData = fallbackToLocalDb() as User[];
    
    // Cache the fallback data
    setMemoryCacheData(memoryCacheKey, fallbackData, { ttl: 10000 });
    
    // Store in LRU cache
    if (cacheKey) {
      enhancedCache?.set(CacheCategory.USERS, cacheKey, fallbackData);
    }
    
    return fallbackData;
  } catch (error) {
    logError('Error getting optimized users data', { error });
    throw new DataFetchError('Failed to fetch users', 'USERS_FETCH_ERROR', { error });
  }
}

/**
 * Process users data with filtering, sorting and pagination
 */
function processUsersData(users: unknown[], options: FilterOptions): User[] {
  // Cast users to User[] to ensure compatibility
  let result = [...users] as User[];
  
  // Apply filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        result = result.filter(item => {
          if (typeof value === 'string' && typeof item[key] === 'string') {
            return item[key].toLowerCase().includes(value.toLowerCase());
          }
          return item[key] === value;
        });
      }
    });
  }
  
  // Apply sorting
  if (options.sortBy) {
    result.sort((a, b) => {
      const aValue = a[options.sortBy!];
      const bValue = b[options.sortBy!];
      
      return compareValues(aValue, bValue, options.sortOrder === 'desc');
    });
  }
  
  // Apply pagination
  if (options.offset !== undefined || options.limit !== undefined) {
    const start = options.offset || 0;
    const end = options.limit ? start + options.limit : undefined;
    result = result.slice(start, end);
  }
  
  // Apply field selection if needed
  if (options.fields && options.fields.length > 0) {
    result = result.map(item => {
      const newItem: Record<string, unknown> = { id: item.id };
      options.fields!.forEach((field: string) => {
        if (field in item) {
          newItem[field] = item[field];
        }
      });
      return newItem as User;
    });
  }
  
  return result;
}

/**
 * Get optimized doctors with filtering and caching
 */
export async function getOptimizedDoctors(options: FilterOptions = {}): Promise<Doctor[]> {
  const cacheKey = `doctors-${JSON.stringify(options)}`;
  
  try {
    // Try memory cache first (30 second TTL)
    const cachedData = getMemoryCacheData<Doctor[]>(cacheKey);
    if (cachedData) {
      logInfo('Using memory cached doctors data');
      return cachedData;
    }
    
    // Try React Query cache next
    const queryData = cacheManager.getQueryData<{ success: boolean; doctors: Doctor[] }>(
      cacheKeys.doctors(options.filters)
    );
    
    if (queryData?.success && queryData.doctors) {
      logInfo('Using React Query cached doctors data');
      
      // Apply filtering, sorting, and pagination in-memory
      const filteredData = processDoctorsData(queryData.doctors, options);
      
      // Cache processed results
      setMemoryCacheData(cacheKey, filteredData);
      return filteredData;
    }
    
    // Fetch fresh data using admin function if available
    logInfo('Fetching fresh doctors data');
    
    // Try using admin function first
    try {
      const adminCtx = { uid: 'admin', role: UserRole.ADMIN };
      const result = await callApi<{ success: boolean; doctors: Doctor[] }>('adminGetAllDoctors', adminCtx);
      
      if (result.success && result.doctors) {
        // Set in both caches
        cacheManager.setQueryData(cacheKeys.doctors(options.filters), result);
        
        // Process and return data
        const processedData = processDoctorsData(result.doctors, options);
        setMemoryCacheData(cacheKey, processedData);
        return processedData;
      }
    } catch (adminError) {
      logError('Admin doctors fetch failed, falling back to standard method', adminError);
    }
    
    // Fallback to direct API access
    const doctorsResponse = await callApi<{ success: boolean; doctors: Doctor[] }>('getAllDoctors');
    
    if (!doctorsResponse.success || !doctorsResponse.doctors) {
      throw new DataFetchError('Failed to fetch doctors', 'DOCTOR_FETCH_ERROR');
    }
    
    const doctors = doctorsResponse.doctors;
    
    // Enhanced data with user information
    const usersResponse = await callApi<{ success: boolean; users: User[] }>('getAllUsers');
    const users = usersResponse.success && usersResponse.users ? usersResponse.users : [];
    
    const enhancedDoctors = doctors.map((doctor: Doctor) => {
      const user = users.find((u: User) => u.id === doctor.userId);
      return {
        ...doctor,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        email: user?.email || '',
      };
    });
    
    // Set in both caches
    cacheManager.setQueryData(cacheKeys.doctors(options.filters), { 
      success: true, 
      doctors: enhancedDoctors 
    });
    
    // Process and return data
    const processedData = processDoctorsData(enhancedDoctors, options);
    setMemoryCacheData(cacheKey, processedData);
    return processedData;
  } catch (error) {
    logError('Error in getOptimizedDoctors', error);
    return [];
  }
}

/**
 * Process doctors data with filtering, sorting and pagination
 */
function processDoctorsData(doctors: unknown[], options: FilterOptions): Doctor[] {
  // Cast doctors to Doctor[] to ensure compatibility
  let result = [...doctors] as Doctor[];
  
  // Apply filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        result = result.filter(item => {
          // Special case for name filter
          if (key === 'name' && typeof value === 'string') {
            const fullName = `${item.firstName || ''} ${item.lastName || ''}`.toLowerCase();
            return fullName.includes(value.toLowerCase());
          }
          
          if (typeof value === 'string' && typeof item[key] === 'string') {
            return item[key].toLowerCase().includes(value.toLowerCase());
          }
          return item[key] === value;
        });
      }
    });
  }
  
  // Apply sorting
  if (options.sortBy) {
    result.sort((a, b) => {
      let aValue = a[options.sortBy!];
      let bValue = b[options.sortBy!];
      
      // Special case for sorting by name
      if (options.sortBy === 'name') {
        aValue = `${a.firstName || ''} ${a.lastName || ''}`;
        bValue = `${b.firstName || ''} ${b.lastName || ''}`;
      }
      
      return compareValues(aValue, bValue, options.sortOrder === 'desc');
    });
  }
  
  // Apply pagination
  if (options.offset !== undefined || options.limit !== undefined) {
    const start = options.offset || 0;
    const end = options.limit ? start + options.limit : undefined;
    result = result.slice(start, end);
  }
  
  return result;
}

/**
 * Get optimized appointments with filtering and caching
 */
export async function getOptimizedAppointments(options: FilterOptions = {}): Promise<Appointment[]> {
  const cacheKey = `appointments-${JSON.stringify(options)}`;
  
  try {
    // Try memory cache first (15 second TTL for appointments - shorter because they change frequently)
    const cachedData = getMemoryCacheData<Appointment[]>(cacheKey);
    if (cachedData) {
      logInfo('Using memory cached appointments data');
      return cachedData;
    }
    
    // Fetch appointments - no advanced caching as they change frequently
    logInfo('Fetching fresh appointments data');
    const response = await callApi<{ success: boolean; appointments: Appointment[] }>('adminGetAllAppointments', {
      uid: options.filters?.uid as string || '',
      role: UserRole.ADMIN
    });
    
    if (!response.success || !response.appointments) {
      throw new DataFetchError('Failed to fetch appointments', 'APPOINTMENT_FETCH_ERROR');
    }
    
    const appointments = response.appointments;
    
    // Process and return data
    const processedData = processAppointmentsData(appointments, options);
    setMemoryCacheData(cacheKey, processedData, { ttl: 15000 }); // 15 seconds TTL with proper options format
    return processedData;
  } catch (error) {
    logError('Error in getOptimizedAppointments', error);
    return [];
  }
}

/**
 * Process appointments data with filtering, sorting and pagination
 */
function processAppointmentsData(appointments: unknown[], options: FilterOptions): Appointment[] {
  // Cast appointments to Appointment[] to ensure compatibility 
  let result = [...appointments] as Appointment[];
  
  // Apply filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        result = result.filter(item => {
          if (typeof value === 'string' && typeof item[key] === 'string') {
            return item[key].toLowerCase().includes(value.toLowerCase());
          }
          return item[key] === value;
        });
      }
    });
  }
  
  // Apply sorting (default to appointmentDate desc)
  const sortBy = options.sortBy || 'appointmentDate';
  result.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    return compareValues(aValue, bValue, options.sortOrder === 'desc');
  });
  
  // Apply pagination
  if (options.offset !== undefined || options.limit !== undefined) {
    const start = options.offset || 0;
    const end = options.limit ? start + options.limit : undefined;
    result = result.slice(start, end);
  }
  
  return result;
}

/**
 * Get notifications with optimized filtering and caching
 */
export async function getOptimizedNotifications(
  userId: string, 
  options: FilterOptions = {},
  cacheOptions: Partial<CacheOptions> = {}
): Promise<Notification[]> {
  try {
    // Check if throttled
    const now = Date.now();
    const timeSinceLastRequest = now - notificationRequestTracker.lastRequestTime;
    
    // Debounce requests that are too close together
    if (timeSinceLastRequest < notificationRequestTracker.backoffInterval) {
      notificationRequestTracker.consecutiveRequests++;
      
      // Return from in-memory notification cache if very recent
      const cachedNotifications = notificationRequestTracker.inMemoryCache.get(userId);
      if (cachedNotifications && (now - cachedNotifications.timestamp < 5000)) {
        return cachedNotifications.data;
      }
    }
    
    // Generate a cache key based on userId and options
    const cacheKey = enhancedCache?.createKey('notifications', userId, JSON.stringify(options));
    
    // Set defaults for cache options
    const mergedCacheOptions: Required<CacheOptions> = {
      ...DEFAULT_CACHE_OPTIONS,
      ...cacheOptions
    };
    
    // Always use LRU cache first (fastest)
    if (cacheKey && !mergedCacheOptions.forceRefresh) {
      const lruCachedData = enhancedCache?.get<Notification[]>(
        CacheCategory.NOTIFICATIONS, 
        cacheKey
      );
      
      if (lruCachedData) {
        logInfo('Retrieved notifications from LRU cache', { userId });
        
        // Update the in-memory notification tracker
        notificationRequestTracker.inMemoryCache.set(userId, {
          data: lruCachedData,
          timestamp: now
        });
        
        return lruCachedData;
      }
    }
    
    // Then check our memory cache
    const memoryCacheKey = `notifications:${userId}:${JSON.stringify(options)}`;
    
    if (!mergedCacheOptions.forceRefresh) {
      const cachedData = getMemoryCacheData<Notification[]>(memoryCacheKey);
      
      if (cachedData) {
        logInfo('Retrieved notifications from memory cache', { userId });
        
        // Also store in LRU cache for cross-component usage
        if (cacheKey) {
          enhancedCache?.set(CacheCategory.NOTIFICATIONS, cacheKey, cachedData);
        }
        
        // Update the in-memory notification tracker
        notificationRequestTracker.inMemoryCache.set(userId, {
          data: cachedData,
          timestamp: now
        });
        
        return cachedData;
      }
    }
    
    // Attempt to get data from API with deduplication
    notificationRequestTracker.lastRequestTime = now;
    
    // Call the API
    const response = await callApi('getMyNotifications', {
      uid: userId,
      role: getUserRole(userId)
    });
    
    // Update backoff parameters based on success/failure
    if (response && response.success) {
      // Reset backoff on success
      notificationRequestTracker.backoffInterval = Math.max(0, notificationRequestTracker.backoffInterval - 500);
      notificationRequestTracker.consecutiveRequests = 0;
    } else {
      // Increase backoff on failure
      notificationRequestTracker.backoffInterval = Math.min(30000, notificationRequestTracker.backoffInterval + 1000);
      notificationRequestTracker.consecutiveRequests++;
    }
    
    // Process and cache successful results
    if (response && response.success && Array.isArray(response.notifications)) {
      // Process notifications to ensure consistent structure
      const processedData = processNotificationsData(response.notifications, options);
      
      // Cache processed data
      setMemoryCacheData(memoryCacheKey, processedData, {
        ttl: CACHE_TTL_CONFIG.notifications
      });
      
      // Update the in-memory notification tracker
      notificationRequestTracker.inMemoryCache.set(userId, {
        data: processedData,
        timestamp: now
      });
      
      // Also store in LRU cache for cross-component usage
      if (cacheKey) {
        enhancedCache?.set(
          CacheCategory.NOTIFICATIONS, 
          cacheKey, 
          processedData,
          { ttl: CACHE_TTL_CONFIG.notifications }
        );
      }
      
      return processedData;
    }
    
    // For no-data responses
    if (response && response.success) {
      const emptyData: Notification[] = [];
      
      // Cache empty responses with shorter TTL
      setMemoryCacheData(memoryCacheKey, emptyData, {
        ttl: 5000 // 5 seconds
      });
      
      // Update the in-memory notification tracker
      notificationRequestTracker.inMemoryCache.set(userId, {
        data: emptyData,
        timestamp: now
      });
      
      // Also store in LRU cache
      if (cacheKey) {
        enhancedCache?.set(
          CacheCategory.NOTIFICATIONS, 
          cacheKey, 
          emptyData, 
          { ttl: 5000 } // 5 seconds TTL
        );
      }
      
      return emptyData;
    }
    
    // If API failed but we have stale data, use it
    if (cacheKey) {
      const staleData = enhancedCache?.get<Notification[]>(
        CacheCategory.NOTIFICATIONS,
        cacheKey,
        { forceRefresh: false }
      );
      
      if (staleData) {
        // Cache stale data with shorter TTL
        setMemoryCacheData(memoryCacheKey, staleData, {
          ttl: 5000 // 5 seconds
        });
        
        // Update the in-memory notification tracker
        notificationRequestTracker.inMemoryCache.set(userId, {
          data: staleData,
          timestamp: now
        });
        
        return staleData;
      }
    }
    
    // Fallback to empty data if nothing else works
    return [];
  } catch (error) {
    logError('Error getting optimized notifications', { error, userId });
    
    // If other notification fetches were successful recently,
    // return their data instead of throwing
    const recentNotifications = notificationRequestTracker.inMemoryCache.get(userId);
    if (recentNotifications) {
      return recentNotifications.data;
    }
    
    throw new DataFetchError('Failed to fetch notifications', 'NOTIFICATIONS_FETCH_ERROR', {
      userId,
      error
    });
  }
}

/**
 * Process notifications data with filtering, sorting, and pagination
 */
function processNotificationsData(notifications: unknown[], options: FilterOptions): Notification[] {
  // Cast notifications to Notification[] to ensure compatibility
  let result = [...notifications] as Notification[];
  
  // Apply filters
  if (options.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        result = result.filter(item => {
          if (typeof value === 'string' && typeof item[key] === 'string') {
            return item[key].toLowerCase().includes(value.toLowerCase());
          }
          return item[key] === value;
        });
      }
    });
  }
  
  // Apply sorting (default to newest first for notifications)
  const sortBy = options.sortBy || 'createdAt';
  const sortOrder = options.sortOrder || 'desc';
  
  result.sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    return compareValues(aValue, bValue, sortOrder === 'desc');
  });
  
  // Apply pagination
  if (options.offset !== undefined || options.limit !== undefined) {
    const start = options.offset || 0;
    const end = options.limit ? start + options.limit : undefined;
    result = result.slice(start, end);
  }
  
  return result;
}

// Export utility functions for direct use in components
export { 
  setMemoryCacheData, 
  getMemoryCacheData, 
  clearMemoryCache,
  evictCacheEntries
};

/**
 * Base error class for optimized data access
 */
export class OptimizedDataError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'OptimizedDataError';
  }
}

function fallbackToLocalDb() {
  logWarn('Falling back to local database for data access');
  // Implementation...
} 