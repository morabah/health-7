/**
 * performance.ts
 *
 * Simple performance tracking utility to measure execution time
 * for functions and operations in the application.
 */

import { logInfo } from './logger';
import { useRef, useEffect } from 'react';

/** Interface for a basic performance tracker */
export interface PerformanceTracker {
  /** Stops the timer and returns the elapsed time in milliseconds */
  stop: () => number;

  /** Returns the current elapsed time without stopping the timer */
  current: () => number;
  
  /** Marks a point in time during execution with a label */
  mark: (markerName: string) => void;
}

/**
 * Creates a performance tracker that measures elapsed time.
 *
 * @param label Name to identify this tracking session in logs
 * @returns PerformanceTracker object with stop(), current(), and mark() methods
 *
 * @example
 * const perf = trackPerformance('fetchUsers');
 * // ... do something ...
 * perf.mark('data-loaded');
 * // ... do more things ...
 * const elapsedMs = perf.stop(); // logs and returns time
 */
export function trackPerformance(label: string): PerformanceTracker {
  const startTime = performance.now();
  const markers: Record<string, number> = {};
  let isStopped = false;

  return {
    stop: () => {
      if (isStopped) return 0;

      const endTime = performance.now();
      const elapsed = endTime - startTime;
      const roundedMs = Math.round(elapsed);

      // Log any markers collected during execution
      const markerInfo = Object.entries(markers)
        .map(([name, time]) => `${name}: ${Math.round(time - startTime)}ms`)
        .join(', ');
        
      const logMessage = markerInfo 
        ? `Performance [${label}]: ${roundedMs}ms (${markerInfo})`
        : `Performance [${label}]: ${roundedMs}ms`;
        
      logInfo(logMessage);
      isStopped = true;

      return roundedMs;
    },

    current: () => {
      if (isStopped) return 0;
      return Math.round(performance.now() - startTime);
    },
    
    mark: (markerName: string) => {
      if (isStopped) return;
      markers[markerName] = performance.now();
      
      // Optionally log each marker as it happens (useful for long-running operations)
      // logInfo(`Performance [${label}] Mark: ${markerName} at ${Math.round(markers[markerName] - startTime)}ms`);
    }
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

/**
 * Hook to track component render time
 * 
 * @param componentName The name of the component being tracked
 * @param threshold Optional threshold in ms to only log renders longer than this value
 * 
 * @example
 * function MyComponent() {
 *   useRenderPerformance('MyComponent', 50); // Only log renders > 50ms
 *   // Component logic...
 * }
 */
export function useRenderPerformance(componentName: string, threshold: number = 0) {
  const renderStartTime = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    
    // Only log if render time exceeds threshold
    if (renderTime > threshold) {
      logInfo(`Render time for ${componentName}: ${Math.round(renderTime)}ms`);
    }
    
    // Update for next render
    return () => {
      renderStartTime.current = performance.now();
    };
  });
}
