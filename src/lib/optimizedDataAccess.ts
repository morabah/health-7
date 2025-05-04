'use client';

import {
  getUsers,
  getPatients,
  getDoctors,
  getAppointments,
  getNotifications
} from './localDb';
import { localApi } from './localApiFunctions';
import { cacheKeys, cacheManager } from './queryClient';
import { logInfo, logError } from './logger';
import { UserType } from '@/types/enums';

// Type for filtered data request options
interface FilterOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  fields?: string[];
  filters?: Record<string, unknown>;
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
  email?: string;
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
  const cacheKey = `users-${JSON.stringify(options)}`;
  
  try {
    // Try memory cache first (30 second TTL)
    const cachedData = getMemoryCacheData<User[]>(cacheKey);
    if (cachedData) {
      logInfo('Using memory cached users data');
      return cachedData;
    }
    
    // Try React Query cache next
    const queryData = cacheManager.getQueryData<{ success: boolean; users: User[] }>(
      cacheKeys.users(options.filters)
    );
    
    if (queryData?.success && queryData.users) {
      logInfo('Using React Query cached users data');
      
      // Apply filtering, sorting, and pagination in-memory
      let filteredData = [...queryData.users];
      
      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            filteredData = filteredData.filter(item => {
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
        filteredData.sort((a, b) => {
          const aValue = a[options.sortBy!];
          const bValue = b[options.sortBy!];
          
          if (options.sortOrder === 'desc') {
            return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
          }
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        });
      }
      
      // Apply pagination
      if (options.offset !== undefined || options.limit !== undefined) {
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : undefined;
        filteredData = filteredData.slice(start, end);
      }
      
      // Cache processed results
      setMemoryCacheData(cacheKey, filteredData);
      return filteredData;
    }
    
    // Fetch fresh data
    logInfo('Fetching fresh users data');
    const users = await getUsers();
    
    // Set in both caches
    cacheManager.setQueryData(cacheKeys.users(options.filters), { success: true, users });
    
    // Process and return data
    const processedData = processUsersData(users, options);
    setMemoryCacheData(cacheKey, processedData);
    return processedData;
  } catch (error) {
    logError('Error in getOptimizedUsers', error);
    return [];
  }
}

/**
 * Process users data with filtering, sorting and pagination
 */
function processUsersData(users: User[], options: FilterOptions): User[] {
  let result = [...users];
  
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
      
      if (options.sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
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
      const newItem: Record<string, any> = {};
      options.fields!.forEach(field => {
        if (field in item) {
          newItem[field] = item[field];
        }
      });
      return newItem;
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
    const queryData = cacheManager.getQueryData<any>(
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
      const adminCtx = { uid: 'admin', role: UserType.ADMIN };
      const result = await localApi.adminGetAllDoctors(adminCtx);
      
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
    
    // Fallback to direct database access
    const doctors = await getDoctors();
    
    // Enhanced data with user information
    const users = await getUsers();
    const enhancedDoctors = doctors.map(doctor => {
      const user = users.find(u => u.id === doctor.userId);
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
function processDoctorsData(doctors: Doctor[], options: FilterOptions): Doctor[] {
  let result = [...doctors];
  
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
      
      if (options.sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
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
    const appointments = await getAppointments();
    
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
function processAppointmentsData(appointments: Appointment[], options: FilterOptions): Appointment[] {
  let result = [...appointments];
  
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
    
    const sortOrder = options.sortOrder || 'desc';
    if (sortOrder === 'desc') {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
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
  const cacheKey = `notifications-${userId}-${JSON.stringify(options)}`;
  const mergedCacheOptions = { 
    ...DEFAULT_CACHE_OPTIONS, 
    ttl: CACHE_TTL_CONFIG.notifications,
    ...cacheOptions 
  };
  
  try {
    const now = Date.now();
    
    // Check if we're making too many requests in a short time
    const requestInterval = now - notificationRequestTracker.lastRequestTime;
    if (requestInterval < 300 && !mergedCacheOptions.forceRefresh) { // 300ms minimum between normal requests
      notificationRequestTracker.consecutiveRequests++;
      
      // If we have too many consecutive requests, use in-memory super-cache with longer TTL
      if (notificationRequestTracker.consecutiveRequests > 5) {
        const cachedData = notificationRequestTracker.inMemoryCache.get(cacheKey);
        if (cachedData && now - cachedData.timestamp < 10000) { // Special 10s TTL for rapid requests
          // Don't log this to avoid log spam
          return cachedData.data;
        }
      }
    } else {
      // Reset consecutive request counter if enough time has passed
      notificationRequestTracker.consecutiveRequests = 0;
    }
    
    // Update last request time
    notificationRequestTracker.lastRequestTime = now;
    
    // Check if we need to apply backoff due to errors
    if (notificationRequestTracker.backoffInterval > 0 && !mergedCacheOptions.forceRefresh) {
      if (now - notificationRequestTracker.lastRequestTime < notificationRequestTracker.backoffInterval) {
        // Try memory cache with extended TTL during backoff period
        const cachedData = getMemoryCacheData<Notification[]>(cacheKey);
        if (cachedData) {
          // Don't log during backoff to reduce spam
          return cachedData;
        }
      } else {
        // Reset backoff after it expires
        notificationRequestTracker.backoffInterval = 0;
      }
    }
    
    // Try memory cache first with shorter TTL for notifications
    if (!mergedCacheOptions.forceRefresh) {
      const cachedData = getMemoryCacheData<Notification[]>(cacheKey, mergedCacheOptions);
      if (cachedData) {
        // Only log cache hits when not in rapid succession
        if (notificationRequestTracker.consecutiveRequests < 3) {
          logInfo('Using memory cached notifications data');
        }
        return cachedData;
      }
    }
    
    // Try React Query cache next
    const queryData = cacheManager.getQueryData<{ success: boolean; notifications: Notification[] }>(
      cacheKeys.notifications(userId)
    );
    
    if (queryData?.success && queryData.notifications && !mergedCacheOptions.forceRefresh) {
      // Only log when not in rapid succession
      if (notificationRequestTracker.consecutiveRequests < 3) {
        logInfo('Using React Query cached notifications data');
      }
      
      // Apply filtering, sorting, and pagination in-memory
      const filteredData = processNotificationsData(queryData.notifications, options);
      
      // Cache processed results
      setMemoryCacheData(cacheKey, filteredData, { 
        ttl: CACHE_TTL_CONFIG.notifications,
        priority: 'normal' as const
      });
      
      // Also update the super-cache for rapid requests
      notificationRequestTracker.inMemoryCache.set(cacheKey, {
        data: filteredData,
        timestamp: now
      });
      
      return filteredData;
    }
    
    // Implement visibility-aware fetching - if document is hidden, extend TTL
    const isDocumentHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    if (isDocumentHidden && !mergedCacheOptions.forceRefresh) {
      // Double TTL when tab is not visible
      mergedCacheOptions.ttl *= 2;
    }
    
    // Fetch fresh notifications data
    // Only log when not in rapid succession
    if (notificationRequestTracker.consecutiveRequests < 3) {
      logInfo('Fetching fresh notifications data');
    }
    
    // Try to get user role from cache first
    const usersCacheKey = `users-${JSON.stringify({ filters: { id: userId } })}`;
    const cachedUsers = getMemoryCacheData<User[]>(usersCacheKey);
    const userRole = cachedUsers?.[0]?.role || UserType.PATIENT;
    
    // Call API to get notifications
    const result = await localApi.getMyNotifications({
      uid: userId,
      role: userRole
    });
    
    if (result.success && result.notifications) {
      // Set in both caches
      cacheManager.setQueryData(cacheKeys.notifications(userId), result);
      
      // Process and return data
      const processedData = processNotificationsData(result.notifications, options);
      setMemoryCacheData(cacheKey, processedData, { 
        ttl: CACHE_TTL_CONFIG.notifications,
        priority: 'normal' as const
      });
      
      // Also update the super-cache for rapid requests
      notificationRequestTracker.inMemoryCache.set(cacheKey, {
        data: processedData,
        timestamp: now
      });
      
      // Reset backoff on success
      notificationRequestTracker.backoffInterval = 0;
      
      return processedData;
    }
    
    // Fallback to direct database access
    const notifications = await getNotifications();
    
    // Filter notifications for this user
    const userNotifications = notifications.filter(notif => notif.userId === userId);
    
    // Set in both caches
    cacheManager.setQueryData(cacheKeys.notifications(userId), { 
      success: true, 
      notifications: userNotifications 
    });
    
    // Process and return data
    const processedData = processNotificationsData(userNotifications, options);
    setMemoryCacheData(cacheKey, processedData, { 
      ttl: CACHE_TTL_CONFIG.notifications,
      priority: 'normal' as const
    });
    
    // Also update the super-cache for rapid requests
    notificationRequestTracker.inMemoryCache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now()
    });
    
    return processedData;
  } catch (error) {
    // Set backoff on error to prevent rapid retries
    notificationRequestTracker.backoffInterval = Math.min(
      (notificationRequestTracker.backoffInterval || 1000) * 2, // Exponential backoff
      30000 // Max 30-second backoff
    );
    
    logError('Error in getOptimizedNotifications', error);
    return [];
  }
}

/**
 * Process notifications data with filtering, sorting, and pagination
 */
function processNotificationsData(notifications: Notification[], options: FilterOptions): Notification[] {
  let result = [...notifications];
  
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
    
    if (sortOrder === 'desc') {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
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