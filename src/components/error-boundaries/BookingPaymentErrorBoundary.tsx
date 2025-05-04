'use client';

import React, { useEffect } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { CreditCard, RefreshCw, ArrowLeft, HelpCircle, AlertTriangle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { errorMonitor } from '@/lib/errorMonitoring';
import { ErrorCategory } from '@/components/ui/ErrorDisplay';
import { useRouter } from 'next/navigation';
import Alert from '@/components/ui/Alert';

interface PaymentError extends Error {
  code?: string;
  details?: {
    transactionId?: string;
    appointmentId?: string;
    paymentMethod?: string;
    amount?: number;
    [key: string]: unknown;
  };
}

/**
 * Booking Payment Error Fallback UI
 * A specialized UI for payment-related errors during booking
 */
const BookingPaymentErrorFallback: React.FC<{ 
  error: PaymentError | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  const router = useRouter();
  
  // Report error to monitoring service
  useEffect(() => {
    if (error) {
      // Determine error category based on error code
      const errorCategory: ErrorCategory = 
        error.code?.includes('PAYMENT') ? 'api' : 'appointment';
        
      errorMonitor.captureException(error, {
        component: 'BookingPayment',
        severity: 'error',
        category: errorCategory,
        action: 'process_payment',
        details: error.details || {}
      });
    }
  }, [error]);

  // Get specific guidance based on error code
  const getPaymentGuidance = () => {
    if (!error?.code) return 'Please try again with a different payment method or contact customer support.';
    
    switch(error.code) {
      case 'PAYMENT_DECLINED':
        return 'Your payment was declined. Please check your card details or try a different payment method.';
      case 'PAYMENT_INSUFFICIENT_FUNDS':
        return 'Your card has insufficient funds. Please try a different payment method.';
      case 'PAYMENT_CARD_EXPIRED':
        return 'Your card has expired. Please update your card information or try a different payment method.';
      case 'PAYMENT_PROCESSING_ERROR':
        return 'There was an error processing your payment. Please try again in a few minutes.';
      case 'PAYMENT_GATEWAY_ERROR':
        return 'Our payment system is currently experiencing issues. Please try again later.';
      case 'PAYMENT_VALIDATION_ERROR':
        return 'Some of your payment information appears to be invalid. Please check and try again.';
      case 'APPOINTMENT_ALREADY_PAID':
        return 'This appointment appears to be already paid for. Please check your appointments.';
      default:
        return 'Please try again with a different payment method or contact customer support.';
    }
  };

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
          </p>
          
          <Alert variant="warning" className="mb-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{getPaymentGuidance()}</p>
            </div>
          </Alert>
          
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-md mb-4">
              <p className="text-sm text-red-800 dark:text-red-300">
                Error: {error.message}
              </p>
              {error.details?.transactionId && (
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  Transaction ID: {error.details.transactionId}
                </p>
              )}
            </div>
          )}

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
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              as="a"
              href="/help/payment-issues"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Payment Help
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * BookingPaymentErrorBoundary - Error boundary for payment processing during booking
 * 
 * This component provides specialized error handling for payment processing
 * in the booking workflow, handling specific payment failure scenarios
 * with user-friendly error messages and guidance.
 * 
 * @example
 * <BookingPaymentErrorBoundary>
 *   <PaymentProcessor appointmentData={data} />
 * </BookingPaymentErrorBoundary>
 */
export default function BookingPaymentErrorBoundary({ 
  children,
  componentName = 'BookingPaymentComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <BookingPaymentErrorFallback error={null} resetError={() => {}} />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 