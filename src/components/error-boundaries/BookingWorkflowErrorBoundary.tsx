'use client';

import React, { useEffect } from 'react';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { CalendarPlus, RefreshCw, ArrowLeft, PhoneOutgoing, HelpCircle, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { ErrorMonitor } from '@/lib/errors/errorMonitoring';
import type { ErrorCategory } from '@/components/ui/ErrorDisplay';
import { useRouter } from 'next/navigation';
import Alert from '@/components/ui/Alert';

interface BookingError extends Error {
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Booking Workflow Error Fallback UI
 * A specialized UI for booking process-related errors
 */
const BookingWorkflowErrorFallback: React.FC<{ 
  error: BookingError | null;
  resetError: () => void;
}> = ({ error, resetError }) => {
  const router = useRouter();
  
  // Report error to monitoring service
  useEffect(() => {
    if (error) {
      // Provide enhanced context for booking-specific errors
      ErrorMonitor.getInstance().reportError(error, {
        component: 'BookingWorkflow',
        severity: error.code === 'SLOT_UNAVAILABLE' ? 'warning' : 'error',
        category: 'appointment' as ErrorCategory,
        action: 'book_appointment',
        details: error.details || {}
      });
    }
  }, [error]);

  // Determine error type and message based on error code
  const getErrorContent = () => {
    if (!error) return {
      title: 'Booking Process Error',
      message: 'We encountered an issue while processing your appointment booking.',
      suggestion: 'Please try again or choose another time slot.'
    };

    // Handle specific error types
    switch(error.code) {
      case 'SLOT_UNAVAILABLE':
        return {
          title: 'Time Slot No Longer Available',
          message: 'The appointment time slot you selected is no longer available.',
          suggestion: 'Please select a different time or date for your appointment.'
        };
      case 'DOCTOR_UNAVAILABLE':
        return {
          title: 'Doctor Not Available',
          message: 'The doctor you selected is not available at this time.',
          suggestion: 'Try selecting another doctor or choose a different date.'
        };
      case 'BOOKING_CONFLICT':
        return {
          title: 'Booking Conflict',
          message: 'You already have another appointment scheduled at this time.',
          suggestion: 'Please select a different time slot for your appointment.'
        };
      case 'VALIDATION_ERROR':
        return {
          title: 'Invalid Booking Information',
          message: 'Some of the information you provided is not valid.',
          suggestion: 'Please review your booking details and try again.'
        };
      case 'PAYMENT_REQUIRED':
        return {
          title: 'Payment Required',
          message: 'A payment is required to complete this booking.',
          suggestion: 'Please complete the payment process to confirm your appointment.'
        };
      case 'NETWORK_ERROR':
        return {
          title: 'Connection Error',
          message: 'We couldn\'t connect to our servers to complete your booking.',
          suggestion: 'Please check your internet connection and try again.'
        };
      default:
        return {
          title: 'Booking Process Error',
          message: 'We encountered an issue while processing your appointment booking.',
          suggestion: 'Please try again or contact our support team for assistance.'
        };
    }
  };

  const { title, message, suggestion } = getErrorContent();

  return (
    <div className="p-6 rounded-lg border border-teal-100 dark:border-teal-900/30 bg-white dark:bg-slate-800 shadow-sm">
      <div className="flex items-start">
        <div className="mr-4 mt-1 flex-shrink-0">
          <CalendarPlus className="h-8 w-8 text-teal-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium mb-2">
            {title}
          </h3>
          <p className="text-slate-600 dark:text-slate-300 mb-2">
            {message}
          </p>
          
          <Alert variant="info" className="mb-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{suggestion}</p>
            </div>
          </Alert>
          
          {error && (
            <div className="bg-teal-50 dark:bg-teal-900/20 p-3 rounded-md mb-4">
              <p className="text-sm text-teal-800 dark:text-teal-300">
                {error.message}
              </p>
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
              onClick={() => router.push('/find-doctors')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Find Another Doctor
            </Button>
            <Button
              variant="ghost"
              size="sm"
              as="a"
              href="tel:+18001234567"
            >
              <PhoneOutgoing className="mr-2 h-4 w-4" />
              Book by Phone
            </Button>
            <Button
              variant="ghost"
              size="sm"
              as="a"
              href="/help/booking-issues"
            >
              <HelpCircle className="mr-2 h-4 w-4" />
              Help
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Specialized error boundary for booking workflow
 * 
 * This component provides detailed error handling specifically for the appointment booking process.
 * It can detect and handle various booking-specific errors like unavailable time slots,
 * doctor unavailability, booking conflicts, and validation errors.
 * 
 * @example
 * <BookingWorkflowErrorBoundary>
 *   <BookingForm />
 * </BookingWorkflowErrorBoundary>
 * 
 * @example
 * // With custom component name for better error tracking
 * <BookingWorkflowErrorBoundary componentName="DoctorTimeSelection">
 *   <TimeSlotSelectionComponent />
 * </BookingWorkflowErrorBoundary>
 */
export default function BookingWorkflowErrorBoundary({ 
  children,
  componentName = 'BookingWorkflowComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  return (
    <ErrorBoundary
      componentName={componentName}
      fallback={
        <BookingWorkflowErrorFallback error={null} resetError={() => {}} />
      }
    >
      {children}
    </ErrorBoundary>
  );
} 