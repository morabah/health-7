'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React from 'react';
import CustomizableErrorBoundary from './CustomizableErrorBoundary';
import { Database, RefreshCw } from 'lucide-react';

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
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
export default function DataLoadingErrorBoundary({ 
  children,
  componentName = 'DataLoadingComponent',
  title = "Data Loading Error",
  description = "We couldn't load the requested data. This might be due to a network issue or server problem."
}: { 
  children: React.ReactNode;
  componentName?: string;
  title?: string;
  description?: string;
}) {
  return (
    <CustomizableErrorBoundary
      title={title}
      message={description}
      icon={Database}
      category="data"
      componentName={componentName}
      actions={[
        {
          label: 'Retry',
          icon: RefreshCw,
          variant: 'primary'
        }
      ]}
    >
      {children}
    </CustomizableErrorBoundary>
  );
} 