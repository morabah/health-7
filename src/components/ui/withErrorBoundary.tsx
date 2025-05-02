'use client';

import React, { ComponentType, ErrorInfo } from 'react';
import ErrorBoundary from './ErrorBoundary';

interface WithErrorBoundaryOptions {
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary
 * 
 * @param Component The component to wrap
 * @param options Options for the ErrorBoundary
 * @returns The wrapped component
 */
function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  options: WithErrorBoundaryOptions = {}
): ComponentType<P> {
  const { fallback, onError } = options;
  
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  // Set display name for debugging
  const componentName = Component.displayName || Component.name || 'Component';
  WithErrorBoundary.displayName = `withErrorBoundary(${componentName})`;
  
  return WithErrorBoundary;
}

export default withErrorBoundary; 