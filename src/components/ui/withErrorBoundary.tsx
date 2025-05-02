'use client';

import React, { FC, ComponentType } from 'react';
import ErrorBoundary from './ErrorBoundary';
import { errorMonitor } from '@/lib/errorMonitoring';

interface WithErrorBoundaryOptions {
  /**
   * Component name for error tracking
   */
  componentName?: string;
  
  /**
   * Custom fallback UI to show when an error occurs
   */
  fallback?: React.ReactNode;
  
  /**
   * Whether to capture errors in error monitoring system
   */
  captureErrors?: boolean;
  
  /**
   * Additional context to provide in error reports
   */
  errorContext?: Record<string, unknown>;
  
  /**
   * Callback when an error occurs
   */
  onError?: (error: Error) => void;
}

/**
 * Higher Order Component that wraps a component with an ErrorBoundary
 * Provides better error isolation and fallback UIs for different parts of the app
 * 
 * @example
 * // Basic usage
 * const SafeComponent = withErrorBoundary(UnsafeComponent);
 * 
 * // With options
 * const SafeComponent = withErrorBoundary(UnsafeComponent, {
 *   componentName: 'UserProfile',
 *   fallback: <p>Could not load user profile</p>,
 *   captureErrors: true
 * });
 */
export default function withErrorBoundary<P extends React.JSX.IntrinsicAttributes>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): FC<P> {
  const {
    componentName = Component.displayName || Component.name || 'UnknownComponent',
    fallback,
    captureErrors = true,
    errorContext = {},
    onError,
  } = options;
  
  // Create wrapped component
  const WrappedComponent: FC<P> = (props: P) => {
    // Handle errors
    const handleError = (error: Error) => {
      // Log error
      if (captureErrors) {
        errorMonitor.captureException(error, {
          component: componentName,
          ...errorContext,
        });
      }
      
      // Call onError callback if provided
      if (onError) {
        onError(error);
      }
    };
    
    return (
      <ErrorBoundary
        componentName={componentName}
        fallback={fallback}
        onError={handleError}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
  
  // Set display name for better debugging
  WrappedComponent.displayName = `withErrorBoundary(${componentName})`;
  
  return WrappedComponent;
} 