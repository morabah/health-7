/**
 * App Error Boundary
 * 
 * A React error boundary component that integrates with our error system.
 * This component catches errors in its children and displays a fallback UI.
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { normalizeError, getUserFriendlyMessage } from '@/lib/errors/errorUtils';
import { AppError } from '@/lib/errors/errorClasses';
import { reportError } from '@/lib/errors/errorMonitoring';

interface AppErrorBoundaryProps {
  /** The children to render */
  children: ReactNode;
  
  /** Component to display when an error occurs */
  FallbackComponent?: React.ComponentType<FallbackProps>;
  
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  
  /** Name of the component (for error reporting) */
  componentName?: string;
  
  /** Whether to reset the error state on component updates */
  resetOnUpdate?: boolean;
  
  /** Additional context to add to errors */
  errorContext?: Record<string, unknown>;
}

export interface FallbackProps {
  /** The error that was caught */
  error: Error;
  
  /** User-friendly error message */
  message: string;
  
  /** Error category (if available) */
  category?: string;
  
  /** Error severity (if available) */
  severity?: string;
  
  /** Whether the error is retryable */
  isRetryable: boolean;
  
  /** Reset the error state */
  resetErrorBoundary: () => void;
}

interface AppErrorBoundaryState {
  /** Whether there is an active error */
  hasError: boolean;
  
  /** The error that was caught */
  error: Error | null;
  
  /** User-friendly error message */
  message: string;
  
  /** Error category (if available) */
  category?: string;
  
  /** Error severity (if available) */
  severity?: string;
  
  /** Whether the error is retryable */
  isRetryable: boolean;
}

/**
 * Default fallback component
 */
const DefaultFallback: React.FC<FallbackProps> = ({ 
  message, 
  error, 
  category, 
  severity,
  isRetryable, 
  resetErrorBoundary 
}) => (
  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
    <h2 className="text-lg font-semibold text-red-800 dark:text-red-400">
      {severity === 'fatal' ? 'Fatal Error' : 'Error'}
    </h2>
    <p className="mt-2 text-sm text-red-700 dark:text-red-300">
      {message}
    </p>
    {category && (
      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
        Category: {category}
      </p>
    )}
    {isRetryable && (
      <button
        onClick={resetErrorBoundary}
        className="mt-3 px-3 py-1 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
      >
        Try Again
      </button>
    )}
    {process.env.NODE_ENV !== 'production' && (
      <details className="mt-3">
        <summary className="text-xs text-red-600 dark:text-red-400 cursor-pointer">
          Error Details
        </summary>
        <pre className="mt-2 text-xs whitespace-pre-wrap overflow-auto max-h-40 p-2 bg-red-100 dark:bg-red-900/40 rounded">
          {error.stack}
        </pre>
      </details>
    )}
  </div>
);

/**
 * App Error Boundary component
 */
class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      message: '',
      isRetryable: false,
    };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    // Normalize the error
    const normalizedError = normalizeError(error);
    
    // Get user-friendly message
    const message = getUserFriendlyMessage(normalizedError);
    
    // Extract AppError properties if available
    const isAppError = normalizedError instanceof AppError;
    const category = isAppError ? normalizedError.category : undefined;
    const severity = isAppError ? normalizedError.severity : undefined;
    const isRetryable = isAppError ? normalizedError.retryable : false;
    
    return {
      hasError: true,
      error: normalizedError,
      message,
      category,
      severity,
      isRetryable,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Normalize the error with component context
    const normalizedError = normalizeError(error, {
      context: {
        componentName: this.props.componentName,
        ...this.props.errorContext,
        reactComponentStack: errorInfo.componentStack,
      },
    });
    
    // Report the error
    reportError(normalizedError);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(normalizedError, errorInfo);
    }
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps): void {
    // Reset the error state if resetOnUpdate is true and children have changed
    if (
      this.props.resetOnUpdate &&
      this.state.hasError &&
      prevProps.children !== this.props.children
    ) {
      this.resetErrorBoundary();
    }
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
      message: '',
      isRetryable: false,
    });
  };

  render(): ReactNode {
    const { FallbackComponent = DefaultFallback, children } = this.props;
    const { hasError, error, message, category, severity, isRetryable } = this.state;

    if (hasError && error) {
      return (
        <FallbackComponent
          error={error}
          message={message}
          category={category}
          severity={severity}
          isRetryable={isRetryable}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    return children;
  }
}

export default AppErrorBoundary; 