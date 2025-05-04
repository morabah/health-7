'use client';

import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { Lock, RefreshCw, Home, HelpCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { errorMonitor } from '@/lib/errorMonitoring';
import { APP_ROUTES } from '@/lib/router';

/**
 * Authentication Error Fallback UI
 * A specialized UI for authentication-related errors
 */
const AuthErrorFallback: React.FC<{ 
  error: Error | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  // Report error to monitoring service
  React.useEffect(() => {
    if (error) {
      errorMonitor.captureException(error, {
        component: 'Authentication',
        severity: 'error',
        category: 'auth',
      });
    }
  }, [error]);

  return (
    <div className="p-6 rounded-lg border border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <Lock className="h-8 w-8 text-indigo-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">
            Authentication Error
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            We encountered an issue during the authentication process. 
            This could be due to an expired session or temporary service unavailability.
          </p>
          
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-md mb-4">
            <p className="text-sm text-indigo-800 dark:text-indigo-300">
              {error?.message || 'An unexpected authentication error occurred'}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={resetError}
              variant="primary"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
            <Button 
              variant="outline"
              size="sm"
              as="a"
              href={APP_ROUTES.LOGIN}
            >
              <Lock className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              as="a"
              href={APP_ROUTES.HOME}
            >
              <Home className="mr-2 h-4 w-4" />
              Go to Home
            </Button>
            <Button
              variant="ghost"
              size="sm"
              as="a"
              href={APP_ROUTES.FORGOT_PASSWORD}
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Forgot Password?
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * AuthErrorBoundary - Error boundary specifically for authentication-related components
 * This provides more contextual error messaging for login, registration, and other auth flows
 * 
 * @example
 * <AuthErrorBoundary>
 *   <LoginForm />
 * </AuthErrorBoundary>
 */
export default function AuthErrorBoundary({ 
  children,
  componentName = 'AuthComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <AuthErrorFallback error={null} resetError={() => {}} />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 