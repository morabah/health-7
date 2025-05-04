'use client';

import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { RefreshCw, Home } from 'lucide-react';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import { errorMonitor } from '@/lib/errorMonitoring';

/**
 * Root Error Boundary Fallback UI
 * A more comprehensive UI for application-level errors
 */
const RootErrorFallback = ({ error, resetError }: { error: Error | null; resetError: () => void }) => {
  // Report error to monitoring service if it's a new error
  React.useEffect(() => {
    if (error) {
      errorMonitor.captureException(error, {
        component: 'RootApplication',
        severity: 'fatal',
        category: 'unknown',
      });
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-900">
      <div className="w-full max-w-md p-8 rounded-lg shadow-xl bg-white dark:bg-slate-800">
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">
              Application Error
            </h2>
            <p className="text-slate-600 dark:text-slate-300">
              We&apos;re sorry, but the application has encountered a critical error.
            </p>
          </div>

          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-100 dark:border-red-900/30">
            <p className="text-sm text-red-800 dark:text-red-300">
              {error?.message || 'An unexpected error occurred'}
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Try these steps to resolve the issue:
            </p>
            <ul className="list-disc pl-5 text-sm text-slate-500 dark:text-slate-400 space-y-1">
              <li>Refresh the page to reload the application</li>
              <li>Clear your browser cache and cookies</li>
              <li>Try again later if the problem persists</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-3">
            <Button 
              onClick={resetError} 
              variant="primary" 
              className="flex-1 justify-center"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Application
            </Button>
            <Link href="/" className="flex-1">
              <Button variant="outline" className="w-full justify-center">
                <Home className="mr-2 h-4 w-4" />
                Return Home
              </Button>
            </Link>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
            If you continue to experience issues, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * RootErrorBoundary - A top-level error boundary for the entire application
 */
export default function RootErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      componentName="RootApplication"
      fallback={
        <RootErrorFallback 
          error={null} 
          resetError={() => {}} // This will be replaced by the actual resetErrorBoundary function
        />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 