'use client';

import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Database, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ErrorMonitor } from '@/lib/errors/errorMonitoring';

/**
 * Data Loading Error Fallback UI
 * A specialized UI for data fetching and API errors
 */
const DataLoadingErrorFallback: React.FC<{ 
  error: Error | null;
  resetError: () => void;
  title?: string;
  description?: string;
}> = ({ 
  error, 
  resetError,
  title = "Data Loading Error",
  description = "We couldn't load the requested data. This might be due to a network issue or server problem."
}) => {
  // Report error to monitoring service
  React.useEffect(() => {
    if (error) {
      ErrorMonitor.getInstance().reportError(error, {
        component: 'DataLoading',
        severity: 'error',
        category: 'api',
      });
    }
  }, [error]);

  return (
    <div className="p-6 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <Database className="h-8 w-8 text-amber-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">
            {title}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            {description}
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {error?.message || 'An unexpected error occurred while fetching data'}
            </p>
          </div>

          <Button 
            onClick={resetError}
            variant="primary"
            size="sm"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * DataLoadingErrorBoundary - Error boundary for data loading operations
 * This provides more contextual error messaging for API and data fetching errors
 * 
 * @example
 * // Basic usage with defaults
 * <DataLoadingErrorBoundary>
 *   <ComponentThatFetchesData />
 * </DataLoadingErrorBoundary>
 * 
 * // With custom error messages
 * <DataLoadingErrorBoundary 
 *   title="User Profile Error"
 *   description="We couldn't load your user profile information"
 * >
 *   <UserProfile />
 * </DataLoadingErrorBoundary>
 */
export default function DataLoadingErrorBoundary({ 
  children,
  componentName = 'DataLoadingComponent',
  title,
  description
}: { 
  children: React.ReactNode;
  componentName?: string;
  title?: string;
  description?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <DataLoadingErrorFallback 
          error={null} 
          resetError={() => {}}
          title={title}
          description={description}
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 