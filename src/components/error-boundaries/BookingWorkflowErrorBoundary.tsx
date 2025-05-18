'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React, { useState, useEffect } from 'react';
import { CalendarPlus, RefreshCw, ArrowLeft, PhoneOutgoing, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CustomizableErrorBoundary, { ErrorAction } from './CustomizableErrorBoundary';
import { appEventBus, LogLevel } from '@/lib/eventBus';
import type { ErrorCategory } from '@/components/ui/ErrorDisplay';

interface BookingError extends Error {
  code?: string;
  details?: Record<string, unknown>;
}

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
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
export default function BookingWorkflowErrorBoundary({ 
  children,
  componentName = 'BookingWorkflowComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  // Create a component that will handle the dynamic error message and actions
  const DynamicBookingErrorHandler: React.FC<{
    error: Error | null;
    resetErrorBoundary: () => void;
  }> = ({ error, resetErrorBoundary }) => {
    const router = useRouter();
    const [title, setTitle] = useState('Booking Process Error');
    const [message, setMessage] = useState('We encountered an issue while processing your appointment booking.');
    const [suggestion, setSuggestion] = useState('Please try again or choose another time slot.');
    const [actions, setActions] = useState<ErrorAction[]>([]);
    const [additionalContext, setAdditionalContext] = useState<Record<string, unknown>>({});
    
    useEffect(() => {
      if (!error) return;
      
      // Cast to BookingError to access code and details properties
      const bookingError = error as BookingError;
      const errorCode = bookingError.code;
      const errorDetails = bookingError.details || {};
      
      // Emit error event for centralized logging
      appEventBus.emit('log_event', {
        level: errorCode === 'SLOT_UNAVAILABLE' ? LogLevel.WARN : LogLevel.ERROR,
        message: `Booking workflow error: ${error.message}`,
        data: {
          component: componentName || 'BookingWorkflow',
          errorCode,
          errorDetails,
          stack: error.stack
        },
        timestamp: Date.now()
      });
      
      // Set additional context for error reporting
      setAdditionalContext({
        errorCode,
        errorDetails,
        workflow: 'booking'
      });
      
      // Determine error type and message based on error code
      let errorInfo = {
        title: 'Booking Process Error',
        message: 'We encountered an issue while processing your appointment booking.',
        suggestion: 'Please try again or choose another time slot.'
      };
      
      // Handle specific error types
      switch(errorCode) {
        case 'SLOT_UNAVAILABLE':
          errorInfo = {
            title: 'Time Slot No Longer Available',
            message: 'The appointment time slot you selected is no longer available.',
            suggestion: 'Please select a different time or date for your appointment.'
          };
          break;
        case 'DOCTOR_UNAVAILABLE':
          errorInfo = {
            title: 'Doctor Not Available',
            message: 'The doctor you selected is not available at this time.',
            suggestion: 'Try selecting another doctor or choose a different date.'
          };
          break;
        case 'BOOKING_CONFLICT':
          errorInfo = {
            title: 'Booking Conflict',
            message: 'You already have another appointment scheduled at this time.',
            suggestion: 'Please select a different time slot for your appointment.'
          };
          break;
        case 'VALIDATION_ERROR':
          errorInfo = {
            title: 'Invalid Booking Information',
            message: 'Some of the information you provided is not valid.',
            suggestion: 'Please review your booking details and try again.'
          };
          break;
        case 'PAYMENT_REQUIRED':
          errorInfo = {
            title: 'Payment Required',
            message: 'A payment is required to complete this booking.',
            suggestion: 'Please complete the payment process to confirm your appointment.'
          };
          break;
        case 'NETWORK_ERROR':
          errorInfo = {
            title: 'Connection Error',
            message: 'We couldn\'t connect to our servers to complete your booking.',
            suggestion: 'Please check your internet connection and try again.'
          };
          break;
        default:
          errorInfo = {
            title: 'Booking Process Error',
            message: error.message || 'We encountered an issue while processing your appointment booking.',
            suggestion: 'Please try again or contact our support team for assistance.'
          };
      }
      
      setTitle(errorInfo.title);
      setMessage(`${errorInfo.message} ${errorInfo.suggestion}`);
      setSuggestion(errorInfo.suggestion);
      
      // Set actions based on error
      const errorActions: ErrorAction[] = [
        {
          label: 'Try Again',
          icon: RefreshCw,
          onClick: resetErrorBoundary,
          variant: 'primary'
        },
        {
          label: 'Find Another Doctor',
          icon: ArrowLeft,
          onClick: () => router.push('/find-doctors'),
          variant: 'outline'
        },
        {
          label: 'Book by Phone',
          icon: PhoneOutgoing,
          href: 'tel:+18001234567',
          variant: 'ghost'
        },
        {
          label: 'Help',
          icon: HelpCircle,
          href: '/help/booking-issues',
          variant: 'ghost'
        }
      ];
      
      setActions(errorActions);
    }, [error, resetErrorBoundary, router, componentName]);
    
    return (
      <CustomizableErrorBoundary
        title={title}
        message={message}
        icon={CalendarPlus}
        category="appointment"
        componentName={componentName}
        actions={actions}
        additionalContext={additionalContext}
      >
        {children}
      </CustomizableErrorBoundary>
    );
  };
  
  return <DynamicBookingErrorHandler error={null} resetErrorBoundary={() => {}} />;
} 