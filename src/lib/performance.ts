/**
 * performance.ts
 *
 * Simple performance tracking utility to measure execution time
 * for functions and operations in the application.
 */

import { logInfo } from './logger';

/** Interface for a basic performance tracker */
export interface PerformanceTracker {
  /** Stops the timer and returns the elapsed time in milliseconds */
  stop: () => number;

  /** Returns the current elapsed time without stopping the timer */
  current: () => number;
}

/**
 * Creates a performance tracker that measures elapsed time.
 *
 * @param label Name to identify this tracking session in logs
 * @returns PerformanceTracker object with stop() and current() methods
 *
 * @example
 * const perf = trackPerformance('fetchUsers');
 * // ... do something ...
 * const elapsedMs = perf.stop(); // logs and returns time
 */
export function trackPerformance(label: string): PerformanceTracker {
  const startTime = performance.now();
  let isStopped = false;

  return {
    stop: () => {
      if (isStopped) return 0;

      const endTime = performance.now();
      const elapsed = endTime - startTime;
      const roundedMs = Math.round(elapsed);

      logInfo(`Performance [${label}]: ${roundedMs}ms`);
      isStopped = true;

      return roundedMs;
    },

    current: () => {
      if (isStopped) return 0;
      return Math.round(performance.now() - startTime);
    },
  };
}

/**
 * Measures the execution time of an async function.
 *
 * @param label Name to identify this operation in logs
 * @param fn Async function to measure
 * @returns The result from the measured function
 *
 * @example
 * const result = await measureAsync('processData', async () => {
 *   return await processData();
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
