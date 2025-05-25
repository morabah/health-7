/**
 * performance.ts
 *
 * Performance tracking utility for Firebase Cloud Functions
 * Adapted from frontend version to work in the serverless environment
 * without React-specific hooks
 */

import { logInfo } from './logger';

/** Interface for a basic performance tracker */
export interface PerformanceTracker {
  /** Stops the timer and returns the elapsed time in milliseconds */
  stop: () => number;

  /** Returns the current elapsed time without stopping the timer */
  current: () => number;
  
  /** Marks a point in time during execution with a label */
  mark: (markerName: string) => void;
  
  /** Gets the elapsed time in milliseconds without stopping the timer */
  getElapsedTime: () => number;
}

/**
 * Creates a performance tracker that measures elapsed time in Cloud Functions.
 *
 * @param label Name to identify this tracking session in logs
 * @returns PerformanceTracker object with stop(), current(), and mark() methods
 *
 * @example
 * const perf = trackPerformance('processFirestoreData');
 * // ... do something ...
 * perf.mark('data-loaded');
 * // ... do more things ...
 * const elapsedMs = perf.stop(); // logs and returns time
 */
export function trackPerformance(label: string): PerformanceTracker {
  const startTime = Date.now(); // Use Date.now() instead of performance.now() in Cloud Functions
  const markers: Record<string, number> = {};
  let isStopped = false;

  return {
    stop: () => {
      if (isStopped) return 0;

      const endTime = Date.now();
      const elapsed = endTime - startTime;

      // Log any markers collected during execution
      const markerInfo = Object.entries(markers)
        .map(([name, time]) => `${name}: ${time - startTime}ms`)
        .join(', ');
        
      logInfo(`⏱️ ${label} completed in ${elapsed}ms${markerInfo ? ` (${markerInfo})` : ''}`, {
        label,
        duration: elapsed,
        markers: Object.keys(markers).length > 0 ? markers : undefined,
      });
      isStopped = true;

      return elapsed;
    },

    current: () => {
      if (isStopped) return 0;
      return Date.now() - startTime;
    },
    
    mark: (markerName: string) => {
      if (isStopped) return;
      markers[markerName] = Date.now();
    },
    
    getElapsedTime: () => {
      if (isStopped) return 0;
      return Date.now() - startTime;
    },
  };
}

/**
 * Measures the execution time of an async function in Cloud Functions.
 *
 * @param label Name to identify this operation in logs
 * @param fn Async function to measure
 * @returns The result from the measured function
 *
 * @example
 * const result = await measureAsync('firestoreQuery', async () => {
 *   return await db.collection('users').get();
 * });
 */
export async function measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const perf = trackPerformance(label);
  try {
    return await fn();
  } finally {
    perf.stop();
  }
}

/**
 * Measures the execution time of a synchronous function in Cloud Functions.
 *
 * @param label Name to identify this operation in logs
 * @param fn Synchronous function to measure
 * @returns The result from the measured function
 *
 * @example
 * const result = measureSync('dataProcessing', () => {
 *   return processUserData(userData);
 * });
 */
export function measureSync<T>(label: string, fn: () => T): T {
  const perf = trackPerformance(label);
  try {
    return fn();
  } finally {
    perf.stop();
  }
} 