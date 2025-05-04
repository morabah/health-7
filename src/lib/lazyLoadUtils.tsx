'use client';

import React, { lazy, Suspense, ComponentType } from 'react';

/**
 * Default loading component used when no custom loading component is provided
 */
export const DefaultLoadingComponent = () => (
  <div className="flex items-center justify-center p-4 min-h-[200px]">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
  </div>
);

/**
 * Default error component used when no custom error component is provided
 */
export const DefaultErrorComponent = () => (
  <div className="p-4 text-center text-red-500">
    <p>Failed to load component</p>
  </div>
);

/**
 * Options for lazyLoad function
 */
interface LazyLoadOptions {
  /**
   * Custom loading component to show while the component is loading
   */
  LoadingComponent?: ComponentType;
  
  /**
   * Custom error component to show if the component fails to load
   */
  ErrorComponent?: ComponentType<{ error: Error; retry: () => void }>;
  
  /**
   * Minimum display time for loading component to avoid flicker (in ms)
   */
  minimumLoadTime?: number;
  
  /**
   * Additional suspense fallback options
   */
  suspenseOptions?: object;
}

/**
 * Creates a lazy-loaded component with suspense
 * 
 * @param importPromise Promise returned by dynamic import
 * @param options Options for lazy loading behavior
 * @returns Lazy-loaded component wrapped in Suspense
 */
export function lazyLoad<T extends ComponentType<any>>(
  importPromise: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.FC<React.ComponentProps<T>> {
  const {
    LoadingComponent = DefaultLoadingComponent,
    minimumLoadTime = 0,
  } = options;

  // Add minimum display time to avoid flickering if requested
  const enhancedImport = async () => {
    const start = Date.now();
    const result = await importPromise();
    
    if (minimumLoadTime > 0) {
      const elapsed = Date.now() - start;
      if (elapsed < minimumLoadTime) {
        await new Promise(resolve => setTimeout(resolve, minimumLoadTime - elapsed));
      }
    }
    
    return result;
  };

  // Create lazy component
  const LazyComponent = lazy(enhancedImport);
  
  // Return wrapped component that handles props correctly
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={<LoadingComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  );
}

/**
 * Higher-order component that adds lazy loading with suspense
 * 
 * @param Component The component to lazy load
 * @param options Options for lazy loading behavior
 * @returns A new component that lazy-loads the input component
 */
export function withLazyLoading<T extends ComponentType<any>>(
  Component: T,
  options: LazyLoadOptions = {}
): React.FC<React.ComponentProps<T>> {
  const {
    LoadingComponent = DefaultLoadingComponent,
  } = options;
  
  // Return wrapped component
  return (props: React.ComponentProps<T>) => (
    <Suspense fallback={<LoadingComponent />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Prefetch a component but don't render it
 * Useful for preloading components that might be needed soon
 * 
 * @param importPromise Dynamic import promise for the component
 */
export function prefetchComponent(importPromise: () => Promise<any>): void {
  // Execute the import but don't wait for it
  importPromise().catch(error => {
    console.error('Error prefetching component:', error);
  });
} 