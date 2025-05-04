'use client';

import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { UserCog, RefreshCw, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import { errorMonitor } from '@/lib/errorMonitoring';
import Link from 'next/link';

/**
 * Doctor Profile Error Fallback UI
 * A specialized UI for doctor profile-related errors
 */
const DoctorProfileErrorFallback: React.FC<{ 
  error: Error | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  // Report error to monitoring service
  React.useEffect(() => {
    if (error) {
      errorMonitor.captureException(error, {
        component: 'DoctorProfileView',
        severity: 'error',
        category: 'data',
      });
    }
  }, [error]);

  return (
    <div className="p-6 rounded-lg border border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <UserCog className="h-8 w-8 text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">
            Unable to load doctor profile
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            We encountered an issue while loading the doctor profile information. 
            This could be due to a temporary server issue.
          </p>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4">
            <p className="text-sm text-red-800 dark:text-red-300">
              {error?.message || 'An unexpected error occurred with profile data'}
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
            <Link href="/doctor/dashboard">
              <Button 
                variant="outline"
                size="sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * DoctorProfileErrorBoundary - Error boundary for doctor profile-related components
 * This provides more contextual error messaging for doctor profile functionality
 */
export default function DoctorProfileErrorBoundary({ 
  children,
  componentName = 'DoctorProfileComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <DoctorProfileErrorFallback error={null} resetError={() => {}} />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 