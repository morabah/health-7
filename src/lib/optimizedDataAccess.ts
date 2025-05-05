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
import { enhancedCache, CacheCategory } from './cacheManager';
import { callApi } from './apiClient';
import { queryOptions } from '@tanstack/react-query';
import { DataError } from './errors';

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

// Use the imported error classes from errors.ts
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
  const cacheKey = enhancedCache.createKey('users', JSON.stringify(options));
  
  try {
    // Try enhanced LRU cache first
    const lruCachedData = enhancedCache.get<User[]>(CacheCategory.USERS, cacheKey);
    if (lruCachedData) {
      logInfo('Using LRU cached users data');
      return lruCachedData;
    }
    
    // Try memory cache next (legacy support)
    const cachedData = getMemoryCacheData<User[]>(`users-${JSON.stringify(options)}`);
    if (cachedData) {
      logInfo('Using memory cached users data');
      // Store in new LRU cache for future
      enhancedCache.set(CacheCategory.USERS, cacheKey, cachedData);
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
          
          return compareValues(aValue, bValue, options.sortOrder === 'desc');
        });
      }
      
      // Apply pagination
      if (options.offset !== undefined || options.limit !== undefined) {
        const start = options.offset || 0;
        const end = options.limit ? start + options.limit : undefined;
        filteredData = filteredData.slice(start, end);
      }
      
      // Cache processed results in the enhanced LRU cache
      enhancedCache.set(CacheCategory.USERS, cacheKey, filteredData);
      
      // Also update legacy cache for backward compatibility
      setMemoryCacheData(`users-${JSON.stringify(options)}`, filteredData);
      
      return filteredData;
    }
    
    // Fetch fresh data
    logInfo('Fetching fresh users data');
    const response = await callApi<{ success: boolean; users: User[] }>('getAllUsers');
    
    if (!response.success || !response.users || !Array.isArray(response.users)) {
      throw new DataFetchError(
        'Invalid response from users data source',
        'INVALID_USER_DATA',
        { dataType: typeof response.users, cacheKey },
        false
      );
    }
    
    const users = response.users;
    
    // Set in React Query cache
    cacheManager.setQueryData(cacheKeys.users(options.filters), { success: true, users });
    
    // Process and return data
    const processedData = processUsersData(users, options);
    
    // Store in enhanced LRU cache
    enhancedCache.set(CacheCategory.USERS, cacheKey, processedData);
    
    // Also update legacy cache for backward compatibility
    setMemoryCacheData(`users-${JSON.stringify(options)}`, processedData);
    
    return processedData;
  } catch (error) {
    // Enhanced error logging with context
    const errorContext = {
      operation: 'getOptimizedUsers',
      cacheKey,
      filterOptions: options,
      errorType: error instanceof Error ? error.name : typeof error
    };
    
    logError('Error in getOptimizedUsers', { error, ...errorContext });
    
    // Determine if we have a fallback strategy
    const shouldAttemptFallback = !(error instanceof DataFetchError && !error.retryable);
    
    if (shouldAttemptFallback) {
      logWarn('Attempting to recover with empty result in getOptimizedUsers');
      return [];
    }
    
    // Re-throw critical errors that shouldn't be handled here
    throw error;
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
  const cacheKey = enhancedCache.createKey('notifications', userId, JSON.stringify(options));
  
  let recoveryAttempted = false;
  
  try {
    const now = Date.now();
    
    // Check if we're making too many requests in a short time
    const requestInterval = now - notificationRequestTracker.lastRequestTime;
    if (requestInterval < 300 && !cacheOptions.forceRefresh) { // 300ms minimum between normal requests
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
    
    // First, try the enhanced LRU cache
    const lruCachedData = enhancedCache.get<Notification[]>(
      CacheCategory.NOTIFICATIONS, 
      cacheKey,
      { forceRefresh: cacheOptions.forceRefresh }
    );
    
    if (lruCachedData) {
      logInfo('Using LRU cached notifications data');
      return lruCachedData;
    }
    
    // Next try the legacy memory cache
    const cachedData = getMemoryCacheData<Notification[]>(
      `notifications-${userId}-${JSON.stringify(options)}`, 
      cacheOptions
    );
    
    if (cachedData) {
      logInfo('Using memory cached notifications data');
      // Store in enhanced LRU cache for future
      enhancedCache.set(CacheCategory.NOTIFICATIONS, cacheKey, cachedData);
      return cachedData;
    }
    
    // Next, try to get data from React Query cache
    const queryData = cacheManager.getQueryData<ApiResponse<Notification[]>>(
      cacheKeys.notifications(userId)
    );
    
    if (queryData?.success && 'notifications' in queryData && Array.isArray(queryData.notifications)) {
      logInfo('Using React Query cached notifications data');
      
      // Process the data (filtering, sorting, pagination)
      const processedData = processNotificationsData(queryData.notifications, options);
      
      // Store in enhanced LRU cache
      enhancedCache.set(
        CacheCategory.NOTIFICATIONS, 
        cacheKey, 
        processedData, 
        { priority: 'normal' }
      );
      
      // Also update legacy cache for backward compatibility
      setMemoryCacheData(
        `notifications-${userId}-${JSON.stringify(options)}`, 
        processedData, 
        { ttl: CACHE_TTL_CONFIG.notifications }
      );
      
      return processedData;
    }
    
    // No cached data found, need to fetch fresh
    logInfo('Fetching fresh notifications data');
    
    // Get user role from users collection if we need it for API call
    let userRole: UserRole = UserRole.PATIENT;
    try {
      const users = await getOptimizedUsers();
      const user = users.find(u => u.id === userId);
      if (user && 'userType' in user) {
        userRole = user.userType as UserRole;
      }
    } catch (error) {
      logError('Error getting user role for notifications, using default', error);
    }
    
    // Call API to get notifications with proper UserType
    const result = await callApi<ApiResponse<Notification[]>>(
      'getMyNotifications',
      {
        uid: userId,
        role: userRole
      }
    );
    
    if (result.success && 'notifications' in result && Array.isArray(result.notifications)) {
      // Set in both caches
      cacheManager.setQueryData(cacheKeys.notifications(userId), result);
      
      // Process and return data
      const processedData = processNotificationsData(result.notifications, options);
      
      // Store in enhanced LRU cache 
      enhancedCache.set(
        CacheCategory.NOTIFICATIONS, 
        cacheKey, 
        processedData, 
        { priority: 'normal' }
      );
      
      // Also update legacy cache for backward compatibility
      setMemoryCacheData(
        `notifications-${userId}-${JSON.stringify(options)}`, 
        processedData, 
        { ttl: CACHE_TTL_CONFIG.notifications }
      );
      
      // Also update the super-cache for rapid requests
      notificationRequestTracker.inMemoryCache.set(cacheKey, {
        data: processedData,
        timestamp: now
      });
      
      return processedData;
    }
    
    // API notification fetch failed, attempting database fallback
    logWarn('API notification fetch failed, attempting database fallback', {
      userId,
      apiSuccess: result.success,
      hasNotifications: 'notifications' in result ? !!result.notifications : false
    });
    
    recoveryAttempted = true;
    const notificationsResponse = await callApi<{ success: boolean; notifications: Notification[] }>('getAllNotifications');
    
    if (!notificationsResponse.success || !notificationsResponse.notifications || !Array.isArray(notificationsResponse.notifications)) {
      throw new DataFetchError(
        'Invalid response from notifications data source',
        'INVALID_NOTIFICATION_DATA',
        { dataType: typeof notificationsResponse.notifications, userId, cacheKey },
        false
      );
    }
    
    const notifications = notificationsResponse.notifications;
    
    // Filter notifications for this user
    const userNotifications = notifications.filter(notif => 
      typeof notif === 'object' && notif !== null && 'userId' in notif && notif.userId === userId
    );
    
    // Set in both caches
    cacheManager.setQueryData(cacheKeys.notifications(userId), { 
      success: true, 
      notifications: userNotifications 
    });
    
    // Process and return data
    const processedData = processNotificationsData(userNotifications, options);
    
    // Store in enhanced LRU cache
    enhancedCache.set(
      CacheCategory.NOTIFICATIONS, 
      cacheKey, 
      processedData, 
      { priority: 'normal' }
    );
    
    // Also update legacy cache for backward compatibility
    setMemoryCacheData(
      `notifications-${userId}-${JSON.stringify(options)}`, 
      processedData, 
      { ttl: CACHE_TTL_CONFIG.notifications }
    );
    
    // Also update the super-cache for rapid requests
    notificationRequestTracker.inMemoryCache.set(cacheKey, {
      data: processedData,
      timestamp: Date.now()
    });
    
    return processedData;
  } catch (error) {
    // Enhanced error handling with context
    const errorContext = {
      operation: 'getOptimizedNotifications',
      userId,
      cacheKey,
      filterOptions: options,
      recoveryAttempted,
      backoffInterval: notificationRequestTracker.backoffInterval,
      errorType: error instanceof Error ? error.name : typeof error
    };
    
    // Set backoff on error to prevent rapid retries
    notificationRequestTracker.backoffInterval = Math.min(
      (notificationRequestTracker.backoffInterval || 1000) * 2, // Exponential backoff
      30000 // Max 30-second backoff
    );
    
    logError('Error in getOptimizedNotifications', { error, ...errorContext });
    
    // Try to serve stale data on error as a last resort
    try {
      // First try LRU cache with force refresh option (to get expired data)
      const staleData = enhancedCache.get<Notification[]>(
        CacheCategory.NOTIFICATIONS, 
        cacheKey, 
        { forceRefresh: true }
      );
      
      if (staleData) {
        logWarn('Serving stale notification data from LRU cache due to error', { userId });
        return staleData;
      }
      
      // Fall back to legacy in-memory cache if needed
      const legacyStaleData = notificationRequestTracker.inMemoryCache.get(cacheKey);
      if (legacyStaleData) {
        logWarn('Serving stale notification data from legacy cache due to error', { 
          age: Date.now() - legacyStaleData.timestamp,
          userId
        });
        return legacyStaleData.data;
      }
    } catch (fallbackError) {
      // Just swallow this error - we'll return empty array below
    }
    
    return [];
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