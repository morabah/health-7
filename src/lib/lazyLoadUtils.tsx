'use client';

import React, { lazy, Suspense, useState, useEffect } from 'react';
import { logError } from './logger';
import { startMeasurement, endMeasurement } from './performanceMetrics';

// Types for lazy loading options
interface LazyLoadOptions {
  minimumLoadTime?: number;
  errorFallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * Default loading component used when no custom component is provided
 */
const DefaultLoadingComponent: React.FC = () => (
  <div className="flex justify-center items-center py-10">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

/**
 * Default error fallback component
 */
const DefaultErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
          Error loading component
        </h3>
        <div className="mt-2 text-sm text-red-700 dark:text-red-300">
          <p>{error.message || 'An unknown error occurred'}</p>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Higher-order component that wraps a lazy-loaded component with error boundaries,
 * loading states, and performance tracking.
 * 
 * @param factory Function that returns a dynamic import
 * @param options Configuration options for lazy loading behavior
 * @returns A component that lazy loads the target component
 */
export function lazyLoad<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.FC<React.ComponentProps<T>> {
  const {
    minimumLoadTime = 0,
    errorFallback,
    loadingComponent = <DefaultLoadingComponent />,
  } = options;

  // Create a lazy-loaded component
  const LazyComponent = lazy(async () => {
    // Start measuring load time
    const perfId = startMeasurement('lazy-component-load');
    
    try {
      // If minimum load time is specified, we use Promise.all to ensure the component
      // doesn't render too quickly and cause UI flickering
      if (minimumLoadTime > 0) {
        const [moduleExports] = await Promise.all([
          factory(),
          new Promise(resolve => setTimeout(resolve, minimumLoadTime))
        ]);
        
        // End measurement with success
        endMeasurement(perfId, { success: true });
        
        return moduleExports;
      }
      
      // Standard loading without minimum time
      const moduleExports = await factory();
      
      // End measurement with success
      endMeasurement(perfId, { success: true });
      
      return moduleExports;
    } catch (error) {
      // End measurement with error
      endMeasurement(perfId, { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Log error but also let it propagate
      logError('Error lazy loading component', error);
      throw error;
    }
  });

  // Create error boundary wrapper component
  const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
      // Reset error state when children change
      setHasError(false);
      setError(null);
    }, [children]);
    
    // If there's an error, show fallback UI
    if (hasError && error) {
      return errorFallback ? (
        <>{errorFallback}</>
      ) : (
        <DefaultErrorFallback error={error} />
      );
    }
    
    // If no error, render children
    try {
      return <>{children}</>;
    } catch (e) {
      // This handles errors during render
      setHasError(true);
      setError(e instanceof Error ? e : new Error(String(e)));
      return errorFallback ? (
        <>{errorFallback}</>
      ) : (
        <DefaultErrorFallback error={e instanceof Error ? e : new Error(String(e))} />
      );
    }
  };

  // Return the component with Suspense and error handling
  const LazyLoadComponent: React.FC<React.ComponentProps<T>> = (props) => (
    <ErrorBoundary>
      <Suspense fallback={loadingComponent}>
        <LazyComponent {...props} />
      </Suspense>
    </ErrorBoundary>
  );

  // Display name for debugging
  const componentName = factory.toString().match(/import\(['"](.+)['"]\)/)?.[1] || 'LazyComponent';
  LazyLoadComponent.displayName = `LazyLoad(${componentName})`;

  return LazyLoadComponent;
}

/**
 * Preload a component asynchronously but don't render it
 * Useful for preloading components that are likely to be needed soon
 * 
 * @param factory Function that returns a dynamic import
 * @returns Promise that resolves when the component is loaded
 */
export function preloadComponent(factory: () => Promise<any>): Promise<void> {
  return factory()
    .then(() => {
      // Component loaded successfully, nothing to do
    })
    .catch(error => {
      // Log error but don't throw
      logError('Error preloading component', error);
    });
} 