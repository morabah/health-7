'use client';

/**
 * Optimized hook for batch data handling with improved caching and pagination support
 */

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { logInfo } from '@/lib/logger';
import { trackPerformance } from '@/lib/performance';

interface OptimizedBatchDataOptions {
  /**
   * Process data before returning it (transform data format)
   */
  processData?: (data: Record<string, any>) => Record<string, any>;
  
  /**
   * Auto-update React Query cache with batch results
   */
  updateCache?: boolean;
  
  /**
   * Pagination options for large datasets
   */
  pagination?: {
    page: number;
    pageSize: number;
  };
  
  /**
   * Filter function to reduce payload size
   */
  filterData?: (item: any) => boolean;
  
  /**
   * Track performance metrics
   */
  trackPerformance?: boolean;
}

/**
 * Optimized hook to extract and process data from batch responses
 * with improved caching, pagination, and performance tracking
 * 
 * @param batchResult Batch query result from a useSomeBatch hook
 * @param keys Array of keys to extract from the batch result
 * @param options Hook options
 * @returns Processed data, loading state, and any errors
 */
export function useOptimizedBatchData(
  batchResult: any,
  keys: string[],
  options: OptimizedBatchDataOptions = {}
) {
  const queryClient = useQueryClient();
  const perfTracker = useMemo(() => trackPerformance('useOptimizedBatchData'), []);
  
  // Default options
  const { 
    processData = (d) => d,
    updateCache = true,
    pagination,
    filterData,
    trackPerformance: shouldTrackPerformance = false
  } = options;
  
  // Memoize the extraction logic to avoid unnecessary processing
  const result = useMemo(() => {
    // Start performance tracking if enabled
    if (shouldTrackPerformance) {
      // No need to explicitly start as trackPerformance already starts tracking
    }
    
    const baseResult = {
      data: {} as Record<string, any>,
      isLoading: batchResult?.isLoading ?? true,
      error: batchResult?.error ?? null,
      pagination: pagination ? {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems: 0,
        totalPages: 0
      } : undefined
    };
    
    // If there's no data or loading/error, just return early
    if (!batchResult?.data || baseResult.isLoading || baseResult.error) {
      if (shouldTrackPerformance) {
        perfTracker.stop();
      }
      return baseResult;
    }
    
    try {
      // Extract data for the requested keys
      const extractedData: Record<string, any> = {};
      let totalItems = 0;
      
      keys.forEach(key => {
        if (batchResult.data && batchResult.data[key]) {
          let keyData = batchResult.data[key];
          
          // Apply filter if provided
          if (filterData && Array.isArray(keyData.data)) {
            keyData = {
              ...keyData,
              data: keyData.data.filter(filterData)
            };
          }
          
          // Apply pagination if provided
          if (pagination && Array.isArray(keyData.data)) {
            const { page, pageSize } = pagination;
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            
            // Store total count for pagination info
            totalItems = keyData.data.length;
            
            // Slice the data for the current page
            keyData = {
              ...keyData,
              data: keyData.data.slice(startIndex, endIndex),
              pagination: {
                page,
                pageSize,
                totalItems,
                totalPages: Math.ceil(totalItems / pageSize)
              }
            };
          }
          
          extractedData[key] = keyData;
          
          // Update React Query cache if requested
          if (updateCache && extractedData[key].success) {
            updateQueryCacheOptimized(key, extractedData[key], queryClient);
          }
        } else {
          extractedData[key] = { success: false, error: 'Not found in batch result' };
        }
      });
      
      // Process the data using the provided function
      const processedData = processData(extractedData);
      
      // Only log once when data is successfully processed
      const foundKeys = Object.keys(extractedData).filter(k => extractedData[k].success);
      if (foundKeys.length > 0) {
        logInfo('Batch data processed', { 
          keys, 
          foundKeys,
          withPagination: !!pagination,
          filtered: !!filterData
        });
      }
      
      // Update pagination info if needed
      const paginationInfo = pagination ? {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pagination.pageSize)
      } : undefined;
      
      // Log performance metrics if enabled
      if (shouldTrackPerformance) {
        const elapsed = perfTracker.stop();
        // Use structured performance logging with consistent format
        logInfo('Performance:BatchDataProcessing', {
          operation: 'batch_data_processing',
          metrics: {
            keys: keys.length,
            foundKeys: foundKeys.length,
            processingTimeMs: elapsed,
            dataSizeBytes: JSON.stringify(processedData).length,
          },
          context: {
            withPagination: !!pagination,
            filtered: !!filterData,
            cacheHitRatio: keys.length > 0 ? foundKeys.length / keys.length : 0,
          }
        });
      }
      
      // Return the processed data along with status and pagination info
      return {
        data: processedData,
        isLoading: false,
        error: null,
        pagination: paginationInfo
      };
    } catch (error) {
      // Log the error
      logInfo('Error processing batch data', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        keys
      });
      
      if (shouldTrackPerformance) {
        perfTracker.stop();
      }
      
      // Return error state if processing failed
      return {
        data: {} as Record<string, any>,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Error processing batch data'),
        pagination: pagination ? {
          page: pagination.page,
          pageSize: pagination.pageSize,
          totalItems: 0,
          totalPages: 0
        } : undefined
      };
    }
  }, [batchResult, keys, processData, updateCache, pagination, filterData, queryClient, perfTracker, shouldTrackPerformance]);
  
  return result;
}

/**
 * Optimized helper to update React Query cache with batch data
 * Uses more efficient caching strategies and prevents redundant updates
 */
function updateQueryCacheOptimized(key: string, data: any, queryClient: any) {
  // Determine the appropriate query key based on the data type
  let queryKey;
  switch (key) {
    case 'notifications':
      queryKey = ['notifications'];
      break;
    case 'upcomingAppointments':
      queryKey = ['appointments', 'upcoming'];
      break;
    case 'todayAppointments':
      queryKey = ['appointments', 'today'];
      break;
    case 'userProfile':
      queryKey = ['userProfile'];
      break;
    case 'adminStats':
      queryKey = ['admin', 'dashboard'];
      break;
    case 'pendingDoctors':
      queryKey = ['admin', 'doctors', { verificationStatus: 'pending' }];
      break;
    default:
      queryKey = [key];
  }
  
  // Only update if we have successful data
  if (data.success) {
    // Check if the data is already in the cache
    const existingData = queryClient.getQueryData(queryKey);
    
    // If data is identical, skip the update to prevent unnecessary rerenders
    if (existingData && JSON.stringify(existingData) === JSON.stringify(data)) {
      return;
    }
    
    // Update the cache with the new data
    queryClient.setQueryData(queryKey, data);
    
    // Log cache update for debugging
    logInfo('Query cache updated', { key, queryKey });
  }
}
