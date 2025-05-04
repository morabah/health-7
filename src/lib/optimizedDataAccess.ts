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
  filters?: Record<string, any>;
}

// Cache storage for in-memory data
const memoryCache: Record<string, {
  data: any;
  timestamp: number;
  expiresAt: number;
}> = {};

/**
 * Set data in the memory cache with expiration
 */
function setMemoryCacheData(key: string, data: any, ttlMs = 30000): void {
  const now = Date.now();
  memoryCache[key] = {
    data,
    timestamp: now,
    expiresAt: now + ttlMs
  };
}

/**
 * Get data from memory cache if not expired
 */
function getMemoryCacheData<T>(key: string): T | null {
  const cached = memoryCache[key];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }
  return null;
}

/**
 * Clear a specific cache entry or all entries
 */
function clearMemoryCache(key?: string): void {
  if (key) {
    delete memoryCache[key];
  } else {
    Object.keys(memoryCache).forEach(k => delete memoryCache[k]);
  }
}

/**
 * Get users with optimized filtering and caching
 */
export async function getOptimizedUsers(options: FilterOptions = {}): Promise<any[]> {
  const cacheKey = `users-${JSON.stringify(options)}`;
  
  try {
    // Try memory cache first (30 second TTL)
    const cachedData = getMemoryCacheData<any[]>(cacheKey);
    if (cachedData) {
      logInfo('Using memory cached users data');
      return cachedData;
    }
    
    // Try React Query cache next
    const queryData = cacheManager.getQueryData<{ success: boolean; users: any[] }>(
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
function processUsersData(users: any[], options: FilterOptions): any[] {
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
 * Get doctors with optimized filtering and caching
 */
export async function getOptimizedDoctors(options: FilterOptions = {}): Promise<any[]> {
  const cacheKey = `doctors-${JSON.stringify(options)}`;
  
  try {
    // Try memory cache first (30 second TTL)
    const cachedData = getMemoryCacheData<any[]>(cacheKey);
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
function processDoctorsData(doctors: any[], options: FilterOptions): any[] {
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
 * Get appointments with optimized filtering and caching
 */
export async function getOptimizedAppointments(options: FilterOptions = {}): Promise<any[]> {
  const cacheKey = `appointments-${JSON.stringify(options)}`;
  
  try {
    // Try memory cache first (15 second TTL for appointments - shorter because they change frequently)
    const cachedData = getMemoryCacheData<any[]>(cacheKey);
    if (cachedData) {
      logInfo('Using memory cached appointments data');
      return cachedData;
    }
    
    // Fetch appointments - no advanced caching as they change frequently
    logInfo('Fetching fresh appointments data');
    const appointments = await getAppointments();
    
    // Process and return data
    const processedData = processAppointmentsData(appointments, options);
    setMemoryCacheData(cacheKey, processedData, 15000); // 15 seconds TTL
    return processedData;
  } catch (error) {
    logError('Error in getOptimizedAppointments', error);
    return [];
  }
}

/**
 * Process appointments data with filtering, sorting and pagination
 */
function processAppointmentsData(appointments: any[], options: FilterOptions): any[] {
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

// Export utility functions
export {
  clearMemoryCache,
  setMemoryCacheData,
  getMemoryCacheData
}; 