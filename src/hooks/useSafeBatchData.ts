'use client';

/**
 * A safer, simpler implementation of useBatchData that avoids infinite loop issues
 * by using React's useMemo instead of useState/useEffect combinations
 */

import { useMemo } from 'react';
import { useQueryClient, QueryClient } from '@tanstack/react-query';
import { logInfo } from '@/lib/logger';

/**
 * Generic type for a batch data result with success and error
 */
interface BatchDataResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Type for the batch result that comes from a useSomeBatch hook
 */
interface BatchQueryResult<T> {
  data?: { [key: string]: BatchDataResult<T> };
  isLoading: boolean;
  error: Error | null;
}

interface BatchDataOptions<T, R> {
  /**
   * Process data before returning it (transform data format)
   */
  processData?: (data: Record<string, BatchDataResult<T>>) => Record<string, R>;
  
  /**
   * Auto-update React Query cache with batch results
   */
  updateCache?: boolean;
}

/**
 * Hook result type
 */
interface SafeBatchDataResult<T, R> {
  data: Record<string, R>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to safely extract and process data from batch responses
 * 
 * @param batchResult Batch query result from a useSomeBatch hook
 * @param keys Array of keys to extract from the batch result
 * @param options Hook options
 * @returns Processed data, loading state, and any errors
 */
export function useSafeBatchData<T, R = BatchDataResult<T>>(
  batchResult: BatchQueryResult<T>,
  keys: string[],
  options: BatchDataOptions<T, R> = {}
): SafeBatchDataResult<T, R> {
  const queryClient = useQueryClient();
  
  // Default options
  const { 
    processData = ((d: Record<string, BatchDataResult<T>>) => d as unknown as Record<string, R>),
    updateCache = true
  } = options;
  
  // Use useMemo to derive the result without state updates
  const result = useMemo(() => {
    // Base result with defaults
    const baseResult: SafeBatchDataResult<T, R> = {
      data: {} as Record<string, R>,
      isLoading: true,
      error: null
    };
    
    // Handle missing batch result or loading state
    if (!batchResult || batchResult.isLoading) {
      return {
        ...baseResult,
        isLoading: true
      };
    }
    
    // Handle error state
    if (batchResult.error) {
      return {
        ...baseResult,
        isLoading: false,
        error: batchResult.error instanceof Error 
          ? batchResult.error 
          : new Error(String(batchResult.error))
      };
    }
    
    // Process the data if we have it
    try {
      const extractedData: Record<string, BatchDataResult<T>> = {};
      
      // Extract requested keys from batch result
      keys.forEach(key => {
        if (batchResult.data && batchResult.data[key]) {
          extractedData[key] = batchResult.data[key];
          
          // Update React Query cache if requested
          if (updateCache && extractedData[key].success) {
            updateQueryCache(key, extractedData[key], queryClient);
          }
        } else {
          extractedData[key] = { success: false, error: 'Not found in batch result' };
        }
      });
      
      // Apply custom data processing if provided
      const processedData = processData(extractedData);
      
      // Log results (only once when found)
      if (process.env.NODE_ENV !== 'production') {
        const foundKeys = Object.keys(extractedData).filter(k => extractedData[k].success);
        if (foundKeys.length > 0) {
          // Use a setTimeout to prevent the log from being part of the render
          setTimeout(() => {
            logInfo('Batch data processed', { keys, foundKeys });
          }, 0);
        }
      }
      
      return {
        data: processedData,
        isLoading: false,
        error: null
      };
    } catch (err) {
      // Handle errors in processing
      return {
        data: {} as Record<string, R>,
        isLoading: false,
        error: err instanceof Error ? err : new Error('Error processing batch data')
      };
    }
  }, [batchResult, keys, processData, updateCache, queryClient]);
  
  return result;
}

/**
 * Helper to update React Query cache with batch data
 */
function updateQueryCache<T>(key: string, data: BatchDataResult<T>, queryClient: QueryClient): void {
  // Determine the appropriate query key based on the data type
  let queryKey: unknown[];
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
    queryClient.setQueryData(queryKey, data);
  }
} 