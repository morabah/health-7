'use client';

/**
 * Hook to extract and process data from batch responses
 * 
 * This hook simplifies using data from batch API responses in components.
 */

import { useMemo } from 'react'; // Just use useMemo, no state or effect
import { useQueryClient } from '@tanstack/react-query';
import { logInfo } from '@/lib/logger';

interface BatchDataOptions {
  /**
   * Process data before returning it (transform data format)
   */
  processData?: (data: Record<string, any>) => Record<string, any>;
  
  /**
   * Auto-update React Query cache with batch results
   */
  updateCache?: boolean;
}

/**
 * Hook to extract and process data from batch responses
 * 
 * Simplified implementation that avoids state management issues
 * by using React Query state directly and minimal processing.
 * 
 * @param batchResult Batch query result from a useSomeBatch hook
 * @param keys Array of keys to extract from the batch result
 * @param options Hook options
 * @returns Processed data, loading state, and any errors
 */
export function useBatchData(
  batchResult: any,
  keys: string[],
  options: BatchDataOptions = {}
) {
  const queryClient = useQueryClient();
  
  // Default options
  const { 
    processData = (d) => d,
    updateCache = true
  } = options;
  
  // Memoize the extraction logic to avoid unnecessary processing
  const result = useMemo(() => {
    const baseResult = {
      data: {} as Record<string, any>,
      isLoading: batchResult?.isLoading ?? true,
      error: batchResult?.error ?? null
    };
    
    // If there's no data or loading/error, just return early
    if (!batchResult?.data || baseResult.isLoading || baseResult.error) {
      return baseResult;
    }
    
    try {
      // Extract data for the requested keys
      const extractedData: Record<string, any> = {};
      
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
      
      // Process the data using the provided function
      const processedData = processData(extractedData);
      
      // Only log once when data is successfully processed
      const foundKeys = Object.keys(extractedData).filter(k => extractedData[k].success);
      if (process.env.NODE_ENV !== 'production' && foundKeys.length > 0) {
        logInfo('Batch data processed', { keys, foundKeys });
      }
      
      // Return the processed data along with status
      return {
        data: processedData,
        isLoading: false,
        error: null
      };
    } catch (error) {
      // Return error state if processing failed
      return {
        data: {} as Record<string, any>,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Error processing batch data')
      };
    }
  }, [batchResult, keys, processData, updateCache, queryClient]);
  
  return result;
}

/**
 * Helper to update React Query cache with batch data
 */
function updateQueryCache(key: string, data: any, queryClient: any) {
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
    queryClient.setQueryData(queryKey, data);
  }
} 