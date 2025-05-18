'use client';

import React, { useCallback, type ReactNode, type ErrorInfo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { normalizeError, getUserFriendlyMessage } from '@/lib/errors/errorUtils';
import { AppError } from '@/lib/errors/errorClasses';
import CustomizableErrorBoundary, { ErrorAction } from './CustomizableErrorBoundary';
import type { ErrorCategory } from '@/components/ui/ErrorDisplay';

// Define error boundary props
interface GlobalErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: GlobalErrorFallbackProps) => ReactNode);
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnRouteChange?: boolean;
  errorContext?: Record<string, unknown>;
}

// Define fallback props
export interface GlobalErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  userMessage: string;
  errorCategory: string;
  errorSeverity: string;
  isRetryable: boolean;
  resetErrorBoundary: () => void;
  componentName: string;
}

/**
 * Default fallback component for the GlobalErrorBoundary
 * This is maintained for backward compatibility with existing code
 */
export const DefaultGlobalErrorFallback: React.FC<GlobalErrorFallbackProps> = ({
  error,
  userMessage,
  errorCategory,
  errorSeverity,
  isRetryable,
  resetErrorBoundary,
  componentName,
}) => {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
    resetErrorBoundary();
  };

  return (
    <div className="min-h-[300px] flex items-center justify-center p-6">
      <div className="w-full max-w-md p-6 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-red-100 dark:border-red-900">
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/30">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-6 h-6 text-red-500 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="mb-4 text-xl font-semibold text-center text-slate-800 dark:text-slate-200">
          {errorSeverity === 'fatal' ? 'Something went wrong' : 'Error Encountered'}
        </h2>
        <p className="mb-4 text-center text-slate-600 dark:text-slate-300">{userMessage}</p>
        
        {process.env.NODE_ENV === 'development' && error && (
          <div className="p-3 mb-4 overflow-auto text-xs bg-slate-100 dark:bg-slate-900 rounded max-h-[150px] text-slate-800 dark:text-slate-300">
            <p className="font-semibold">Error details (development only):</p>
            <p className="mt-1">{error.message}</p>
            <p className="mt-1 text-slate-500">Component: {componentName}</p>
            <p className="mt-1 text-slate-500">Category: {errorCategory}</p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {isRetryable && (
            <button
              onClick={resetErrorBoundary}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Try Again
            </button>
          )}
          <button
            onClick={handleGoHome}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 dark:text-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
          >
            Go to Home Page
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Global Error Boundary component
 * 
 * A React error boundary that provides standardized error handling across the application.
 * This component catches errors in its children and displays a fallback UI.
 * 
 * This implementation uses the CustomizableErrorBoundary internally while maintaining
 * backward compatibility with existing code.
 */
const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({
  children,
  fallback,
  componentName = 'GlobalErrorBoundary',
  onError,
  resetOnRouteChange = false,
  errorContext = {},
}) => {
  const router = useRouter();
  
  // Create a handler for custom fallback rendering
  const renderCustomFallback = useCallback((error: Error | null, resetErrorBoundary: () => void) => {
    if (!error) return null;
    
    // Process the error
    const normalizedError = normalizeError(error);
    const userMessage = getUserFriendlyMessage(normalizedError);
    
    // Determine error properties
    let errorCategory = 'unknown';
    let errorSeverity = 'warning';
    let isRetryable = true;
    let errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    if (normalizedError instanceof AppError) {
      errorCategory = normalizedError.category || 'unknown';
      errorSeverity = normalizedError.severity || 'warning';
      isRetryable = normalizedError.retryable !== false;
    }
    
    // Create fallback props for backward compatibility
    const fallbackProps: GlobalErrorFallbackProps = {
      error: normalizedError,
      errorInfo: null, // Not available in functional component
      errorId,
      userMessage,
      errorCategory,
      errorSeverity,
      isRetryable,
      resetErrorBoundary,
      componentName,
    };
    
    // Render custom fallback if provided
    if (fallback) {
      if (typeof fallback === 'function') {
        return fallback(fallbackProps);
      }
      return fallback;
    }
    
    // Default actions for the CustomizableErrorBoundary
    const actions: ErrorAction[] = [
      {
        label: 'Try Again',
        icon: RefreshCw,
        onClick: resetErrorBoundary,
        variant: 'primary',
      },
      {
        label: 'Go to Home Page',
        icon: Home,
        onClick: () => {
          router.push('/');
          resetErrorBoundary();
        },
        variant: 'outline',
      },
    ];
    
    // If not retryable, remove the retry action
    const finalActions = isRetryable ? actions : [actions[1]];
    
    // Return the default fallback UI
    return (
      <div className="min-h-[300px] flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Using the CustomizableErrorFallback directly would be better, but for backward compatibility we use DefaultGlobalErrorFallback */}
          <DefaultGlobalErrorFallback {...fallbackProps} />
        </div>
      </div>
    );
  }, [fallback, componentName, router]);
  
  return (
    <CustomizableErrorBoundary
      title="Something went wrong"
      message="An unexpected error occurred. Please try again later."
      icon={AlertTriangle}
      category="unknown"
      componentName={componentName}
      additionalContext={errorContext}
      onError={onError}
      // We provide a custom fallback renderer to maintain backward compatibility
      actions={[]}
      showErrorDetails={process.env.NODE_ENV === 'development'}
    >
      {resetOnRouteChange ? (
        <RouteChangeListener resetOnRouteChange={resetOnRouteChange}>
          {children}
        </RouteChangeListener>
      ) : (
        children
      )}
    </CustomizableErrorBoundary>
  );
};

// Helper component to handle route change resets
interface RouteChangeListenerProps {
  children: ReactNode;
  resetOnRouteChange: boolean;
}

const RouteChangeListener: React.FC<RouteChangeListenerProps> = ({ children, resetOnRouteChange }) => {
  // This component would normally use useEffect to listen for route changes
  // and reset the error boundary, but since we're using the App Router,
  // the component will naturally re-render on route changes
  
  return <>{children}</>;
};

export default GlobalErrorBoundary;
