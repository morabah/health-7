'use client';

/**
 * Batch API Fallback Mechanisms
 * 
 * This module provides fallback mechanisms for batch API operations
 * to handle failures gracefully and maintain application functionality.
 */

import { callApi } from './apiClient';
import { logInfo, logError } from './logger';
import { trackPerformance } from './performance';
import type { BatchOperation } from './batchApiUtils';

/**
 * Execute a batch request with automatic fallback to individual API calls
 * if the batch request fails.
 * 
 * @param operations Array of batch operations to execute
 * @param context Authentication context
 * @param options Fallback options
 * @returns Consolidated results from all operations
 */
export async function executeBatchWithFallback(
  operations: BatchOperation[],
  context?: { uid: string; role: string },
  options: {
    retryCount?: number;
    fallbackToIndividual?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<Record<string, unknown>> {
  const {
    retryCount = 1,
    fallbackToIndividual = true,
    timeoutMs = 10000
  } = options;
  
  const perf = trackPerformance('executeBatchWithFallback');
  
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Batch operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });
    
    // Create the batch request promise
    const batchPromise = callApi('executeBatchOperations', context, { operations });
    
    // Execute with timeout
    const result = await Promise.race([batchPromise, timeoutPromise]) as {
      success: boolean;
      results?: Record<string, unknown>;
      error?: string;
    };
    
    if (result.success && result.results) {
      // Process the successful result
      perf.mark('batch-success');
      logInfo('Batch operation completed successfully', {
        operationCount: operations.length
      });
      perf.stop();
      return result.results;
    } else {
      throw new Error(result.error || 'Batch operation failed');
    }
  } catch (error) {
    logError('Batch operation failed, attempting recovery', { error, retryCount });
    perf.mark('batch-failed');
    
    // Try retrying the batch operation first
    if (retryCount > 0) {
      try {
        logInfo('Retrying batch operation', { remainingRetries: retryCount - 1 });
        return await executeBatchWithFallback(operations, context, {
          ...options,
          retryCount: retryCount - 1
        });
      } catch (retryError) {
        logError('Batch retry failed', { error: retryError });
      }
    }
    
    // If retries failed and fallback is enabled, fall back to individual calls
    if (fallbackToIndividual) {
      logInfo('Falling back to individual API calls', { operationCount: operations.length });
      perf.mark('fallback-started');
      
      const results: Record<string, unknown> = { success: true };
      
      // Execute operations individually
      await Promise.all(
        operations.map(async (op) => {
          try {
            const result = await callApi(op.method, context, op.payload);
            results[op.key] = result;
          } catch (individualError) {
            logError('Individual operation failed', { 
              method: op.method, 
              key: op.key, 
              error: individualError 
            });
            results[op.key] = { 
              success: false, 
              error: individualError instanceof Error 
                ? individualError.message 
                : 'Unknown error' 
            };
          }
        })
      );
      
      perf.mark('fallback-completed');
      logInfo('Fallback completed', { 
        successCount: Object.keys(results).filter(key => 
          key !== 'success' && 
          typeof results[key] === 'object' && 
          results[key] !== null && 
          (results[key] as any).success === true
        ).length
      });
      
      perf.stop();
      return results;
    }
    
    // If neither retry nor fallback worked, throw the error
    perf.stop();
    throw error;
  }
}

/**
 * Higher-order function that wraps a batch operation function with
 * fallback capabilities.
 * 
 * @param batchFn The batch operation function to wrap
 * @param options Fallback options
 * @returns A wrapped function with fallback capabilities
 */
export function withBatchFallback<T extends (...args: any[]) => Promise<any>>(
  batchFn: T,
  options: {
    retryCount?: number;
    fallbackToIndividual?: boolean;
    timeoutMs?: number;
    getFallbackFn?: (args: Parameters<T>) => (...args: any[]) => Promise<any>;
  } = {}
): T {
  return (async (...args: Parameters<T>) => {
    try {
      // Try the normal batch function first
      return await batchFn(...args);
    } catch (error) {
      logError('Batch function failed, attempting fallback', {
        functionName: batchFn.name,
        error
      });
      
      // If there's a custom fallback function, use it
      if (options.getFallbackFn) {
        const fallbackFn = options.getFallbackFn(args);
        logInfo('Using custom fallback function', { functionName: fallbackFn.name });
        return await fallbackFn(...args);
      }
      
      // Otherwise, just throw the error
      throw error;
    }
  }) as T;
} 