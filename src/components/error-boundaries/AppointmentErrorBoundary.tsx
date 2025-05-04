'use client';

import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Calendar, RefreshCw } from 'lucide-react';
import Button from '@/components/ui/Button';
import { errorMonitor } from '@/lib/errorMonitoring';

/**
 * Appointment Error Fallback UI
 * A specialized UI for appointment-related errors
 */
const AppointmentErrorFallback: React.FC<{ 
  error: Error | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  // Report error to monitoring service
  React.useEffect(() => {
    if (error) {
      errorMonitor.captureException(error, {
        component: 'AppointmentView',
        severity: 'error',
        category: 'appointment',
      });
    }
  }, [error]);

  return (
    <div className="p-6 rounded-lg border border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <Calendar className="h-8 w-8 text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">
            Unable to load appointments
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            We encountered an issue while loading your appointment information. 
            This could be due to a temporary connectivity issue.
          </p>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4">
            <p className="text-sm text-red-800 dark:text-red-300">
              {error?.message || 'An unexpected error occurred with appointment data'}
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
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * AppointmentErrorBoundary - Error boundary specifically for appointment-related components
 * This provides more contextual error messaging for appointment functionality
 */
export default function AppointmentErrorBoundary({ 
  children,
  componentName = 'AppointmentComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <AppointmentErrorFallback error={null} resetError={() => {}} />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 