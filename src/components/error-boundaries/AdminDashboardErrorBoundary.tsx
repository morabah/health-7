'use client';

import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { ShieldAlert, RefreshCw, Home, Settings } from 'lucide-react';
import Button from '@/components/ui/Button';
import { errorMonitor } from '@/lib/errorMonitoring';
import type { ErrorCategory } from '@/components/ui/ErrorDisplay';

/**
 * Admin Dashboard Error Fallback UI
 * A specialized UI for admin dashboard-related errors
 */
const AdminDashboardErrorFallback: React.FC<{ 
  error: Error | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  // Report error to monitoring service
  React.useEffect(() => {
    if (error) {
      errorMonitor.captureException(error, {
        component: 'AdminDashboard',
        severity: 'error',
        category: 'api' as ErrorCategory,
      });
    }
  }, [error]);

  return (
    <div className="p-6 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <ShieldAlert className="h-8 w-8 text-amber-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">
            Admin Dashboard Error
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            We encountered an issue while loading the administrative panel. 
            This could be due to missing permissions or a temporary system issue.
          </p>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-md mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              {error?.message || 'An unexpected error occurred while loading the admin dashboard'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={resetError}
              variant="primary"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Loading
            </Button>
            <Button 
              variant="outline"
              size="sm"
              as="a"
              href="/"
            >
              <Home className="mr-2 h-4 w-4" />
              Return to Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              as="a"
              href="/admin/settings"
            >
              <Settings className="mr-2 h-4 w-4" />
              System Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * AdminDashboardErrorBoundary - Error boundary specifically for admin dashboard components
 * This provides more contextual error messaging for admin functionality
 * 
 * @example
 * <AdminDashboardErrorBoundary>
 *   <AdminDashboardComponent />
 * </AdminDashboardErrorBoundary>
 */
export default function AdminDashboardErrorBoundary({ 
  children,
  componentName = 'AdminDashboardComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <AdminDashboardErrorFallback error={null} resetError={() => {}} />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 