import type { ComponentType } from 'react';
import React from 'react';
import type { FallbackProps } from '@/components/error/AppErrorBoundary';
import AppErrorBoundary from '@/components/error/AppErrorBoundary';

interface WithErrorBoundaryOptions {
  /**
   * The name of the component being wrapped (for error reporting)
   */
  componentName?: string;
  
  /**
   * Custom fallback component to show when an error occurs
   */
  FallbackComponent?: React.ComponentType<FallbackProps>;
  
  /**
   * Additional context to add to errors
   */
  errorContext?: Record<string, unknown>;
  
  /**
   * Whether to reset the error state on component updates
   */
  resetOnUpdate?: boolean;
}

/**
 * Higher-order component that wraps a component with an error boundary
 * 
 * @example
 * const SafeProfilePage = withErrorBoundary(ProfilePage, { 
 *   componentName: 'ProfilePage' 
 * });
 * 
 * @param Component - The component to wrap
 * @param options - Configuration options for the error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): React.FC<P> {
  const { 
    componentName = Component.displayName || Component.name, 
    FallbackComponent,
    errorContext,
    resetOnUpdate
  } = options;
  
  // Create a wrapped component with error boundary
  const WrappedComponent: React.FC<P> = (props) => {
    return (
      <AppErrorBoundary 
        componentName={componentName}
        FallbackComponent={FallbackComponent}
        errorContext={errorContext}
        resetOnUpdate={resetOnUpdate}
      >
        <Component {...props} />
      </AppErrorBoundary>
    );
  };
  
  // Set display name for better debugging
  WrappedComponent.displayName = `withErrorBoundary(${componentName})`;
  
  return WrappedComponent;
}

export default withErrorBoundary; 