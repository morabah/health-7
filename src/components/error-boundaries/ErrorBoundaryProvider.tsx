'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import GlobalErrorBoundary, { GlobalErrorFallbackProps } from './GlobalErrorBoundary';
import { ErrorCategory, ErrorSeverity } from '@/components/ui/ErrorDisplay';

// Define context types
interface ErrorBoundaryContextType {
  // Create a boundary with standard settings for a specific section
  createBoundary: (options: {
    componentName: string;
    errorCategory?: ErrorCategory;
    errorSeverity?: ErrorSeverity;
    fallback?: React.ReactNode | ((props: GlobalErrorFallbackProps) => ReactNode);
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    resetOnRouteChange?: boolean;
    errorContext?: Record<string, unknown>;
  }) => React.FC<{ children: ReactNode }>;
}

// Create the context
const ErrorBoundaryContext = createContext<ErrorBoundaryContextType | null>(null);

// Provider props
interface ErrorBoundaryProviderProps {
  children: ReactNode;
  defaultFallback?: React.ReactNode | ((props: GlobalErrorFallbackProps) => ReactNode);
  defaultResetOnRouteChange?: boolean;
  onGlobalError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

/**
 * Error Boundary Provider
 * 
 * Provides a context for creating standardized error boundaries throughout the application.
 * This component should be placed high in the component tree, typically in the ClientLayout.
 */
export function ErrorBoundaryProvider({
  children,
  defaultFallback,
  defaultResetOnRouteChange = true,
  onGlobalError,
}: ErrorBoundaryProviderProps) {
  // Factory function to create error boundaries with consistent settings
  const createBoundary = ({
    componentName,
    errorCategory,
    errorSeverity,
    fallback = defaultFallback,
    onError,
    resetOnRouteChange = defaultResetOnRouteChange,
    errorContext,
  }: {
    componentName: string;
    errorCategory?: ErrorCategory;
    errorSeverity?: ErrorSeverity;
    fallback?: React.ReactNode | ((props: GlobalErrorFallbackProps) => ReactNode);
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    resetOnRouteChange?: boolean;
    errorContext?: Record<string, unknown>;
  }) => {
    // Return a component that wraps children in an error boundary
    return ({ children }: { children: ReactNode }) => (
      <GlobalErrorBoundary
        componentName={componentName}
        fallback={fallback}
        onError={(error, errorInfo) => {
          // Call the component-specific error handler if provided
          if (onError) {
            onError(error, errorInfo);
          }
          
          // Call the global error handler if provided
          if (onGlobalError) {
            onGlobalError(error, errorInfo);
          }
        }}
        resetOnRouteChange={resetOnRouteChange}
        errorContext={{
          ...errorContext,
          errorCategory,
          errorSeverity,
        }}
      >
        {children}
      </GlobalErrorBoundary>
    );
  };

  return (
    <ErrorBoundaryContext.Provider value={{ createBoundary }}>
      <GlobalErrorBoundary
        componentName="RootApplication"
        fallback={defaultFallback}
        onError={onGlobalError}
        resetOnRouteChange={defaultResetOnRouteChange}
      >
        {children}
      </GlobalErrorBoundary>
    </ErrorBoundaryContext.Provider>
  );
}

/**
 * Hook to access the error boundary context
 */
export function useErrorBoundary() {
  const context = useContext(ErrorBoundaryContext);
  
  if (!context) {
    throw new Error('useErrorBoundary must be used within an ErrorBoundaryProvider');
  }
  
  return context;
}

/**
 * HOC to wrap a component with an error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    componentName: string;
    errorCategory?: ErrorCategory;
    errorSeverity?: ErrorSeverity;
    fallback?: React.ReactNode | ((props: GlobalErrorFallbackProps) => ReactNode);
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
    resetOnRouteChange?: boolean;
    errorContext?: Record<string, unknown>;
  }
) {
  return function WithErrorBoundary(props: P) {
    return (
      <GlobalErrorBoundary
        componentName={options.componentName}
        fallback={options.fallback}
        onError={options.onError}
        resetOnRouteChange={options.resetOnRouteChange}
        errorContext={{
          ...options.errorContext,
          errorCategory: options.errorCategory,
          errorSeverity: options.errorSeverity,
        }}
      >
        <Component {...props} />
      </GlobalErrorBoundary>
    );
  };
}

export default ErrorBoundaryProvider;
