'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { callApi } from '@/lib/apiClient';
import { logInfo } from '@/lib/logger';

// Define cache durations directly since constants file may not exist
const CACHE_DURATIONS = {
  DOCTOR_PROFILE: 5 * 60 * 1000, // 5 minutes
  USER_PROFILE: 10 * 60 * 1000, // 10 minutes
  APPOINTMENTS: 2 * 60 * 1000 // 2 minutes
};

/**
 * Optimized hook to batch fetch multiple doctors data at once with improved caching
 * and pagination support for large datasets
 * 
 * @param doctorIds Array of doctor IDs to fetch
 * @param options Additional query options
 * @returns Query result with doctors data
 */
export const useOptimizedBatchDoctorData = (
  doctorIds: string[] = [], 
  options: { 
    enabled?: boolean;
    pagination?: { page: number; pageSize: number };
    filterBySpecialty?: string;
    filterByLocation?: string;
  } = {}
) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Ensure doctorIds are sorted to maintain consistent cache keys
  const sortedDoctorIds = [...doctorIds].sort();
  
  // Create a cache key that includes pagination and filter info
  const cacheKey = ['batchDoctors', 
    sortedDoctorIds.join(','),
    options.pagination?.page || 1,
    options.pagination?.pageSize || 10,
    options.filterBySpecialty || '',
    options.filterByLocation || ''
  ];
  
  return useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!sortedDoctorIds.length) {
        return { success: true, doctors: {} };
      }

      // Log batch request details for performance monitoring
      logInfo('Batch doctor data request', {
        count: sortedDoctorIds.length,
        pagination: options.pagination ? `${options.pagination.page}/${options.pagination.pageSize}` : 'none',
        filters: {
          specialty: options.filterBySpecialty || 'none',
          location: options.filterByLocation || 'none'
        }
      });

      if (!user?.uid) {
        // Allow anonymous access with limited data
        return callApi('batchGetDoctorsData', undefined, sortedDoctorIds, {
          pagination: options.pagination,
          filters: {
            specialty: options.filterBySpecialty,
            location: options.filterByLocation
          }
        });
      }
      
      // Execute with auth context when available
      return callApi('batchGetDoctorsData', 
        { uid: user.uid, role: user.role },
        sortedDoctorIds,
        {
          pagination: options.pagination,
          filters: {
            specialty: options.filterBySpecialty,
            location: options.filterByLocation
          }
        }
      );
    },
    enabled: options.enabled !== false && sortedDoctorIds.length > 0,
    staleTime: CACHE_DURATIONS.DOCTOR_PROFILE, // 5 minutes for doctor profiles
    // Keep data for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Deduplicate identical requests
    select: (data: any) => {
      if (!data.success || !data.doctors) {
        return { success: false, doctors: {} };
      }
      
      // Cache individual doctors to reduce future fetching
      // Only cache the full doctor profiles, not the paginated or filtered versions
      if (!options.pagination && !options.filterBySpecialty && !options.filterByLocation) {
        Object.entries(data.doctors).forEach(([doctorId, doctorData]) => {
          // Check if we already have this doctor in cache to avoid unnecessary updates
          const existingData = queryClient.getQueryData(['doctor', doctorId]);
          if (!existingData) {
            queryClient.setQueryData(['doctor', doctorId], { 
              success: true, 
              doctor: doctorData 
            });
          }
        });
      }
      
      // If we have pagination info in the response, include it
      if (data.pagination) {
        return {
          ...data,
          pagination: {
            page: data.pagination.page || options.pagination?.page || 1,
            pageSize: data.pagination.pageSize || options.pagination?.pageSize || 10,
            totalItems: data.pagination.totalItems || Object.keys(data.doctors).length,
            totalPages: data.pagination.totalPages || Math.ceil(Object.keys(data.doctors).length / (options.pagination?.pageSize || 10))
          }
        };
      }
      
      // Add pagination info if we're paginating client-side
      if (options.pagination) {
        const totalItems = Object.keys(data.doctors).length;
        return {
          ...data,
          pagination: {
            page: options.pagination.page,
            pageSize: options.pagination.pageSize,
            totalItems,
            totalPages: Math.ceil(totalItems / options.pagination.pageSize)
          }
        };
      }
      
      return data;
    }
  });
};

/**
 * Prefetch doctor data for a list of doctor IDs
 * This is useful for improving perceived performance by preloading data
 * that will likely be needed soon
 */
export const prefetchDoctorBatchData = async (
  doctorIds: string[],
  queryClient: any,
  options: {
    pagination?: { page: number; pageSize: number };
    filterBySpecialty?: string;
    filterByLocation?: string;
  } = {}
) => {
  if (!doctorIds.length) return;
  
  // Only prefetch a reasonable number of doctors to avoid excessive API calls
  const idsToFetch = doctorIds.slice(0, 10);
  
  // Sort IDs for consistent cache keys
  const sortedIds = [...idsToFetch].sort();
  
  // Create a cache key that includes pagination and filter info
  const cacheKey = ['batchDoctors', 
    sortedIds.join(','),
    options.pagination?.page || 1,
    options.pagination?.pageSize || 10,
    options.filterBySpecialty || '',
    options.filterByLocation || ''
  ];
  
  // Check if we already have this data in cache
  const existingData = queryClient.getQueryData(cacheKey);
  if (existingData) return;
  
  // Log prefetch for debugging
  logInfo('Prefetching doctor batch data', {
    count: idsToFetch.length,
    pagination: options.pagination ? `${options.pagination.page}/${options.pagination.pageSize}` : 'none',
    filters: {
      specialty: options.filterBySpecialty || 'none',
      location: options.filterByLocation || 'none'
    }
  });
  
  // Prefetch the data
  try {
    await queryClient.prefetchQuery({
      queryKey: cacheKey,
      queryFn: async () => {
        return callApi('batchGetDoctorsData', undefined, sortedIds, {
          pagination: options.pagination,
          filters: {
            specialty: options.filterBySpecialty,
            location: options.filterByLocation
          }
        });
      },
      staleTime: CACHE_DURATIONS.DOCTOR_PROFILE
    });
  } catch (error) {
    // Silently log errors but don't throw - this is just prefetching
    logInfo('Error prefetching doctor batch data', {
      error: error instanceof Error ? error.message : 'Unknown error',
      doctorIds: sortedIds
    });
  }
};
