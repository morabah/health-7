'use client';

/**
 * Batch API Utilities
 * 
 * This module provides utilities for executing multiple API operations
 * in a single request to reduce network overhead and improve performance.
 */

import { callApi } from './apiClient';
import { logInfo, logError } from './logger';
import { trackPerformance } from './performance';

export type BatchOperation = {
  method: string;
  payload: Record<string, unknown>;
  key: string;
};

/**
 * Execute multiple API operations in a single batch request
 * 
 * @param operations Array of operations to execute
 * @param context Authentication context (optional)
 * @returns Consolidated results from all operations
 */
export async function executeBatchOperations(
  operations: BatchOperation[],
  context?: { uid: string; role: string }
): Promise<Record<string, unknown>> {
  const perf = trackPerformance('executeBatchOperations');
  try {
    logInfo('Executing batch operations', { 
      count: operations.length,
      methods: operations.map(op => op.method)
    });

    // Deduplicate operations based on method+payload hash
    const uniqueOps = deduplicateOperations(operations);
    perf.mark('deduplication-complete');
    
    // Call the batch API endpoint
    const result = await callApi('executeBatchOperations', context, { operations: uniqueOps });
    perf.mark('api-call-complete');
    
    // Parse and normalize response
    const formattedResults = formatBatchResults(result, operations);
    perf.mark('formatting-complete');
    
    logInfo('Batch operations completed successfully', { 
      originalCount: operations.length,
      uniqueCount: uniqueOps.length,
      resultCount: Object.keys(formattedResults).length - 1 // Subtract 'success' key
    });
    
    perf.stop();
    return formattedResults;
  } catch (error) {
    logError('Batch operations failed', { 
      error, 
      operationCount: operations.length 
    });
    perf.stop();
    throw error;
  }
}

/**
 * Helper function to deduplicate operations
 * 
 * @param operations Array of batch operations
 * @returns Deduplicated array of operations
 */
function deduplicateOperations(operations: BatchOperation[]): BatchOperation[] {
  const uniqueOps = new Map<string, BatchOperation>();
  
  operations.forEach(op => {
    const key = `${op.method}:${JSON.stringify(op.payload)}`;
    if (!uniqueOps.has(key)) {
      uniqueOps.set(key, op);
    }
  });
  
  return Array.from(uniqueOps.values());
}

/**
 * Format batch results to match the expected structure
 * 
 * @param result Raw API response
 * @param originalOperations Original operations array
 * @returns Formatted results with original operation keys
 */
function formatBatchResults(
  result: any,
  originalOperations: BatchOperation[]
): Record<string, unknown> {
  if (!result.success || !result.results) {
    return { success: false, error: result.error || 'Unknown error in batch operation' };
  }
  
  const formattedResults: Record<string, unknown> = { success: true };
  
  originalOperations.forEach(op => {
    // Match the operation with its result using the key
    // If the operation was deduplicated, we still include it in the results
    if (result.results[op.key]) {
      formattedResults[op.key] = result.results[op.key];
    } else {
      // Try to find the result using the operation method and payload
      // This handles when the operation was renamed during deduplication
      const opKey = `${op.method}:${JSON.stringify(op.payload)}`;
      let found = false;
      
      // Search through the results for a matching operation
      Object.entries(result.results).forEach(([key, value]) => {
        if (!found && typeof value === 'object' && value !== null && 'method' in value && 'payload' in value) {
          const resultKey = `${(value as any).method}:${JSON.stringify((value as any).payload)}`;
          if (resultKey === opKey) {
            formattedResults[op.key] = (value as any).result;
            found = true;
          }
        }
      });
      
      // If we still don't have a result, add a not found error
      if (!found) {
        formattedResults[op.key] = { success: false, error: 'Result not found' };
      }
    }
  });
  
  return formattedResults;
}

/**
 * Create a batch operation object
 * 
 * @param method API method name
 * @param payload Method parameters
 * @param key Result key identifier
 * @returns BatchOperation object
 */
export function createBatchOperation(
  method: string, 
  payload: Record<string, unknown> = {}, 
  key?: string
): BatchOperation {
  return {
    method,
    payload,
    // Use method as key if not provided
    key: key || method
  };
} 