'use client';

import React from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { CreditCard, RefreshCw, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { errorMonitor } from '@/lib/errorMonitoring';
import { ErrorCategory } from '@/components/ui/ErrorDisplay';

/**
 * Payment Error Fallback UI
 * A specialized UI for payment-related errors
 */
const PaymentErrorFallback: React.FC<{ 
  error: Error | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  // Report error to monitoring service
  React.useEffect(() => {
    if (error) {
      errorMonitor.captureException(error, {
        component: 'PaymentProcessing',
        severity: 'error',
        category: 'api' as ErrorCategory,
      });
    }
  }, [error]);

  return (
    <div className="p-6 rounded-lg border border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <CreditCard className="h-8 w-8 text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">
            Payment Processing Error
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">
            We encountered an issue while processing your payment. 
            This could be due to a temporary system issue or an issue with the payment method.
          </p>
          
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4">
            <p className="text-sm text-red-800 dark:text-red-300">
              {error?.message || 'An unexpected error occurred during payment processing'}
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
              href="/payment/methods"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Change Payment Method
            </Button>
            <Button
              variant="ghost"
              size="sm"
              as="a"
              href="/contact-support"
            >
              <AlertCircle className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * PaymentProcessingErrorBoundary - Error boundary specifically for payment processing components
 * This provides more contextual error messaging for payment functionality
 * 
 * @example
 * <PaymentProcessingErrorBoundary>
 *   <PaymentForm />
 * </PaymentProcessingErrorBoundary>
 */
export default function PaymentProcessingErrorBoundary({ 
  children,
  componentName = 'PaymentComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <PaymentErrorFallback error={null} resetError={() => {}} />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 