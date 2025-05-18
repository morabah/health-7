'use client';

/**
 * @deprecated Use CustomizableErrorBoundary instead for more flexibility
 */

import React, { useState, useEffect } from 'react';
import CustomizableErrorBoundary from './CustomizableErrorBoundary';
import { Clock, RefreshCw, Calendar, HelpCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ErrorAction } from './CustomizableErrorBoundary';
import type { ErrorCategory } from '@/components/ui/ErrorDisplay';

interface TimeSlotError extends Error {
  code?: string;
  details?: {
    date?: string;
    doctorId?: string;
    [key: string]: unknown;
  };
}

/**
 * TimeSlotSelectionErrorBoundary - Error boundary specifically for time slot selection
 * 
 * This component provides specialized error handling for the time slot selection
 * part of the booking workflow, which is often a point of failure when slots
 * become unavailable or there are doctor schedule changes.
 * 
 * @example
 * <TimeSlotSelectionErrorBoundary>
 *   <TimeSlotSelector date={selectedDate} doctorId={doctorId} />
 * </TimeSlotSelectionErrorBoundary>
 * 
 * @deprecated Use CustomizableErrorBoundary directly for more flexibility
 */
export default function TimeSlotSelectionErrorBoundary({ 
  children,
  componentName = 'TimeSlotSelectionComponent'
}: { 
  children: React.ReactNode;
  componentName?: string;
}) {
  // Create a component that will handle the dynamic error message
  const DynamicTimeSlotErrorHandler: React.FC<{
    error: Error | null;
    resetErrorBoundary: () => void;
  }> = ({ error, resetErrorBoundary }) => {
    const router = useRouter();
    const [message, setMessage] = useState('We couldn\'t load available time slots.');
    
    // Determine specific error message based on the error code
    useEffect(() => {
      if (!error) return;
      
      // Cast to TimeSlotError to access code and details properties
      const timeSlotError = error as TimeSlotError;
      
      switch(timeSlotError.code) {
        case 'NO_SLOTS_AVAILABLE':
          setMessage('No time slots are available for the selected date.');
          break;
        case 'DATE_IN_PAST':
          setMessage('The selected date is in the past. Please choose a future date.');
          break;
        case 'DOCTOR_UNAVAILABLE':
          setMessage('The doctor is not available on the selected date.');
          break;
        case 'LOADING_FAILED':
          setMessage('We couldn\'t load the time slots due to a technical issue.');
          break;
        case 'INVALID_DATE_RANGE':
          setMessage('The selected date is outside the allowed booking range.');
          break;
        default:
          setMessage(timeSlotError.message || 'We couldn\'t load available time slots.');
      }
    }, [error]);
    
    // Create dynamic actions based on error details
    const actions: ErrorAction[] = [
      {
        label: 'Try Again',
        icon: RefreshCw,
        onClick: resetErrorBoundary,
        variant: 'primary'
      }
    ];
    
    // Add action to choose another date if we have a doctorId
    if (error && (error as TimeSlotError).details?.doctorId) {
      const doctorId = (error as TimeSlotError).details?.doctorId;
      actions.push({
        label: 'Choose Another Date',
        icon: Calendar,
        onClick: () => router.push(`/book-appointment/${doctorId}`),
        variant: 'outline'
      });
    } else {
      actions.push({
        label: 'Choose Another Date',
        icon: Calendar,
        onClick: resetErrorBoundary,
        variant: 'outline'
      });
    }
    
    // Add help action
    actions.push({
      label: 'Help',
      icon: HelpCircle,
      href: '/help/booking-time-slots',
      variant: 'ghost'
    });
    
    return (
      <CustomizableErrorBoundary
        title="Time Slot Selection Issue"
        message={message}
        icon={Clock}
        category="appointment"
        componentName={componentName}
        actions={actions}
        additionalContext={{
          errorCode: (error as TimeSlotError)?.code,
          errorDetails: (error as TimeSlotError)?.details
        }}
      >
        {children}
      </CustomizableErrorBoundary>
    );
  };
  
  return <DynamicTimeSlotErrorHandler error={null} resetErrorBoundary={() => {}} />;
} 