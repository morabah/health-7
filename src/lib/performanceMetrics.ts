'use client';

import { logInfo } from './logger';
import type { ComponentType} from 'react';
import React, { useRef, useEffect } from 'react';

/**
 * Performance metrics tracking utility
 * Helps identify performance bottlenecks and optimize the application
 */

// Store for performance metrics
interface PerformanceMetric {
  name: string;
  start: number;
  end?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

// Performance metrics history (recent operations)
const metricsHistory: PerformanceMetric[] = [];

// Maximum metrics history to keep
const MAX_METRICS_HISTORY = 100;

// Active performance spans
const activeSpans: Record<string, PerformanceMetric> = {};

// Aggregated metrics by operation type
interface OperationMetrics {
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
  lastTimestamp: number;
}

const metricsByOperation: Record<string, OperationMetrics> = {};

/**
 * Start a performance measurement
 * @param name Name of the operation being measured
 * @param metadata Additional data to attach to the metric
 * @returns ID of the measurement span
 */
export function startMeasurement(name: string, metadata?: Record<string, unknown>): string {
  const id = `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  const metric: PerformanceMetric = {
    name,
    start: performance.now(),
    metadata
  };
  
  activeSpans[id] = metric;
  return id;
}

/**
 * End a performance measurement
 * @param id ID of the measurement span
 * @param additionalMetadata Additional metadata to attach to the final metric
 * @returns Duration of the operation in milliseconds
 */
export function endMeasurement(id: string, additionalMetadata?: Record<string, unknown>): number {
  const span = activeSpans[id];
  if (!span) {
    console.warn(`No active performance span found with id: ${id}`);
    return 0;
  }
  
  const endTime = performance.now();
  const duration = endTime - span.start;
  
  // Update the span
  span.end = endTime;
  span.duration = duration;
  if (additionalMetadata) {
    span.metadata = { ...span.metadata, ...additionalMetadata };
  }
  
  // Add to history, keeping only recent entries
  metricsHistory.unshift(span);
  if (metricsHistory.length > MAX_METRICS_HISTORY) {
    metricsHistory.pop();
  }
  
  // Update aggregated metrics
  if (!metricsByOperation[span.name]) {
    metricsByOperation[span.name] = {
      count: 0,
      totalDuration: 0,
      minDuration: duration,
      maxDuration: duration,
      lastDuration: duration,
      lastTimestamp: Date.now()
    };
  }
  
  const opMetrics = metricsByOperation[span.name];
  opMetrics.count++;
  opMetrics.totalDuration += duration;
  opMetrics.minDuration = Math.min(opMetrics.minDuration, duration);
  opMetrics.maxDuration = Math.max(opMetrics.maxDuration, duration);
  opMetrics.lastDuration = duration;
  opMetrics.lastTimestamp = Date.now();
  
  // Clean up
  delete activeSpans[id];
  
  // Log performance for important operations
  if (duration > 500) {
    // Log slow operations
    logInfo('PERFORMANCE_SLOW', {
      operation: span.name,
      duration,
      metadata: span.metadata
    });
  }
  
  return duration;
}

/**
 * Measure a function's execution time
 * @param name Name of the operation being measured
 * @param fn Function to measure
 * @param metadata Additional data to attach to the metric
 * @returns Result of the function
 */
export async function measureAsync<T>(
  name: string, 
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const id = startMeasurement(name, metadata);
  
  try {
    const result = await fn();
    endMeasurement(id);
    return result;
  } catch (error) {
    endMeasurement(id, { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Sync version of measureAsync
 */
export function measure<T>(
  name: string, 
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  const id = startMeasurement(name, metadata);
  
  try {
    const result = fn();
    endMeasurement(id);
    return result;
  } catch (error) {
    endMeasurement(id, { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Interface for performance metrics summary
 */
export interface PerformanceMetricsSummary {
  name: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  lastDuration: number;
  lastExecuted: Date;
}

/**
 * Interface for all performance metrics data
 */
export interface AllPerformanceMetrics {
  summary: PerformanceMetricsSummary[];
  recentOperations: PerformanceMetric[];
}

/**
 * Get performance metrics for all operations
 * @returns Summary of all tracked operations
 */
export function getPerformanceMetrics(): AllPerformanceMetrics {
  const summary = Object.entries(metricsByOperation).map(([name, metrics]) => ({
    name,
    count: metrics.count,
    avgDuration: metrics.totalDuration / metrics.count,
    minDuration: metrics.minDuration,
    maxDuration: metrics.maxDuration,
    lastDuration: metrics.lastDuration,
    lastExecuted: new Date(metrics.lastTimestamp)
  }));
  
  return {
    summary,
    recentOperations: metricsHistory.slice(0, 20) // Return only the 20 most recent operations
  };
}

/**
 * Create a higher-order component that measures render time
 * @param Component React component to measure
 * @param name Optional custom name for the metric
 * @returns Wrapped component with performance measurement
 */
export function withPerformanceTracking<P extends object>(
  Component: ComponentType<P>,
  name?: string
): React.FC<P> {
  const displayName = name || Component.displayName || Component.name || 'UnknownComponent';
  const metricName = `render_${displayName}`;
  
  // Properly typed wrapped component
  const WrappedComponent: React.FC<P> = (props: P) => {
    const id = useRef<string | null>(null);
    
    useEffect(() => {
      // Start measurement after initial render
      id.current = startMeasurement(metricName);
      
      return () => {
        // End measurement during cleanup
        if (id.current) {
          const duration = endMeasurement(id.current);
          
          // Log unusually slow renders
          if (duration > 100) {
            logInfo('SLOW_RENDER', { component: displayName, duration });
          }
        }
      };
    }, []);
    
    // Using React.createElement for better type safety
    return React.createElement(Component, props);
  };
  
  WrappedComponent.displayName = `WithPerformanceTracking(${displayName})`;
  return WrappedComponent;
}

/**
 * Type for tracked props in components
 */
export type TrackedProps = Record<string, unknown>;

/**
 * Interface for the return value of usePerformanceTracking
 */
export interface PerformanceTrackingHook {
  startMeasurement: (operationName: string, metadata?: Record<string, unknown>) => string;
  endMeasurement: typeof endMeasurement;
  renderCount: number;
  trackPropsChange: (currentProps: TrackedProps) => void;
}

/**
 * Performance measurement hook for React components
 * @param name Name of the component or operation
 * @param trackProps Whether to track prop changes
 * @returns Performance tracking helpers
 */
export function usePerformanceTracking(name: string, trackProps = false): PerformanceTrackingHook {
  const renderCount = useRef(0);
  const prevProps = useRef<TrackedProps | null>(null);
  
  // Track render count
  renderCount.current++;
  
  // Track what caused re-renders by comparing props
  const trackPropsChange = (currentProps: TrackedProps): void => {
    if (trackProps && renderCount.current > 1 && prevProps.current) {
      const propsChanged: Record<string, { from: unknown; to: unknown }> = {};
      
      Object.keys(prevProps.current).forEach(key => {
        if (prevProps.current?.[key] !== currentProps[key]) {
          propsChanged[key] = {
            from: prevProps.current?.[key],
            to: currentProps[key]
          };
        }
      });
      
      if (Object.keys(propsChanged).length > 0) {
        logInfo('COMPONENT_RERENDER', {
          component: name,
          renderCount: renderCount.current,
          propsChanged
        });
      }
    }
    
    // Store current props for next comparison
    if (trackProps) {
      prevProps.current = { ...currentProps };
    }
  };
  
  return {
    startMeasurement: (operationName: string, metadata?: Record<string, unknown>) => 
      startMeasurement(`${name}_${operationName}`, metadata),
    endMeasurement,
    renderCount: renderCount.current,
    trackPropsChange
  };
} 